import { router, protectedProcedure, adminProcedure } from "@/server/api/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { ClientSubscriptionPlan, UsageType } from "@prisma/client";
import { format, isBefore, isEqual, addMonths } from "date-fns";
import { fr } from "date-fns/locale";
import { Decimal } from "@prisma/client/runtime/library";

/**
 * Router tRPC pour la gestion des abonnements clients EcoDeli
 * Système 3-tier: FREE/STARTER(9.90€)/PREMIUM(19.99€) avec suivi d'usage
 * Conforme au cahier des charges officiel
 */
export const subscriptionRouter = router({
  /**
   * Récupère l'abonnement actif de l'utilisateur avec usage
   */
  getMySubscription: protectedProcedure.query(async ({ _ctx }) => {
    try {
      const { _user: __user } = ctx.session;

      if (user.role !== "CLIENT") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Seuls les clients peuvent consulter leurs abonnements",
        });
      }

      // Récupérer l'abonnement actif du client
      const activeSubscription = await ctx.db.clientSubscriptionPlan.findFirst({
        where: {
          clientId: user.id,
          isActive: true,
        },
        include: {
          usageHistory: {
            where: {
              month: new Date().getMonth() + 1,
              year: new Date().getFullYear(),
            },
            orderBy: { createdAt: "desc" },
          },
          client: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // Si pas d'abonnement, créer un plan FREE par défaut
      if (!activeSubscription) {
        const freePlan = await ctx.db.clientSubscriptionPlan.create({
          data: {
            clientId: user.id,
            plan: "FREE",
            isActive: true,
            startDate: new Date(),
            monthlyPrice: 0,
            announcementsIncluded: 3,
            storageGBIncluded: 0,
            supportLevel: "COMMUNITY",
          },
        });

        return {
          subscription: freePlan,
          currentUsage: null,
          limits: getPlanLimits("FREE"),
          availableUpgrades: await getAvailableUpgrades("FREE"),
        };
      }

      // Calculer l'usage du mois en cours
      const currentUsage = await calculateCurrentMonthUsage(user.id, _ctx.db);
      const limits = getPlanLimits(activeSubscription.plan);

      return {
        subscription: activeSubscription,
        currentUsage,
        limits,
        availableUpgrades: await getAvailableUpgrades(activeSubscription.plan),
        usagePercentages: {
          announcements:
            limits.announcements > 0
              ? (currentUsage.announcements / limits.announcements) * 100
              : 0,
          storage:
            limits.storage > 0
              ? (currentUsage.storage / limits.storage) * 100
              : 0,
        },
      };
    } catch (error: any) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message:
          error.message || "Erreur lors de la récupération de l'abonnement",
        cause: error,
      });
    }
  }),

  /**
   * Récupère tous les plans d'abonnement EcoDeli
   */
  getAvailablePlans: protectedProcedure.query(async ({ _ctx }) => {
    try {
      const { _user: __user } = ctx.session;

      if (user.role !== "CLIENT") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Seuls les clients peuvent consulter les plans",
        });
      }

      const plans = [
        {
          id: "FREE",
          name: "Gratuit",
          price: 0,
          description: "Pour découvrir EcoDeli",
          features: [
            "3 annonces par mois",
            "Support communautaire",
            "Accès aux services de base",
            "Notifications par email",
          ],
          limits: {
            announcements: 3,
            storage: 0,
            prioritySupport: false,
            advancedFeatures: false,
          },
          popular: false,
        },
        {
          id: "STARTER",
          name: "Starter",
          price: 9.9,
          description: "Pour les utilisateurs réguliers",
          features: [
            "20 annonces par mois",
            "2 GB stockage cloud",
            "Support par email",
            "Statistiques de base",
            "Notifications en temps réel",
          ],
          limits: {
            announcements: 20,
            storage: 2, // GB
            prioritySupport: false,
            advancedFeatures: true,
          },
          popular: true,
        },
        {
          id: "PREMIUM",
          name: "Premium",
          price: 19.99,
          description: "Pour les power users",
          features: [
            "Annonces illimitées",
            "10 GB stockage cloud",
            "Support prioritaire",
            "Analytics avancées",
            "API access",
            "Intégrations tierces",
            "Matching prioritaire",
          ],
          limits: {
            announcements: -1, // Illimité
            storage: 10, // GB
            prioritySupport: true,
            advancedFeatures: true,
          },
          popular: false,
        },
      ];

      // Obtenir le plan actuel de l'utilisateur
      const currentSubscription = await ctx.db.clientSubscriptionPlan.findFirst(
        {
          where: {
            clientId: user.id,
            isActive: true,
          },
        },
      );

      const currentPlan = currentSubscription?.plan || "FREE";

      return {
        plans: plans.map((plan) => ({
          ...plan,
          isCurrent: plan.id === currentPlan,
          canUpgrade: canUpgrade(
            currentPlan,
            plan.id as ClientSubscriptionPlan,
          ),
          canDowngrade: canDowngrade(
            currentPlan,
            plan.id as ClientSubscriptionPlan,
          ),
        })),
        currentPlan,
      };
    } catch (error: any) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error.message || "Erreur lors de la récupération des plans",
        cause: error,
      });
    }
  }),

  /**
   * Changer de plan d'abonnement
   */
  changePlan: protectedProcedure
    .input(
      z.object({
        newPlan: z.nativeEnum(ClientSubscriptionPlan),
        paymentMethodId: z.string().optional(),
      }),
    )
    .mutation(async ({ _ctx, input: _input }) => {
      try {
        const { _user: __user } = ctx.session;
        const { newPlan: _newPlan, paymentMethodId: _paymentMethodId } = input;

        if (user.role !== "CLIENT") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Seuls les clients peuvent changer d'abonnement",
          });
        }

        // Récupérer l'abonnement actuel
        const currentSubscription =
          await ctx.db.clientSubscriptionPlan.findFirst({
            where: {
              clientId: user.id,
              isActive: true,
            },
          });

        const currentPlan = currentSubscription?.plan || "FREE";

        if (currentPlan === newPlan) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Vous êtes déjà sur ce plan",
          });
        }

        // Valider la transition de plan
        if (
          !canUpgrade(currentPlan, newPlan) &&
          !canDowngrade(currentPlan, newPlan)
        ) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Transition de plan non autorisée",
          });
        }

        const isUpgrade =
          getPlanPriority(newPlan) > getPlanPriority(currentPlan);
        const planDetails = getPlanDetails(newPlan);

        // Désactiver l'ancien abonnement
        if (currentSubscription) {
          await ctx.db.clientSubscriptionPlan.update({
            where: { id: currentSubscription.id },
            data: {
              isActive: false,
              endDate: new Date(),
            },
          });
        }

        // Créer le nouvel abonnement
        const newSubscription = await ctx.db.clientSubscriptionPlan.create({
          data: {
            clientId: user.id,
            plan: newPlan,
            isActive: true,
            startDate: new Date(),
            monthlyPrice: planDetails.price,
            announcementsIncluded:
              planDetails.limits.announcements === -1
                ? null
                : planDetails.limits.announcements,
            storageGBIncluded: planDetails.limits.storage,
            supportLevel: planDetails.limits.prioritySupport
              ? "PRIORITY"
              : "STANDARD",
            paymentMethodId,
            autoRenew: newPlan !== "FREE",
          },
        });

        // Enregistrer l'historique de changement
        await ctx.db.clientSubscriptionHistory.create({
          data: {
            clientId: user.id,
            subscriptionId: newSubscription.id,
            action: isUpgrade ? "UPGRADE" : "DOWNGRADE",
            fromPlan: currentPlan,
            toPlan: newPlan,
            effectiveDate: new Date(),
            reason: isUpgrade
              ? "Plan upgrade requested"
              : "Plan downgrade requested",
          },
        });

        // TODO: Gérer le paiement pour les plans payants
        // TODO: Envoyer notification par email

        return {
          success: true,
          subscription: newSubscription,
          message: `Abonnement mis à jour vers ${planDetails.name} avec succès`,
          isUpgrade,
          effectiveImmediately: true,
        };
      } catch (error: any) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors du changement d'abonnement",
        });
      }
    }),

  /**
   * Annuler un abonnement payant (retour vers FREE)
   */
  cancelSubscription: protectedProcedure
    .input(
      z.object({
        reason: z.string().optional(),
        feedback: z.string().max(1000).optional(),
      }),
    )
    .mutation(async ({ _ctx, input: _input }) => {
      try {
        const { _user: __user } = ctx.session;
        const { reason: _reason, feedback: _feedback } = input;

        if (user.role !== "CLIENT") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Seuls les clients peuvent annuler leurs abonnements",
          });
        }

        // Récupérer l'abonnement actif
        const activeSubscription =
          await ctx.db.clientSubscriptionPlan.findFirst({
            where: {
              clientId: user.id,
              isActive: true,
            },
          });

        if (!activeSubscription || activeSubscription.plan === "FREE") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Aucun abonnement payant à annuler",
          });
        }

        // Calculer la date de fin (fin du mois en cours)
        const endOfMonth = new Date();
        endOfMonth.setMonth(endOfMonth.getMonth() + 1);
        endOfMonth.setDate(0); // Dernier jour du mois
        endOfMonth.setHours(23, 59, 59, 999);

        // Marquer comme non renouvelable
        await ctx.db.clientSubscriptionPlan.update({
          where: { id: activeSubscription.id },
          data: {
            autoRenew: false,
            scheduledEndDate: endOfMonth,
            cancellationReason: reason,
            cancellationFeedback: feedback,
            cancelledAt: new Date(),
          },
        });

        // Créer un plan FREE pour la suite
        const freePlan = await ctx.db.clientSubscriptionPlan.create({
          data: {
            clientId: user.id,
            plan: "FREE",
            isActive: false, // Sera activé à la fin du plan payant
            startDate: endOfMonth,
            monthlyPrice: 0,
            announcementsIncluded: 3,
            storageGBIncluded: 0,
            supportLevel: "COMMUNITY",
          },
        });

        // Enregistrer l'historique
        await ctx.db.clientSubscriptionHistory.create({
          data: {
            clientId: user.id,
            subscriptionId: activeSubscription.id,
            action: "CANCELLATION",
            fromPlan: activeSubscription.plan,
            toPlan: "FREE",
            effectiveDate: endOfMonth,
            reason: reason || "User cancellation request",
          },
        });

        return {
          success: true,
          message: `Abonnement programmé pour se terminer le ${format(endOfMonth, "PPP", { locale: fr })}. Vous conservez vos avantages jusqu'à cette date.`,
          endDate: endOfMonth,
          nextPlan: freePlan,
        };
      } catch (error: any) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de l'annulation de l'abonnement",
        });
      }
    }),

  /**
   * Enregistrer l'usage d'une fonctionnalité
   */
  recordUsage: protectedProcedure
    .input(
      z.object({
        type: z.nativeEnum(UsageType),
        amount: z.number().min(0).default(1),
        metadata: z.record(z.any()).optional(),
      }),
    )
    .mutation(async ({ _ctx, input: _input }) => {
      try {
        const { _user: __user } = ctx.session;
        const { type: _type, amount: _amount, metadata: _metadata } = input;

        if (user.role !== "CLIENT") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Seuls les clients peuvent enregistrer de l'usage",
          });
        }

        // Récupérer l'abonnement actuel
        const subscription = await ctx.db.clientSubscriptionPlan.findFirst({
          where: {
            clientId: user.id,
            isActive: true,
          },
        });

        if (!subscription) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Aucun abonnement trouvé",
          });
        }

        // Vérifier les limites avant d'enregistrer l'usage
        const currentUsage = await calculateCurrentMonthUsage(user.id, _ctx.db);
        const limits = getPlanLimits(subscription.plan);

        const canUse = await checkUsageLimit(
          type,
          currentUsage,
          limits,
          amount,
        );
        if (!canUse.allowed) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: canUse.message,
          });
        }

        // Enregistrer l'usage
        const usage = await ctx.db.clientUsageHistory.create({
          data: {
            clientId: user.id,
            subscriptionId: subscription.id,
            type,
            amount,
            month: new Date().getMonth() + 1,
            year: new Date().getFullYear(),
            metadata,
            recordedAt: new Date(),
          },
        });

        // Mettre à jour le compteur mensuel
        await ctx.db.clientMonthlyUsage.upsert({
          where: {
            clientId_month_year: {
              clientId: user.id,
              month: new Date().getMonth() + 1,
              year: new Date().getFullYear(),
            },
          },
          update: {
            [getUsageFieldName(type)]: {
              increment: amount,
            },
            updatedAt: new Date(),
          },
          create: {
            clientId: user.id,
            month: new Date().getMonth() + 1,
            year: new Date().getFullYear(),
            [getUsageFieldName(type)]: amount,
            subscriptionPlan: subscription.plan,
          },
        });

        return {
          success: true,
          usage,
          remainingQuota: calculateRemainingQuota(
            type,
            currentUsage,
            limits,
            amount,
          ),
        };
      } catch (error: any) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de l'enregistrement de l'usage",
        });
      }
    }),

  /**
   * Obtenir l'historique d'usage détaillé
   */
  getUsageHistory: protectedProcedure
    .input(
      z.object({
        type: z.nativeEnum(UsageType).optional(),
        month: z.number().min(1).max(12).optional(),
        year: z.number().min(2020).optional(),
        limit: z.number().min(1).max(100).default(50),
      }),
    )
    .query(async ({ _ctx, input: _input }) => {
      try {
        const { _user: __user } = ctx.session;
        const { type: _type, month: _month, year: _year, limit: _limit } = input;

        if (user.role !== "CLIENT") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message:
              "Seuls les clients peuvent consulter leur historique d'usage",
          });
        }

        const where: any = {
          clientId: user.id,
        };

        if (type) where.type = type;
        if (month) where.month = month;
        if (year) where.year = year;

        const history = await ctx.db.clientUsageHistory.findMany({
          where,
          orderBy: { recordedAt: "desc" },
          take: limit,
          include: {
            subscription: {
              select: {
                plan: true,
              },
            },
          },
        });

        // Calculer les statistiques par type
        const stats = await ctx.db.clientUsageHistory.groupBy({
          by: ["type"],
          where: {
            clientId: user.id,
            month: month || new Date().getMonth() + 1,
            year: year || new Date().getFullYear(),
          },
          _sum: {
            amount: true,
          },
        });

        return {
          history,
          monthlyStats: stats.reduce(
            (acc, stat) => {
              acc[stat.type] = stat._sum.amount || 0;
              return acc;
            },
            {} as Record<string, number>,
          ),
        };
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération de l'historique",
        });
      }
    }),

  /**
   * Vérifier si une action est autorisée selon le plan
   */
  checkUsageLimit: protectedProcedure
    .input(
      z.object({
        type: z.nativeEnum(UsageType),
        amount: z.number().min(1).default(1),
      }),
    )
    .query(async ({ _ctx, input: _input }) => {
      try {
        const { _user: __user } = ctx.session;
        const { type: _type, amount: _amount } = input;

        if (user.role !== "CLIENT") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Seuls les clients peuvent vérifier leurs limites",
          });
        }

        // Récupérer l'abonnement actuel
        const subscription = await ctx.db.clientSubscriptionPlan.findFirst({
          where: {
            clientId: user.id,
            isActive: true,
          },
        });

        if (!subscription) {
          // Plan FREE par défaut
          const currentUsage = await calculateCurrentMonthUsage(
            user.id,
            _ctx.db,
          );
          const limits = getPlanLimits("FREE");
          return await checkUsageLimit(type, currentUsage, limits, amount);
        }

        const currentUsage = await calculateCurrentMonthUsage(user.id, _ctx.db);
        const limits = getPlanLimits(subscription.plan);

        return await checkUsageLimit(type, currentUsage, limits, amount);
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la vérification des limites",
        });
      }
    }),

  // ==== ADMIN PROCEDURES ====

  /**
   * Récupère tous les abonnements clients (admin uniquement)
   */
  getAllSubscriptions: adminProcedure
    .input(
      z.object({
        page: z.number().int().positive().default(1),
        limit: z.number().int().positive().max(100).default(10),
        status: z
          .enum(["ALL", "ACTIVE", "CANCELLED", "EXPIRED", "TRIALING"])
          .optional(),
        planType: z
          .enum(["ALL", "FREE", "STARTER", "PREMIUM", "CUSTOM"])
          .optional(),
        sortOrder: z.enum(["asc", "desc"]).default("desc"),
        userId: z.string().optional(),
      }),
    )
    .query(async ({ _ctx, input: _input }) => {
      try {
        const { page: _page, limit: _limit, status: _status, planType: _planType, sortOrder: _sortOrder, userId: _userId } = input;

        // Construire le filtre
        const where: any = {};

        if (status && status !== "ALL") {
          where.status = status;
        }

        if (planType && planType !== "ALL") {
          where.planType = planType;
        }

        if (userId) {
          where.userId = userId;
        }

        // Récupérer les abonnements
        const [subscriptions, total] = await Promise.all([
          _ctx.db.subscription.findMany({
            where,
            orderBy: { createdAt: sortOrder },
            skip: (page - 1) * limit,
            take: limit,
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  role: true,
                },
              },
              invoices: {
                orderBy: { issuedDate: "desc" },
                take: 1,
              },
            },
          }),
          ctx.db.subscription.count({ where }),
        ]);

        // Calculer les statistiques
        const stats = await ctx.db.subscription.groupBy({
          by: ["planType", "status"],
          _count: true,
        });

        // Regrouper les statistiques par plan
        const statsByPlan = stats.reduce((acc: Record<string, any>, stat) => {
          if (!acc[stat.planType]) {
            acc[stat.planType] = {
              total: 0,
              byStatus: {},
            };
          }

          acc[stat.planType].total += stat._count;
          acc[stat.planType].byStatus[stat.status] = stat._count;

          return acc;
        }, {});

        return {
          subscriptions,
          pagination: {
            total,
            page,
            limit,
            pages: Math.ceil(total / limit),
          },
          stats: {
            byPlan: statsByPlan,
            total: total,
          },
        };
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error.message || "Erreur lors de la récupération des abonnements",
          cause: error,
        });
      }
    }),

  /**
   * Modifie un abonnement existant (admin uniquement)
   */
  updateSubscription: adminProcedure
    .input(
      z.object({
        subscriptionId: z.string(),
        planType: z.enum(["FREE", "STARTER", "PREMIUM", "CUSTOM"]).optional(),
        status: z.enum(["ACTIVE", "CANCELLED", "EXPIRED"]).optional(),
        autoRenew: z.boolean().optional(),
        discountPercent: z.number().min(0).max(100).optional(),
        currentPeriodEnd: z.date().optional(),
        billingCycle: z.enum(["MONTHLY", "YEARLY"]).optional(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ _ctx, input: _input }) => {
      try {
        const adminId = ctx.session.user.id;
        const { subscriptionId: _subscriptionId, ...updateData } = input;

        // Récupérer l'abonnement
        const subscription = await ctx.db.subscription.findUnique({
          where: { id: subscriptionId },
        });

        if (!subscription) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Abonnement non trouvé",
          });
        }

        // Préparer les données de mise à jour
        const dataToUpdate: any = { ...updateData };

        // Calculer la nouvelle date de fin si le type de plan change
        if (
          updateData.planType &&
          updateData.planType !== subscription.planType
        ) {
          // Obtenir les détails du nouveau plan
          const planDetails = await subscriptionService.getPlanDetails(
            updateData.planType,
          );

          dataToUpdate.planName = planDetails.name;
          dataToUpdate.planDescription = planDetails.description;
          dataToUpdate.planFeatures = planDetails.features;
          dataToUpdate.planPrice = new Decimal(planDetails.price);
          dataToUpdate.previousPlanType = subscription.planType;
          dataToUpdate.planChangedAt = new Date();
        }

        // Mettre à jour l'abonnement
        const updatedSubscription = await ctx.db.subscription.update({
          where: { id: subscriptionId },
          data: dataToUpdate,
        });

        // Enregistrer dans les logs d'audit
        await ctx.db.auditLog.create({
          data: {
            entityType: "SUBSCRIPTION",
            entityId: subscriptionId,
            performedById: adminId,
            action: "UPDATE_SUBSCRIPTION",
            changes: Object.entries(updateData).reduce(
              (acc, [key, value]) => {
                acc[key] =
                  value instanceof Date ? value.toISOString() : String(value);
                return acc;
              },
              {} as Record<string, string>,
            ),
          },
        });

        return {
          success: true,
          subscription: updatedSubscription,
          message: "Abonnement mis à jour avec succès",
        };
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error.message || "Erreur lors de la mise à jour de l'abonnement",
          cause: error,
        });
      }
    }),

  /**
   * Crée un abonnement pour un utilisateur (admin uniquement)
   */
  createSubscriptionForUser: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        planType: z.enum(["FREE", "STARTER", "PREMIUM", "CUSTOM"]),
        billingCycle: z.enum(["MONTHLY", "YEARLY"]).default("MONTHLY"),
        autoRenew: z.boolean().default(true),
        discountPercent: z.number().min(0).max(100).optional(),
        startDate: z.date().default(() => new Date()),
        trialDays: z.number().int().min(0).default(0),
        notes: z.string().optional(),
        generateInvoice: z.boolean().default(true),
      }),
    )
    .mutation(async ({ _ctx, input: _input }) => {
      try {
        const adminId = ctx.session.user.id;
        const { userId: _userId, generateInvoice: _generateInvoice, ...subscriptionData } = input;

        // Vérifier que l'utilisateur existe
        const user = await ctx.db.user.findUnique({
          where: { id: userId },
        });

        if (!user) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Utilisateur non trouvé",
          });
        }

        // Vérifier si l'utilisateur a déjà un abonnement actif
        const existingSubscription = await ctx.db.subscription.findFirst({
          where: {
            userId,
            status: "ACTIVE",
          },
        });

        if (existingSubscription) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "L'utilisateur a déjà un abonnement actif",
          });
        }

        // Créer l'abonnement
        const subscription = await subscriptionService.createSubscription(
          userId,
          subscriptionData.planType,
          {
            ...subscriptionData,
            createdByAdmin: true,
            adminId,
          },
        );

        // Générer une facture si demandé
        const invoice = null;
        if (generateInvoice && subscription.planType !== "FREE") {
          const renewalResult = await subscriptionService.processRenewal(
            subscription.id,
          );
          invoice = renewalResult.invoiceId;
        }

        // Enregistrer dans les logs d'audit
        await ctx.db.auditLog.create({
          data: {
            entityType: "SUBSCRIPTION",
            entityId: subscription.id,
            performedById: adminId,
            action: "CREATE_SUBSCRIPTION",
            changes: {
              userId,
              planType: subscriptionData.planType,
              billingCycle: subscriptionData.billingCycle,
              discountPercent: String(subscriptionData.discountPercent || 0),
              invoiceGenerated: generateInvoice ? "true" : "false",
            },
          },
        });

        return {
          success: true,
          subscription,
          invoice,
          message: "Abonnement créé avec succès",
        };
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error.message || "Erreur lors de la création de l'abonnement",
          cause: error,
        });
      }
    }),

  /**
   * Ajoute un code promo (admin uniquement)
   */
  createCouponCode: adminProcedure
    .input(
      z.object({
        code: z.string().min(4),
        description: z.string(),
        discountPercent: z.number().min(1).max(100),
        maxUses: z.number().int().positive().default(100),
        validFrom: z.date().default(() => new Date()),
        validUntil: z.date().optional(),
        applicablePlans: z
          .array(z.enum(["STARTER", "PREMIUM", "CUSTOM"]))
          .min(1),
        isActive: z.boolean().default(true),
      }),
    )
    .mutation(async ({ _ctx, input: _input }) => {
      try {
        const adminId = ctx.session.user.id;

        // Vérifier si le code existe déjà
        const existingCode = await ctx.db.couponCode.findUnique({
          where: { code: input.code },
        });

        if (existingCode) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Ce code promo existe déjà",
          });
        }

        // Créer le code promo
        const coupon = await ctx.db.couponCode.create({
          data: {
            ...input,
            createdById: adminId,
          },
        });

        // Enregistrer dans les logs d'audit
        await ctx.db.auditLog.create({
          data: {
            entityType: "COUPON_CODE",
            entityId: coupon.id,
            performedById: adminId,
            action: "CREATE_COUPON",
            changes: {
              code: input.code,
              discountPercent: String(input.discountPercent),
              maxUses: String(input.maxUses),
              applicablePlans: input.applicablePlans.join(","),
            },
          },
        });

        return {
          success: true,
          coupon,
          message: "Code promo créé avec succès",
        };
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Erreur lors de la création du code promo",
          cause: error,
        });
      }
    }),

  /**
   * Met à jour un plan d'abonnement (admin uniquement)
   */
  updatePlan: adminProcedure
    .input(
      z.object({
        planType: z.enum(["FREE", "STARTER", "PREMIUM", "CUSTOM"]),
        name: z.string().min(2).max(50),
        description: z.string().min(10),
        priceMonthly: z.number().nonnegative(),
        priceYearly: z.number().nonnegative().optional(),
        features: z.array(z.string()).min(1),
        isActive: z.boolean().default(true),
        isPublic: z.boolean().default(true),
        trialDays: z.number().int().min(0).default(0),
      }),
    )
    .mutation(async ({ _ctx, input: _input }) => {
      try {
        const adminId = ctx.session.user.id;

        // Mettre à jour ou créer le plan
        const plan = await ctx.db.subscriptionPlan.upsert({
          where: { type: input.planType },
          update: {
            name: input.name,
            description: input.description,
            priceMonthly: new Decimal(input.priceMonthly),
            priceYearly: input.priceYearly
              ? new Decimal(input.priceYearly)
              : null,
            features: input.features,
            isActive: input.isActive,
            isPublic: input.isPublic,
            trialDays: input.trialDays,
            updatedAt: new Date(),
          },
          create: {
            type: input.planType,
            name: input.name,
            description: input.description,
            priceMonthly: new Decimal(input.priceMonthly),
            priceYearly: input.priceYearly
              ? new Decimal(input.priceYearly)
              : null,
            features: input.features,
            isActive: input.isActive,
            isPublic: input.isPublic,
            trialDays: input.trialDays,
            createdById: adminId,
          },
        });

        // Invalidation du cache des plans
        await subscriptionService.clearPlansCache();

        // Enregistrer dans les logs d'audit
        await ctx.db.auditLog.create({
          data: {
            entityType: "SUBSCRIPTION_PLAN",
            entityId: plan.id,
            performedById: adminId,
            action: "UPDATE_PLAN",
            changes: {
              planType: input.planType,
              name: input.name,
              priceMonthly: String(input.priceMonthly),
              priceYearly: input.priceYearly
                ? String(input.priceYearly)
                : "null",
              isActive: String(input.isActive),
            },
          },
        });

        return {
          success: true,
          plan,
          message: "Plan mis à jour avec succès",
        };
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Erreur lors de la mise à jour du plan",
          cause: error,
        });
      }
    }),

  /**
   * Génère des statistiques sur les abonnements
   */
  getSubscriptionStats: adminProcedure
    .input(
      z.object({
        period: z.enum(["day", "week", "month"]).default("month"),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }),
    )
    .query(async ({ _ctx, input: _input }) => {
      try {
        const { period: _period, startDate: _startDate, endDate: _endDate } = input;

        // Filtrage par date
        const dateFilter: any = {};
        if (startDate) dateFilter.gte = startDate;
        if (endDate) dateFilter.lte = endDate;

        // Statistiques par plan
        const planStats = await ctx.db.subscription.groupBy({
          by: ["planType"],
          _count: true,
          where: startDate || endDate ? { createdAt: dateFilter } : undefined,
        });

        // Statistiques sur la valeur des abonnements
        const valueStats = await ctx.db.subscription.groupBy({
          by: ["planType"],
          _sum: {
            planPrice: true,
          },
          where: {
            status: "ACTIVE",
            ...(startDate || endDate ? { createdAt: dateFilter } : {}),
          },
        });

        // Conversion en MRR (Monthly Recurring Revenue)
        const mrrByPlan = valueStats.reduce(
          (acc: Record<string, number>, stat) => {
            const planType = stat.planType;
            const mrr = stat._sum.planPrice
              ? parseFloat(stat._sum.planPrice.toString())
              : 0;
            acc[planType] = mrr;
            return acc;
          },
          {},
        );

        // Calculer le MRR total
        const totalMRR = Object.values(mrrByPlan).reduce(
          (sum, mrr) => sum + mrr,
          0,
        );

        // Statistiques de conversion
        const conversionStats = {
          totalSignups: await ctx.db.subscription.count(),
          paidSubscriptions: await ctx.db.subscription.count({
            where: {
              status: "ACTIVE",
              planType: {
                not: "FREE",
              },
            },
          }),
          freeTrialUsers: await ctx.db.subscription.count({
            where: {
              status: "TRIALING",
            },
          }),
        };

        // Calculer le taux de conversion
        const conversionRate =
          conversionStats.totalSignups > 0
            ? (conversionStats.paidSubscriptions /
                conversionStats.totalSignups) *
              100
            : 0;

        return {
          planDistribution: planStats.map((stat) => ({
            planType: stat.planType,
            count: stat._count,
          })),
          valueMetrics: {
            mrrByPlan,
            totalMRR,
            averageRevenuePerUser:
              conversionStats.paidSubscriptions > 0
                ? totalMRR / conversionStats.paidSubscriptions
                : 0,
          },
          conversionMetrics: {
            ...conversionStats,
            conversionRate,
          },
          period: {
            type: period,
            startDate: startDate || null,
            endDate: endDate || null,
          },
        };
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error.message || "Erreur lors de la récupération des statistiques",
          cause: error,
        });
      }
    }),
});

