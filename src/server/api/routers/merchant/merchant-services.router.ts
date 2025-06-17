import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { UserRole, ServiceSubscriptionStatus } from "@prisma/client";

/**
 * Router pour les services destinés aux commerçants
 * Gestion des abonnements, outils de gestion et services spécialisés
 */
export const merchantServicesRouter = createTRPCRouter({
  // Récupérer les services disponibles pour les commerçants
  getAvailableServices: protectedProcedure
    .input(
      z.object({
        category: z.enum(["POS", "INVENTORY", "ANALYTICS", "MARKETING", "PAYMENT", "DELIVERY"]).optional(),
        priceRange: z.object({
          min: z.number().min(0).optional(),
          max: z.number().min(0).optional(),
        }).optional(),
        isActive: z.boolean().default(true),
        limit: z.number().min(1).max(50).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const user = ctx.session.user;

      if (user.role !== UserRole.MERCHANT) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Seuls les commerçants peuvent accéder à ces services",
        });
      }

      try {
        const where = {
          targetRole: UserRole.MERCHANT,
          ...(input.isActive !== undefined && { isActive: input.isActive }),
          ...(input.category && { category: input.category }),
          ...(input.priceRange && {
            monthlyPrice: {
              ...(input.priceRange.min && { gte: input.priceRange.min }),
              ...(input.priceRange.max && { lte: input.priceRange.max }),
            },
          }),
        };

        const [services, total] = await Promise.all([
          ctx.db.platformService.findMany({
            where,
            include: {
              features: {
                orderBy: { order: "asc" },
              },
              subscriptions: {
                where: { userId: user.id },
                take: 1,
                orderBy: { createdAt: "desc" },
              },
              reviews: {
                where: { userId: user.id },
                take: 1,
                orderBy: { createdAt: "desc" },
              },
              _count: {
                select: {
                  subscriptions: true,
                  reviews: true,
                },
              },
            },
            orderBy: [
              { featured: "desc" },
              { monthlyPrice: "asc" },
              { createdAt: "desc" },
            ],
            skip: input.offset,
            take: input.limit,
          }),
          ctx.db.platformService.count({ where }),
        ]);

        // Enrichir avec les informations d'abonnement
        const servicesWithSubscription = services.map((service) => {
          const currentSubscription = service.subscriptions[0];
          const isSubscribed = currentSubscription && 
            currentSubscription.status === ServiceSubscriptionStatus.ACTIVE;
          const userReview = service.reviews[0];

          return {
            ...service,
            isSubscribed,
            currentSubscription,
            userReview,
            subscriptionCount: service._count.subscriptions,
            reviewCount: service._count.reviews,
          };
        });

        return {
          success: true,
          data: {
            services: servicesWithSubscription,
            pagination: {
              total,
              offset: input.offset,
              limit: input.limit,
              hasMore: input.offset + input.limit < total,
            },
          },
        };
      } catch (error) {
        console.error("Erreur lors de la récupération des services:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération des services",
        });
      }
    }),

  // Souscrire à un service
  subscribeToService: protectedProcedure
    .input(
      z.object({
        serviceId: z.string(),
        plan: z.enum(["MONTHLY", "QUARTERLY", "YEARLY"]),
        paymentMethodId: z.string().optional(),
        autoRenew: z.boolean().default(true),
        discountCode: z.string().optional(),
        customConfig: z.record(z.any()).optional(), // Configuration personnalisée
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = ctx.session.user;

      if (user.role !== UserRole.MERCHANT) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Seuls les commerçants peuvent souscrire à ces services",
        });
      }

      try {
        // Vérifier que le service existe et est actif
        const service = await ctx.db.platformService.findFirst({
          where: {
            id: input.serviceId,
            targetRole: UserRole.MERCHANT,
            isActive: true,
          },
        });

        if (!service) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Service non trouvé ou non disponible",
          });
        }

        // Vérifier s'il y a déjà un abonnement actif
        const existingSubscription = await ctx.db.serviceSubscription.findFirst({
          where: {
            userId: user.id,
            serviceId: input.serviceId,
            status: ServiceSubscriptionStatus.ACTIVE,
          },
        });

        if (existingSubscription) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Vous êtes déjà abonné à ce service",
          });
        }

        // Calculer le prix selon le plan
        let price = service.monthlyPrice;
        let duration = 1; // mois

        switch (input.plan) {
          case "QUARTERLY":
            price = service.monthlyPrice * 3 * 0.9; // 10% de réduction
            duration = 3;
            break;
          case "YEARLY":
            price = service.monthlyPrice * 12 * 0.8; // 20% de réduction
            duration = 12;
            break;
        }

        // Appliquer un code de réduction si fourni
        if (input.discountCode) {
          const discount = await ctx.db.discountCode.findFirst({
            where: {
              code: input.discountCode,
              isActive: true,
              validUntil: { gt: new Date() },
              OR: [
                { applicableServices: { has: input.serviceId } },
                { applicableServices: { isEmpty: true } },
              ],
            },
          });

          if (discount) {
            if (discount.type === "PERCENTAGE") {
              price = price * (1 - discount.value / 100);
            } else {
              price = Math.max(0, price - discount.value);
            }
          }
        }

        // Calculer les dates
        const startDate = new Date();
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + duration);

        // Créer l'abonnement
        const subscription = await ctx.db.serviceSubscription.create({
          data: {
            userId: user.id,
            serviceId: input.serviceId,
            plan: input.plan,
            status: ServiceSubscriptionStatus.PENDING,
            startDate,
            endDate,
            monthlyPrice: service.monthlyPrice,
            totalPrice: price,
            paymentMethodId: input.paymentMethodId,
            autoRenew: input.autoRenew,
            discountCode: input.discountCode,
            customConfig: input.customConfig || {},
          },
          include: {
            service: {
              select: {
                name: true,
                category: true,
              },
            },
          },
        });

        // Créer le paiement
        const payment = await ctx.db.payment.create({
          data: {
            clientId: user.id,
            amount: price,
            status: "PENDING",
            method: "STRIPE",
            description: `Abonnement ${subscription.service.name} - Plan ${input.plan}`,
            metadata: {
              subscriptionId: subscription.id,
              serviceId: input.serviceId,
              plan: input.plan,
            },
          },
        });

        // Traitement du paiement via Stripe
        const stripePaymentIntent = await createStripePaymentIntent({
          amount: Math.round(totalPrice * 100), // Stripe utilise les centimes
          currency: "eur",
          metadata: {
            subscriptionId: subscription.id,
            serviceId: input.serviceId,
            userId: user.id,
            plan: input.plan,
            userType: "MERCHANT",
          },
        });

        // Mettre à jour le paiement avec l'ID Stripe
        await ctx.db.payment.update({
          where: { id: payment.id },
          data: {
            stripePaymentIntentId: stripePaymentIntent.id,
            status: "PENDING",
          },
        });

        // En développement, activer immédiatement pour les tests
        if (process.env.NODE_ENV === "development") {
          await ctx.db.serviceSubscription.update({
            where: { id: subscription.id },
            data: {
              status: ServiceSubscriptionStatus.ACTIVE,
              activatedAt: new Date(),
            },
          });

          await ctx.db.payment.update({
            where: { id: payment.id },
            data: {
              status: "COMPLETED",
              paidAt: new Date(),
            },
          });
        }

        // Créer une notification
        await ctx.db.notification.create({
          data: {
            userId: user.id,
            type: "SERVICE_SUBSCRIPTION_ACTIVATED",
            title: "Abonnement activé",
            message: `Votre abonnement à ${subscription.service.name} est maintenant actif`,
            data: {
              subscriptionId: subscription.id,
              serviceId: input.serviceId,
              plan: input.plan,
              endDate,
            },
          },
        });

        return {
          success: true,
          data: {
            subscription,
            payment,
          },
          message: "Abonnement souscrit avec succès",
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Erreur lors de la souscription:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la souscription au service",
        });
      }
    }),

  // Obtenir mes abonnements
  getMySubscriptions: protectedProcedure
    .input(
      z.object({
        status: z.nativeEnum(ServiceSubscriptionStatus).optional(),
        category: z.string().optional(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(50).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      const user = ctx.session.user;

      if (user.role !== UserRole.MERCHANT) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Accès non autorisé",
        });
      }

      try {
        const where = {
          userId: user.id,
          ...(input.status && { status: input.status }),
          ...(input.category && {
            service: {
              category: input.category,
            },
          }),
        };

        const [subscriptions, total] = await Promise.all([
          ctx.db.serviceSubscription.findMany({
            where,
            include: {
              service: {
                include: {
                  features: {
                    orderBy: { order: "asc" },
                  },
                },
              },
              payments: {
                orderBy: { createdAt: "desc" },
                take: 3,
              },
            },
            orderBy: { createdAt: "desc" },
            skip: (input.page - 1) * input.limit,
            take: input.limit,
          }),
          ctx.db.serviceSubscription.count({ where }),
        ]);

        return {
          success: true,
          data: {
            subscriptions,
            pagination: {
              total,
              pages: Math.ceil(total / input.limit),
              currentPage: input.page,
              limit: input.limit,
            },
          },
        };
      } catch (error) {
        console.error("Erreur lors de la récupération des abonnements:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération des abonnements",
        });
      }
    }),

  // Créer un service personnalisé (pour les gros commerçants)
  createCustomService: protectedProcedure
    .input(
      z.object({
        name: z.string().min(3, "Nom requis"),
        description: z.string().min(10, "Description requise"),
        category: z.enum(["POS", "INVENTORY", "ANALYTICS", "MARKETING", "PAYMENT", "DELIVERY"]),
        requirements: z.array(z.string()).min(1, "Exigences requises"),
        budget: z.object({
          min: z.number().positive(),
          max: z.number().positive(),
        }),
        timeline: z.string().min(5, "Délais requis"),
        contactEmail: z.string().email(),
        contactPhone: z.string().optional(),
        additionalNotes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = ctx.session.user;

      if (user.role !== UserRole.MERCHANT) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Seuls les commerçants peuvent créer des demandes de services personnalisés",
        });
      }

      try {
        // Créer la demande de service personnalisé
        const customServiceRequest = await ctx.db.customServiceRequest.create({
          data: {
            userId: user.id,
            name: input.name,
            description: input.description,
            category: input.category,
            requirements: input.requirements,
            budgetMin: input.budget.min,
            budgetMax: input.budget.max,
            timeline: input.timeline,
            contactEmail: input.contactEmail,
            contactPhone: input.contactPhone,
            additionalNotes: input.additionalNotes,
            status: "PENDING",
          },
        });

        // Créer une notification pour les admins
        await ctx.db.notification.create({
          data: {
            userId: "admin", // À remplacer par un vrai système d'admin
            type: "CUSTOM_SERVICE_REQUEST",
            title: "Nouvelle demande de service personnalisé",
            message: `${user.name} a demandé un service personnalisé: ${input.name}`,
            data: {
              requestId: customServiceRequest.id,
              userId: user.id,
              category: input.category,
              budget: input.budget,
            },
          },
        });

        return {
          success: true,
          data: customServiceRequest,
          message: "Demande de service personnalisé soumise avec succès",
        };
      } catch (error) {
        console.error("Erreur lors de la création de la demande:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la création de la demande de service personnalisé",
        });
      }
    }),

  // Obtenir les statistiques d'utilisation des services
  getServiceUsageStats: protectedProcedure.query(async ({ ctx }) => {
    const user = ctx.session.user;

    if (user.role !== UserRole.MERCHANT) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Accès non autorisé",
      });
    }

    try {
      const [activeSubscriptions, totalSpent, monthlyCost, servicesByCategory] = await Promise.all([
        ctx.db.serviceSubscription.count({
          where: {
            userId: user.id,
            status: ServiceSubscriptionStatus.ACTIVE,
          },
        }),
        ctx.db.payment.aggregate({
          where: {
            clientId: user.id,
            status: "COMPLETED",
            metadata: {
              path: ["subscriptionId"],
              not: null,
            },
          },
          _sum: { amount: true },
        }),
        ctx.db.serviceSubscription.aggregate({
          where: {
            userId: user.id,
            status: ServiceSubscriptionStatus.ACTIVE,
          },
          _sum: { monthlyPrice: true },
        }),
        ctx.db.serviceSubscription.groupBy({
          by: ["service"],
          where: {
            userId: user.id,
            status: ServiceSubscriptionStatus.ACTIVE,
          },
          _count: { id: true },
          include: {
            service: {
              select: { category: true },
            },
          },
        }),
      ]);

      return {
        success: true,
        data: {
          activeSubscriptions,
          totalSpent: totalSpent._sum.amount || 0,
          monthlyCost: monthlyCost._sum.monthlyPrice || 0,
          servicesByCategory: servicesByCategory.reduce((acc: Record<string, number>, item: any) => {
            const category = item.service?.category || "OTHER";
            acc[category] = (acc[category] || 0) + item._count.id;
            return acc;
          }, {}),
          averageServiceCost: activeSubscriptions > 0 
            ? (monthlyCost._sum.monthlyPrice || 0) / activeSubscriptions 
            : 0,
        },
      };
    } catch (error) {
      console.error("Erreur lors de la récupération des statistiques:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors de la récupération des statistiques",
      });
    }
  }),

  // Configurer un service
  configureService: protectedProcedure
    .input(
      z.object({
        subscriptionId: z.string(),
        configuration: z.record(z.any()),
        webhookUrl: z.string().url().optional(),
        apiKeys: z.record(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = ctx.session.user;

      if (user.role !== UserRole.MERCHANT) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Accès non autorisé",
        });
      }

      try {
        const subscription = await ctx.db.serviceSubscription.findFirst({
          where: {
            id: input.subscriptionId,
            userId: user.id,
            status: ServiceSubscriptionStatus.ACTIVE,
          },
        });

        if (!subscription) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Abonnement non trouvé ou non actif",
          });
        }

        // Mettre à jour la configuration
        const updatedSubscription = await ctx.db.serviceSubscription.update({
          where: { id: input.subscriptionId },
          data: {
            customConfig: {
              ...subscription.customConfig,
              ...input.configuration,
              ...(input.webhookUrl && { webhookUrl: input.webhookUrl }),
              ...(input.apiKeys && { apiKeys: input.apiKeys }),
              updatedAt: new Date(),
            },
          },
        });

        return {
          success: true,
          data: updatedSubscription,
          message: "Configuration mise à jour avec succès",
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Erreur lors de la configuration:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la configuration du service",
        });
      }
    }),
});
