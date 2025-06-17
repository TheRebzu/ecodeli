import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { UserRole, ServiceSubscriptionStatus } from "@prisma/client";

/**
 * Router pour les services destinés aux livreurs
 * Gestion des abonnements, outils et formations
 */
export const delivererServicesRouter = createTRPCRouter({
  // Récupérer les services disponibles pour les livreurs
  getAvailableServices: protectedProcedure
    .input(
      z.object({
        category: z.enum(["TOOLS", "TRAINING", "INSURANCE", "EQUIPMENT", "SUPPORT"]).optional(),
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

      if (user.role !== UserRole.DELIVERER) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Seuls les livreurs peuvent accéder à ces services",
        });
      }

      try {
        const where = {
          targetRole: UserRole.DELIVERER,
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

          return {
            ...service,
            isSubscribed,
            currentSubscription,
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
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = ctx.session.user;

      if (user.role !== UserRole.DELIVERER) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Seuls les livreurs peuvent souscrire à ces services",
        });
      }

      try {
        // Vérifier que le service existe et est actif
        const service = await ctx.db.platformService.findFirst({
          where: {
            id: input.serviceId,
            targetRole: UserRole.DELIVERER,
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
            price = service.monthlyPrice * 3 * 0.95; // 5% de réduction
            duration = 3;
            break;
          case "YEARLY":
            price = service.monthlyPrice * 12 * 0.85; // 15% de réduction
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
                { applicableServices: { isEmpty: true } }, // Code universel
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

        // Créer l'intent de paiement Stripe réel
        const stripePaymentIntent = await createStripePaymentIntent({
          amount: Math.round(totalPrice * 100), // Stripe utilise les centimes
          currency: "eur",
          metadata: {
            subscriptionId: subscription.id,
            serviceId: input.serviceId,
            userId: user.id,
            plan: input.plan,
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

        console.log(`💳 Paiement Stripe créé pour l'abonnement: ${payment.id} (${stripePaymentIntent.id})`);

        // L'abonnement sera activé après confirmation du paiement via webhook Stripe
        // Pour les tests, on peut activer immédiatement
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
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(50).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      const user = ctx.session.user;

      if (user.role !== UserRole.DELIVERER) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Accès non autorisé",
        });
      }

      try {
        const where = {
          userId: user.id,
          ...(input.status && { status: input.status }),
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

  // Annuler un abonnement
  cancelSubscription: protectedProcedure
    .input(
      z.object({
        subscriptionId: z.string(),
        reason: z.string().optional(),
        immediately: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = ctx.session.user;

      if (user.role !== UserRole.DELIVERER) {
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
          },
          include: {
            service: {
              select: { name: true },
            },
          },
        });

        if (!subscription) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Abonnement non trouvé",
          });
        }

        if (subscription.status !== ServiceSubscriptionStatus.ACTIVE) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cet abonnement ne peut pas être annulé",
          });
        }

        const cancelDate = input.immediately ? new Date() : subscription.endDate;

        // Mettre à jour l'abonnement
        const updatedSubscription = await ctx.db.serviceSubscription.update({
          where: { id: input.subscriptionId },
          data: {
            status: input.immediately 
              ? ServiceSubscriptionStatus.CANCELLED 
              : ServiceSubscriptionStatus.CANCELLING,
            cancelledAt: new Date(),
            cancelReason: input.reason,
            autoRenew: false,
            ...(input.immediately && { endDate: cancelDate }),
          },
        });

        // Créer une notification
        await ctx.db.notification.create({
          data: {
            userId: user.id,
            type: "SERVICE_SUBSCRIPTION_CANCELLED",
            title: "Abonnement annulé",
            message: input.immediately
              ? `Votre abonnement à ${subscription.service.name} a été annulé immédiatement`
              : `Votre abonnement à ${subscription.service.name} sera annulé à la fin de la période de facturation`,
            data: {
              subscriptionId: input.subscriptionId,
              cancelDate,
              immediately: input.immediately,
            },
          },
        });

        return {
          success: true,
          data: updatedSubscription,
          message: input.immediately
            ? "Abonnement annulé immédiatement"
            : "Abonnement programmé pour annulation",
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Erreur lors de l'annulation:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de l'annulation de l'abonnement",
        });
      }
    }),

  // Obtenir les statistiques d'utilisation des services
  getServiceUsageStats: protectedProcedure.query(async ({ ctx }) => {
    const user = ctx.session.user;

    if (user.role !== UserRole.DELIVERER) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Accès non autorisé",
      });
    }

    try {
      const [activeSubscriptions, totalSpent, usageHistory] = await Promise.all([
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
        ctx.db.serviceSubscription.findMany({
          where: {
            userId: user.id,
          },
          include: {
            service: {
              select: {
                name: true,
                category: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        }),
      ]);

      return {
        success: true,
        data: {
          activeSubscriptions,
          totalSpent: totalSpent._sum.amount || 0,
          averageMonthlySpending: activeSubscriptions > 0 
            ? (totalSpent._sum.amount || 0) / Math.max(1, 
                Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (30 * 24 * 60 * 60 * 1000))
              )
            : 0,
          recentSubscriptions: usageHistory,
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
});
