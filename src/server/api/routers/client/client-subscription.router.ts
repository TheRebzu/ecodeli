// src/server/api/routers/subscription.router.ts
import { router, protectedProcedure, adminProcedure } from '@/server/api/trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { subscriptionService } from '@/server/services/shared/subscription.service';
import { PlanType } from '@prisma/client';
import { db } from '@/server/db';
import { format, isBefore, isEqual, addMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Router tRPC pour la gestion des abonnements
 * Fournit des endpoints pour gérer les abonnements, formules et avantages
 */
export const subscriptionRouter = router({
  /**
   * Récupère l'abonnement actif de l'utilisateur
   */
  getMySubscription: protectedProcedure.query(async ({ ctx }) => {
    try {
      const userId = ctx.session.user.id;

      // Récupérer l'abonnement actif de l'utilisateur
      const activeSubscription = await ctx.db.subscription.findFirst({
        where: {
          userId,
          status: 'ACTIVE',
        },
        include: {
          invoices: {
            orderBy: { issuedDate: 'desc' },
            take: 3,
          },
        },
      });

      // Récupérer tous les plans disponibles
      const availablePlans = await subscriptionService.getAvailablePlans();

      // Déterminer le plan courant
      let currentPlan = null;
      if (activeSubscription) {
        currentPlan = availablePlans.find(plan => plan.type === activeSubscription.planType);
      } else {
        // Tous les utilisateurs ont au moins un plan FREE par défaut
        currentPlan = availablePlans.find(plan => plan.type === 'FREE');
      }

      return {
        subscription: activeSubscription,
        currentPlan,
        availablePlans,
        isDemoMode: process.env.DEMO_MODE === 'true',
      };
    } catch (error: any) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message || "Erreur lors de la récupération de l'abonnement",
        cause: error,
      });
    }
  }),

  /**
   * Récupère tous les plans d'abonnement disponibles
   */
  getAvailablePlans: protectedProcedure.query(async ({ ctx }) => {
    try {
      const plans = await subscriptionService.getAvailablePlans();

      // Calculer les économies pour les plans annuels
      const plansWithSavings = plans.map(plan => {
        if (plan.priceYearly && plan.priceMonthly) {
          const monthlyCostInYearlyPlan = plan.priceYearly / 12;
          const savings = {
            monthly: plan.priceMonthly - monthlyCostInYearlyPlan,
            percentage: ((plan.priceMonthly - monthlyCostInYearlyPlan) / plan.priceMonthly) * 100,
            yearly: plan.priceMonthly * 12 - plan.priceYearly,
          };
          return { ...plan, savings };
        }
        return plan;
      });

      return {
        plans: plansWithSavings,
        isDemoMode: process.env.DEMO_MODE === 'true',
      };
    } catch (error: any) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message || 'Erreur lors de la récupération des plans',
        cause: error,
      });
    }
  }),

  /**
   * S'abonner à un plan
   */
  subscribe: protectedProcedure
    .input(
      z.object({
        planType: z.enum(['FREE', 'STARTER', 'PREMIUM', 'CUSTOM']),
        billingCycle: z.enum(['MONTHLY', 'YEARLY']).default('MONTHLY'),
        couponCode: z.string().optional(),
        autoRenew: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const userId = ctx.session.user.id;
        const { planType, billingCycle, couponCode, autoRenew } = input;

        // Vérifier si l'utilisateur a déjà un abonnement
        const existingSubscription = await ctx.db.subscription.findFirst({
          where: {
            userId,
            status: 'ACTIVE',
          },
        });

        // Obtenir les détails du plan
        const planDetails = await subscriptionService.getPlanDetails(planType);

        // Appliquer réduction si code promo
        let finalPrice =
          billingCycle === 'YEARLY'
            ? planDetails.priceYearly || planDetails.price * 12
            : planDetails.price;

        let appliedDiscount = 0;
        if (couponCode) {
          const discountResult = await subscriptionService.applyCouponCode(couponCode, planType);
          if (discountResult.valid) {
            appliedDiscount = discountResult.discountPercent;
            finalPrice = finalPrice * (1 - discountResult.discountPercent / 100);
          }
        }

        // Créer ou mettre à jour l'abonnement
        let subscription;

        if (existingSubscription) {
          // Gestion des upgrades/downgrades
          const isUpgrade = subscriptionService.isPlanUpgrade(
            existingSubscription.planType,
            planType
          );
          const isDowngrade = !isUpgrade && existingSubscription.planType !== planType;

          if (isUpgrade) {
            // Immédiatement upgrader
            subscription = await subscriptionService.upgradePlan(
              userId,
              existingSubscription.id,
              planType,
              {
                billingCycle,
                autoRenew,
                appliedDiscount,
              }
            );
          } else if (isDowngrade) {
            // Downgrade à la fin de la période en cours
            subscription = await subscriptionService.downgradePlan(
              userId,
              existingSubscription.id,
              planType,
              {
                billingCycle,
                autoRenew,
                appliedDiscount,
                effectiveImmediately: process.env.DEMO_MODE === 'true',
              }
            );
          } else {
            // Mise à jour du cycle de facturation uniquement
            subscription = await ctx.db.subscription.update({
              where: { id: existingSubscription.id },
              data: {
                billingCycle,
                autoRenew,
                discountPercent: appliedDiscount > 0 ? appliedDiscount : undefined,
              },
            });
          }
        } else {
          // Nouvel abonnement
          subscription = await subscriptionService.createSubscription(userId, planType, {
            billingCycle,
            autoRenew,
            appliedDiscount,
          });
        }

        // Si c'est un plan payant et en mode DEMO, générer une facture immédiatement
        if (process.env.DEMO_MODE === 'true' && planType !== 'FREE') {
          await subscriptionService.processRenewal(subscription.id);
        }

        return {
          success: true,
          subscription,
          message: existingSubscription
            ? `Abonnement mis à jour avec succès vers ${planDetails.name}`
            : `Abonnement ${planDetails.name} créé avec succès`,
          planDetails,
          isDemoMode: process.env.DEMO_MODE === 'true',
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || "Erreur lors de la création de l'abonnement",
          cause: error,
        });
      }
    }),

  /**
   * Annule un abonnement
   */
  cancelSubscription: protectedProcedure
    .input(
      z.object({
        reason: z.string().optional(),
        cancelImmediately: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const userId = ctx.session.user.id;
        const { reason, cancelImmediately } = input;

        // Récupérer l'abonnement actif
        const activeSubscription = await ctx.db.subscription.findFirst({
          where: {
            userId,
            status: 'ACTIVE',
          },
        });

        if (!activeSubscription) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Aucun abonnement actif trouvé',
          });
        }

        // Annuler l'abonnement
        const result = await subscriptionService.cancelSubscription(userId, activeSubscription.id, {
          reason,
          cancelImmediately,
        });

        return {
          success: true,
          message: cancelImmediately
            ? 'Abonnement annulé immédiatement'
            : `Abonnement programmé pour se terminer le ${format(new Date(activeSubscription.currentPeriodEnd || new Date()), 'PPP', { locale: fr })}`,
          subscription: result.subscription,
          effectiveEndDate: result.effectiveEndDate,
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || "Erreur lors de l'annulation de l'abonnement",
          cause: error,
        });
      }
    }),

  /**
   * Change les paramètres d'un abonnement
   */
  updateSubscriptionSettings: protectedProcedure
    .input(
      z.object({
        autoRenew: z.boolean().optional(),
        paymentMethodId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const userId = ctx.session.user.id;

        // Récupérer l'abonnement actif
        const activeSubscription = await ctx.db.subscription.findFirst({
          where: {
            userId,
            status: 'ACTIVE',
          },
        });

        if (!activeSubscription) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Aucun abonnement actif trouvé',
          });
        }

        // Construire les données à mettre à jour
        const updateData: any = {};

        if (input.autoRenew !== undefined) {
          updateData.autoRenew = input.autoRenew;
          updateData.cancelAtPeriodEnd = !input.autoRenew;
        }

        if (input.paymentMethodId) {
          // Vérifier que la méthode de paiement existe
          const paymentMethod = await ctx.db.paymentMethod.findUnique({
            where: {
              id: input.paymentMethodId,
              userId,
            },
          });

          if (!paymentMethod) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Méthode de paiement non trouvée',
            });
          }

          updateData.defaultPaymentMethodId = input.paymentMethodId;
        }

        // Mettre à jour l'abonnement
        const updatedSubscription = await ctx.db.subscription.update({
          where: { id: activeSubscription.id },
          data: updateData,
        });

        return {
          success: true,
          subscription: updatedSubscription,
          message: "Paramètres d'abonnement mis à jour avec succès",
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || "Erreur lors de la mise à jour des paramètres d'abonnement",
          cause: error,
        });
      }
    }),

  /**
   * Vérifie la validité d'un code promo
   */
  validateCouponCode: protectedProcedure
    .input(
      z.object({
        code: z.string(),
        planType: z.enum(['FREE', 'STARTER', 'PREMIUM', 'CUSTOM']),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const { code, planType } = input;

        // Vérifier la validité du code promo
        const result = await subscriptionService.applyCouponCode(code, planType);

        return result;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Erreur lors de la validation du code promo',
          cause: error,
        });
      }
    }),

  /**
   * Simule un renouvellement d'abonnement (uniquement en mode démo)
   */
  simulateRenewal: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      // Vérifier qu'on est en mode démo
      if (process.env.DEMO_MODE !== 'true') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cette fonctionnalité est uniquement disponible en mode démonstration',
        });
      }

      const userId = ctx.session.user.id;

      // Récupérer l'abonnement actif
      const activeSubscription = await ctx.db.subscription.findFirst({
        where: {
          userId,
          status: 'ACTIVE',
        },
      });

      if (!activeSubscription) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Aucun abonnement actif trouvé',
        });
      }

      // Traiter le renouvellement
      const result = await subscriptionService.processRenewal(activeSubscription.id);

      return {
        success: true,
        ...result,
        message: "Renouvellement d'abonnement simulé avec succès",
      };
    } catch (error: any) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message || 'Erreur lors de la simulation du renouvellement',
        cause: error,
      });
    }
  }),

  // ==== ADMIN PROCEDURES ====

  /**
   * Récupère tous les abonnements (admin uniquement)
   */
  getAllSubscriptions: adminProcedure
    .input(
      z.object({
        page: z.number().int().positive().default(1),
        limit: z.number().int().positive().max(100).default(10),
        status: z.enum(['ALL', 'ACTIVE', 'CANCELLED', 'EXPIRED', 'TRIALING']).optional(),
        planType: z.enum(['ALL', 'FREE', 'STARTER', 'PREMIUM', 'CUSTOM']).optional(),
        sortOrder: z.enum(['asc', 'desc']).default('desc'),
        userId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const { page, limit, status, planType, sortOrder, userId } = input;

        // Construire le filtre
        const where: any = {};

        if (status && status !== 'ALL') {
          where.status = status;
        }

        if (planType && planType !== 'ALL') {
          where.planType = planType;
        }

        if (userId) {
          where.userId = userId;
        }

        // Récupérer les abonnements
        const [subscriptions, total] = await Promise.all([
          ctx.db.subscription.findMany({
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
                orderBy: { issuedDate: 'desc' },
                take: 1,
              },
            },
          }),
          ctx.db.subscription.count({ where }),
        ]);

        // Calculer les statistiques
        const stats = await ctx.db.subscription.groupBy({
          by: ['planType', 'status'],
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
          isDemoMode: process.env.DEMO_MODE === 'true',
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Erreur lors de la récupération des abonnements',
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
        planType: z.enum(['FREE', 'STARTER', 'PREMIUM', 'CUSTOM']).optional(),
        status: z.enum(['ACTIVE', 'CANCELLED', 'EXPIRED']).optional(),
        autoRenew: z.boolean().optional(),
        discountPercent: z.number().min(0).max(100).optional(),
        currentPeriodEnd: z.date().optional(),
        billingCycle: z.enum(['MONTHLY', 'YEARLY']).optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const adminId = ctx.session.user.id;
        const { subscriptionId, ...updateData } = input;

        // Récupérer l'abonnement
        const subscription = await ctx.db.subscription.findUnique({
          where: { id: subscriptionId },
        });

        if (!subscription) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Abonnement non trouvé',
          });
        }

        // Préparer les données de mise à jour
        const dataToUpdate: any = { ...updateData };

        // Calculer la nouvelle date de fin si le type de plan change
        if (updateData.planType && updateData.planType !== subscription.planType) {
          // Obtenir les détails du nouveau plan
          const planDetails = await subscriptionService.getPlanDetails(updateData.planType);

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
            entityType: 'SUBSCRIPTION',
            entityId: subscriptionId,
            performedById: adminId,
            action: 'UPDATE_SUBSCRIPTION',
            changes: Object.entries(updateData).reduce(
              (acc, [key, value]) => {
                acc[key] = value instanceof Date ? value.toISOString() : String(value);
                return acc;
              },
              {} as Record<string, string>
            ),
          },
        });

        return {
          success: true,
          subscription: updatedSubscription,
          message: 'Abonnement mis à jour avec succès',
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || "Erreur lors de la mise à jour de l'abonnement",
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
        planType: z.enum(['FREE', 'STARTER', 'PREMIUM', 'CUSTOM']),
        billingCycle: z.enum(['MONTHLY', 'YEARLY']).default('MONTHLY'),
        autoRenew: z.boolean().default(true),
        discountPercent: z.number().min(0).max(100).optional(),
        startDate: z.date().default(() => new Date()),
        trialDays: z.number().int().min(0).default(0),
        notes: z.string().optional(),
        generateInvoice: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const adminId = ctx.session.user.id;
        const { userId, generateInvoice, ...subscriptionData } = input;

        // Vérifier que l'utilisateur existe
        const user = await ctx.db.user.findUnique({
          where: { id: userId },
        });

        if (!user) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Utilisateur non trouvé',
          });
        }

        // Vérifier si l'utilisateur a déjà un abonnement actif
        const existingSubscription = await ctx.db.subscription.findFirst({
          where: {
            userId,
            status: 'ACTIVE',
          },
        });

        if (existingSubscription) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
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
          }
        );

        // Générer une facture si demandé
        let invoice = null;
        if (generateInvoice && subscription.planType !== 'FREE') {
          const renewalResult = await subscriptionService.processRenewal(subscription.id);
          invoice = renewalResult.invoiceId;
        }

        // Enregistrer dans les logs d'audit
        await ctx.db.auditLog.create({
          data: {
            entityType: 'SUBSCRIPTION',
            entityId: subscription.id,
            performedById: adminId,
            action: 'CREATE_SUBSCRIPTION',
            changes: {
              userId,
              planType: subscriptionData.planType,
              billingCycle: subscriptionData.billingCycle,
              discountPercent: String(subscriptionData.discountPercent || 0),
              invoiceGenerated: generateInvoice ? 'true' : 'false',
            },
          },
        });

        return {
          success: true,
          subscription,
          invoice,
          message: 'Abonnement créé avec succès',
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || "Erreur lors de la création de l'abonnement",
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
        applicablePlans: z.array(z.enum(['STARTER', 'PREMIUM', 'CUSTOM'])).min(1),
        isActive: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const adminId = ctx.session.user.id;

        // Vérifier si le code existe déjà
        const existingCode = await ctx.db.couponCode.findUnique({
          where: { code: input.code },
        });

        if (existingCode) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Ce code promo existe déjà',
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
            entityType: 'COUPON_CODE',
            entityId: coupon.id,
            performedById: adminId,
            action: 'CREATE_COUPON',
            changes: {
              code: input.code,
              discountPercent: String(input.discountPercent),
              maxUses: String(input.maxUses),
              applicablePlans: input.applicablePlans.join(','),
            },
          },
        });

        return {
          success: true,
          coupon,
          message: 'Code promo créé avec succès',
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Erreur lors de la création du code promo',
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
        planType: z.enum(['FREE', 'STARTER', 'PREMIUM', 'CUSTOM']),
        name: z.string().min(2).max(50),
        description: z.string().min(10),
        priceMonthly: z.number().nonnegative(),
        priceYearly: z.number().nonnegative().optional(),
        features: z.array(z.string()).min(1),
        isActive: z.boolean().default(true),
        isPublic: z.boolean().default(true),
        trialDays: z.number().int().min(0).default(0),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const adminId = ctx.session.user.id;

        // Mettre à jour ou créer le plan
        const plan = await ctx.db.subscriptionPlan.upsert({
          where: { type: input.planType },
          update: {
            name: input.name,
            description: input.description,
            priceMonthly: new Decimal(input.priceMonthly),
            priceYearly: input.priceYearly ? new Decimal(input.priceYearly) : null,
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
            priceYearly: input.priceYearly ? new Decimal(input.priceYearly) : null,
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
            entityType: 'SUBSCRIPTION_PLAN',
            entityId: plan.id,
            performedById: adminId,
            action: 'UPDATE_PLAN',
            changes: {
              planType: input.planType,
              name: input.name,
              priceMonthly: String(input.priceMonthly),
              priceYearly: input.priceYearly ? String(input.priceYearly) : 'null',
              isActive: String(input.isActive),
            },
          },
        });

        return {
          success: true,
          plan,
          message: 'Plan mis à jour avec succès',
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Erreur lors de la mise à jour du plan',
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
        period: z.enum(['day', 'week', 'month']).default('month'),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const { period, startDate, endDate } = input;

        // Filtrage par date
        const dateFilter: any = {};
        if (startDate) dateFilter.gte = startDate;
        if (endDate) dateFilter.lte = endDate;

        // Statistiques par plan
        const planStats = await ctx.db.subscription.groupBy({
          by: ['planType'],
          _count: true,
          where: startDate || endDate ? { createdAt: dateFilter } : undefined,
        });

        // Statistiques sur la valeur des abonnements
        const valueStats = await ctx.db.subscription.groupBy({
          by: ['planType'],
          _sum: {
            planPrice: true,
          },
          where: {
            status: 'ACTIVE',
            ...(startDate || endDate ? { createdAt: dateFilter } : {}),
          },
        });

        // Conversion en MRR (Monthly Recurring Revenue)
        const mrrByPlan = valueStats.reduce((acc: Record<string, number>, stat) => {
          const planType = stat.planType;
          const mrr = stat._sum.planPrice ? parseFloat(stat._sum.planPrice.toString()) : 0;
          acc[planType] = mrr;
          return acc;
        }, {});

        // Calculer le MRR total
        const totalMRR = Object.values(mrrByPlan).reduce((sum, mrr) => sum + mrr, 0);

        // Statistiques de conversion
        const conversionStats = {
          totalSignups: await ctx.db.subscription.count(),
          paidSubscriptions: await ctx.db.subscription.count({
            where: {
              status: 'ACTIVE',
              planType: {
                not: 'FREE',
              },
            },
          }),
          freeTrialUsers: await ctx.db.subscription.count({
            where: {
              status: 'TRIALING',
            },
          }),
        };

        // Calculer le taux de conversion
        const conversionRate =
          conversionStats.totalSignups > 0
            ? (conversionStats.paidSubscriptions / conversionStats.totalSignups) * 100
            : 0;

        return {
          planDistribution: planStats.map(stat => ({
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
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Erreur lors de la récupération des statistiques',
          cause: error,
        });
      }
    }),
});

export default subscriptionRouter;