// Helper functions
function getPlanLimits(plan: ClientSubscriptionPlan) {
  switch (plan) {
    case "FREE":
      return {
        announcements: 3,
        storage: 0, // GB
        prioritySupport: false,
        advancedFeatures: false,
      };
    case "STARTER":
      return {
        announcements: 20,
        storage: 2, // GB
        prioritySupport: false,
        advancedFeatures: true,
      };
    case "PREMIUM":
      return {
        announcements: -1, // Illimité
        storage: 10, // GB
        prioritySupport: true,
        advancedFeatures: true,
      };
    default:
      return getPlanLimits("FREE");
  }
}

function getPlanDetails(plan: ClientSubscriptionPlan) {
  switch (plan) {
    case "FREE":
      return {
        name: "Gratuit",
        price: 0,
        limits: getPlanLimits("FREE"),
      };
    case "STARTER":
      return {
        name: "Starter",
        price: 9.9,
        limits: getPlanLimits("STARTER"),
      };
    case "PREMIUM":
      return {
        name: "Premium",
        price: 19.99,
        limits: getPlanLimits("PREMIUM"),
      };
    default:
      return getPlanDetails("FREE");
  }
}

function getPlanPriority(plan: ClientSubscriptionPlan): number {
  switch (plan) {
    case "FREE":
      return 0;
    case "STARTER":
      return 1;
    case "PREMIUM":
      return 2;
    default:
      return 0;
  }
}

