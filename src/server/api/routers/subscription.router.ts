import { router, protectedProcedure, adminProcedure } from '@/server/api/trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { SubscriptionService, SUBSCRIPTION_PLANS } from '@/server/services/subscription.service';
import { PlanType } from '@prisma/client';

/**
 * Routeur tRPC pour la gestion des abonnements
 */
export const subscriptionRouter = router({
  /**
   * Récupère les plans d'abonnement disponibles
   */
  getAvailablePlans: protectedProcedure
    .query(async () => {
      try {
        return SUBSCRIPTION_PLANS;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Erreur lors de la récupération des plans',
          cause: error
        });
      }
    }),

  /**
   * Récupère l'abonnement actif de l'utilisateur
   */
  getCurrentSubscription: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        const userId = ctx.session.user.id;
        const subscription = await SubscriptionService.getCurrentSubscription(userId);
        
        // Récupérer les détails du plan
        const planDetails = SubscriptionService.getPlanDetails(subscription.planType);
        
        return {
          subscription,
          planDetails
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Erreur lors de la récupération de l\'abonnement',
          cause: error
        });
      }
    }),

  /**
   * Souscrit à un nouvel abonnement
   */
  subscribeToPlan: protectedProcedure
    .input(z.object({
      planType: z.nativeEnum(PlanType),
      paymentMethodId: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const userId = ctx.session.user.id;
        
        // Si le plan est FREE, pas besoin de paiement
        if (input.planType === 'FREE') {
          const subscription = await SubscriptionService.createFreeSubscription(userId);
          return {
            success: true,
            subscription
          };
        }
        
        // Créer l'abonnement avec paiement
        const subscription = await SubscriptionService.subscribeToNewPlan(
          userId,
          input.planType,
          input.paymentMethodId
        );
        
        return {
          success: true,
          subscription
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Erreur lors de la souscription au plan',
          cause: error
        });
      }
    }),

  /**
   * Annule un abonnement
   */
  cancelSubscription: protectedProcedure
    .input(z.object({
      subscriptionId: z.string(),
      cancelImmediately: z.boolean().optional().default(false)
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Vérifier que l'utilisateur est bien le propriétaire de l'abonnement
        const subscription = await ctx.db.subscription.findUnique({
          where: { id: input.subscriptionId },
          select: { userId: true }
        });
        
        if (!subscription) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Abonnement non trouvé'
          });
        }
        
        if (subscription.userId !== ctx.session.user.id) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Vous n\'êtes pas autorisé à annuler cet abonnement'
          });
        }
        
        // Annuler l'abonnement
        const result = await SubscriptionService.cancelSubscription(
          input.subscriptionId,
          input.cancelImmediately
        );
        
        return {
          success: true,
          ...result
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Erreur lors de l\'annulation de l\'abonnement',
          cause: error
        });
      }
    }),

  /**
   * Change le plan d'abonnement
   */
  changePlan: protectedProcedure
    .input(z.object({
      subscriptionId: z.string(),
      newPlanType: z.nativeEnum(PlanType),
      paymentMethodId: z.string().optional() // Requis uniquement pour un upgrade
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Vérifier que l'utilisateur est bien le propriétaire de l'abonnement
        const subscription = await ctx.db.subscription.findUnique({
          where: { id: input.subscriptionId },
          select: { userId: true, planType: true }
        });
        
        if (!subscription) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Abonnement non trouvé'
          });
        }
        
        if (subscription.userId !== ctx.session.user.id) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Vous n\'êtes pas autorisé à modifier cet abonnement'
          });
        }
        
        // Si on passe à un plan supérieur (plus cher), il faut un moyen de paiement
        const currentPlanDetails = SubscriptionService.getPlanDetails(subscription.planType);
        const newPlanDetails = SubscriptionService.getPlanDetails(input.newPlanType);
        
        const isUpgrade = newPlanDetails.price > currentPlanDetails.price;
        
        if (isUpgrade && !input.paymentMethodId) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Un moyen de paiement est requis pour passer à un plan supérieur'
          });
        }
        
        // Changer le plan
        const result = await SubscriptionService.changePlan(
          input.subscriptionId,
          input.newPlanType,
          input.paymentMethodId
        );
        
        return {
          success: true,
          subscription: result
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Erreur lors du changement de plan',
          cause: error
        });
      }
    }),

  /**
   * Met à jour le moyen de paiement d'un abonnement
   */
  updatePaymentMethod: protectedProcedure
    .input(z.object({
      subscriptionId: z.string(),
      paymentMethodId: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Vérifier que l'utilisateur est bien le propriétaire de l'abonnement
        const subscription = await ctx.db.subscription.findUnique({
          where: { id: input.subscriptionId },
          select: { userId: true }
        });
        
        if (!subscription) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Abonnement non trouvé'
          });
        }
        
        if (subscription.userId !== ctx.session.user.id) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Vous n\'êtes pas autorisé à modifier cet abonnement'
          });
        }
        
        // Mettre à jour le moyen de paiement
        const result = await SubscriptionService.updatePaymentMethod(
          input.subscriptionId,
          input.paymentMethodId
        );
        
        return {
          success: true,
          subscription: result
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Erreur lors de la mise à jour du moyen de paiement',
          cause: error
        });
      }
    }),

  /**
   * Récupère l'historique des abonnements d'un utilisateur
   */
  getSubscriptionHistory: protectedProcedure
    .input(z.object({
      page: z.number().int().min(1).optional().default(1),
      limit: z.number().int().min(1).max(100).optional().default(10)
    }))
    .query(async ({ ctx, input }) => {
      try {
        const userId = ctx.session.user.id;
        
        // Récupérer tous les abonnements de l'utilisateur avec pagination
        const subscriptions = await ctx.db.subscription.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          skip: (input.page - 1) * input.limit,
          take: input.limit,
          include: {
            payments: {
              select: {
                id: true,
                amount: true,
                status: true,
                createdAt: true
              }
            }
          }
        });
        
        const total = await ctx.db.subscription.count({ where: { userId } });
        
        return {
          subscriptions,
          pagination: {
            total,
            page: input.page,
            limit: input.limit,
            totalPages: Math.ceil(total / input.limit)
          }
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Erreur lors de la récupération de l\'historique des abonnements',
          cause: error
        });
      }
    }),

  /**
   * Récupère les fonctionnalités associées à un plan d'abonnement
   */
  getPlanFeatures: protectedProcedure
    .input(z.object({
      planType: z.nativeEnum(PlanType)
    }))
    .query(async ({ input }) => {
      try {
        const planDetails = SubscriptionService.getPlanDetails(input.planType);
        
        // Récupérer les détails complets des avantages du plan
        return {
          name: planDetails.name,
          description: `Plan ${planDetails.name}`,
          price: planDetails.price,
          features: planDetails.features,
          discountPercent: planDetails.discountPercent,
          insuranceAmount: planDetails.insuranceAmount,
          isPriority: planDetails.isPriority,
          advantages: {
            discount: {
              percent: planDetails.discountPercent,
              description: `Réduction de ${planDetails.discountPercent}% sur les livraisons`
            },
            insurance: {
              amount: planDetails.insuranceAmount,
              description: `Assurance jusqu'à ${planDetails.insuranceAmount}€ par envoi`
            },
            priority: {
              enabled: planDetails.isPriority,
              description: planDetails.isPriority ? 'Traitement prioritaire des demandes' : null
            },
            support: {
              level: planDetails.isPriority ? 'VIP' : (planDetails.price > 0 ? 'Premium' : 'Standard'),
              description: planDetails.isPriority 
                ? 'Support client VIP prioritaire' 
                : (planDetails.price > 0 ? 'Support client premium' : 'Support client standard')
            }
          }
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Erreur lors de la récupération des fonctionnalités du plan',
          cause: error
        });
      }
    }),

  /**
   * Vérifie l'éligibilité d'un utilisateur à un plan spécifique
   */
  checkPlanEligibility: protectedProcedure
    .input(z.object({
      planType: z.nativeEnum(PlanType)
    }))
    .query(async ({ ctx, input }) => {
      try {
        const userId = ctx.session.user.id;
        
        // Récupérer l'abonnement actuel de l'utilisateur
        const currentSubscription = await SubscriptionService.getCurrentSubscription(userId);
        
        // Tous les utilisateurs sont éligibles au plan FREE
        if (input.planType === 'FREE') {
          return { eligible: true, reason: null };
        }
        
        // Vérifier les restrictions spécifiques pour les autres plans
        // Pour cet exemple, on suppose que tout le monde est éligible aux plans payants
        
        return {
          eligible: true,
          currentPlan: currentSubscription.planType,
          newPlan: input.planType,
          priceDifference: SUBSCRIPTION_PLANS[input.planType].price - SUBSCRIPTION_PLANS[currentSubscription.planType].price,
          upgradeAvailable: true
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Erreur lors de la vérification de l\'éligibilité',
          cause: error
        });
      }
    }),

  // ENDPOINTS ADMINISTRATEUR

  /**
   * Récupère tous les abonnements actifs (admin)
   */
  getAllSubscriptions: adminProcedure
    .input(z.object({
      page: z.number().int().min(1).optional().default(1),
      limit: z.number().int().min(1).max(100).optional().default(20),
      status: z.string().optional(),
      planType: z.nativeEnum(PlanType).optional(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
      userId: z.string().optional()
    }))
    .query(async ({ ctx, input }) => {
      try {
        // Construire les filtres
        const where: any = {};
        
        if (input.status) {
          where.status = input.status;
        }
        
        if (input.planType) {
          where.planType = input.planType;
        }
        
        if (input.userId) {
          where.userId = input.userId;
        }
        
        if (input.startDate && input.endDate) {
          where.createdAt = {
            gte: input.startDate,
            lte: input.endDate
          };
        }
        
        // Récupérer les abonnements avec pagination
        const [subscriptions, total] = await Promise.all([
          ctx.db.subscription.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip: (input.page - 1) * input.limit,
            take: input.limit,
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              },
              payments: {
                take: 1,
                orderBy: { createdAt: 'desc' }
              }
            }
          }),
          ctx.db.subscription.count({ where })
        ]);
        
        return {
          subscriptions,
          pagination: {
            total,
            page: input.page,
            limit: input.limit,
            totalPages: Math.ceil(total / input.limit)
          }
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Erreur lors de la récupération des abonnements',
          cause: error
        });
      }
    }),

  /**
   * Met fin à un abonnement (admin)
   */
  terminateSubscription: adminProcedure
    .input(z.object({
      subscriptionId: z.string(),
      reason: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Vérifier que l'abonnement existe
        const subscription = await ctx.db.subscription.findUnique({
          where: { id: input.subscriptionId }
        });
        
        if (!subscription) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Abonnement non trouvé'
          });
        }
        
        // Mettre fin à l'abonnement (immédiatement)
        const result = await SubscriptionService.cancelSubscription(
          input.subscriptionId,
          true // cancelImmediately
        );
        
        // Ajouter une note dans l'audit log
        await ctx.db.auditLog.create({
          data: {
            action: 'SUBSCRIPTION_TERMINATED',
            performerId: ctx.session.user.id,
            details: {
              subscriptionId: input.subscriptionId,
              userId: subscription.userId,
              reason: input.reason || 'Terminaison administrative'
            },
            ipAddress: '127.0.0.1', // Normalement à récupérer de la requête
            userAgent: 'Admin Dashboard' // Normalement à récupérer de la requête
          }
        });
        
        return {
          success: true,
          subscription: result
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Erreur lors de la terminaison de l\'abonnement',
          cause: error
        });
      }
    }),

  /**
   * Génère des statistiques sur les abonnements (admin)
   */
  getSubscriptionStats: adminProcedure
    .input(z.object({
      period: z.enum(['DAY', 'WEEK', 'MONTH', 'YEAR']).optional().default('MONTH')
    }))
    .query(async ({ ctx, input }) => {
      try {
        // Calculer la date de début en fonction de la période
        const now = new Date();
        let startDate: Date;
        
        switch (input.period) {
          case 'DAY':
            startDate = new Date(now.setDate(now.getDate() - 30)); // 30 derniers jours
            break;
          case 'WEEK':
            startDate = new Date(now.setDate(now.getDate() - 12 * 7)); // 12 dernières semaines
            break;
          case 'MONTH':
            startDate = new Date(now.setMonth(now.getMonth() - 12)); // 12 derniers mois
            break;
          case 'YEAR':
            startDate = new Date(now.setFullYear(now.getFullYear() - 3)); // 3 dernières années
            break;
          default:
            startDate = new Date(now.setMonth(now.getMonth() - 12)); // 12 derniers mois par défaut
        }
        
        // Statistiques sur les plans
        const planStats = await ctx.db.subscription.groupBy({
          by: ['planType'],
          where: {
            status: 'ACTIVE'
          },
          _count: true
        });
        
        // Statistiques sur les statuts
        const statusStats = await ctx.db.subscription.groupBy({
          by: ['status'],
          _count: true
        });
        
        // Nombre total d'abonnements actifs
        const totalActive = await ctx.db.subscription.count({
          where: { status: 'ACTIVE' }
        });
        
        // Revenus mensuels récurrents (MRR)
        const subscriptions = await ctx.db.subscription.findMany({
          where: { status: 'ACTIVE' },
          select: {
            planType: true,
            planPrice: true
          }
        });
        
        const mrr = subscriptions.reduce((total, sub) => {
          // Si le prix du plan est enregistré, utiliser cette valeur
          if (sub.planPrice) {
            return total + Number(sub.planPrice);
          }
          
          // Sinon, utiliser le prix par défaut du plan
          return total + SUBSCRIPTION_PLANS[sub.planType].price;
        }, 0);
        
        // Taux de rétention
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        
        const activeLastMonth = await ctx.db.subscription.count({
          where: {
            createdAt: { lt: oneMonthAgo },
            status: { in: ['ACTIVE', 'PAUSED', 'PAST_DUE'] }
          }
        });
        
        const stillActiveNow = await ctx.db.subscription.count({
          where: {
            createdAt: { lt: oneMonthAgo },
            status: { in: ['ACTIVE', 'PAUSED', 'PAST_DUE'] }
          }
        });
        
        const retentionRate = activeLastMonth > 0 ? (stillActiveNow / activeLastMonth) * 100 : 0;
        
        // Récupérer les nouvelles souscriptions par période
        let timeGrouping: { [key: string]: any } = {};
        
        if (input.period === 'DAY') {
          // Regrouper par jour
          const dailySignups = await ctx.db.$queryRaw`
            SELECT 
              DATE(created_at) as date, 
              COUNT(*) as count 
            FROM subscriptions 
            WHERE created_at >= ${startDate} 
            GROUP BY DATE(created_at) 
            ORDER BY date
          `;
          timeGrouping = dailySignups;
        } else if (input.period === 'WEEK') {
          // Regrouper par semaine
          const weeklySignups = await ctx.db.$queryRaw`
            SELECT 
              CONCAT(YEAR(created_at), '-', WEEK(created_at)) as week, 
              COUNT(*) as count 
            FROM subscriptions 
            WHERE created_at >= ${startDate} 
            GROUP BY YEAR(created_at), WEEK(created_at) 
            ORDER BY week
          `;
          timeGrouping = weeklySignups;
        } else if (input.period === 'MONTH') {
          // Regrouper par mois
          const monthlySignups = await ctx.db.$queryRaw`
            SELECT 
              CONCAT(YEAR(created_at), '-', MONTH(created_at)) as month, 
              COUNT(*) as count 
            FROM subscriptions 
            WHERE created_at >= ${startDate} 
            GROUP BY YEAR(created_at), MONTH(created_at) 
            ORDER BY month
          `;
          timeGrouping = monthlySignups;
        } else {
          // Regrouper par année
          const yearlySignups = await ctx.db.$queryRaw`
            SELECT 
              YEAR(created_at) as year, 
              COUNT(*) as count 
            FROM subscriptions 
            WHERE created_at >= ${startDate} 
            GROUP BY YEAR(created_at) 
            ORDER BY year
          `;
          timeGrouping = yearlySignups;
        }
        
        return {
          totalActive,
          mrr,
          retentionRate,
          byPlan: planStats,
          byStatus: statusStats,
          byTime: timeGrouping
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Erreur lors de la génération des statistiques',
          cause: error
        });
      }
    })
});

export default subscriptionRouter;