function canUpgrade(
  from: ClientSubscriptionPlan,
  to: ClientSubscriptionPlan,
): boolean {
  return getPlanPriority(to) > getPlanPriority(from);
}

function canDowngrade(
  from: ClientSubscriptionPlan,
  to: ClientSubscriptionPlan,
): boolean {
  return getPlanPriority(to) < getPlanPriority(from);
}

async function getAvailableUpgrades(currentPlan: ClientSubscriptionPlan) {
  const allPlans: ClientSubscriptionPlan[] = ["FREE", "STARTER", "PREMIUM"];
  return allPlans.filter((plan) => canUpgrade(currentPlan, plan));
}

async function calculateCurrentMonthUsage(clientId: string, db: any) {
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const usage = await db.clientMonthlyUsage.findUnique({
    where: {
      clientId_month_year: {
        clientId,
        month: currentMonth,
        year: currentYear,
      },
    },
  });

  return {
    announcements: usage?.announcementsCount || 0,
    storage: usage?.storageUsedGB || 0,
    apiCalls: usage?.apiCallsCount || 0,
  };
}

async function checkUsageLimit(
  type: UsageType,
  currentUsage: any,
  limits: any,
  amount: number,
) {
  switch (type) {
    case "ANNOUNCEMENTS":
      if (limits.announcements === -1) {
        return { allowed: true, message: "Illimité" };
      }
      if (currentUsage.announcements + amount > limits.announcements) {
        return {
          allowed: false,
          message: `Limite d'annonces atteinte (${limits.announcements}/mois). Passez à un plan supérieur.`,
        };
      }
      return { allowed: true, message: "OK" };

    case "STORAGE":
      if (currentUsage.storage + amount > limits.storage) {
        return {
          allowed: false,
          message: `Limite de stockage atteinte (${limits.storage}GB). Passez à un plan supérieur.`,
        };
      }
      return { allowed: true, message: "OK" };

    case "API_CALLS":
      // Les appels API ne sont pas limités pour l'instant
      return { allowed: true, message: "OK" };

    default:
      return { allowed: true, message: "OK" };
  }
}

function getUsageFieldName(type: UsageType): string {
  switch (type) {
    case "ANNOUNCEMENTS":
      return "announcementsCount";
    case "STORAGE":
      return "storageUsedGB";
    case "API_CALLS":
      return "apiCallsCount";
    default:
      return "announcementsCount";
  }
}

function calculateRemainingQuota(
  type: UsageType,
  currentUsage: any,
  limits: any,
  usedAmount: number,
) {
  switch (type) {
    case "ANNOUNCEMENTS":
      if (limits.announcements === -1) return -1; // Illimité
      return Math.max(
        0,
        limits.announcements - (currentUsage.announcements + usedAmount),
      );
    case "STORAGE":
      return Math.max(0, limits.storage - (currentUsage.storage + usedAmount));
    default:
      return -1;
  }
}
