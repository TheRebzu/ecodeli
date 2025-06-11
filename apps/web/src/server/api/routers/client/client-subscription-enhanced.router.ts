import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from '@/server/api/trpc';
import { TRPCError } from "@trpc/server";
import { ClientSubscriptionPlan } from "@prisma/client";

/**
 * Router amélioré pour les abonnements clients selon le cahier des charges
 * Gère les 3 formules: FREE, STARTER (9,90€), PREMIUM (19,99€)
 */

// Schémas de validation
const subscriptionPlanSchema = z.object({
  plan: z.nativeEnum(ClientSubscriptionPlan),
  billingCycle: z.enum(['MONTHLY', 'YEARLY']).default('MONTHLY'),
  autoRenew: z.boolean().default(true),
  promotionCode: z.string().optional()
});

const usageFiltersSchema = z.object({
  month: z.number().min(1).max(12).optional(),
  year: z.number().min(2020).max(2030).optional(),
  limit: z.number().min(1).max(12).default(6)
});

export const clientSubscriptionEnhancedRouter = router({
  /**
   * Récupérer les détails de l'abonnement du client connecté
   */
  getMySubscription: protectedProcedure
    .query(async ({ ctx }) => {
      const { user } = ctx.session;
      
      if (user.role !== 'CLIENT') {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Seuls les clients peuvent accéder à leurs abonnements"
        });
      }

      try {
        let subscription = await ctx.db.clientSubscriptionDetail.findUnique({
          where: { userId: user.id },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            payments: {
              orderBy: { createdAt: 'desc' },
              take: 5,
              include: {
                promotion: true
              }
            },
            usageHistory: {
              orderBy: { month: 'desc' },
              take: 6
            }
          }
        });

        // Si pas d'abonnement, créer automatiquement le plan FREE
        if (!subscription) {
          subscription = await ctx.db.clientSubscriptionDetail.create({
            data: {
              userId: user.id,
              currentPlan: 'FREE',
              monthlyPrice: 0,
              insuranceAmount: null,
              discountPercentage: 0,
              freePriorityPerMonth: 0,
              isActive: true,
              startDate: new Date(),
              billingCycle: 'MONTHLY',
              autoRenew: false
            },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              },
              payments: true,
              usageHistory: true
            }
          });
        }

        // Calculer l'utilisation du mois en cours
        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();
        
        const currentUsage = await ctx.db.monthlyUsageHistory.findFirst({
          where: {
            subscriptionId: subscription.id,
            month: currentMonth,
            year: currentYear
          }
        });

        // Obtenir les avantages selon le plan
        const planBenefits = getPlanBenefits(subscription.currentPlan);

        return {
          subscription,
          currentUsage: currentUsage || {
            deliveriesCount: 0,
            priorityDeliveriesUsed: 0,
            totalSpent: 0,
            discountSaved: 0
          },
          planBenefits,
          availablePlans: getAllPlans()
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération de l'abonnement"
        });
      }
    }),

  /**
   * Changer de plan d'abonnement
   */
  changePlan: protectedProcedure
    .input(subscriptionPlanSchema)
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx.session;
      
      if (user.role !== 'CLIENT') {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Seuls les clients peuvent modifier leur abonnement"
        });
      }

      try {
        // Récupérer l'abonnement existant
        let subscription = await ctx.db.clientSubscriptionDetail.findUnique({
          where: { userId: user.id }
        });

        if (!subscription) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Aucun abonnement trouvé"
          });
        }

        // Validation: pas de downgrade depuis PREMIUM vers FREE
        if (subscription.currentPlan === 'PREMIUM' && input.plan === 'FREE') {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Impossible de passer directement de Premium à Gratuit. Passez d'abord par Starter."
          });
        }

        // Calculer les nouveaux paramètres selon le plan
        const planConfig = getPlanConfig(input.plan, input.billingCycle);
        
        // Vérifier le code promo si fourni
        let promotion = null;
        let finalPrice = planConfig.monthlyPrice;
        
        if (input.promotionCode) {
          promotion = await ctx.db.subscriptionPromotion.findFirst({
            where: {
              code: input.promotionCode,
              isActive: true,
              applicablePlans: { has: input.plan },
              validUntil: { gte: new Date() }
            }
          });

          if (promotion) {
            finalPrice = planConfig.monthlyPrice * (1 - promotion.discountPercentage / 100);
          }
        }

        // Mettre à jour l'abonnement
        const updatedSubscription = await ctx.db.clientSubscriptionDetail.update({
          where: { userId: user.id },
          data: {
            currentPlan: input.plan,
            monthlyPrice: finalPrice,
            insuranceAmount: planConfig.insuranceAmount,
            discountPercentage: planConfig.discountPercentage,
            freePriorityPerMonth: planConfig.freePriorityPerMonth,
            billingCycle: input.billingCycle,
            autoRenew: input.autoRenew,
            nextBillingDate: calculateNextBillingDate(input.billingCycle),
            planChangedAt: new Date(),
            previousPlan: subscription.currentPlan
          }
        });

        // Créer un paiement si plan payant
        if (input.plan !== 'FREE' && finalPrice > 0) {
          await ctx.db.subscriptionPayment.create({
            data: {
              subscriptionId: subscription.id,
              amount: finalPrice,
              billingCycle: input.billingCycle,
              status: 'PENDING',
              dueDate: calculateNextBillingDate(input.billingCycle),
              promotionId: promotion?.id
            }
          });
        }

        // Réinitialiser l'utilisation prioritaire si changement de plan
        if (subscription.currentPlan !== input.plan) {
          const currentMonth = new Date().getMonth() + 1;
          const currentYear = new Date().getFullYear();
          
          await ctx.db.monthlyUsageHistory.upsert({
            where: {
              subscriptionId_month_year: {
                subscriptionId: subscription.id,
                month: currentMonth,
                year: currentYear
              }
            },
            update: {
              priorityDeliveriesUsed: 0 // Reset pour le nouveau plan
            },
            create: {
              subscriptionId: subscription.id,
              month: currentMonth,
              year: currentYear,
              deliveriesCount: 0,
              priorityDeliveriesUsed: 0,
              totalSpent: 0,
              discountSaved: 0
            }
          });
        }

        return {
          success: true,
          subscription: updatedSubscription,
          message: `Abonnement mis à jour vers ${input.plan}`,
          planBenefits: getPlanBenefits(input.plan)
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors du changement de plan"
        });
      }
    }),

  /**
   * Annuler l'abonnement
   */
  cancelSubscription: protectedProcedure
    .input(z.object({
      reason: z.string().optional(),
      effectiveImmediately: z.boolean().default(false)
    }))
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx.session;
      
      if (user.role !== 'CLIENT') {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Seuls les clients peuvent annuler leur abonnement"
        });
      }

      try {
        const subscription = await ctx.db.clientSubscriptionDetail.findUnique({
          where: { userId: user.id }
        });

        if (!subscription) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Aucun abonnement à annuler"
          });
        }

        if (subscription.currentPlan === 'FREE') {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Impossible d'annuler un abonnement gratuit"
          });
        }

        const endDate = input.effectiveImmediately ? new Date() : subscription.nextBillingDate;

        await ctx.db.clientSubscriptionDetail.update({
          where: { userId: user.id },
          data: {
            isActive: input.effectiveImmediately ? false : true,
            autoRenew: false,
            cancelledAt: new Date(),
            cancellationReason: input.reason,
            endDate: endDate,
            // Si annulation immédiate, revenir au plan FREE
            ...(input.effectiveImmediately && {
              currentPlan: 'FREE',
              monthlyPrice: 0,
              insuranceAmount: null,
              discountPercentage: 0,
              freePriorityPerMonth: 0,
              isActive: true
            })
          }
        });

        return {
          success: true,
          message: input.effectiveImmediately 
            ? "Abonnement annulé immédiatement"
            : `Abonnement programmé pour se terminer le ${endDate?.toLocaleDateString()}`
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de l'annulation"
        });
      }
    }),

  /**
   * Récupérer l'historique d'utilisation
   */
  getUsageHistory: protectedProcedure
    .input(usageFiltersSchema)
    .query(async ({ ctx, input }) => {
      const { user } = ctx.session;
      
      if (user.role !== 'CLIENT') {
        throw new TRPCError({
          code: "FORBIDDEN", 
          message: "Seuls les clients peuvent consulter leur historique"
        });
      }

      try {
        const subscription = await ctx.db.clientSubscriptionDetail.findUnique({
          where: { userId: user.id }
        });

        if (!subscription) {
          return { usage: [] };
        }

        const whereClause: any = { subscriptionId: subscription.id };
        
        if (input.month) whereClause.month = input.month;
        if (input.year) whereClause.year = input.year;

        const usage = await ctx.db.monthlyUsageHistory.findMany({
          where: whereClause,
          orderBy: [{ year: 'desc' }, { month: 'desc' }],
          take: input.limit
        });

        return { usage };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération de l'historique"
        });
      }
    }),

  /**
   * Utiliser une livraison prioritaire
   */
  usePriorityDelivery: protectedProcedure
    .input(z.object({
      announcementId: z.string().cuid()
    }))
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx.session;
      
      if (user.role !== 'CLIENT') {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Seuls les clients peuvent utiliser des livraisons prioritaires"
        });
      }

      try {
        const subscription = await ctx.db.clientSubscriptionDetail.findUnique({
          where: { userId: user.id }
        });

        if (!subscription) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Aucun abonnement trouvé"
          });
        }

        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();

        // Récupérer ou créer l'utilisation du mois
        let usage = await ctx.db.monthlyUsageHistory.findFirst({
          where: {
            subscriptionId: subscription.id,
            month: currentMonth,
            year: currentYear
          }
        });

        if (!usage) {
          usage = await ctx.db.monthlyUsageHistory.create({
            data: {
              subscriptionId: subscription.id,
              month: currentMonth,
              year: currentYear,
              deliveriesCount: 0,
              priorityDeliveriesUsed: 0,
              totalSpent: 0,
              discountSaved: 0
            }
          });
        }

        // Vérifier les limites selon le plan
        const canUsePriority = checkPriorityAvailability(
          subscription.currentPlan, 
          usage.priorityDeliveriesUsed,
          subscription.freePriorityPerMonth
        );

        if (!canUsePriority) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Limite de livraisons prioritaires atteinte pour ce mois"
          });
        }

        // Mettre à jour l'utilisation
        await ctx.db.monthlyUsageHistory.update({
          where: { id: usage.id },
          data: {
            priorityDeliveriesUsed: usage.priorityDeliveriesUsed + 1
          }
        });

        return {
          success: true,
          remainingPriority: subscription.freePriorityPerMonth - (usage.priorityDeliveriesUsed + 1)
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de l'utilisation de la livraison prioritaire"
        });
      }
    }),

  /**
   * Vérifier la validité d'un code promo
   */
  validatePromoCode: protectedProcedure
    .input(z.object({
      code: z.string(),
      targetPlan: z.nativeEnum(ClientSubscriptionPlan)
    }))
    .query(async ({ ctx, input }) => {
      try {
        const promotion = await ctx.db.subscriptionPromotion.findFirst({
          where: {
            code: input.code,
            isActive: true,
            applicablePlans: { has: input.targetPlan },
            validUntil: { gte: new Date() },
            OR: [
              { maxUses: null },
              { usedCount: { lt: ctx.db.subscriptionPromotion.fields.maxUses } }
            ]
          }
        });

        if (!promotion) {
          return {
            valid: false,
            message: "Code promo invalide ou expiré"
          };
        }

        return {
          valid: true,
          promotion: {
            code: promotion.code,
            description: promotion.description,
            discountPercentage: promotion.discountPercentage,
            validUntil: promotion.validUntil
          }
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la validation du code promo"
        });
      }
    }),

  /**
   * Obtenir les plans disponibles avec tarification
   */
  getAvailablePlans: protectedProcedure
    .query(async ({ ctx }) => {
      return {
        plans: getAllPlans(),
        benefits: {
          FREE: getPlanBenefits('FREE'),
          STARTER: getPlanBenefits('STARTER'),
          PREMIUM: getPlanBenefits('PREMIUM')
        }
      };
    })
});

// Helper functions
function getPlanConfig(plan: ClientSubscriptionPlan, billingCycle: 'MONTHLY' | 'YEARLY') {
  const configs = {
    FREE: {
      monthlyPrice: 0,
      insuranceAmount: null,
      discountPercentage: 0,
      freePriorityPerMonth: 0
    },
    STARTER: {
      monthlyPrice: billingCycle === 'YEARLY' ? 8.50 : 9.90, // -15% annuel
      insuranceAmount: 115,
      discountPercentage: 5,
      freePriorityPerMonth: 1 // 1 prioritaire gratuit par mois
    },
    PREMIUM: {
      monthlyPrice: billingCycle === 'YEARLY' ? 16.99 : 19.99, // -15% annuel
      insuranceAmount: 3000,
      discountPercentage: 9,
      freePriorityPerMonth: 3 // 3 prioritaires gratuits par mois
    }
  };

  return configs[plan];
}

function getPlanBenefits(plan: ClientSubscriptionPlan) {
  const benefits = {
    FREE: [
      "Pas d'assurance",
      "Pas de réduction",
      "Pas de livraison prioritaire"
    ],
    STARTER: [
      "Assurance jusqu'à 115€",
      "5% de réduction sur toutes les livraisons", 
      "Livraisons prioritaires +15% de rapidité",
      "1 livraison prioritaire gratuite par mois"
    ],
    PREMIUM: [
      "Assurance jusqu'à 3000€",
      "9% de réduction sur toutes les livraisons",
      "1er envoi du mois offert",
      "3 livraisons prioritaires gratuites par mois",
      "Support client prioritaire"
    ]
  };

  return benefits[plan];
}

function getAllPlans() {
  return [
    {
      id: 'FREE',
      name: 'Gratuit',
      monthlyPrice: 0,
      yearlyPrice: 0,
      popular: false
    },
    {
      id: 'STARTER', 
      name: 'Starter',
      monthlyPrice: 9.90,
      yearlyPrice: 102, // 8.50 * 12
      popular: true
    },
    {
      id: 'PREMIUM',
      name: 'Premium',
      monthlyPrice: 19.99,
      yearlyPrice: 203.88, // 16.99 * 12
      popular: false
    }
  ];
}

function calculateNextBillingDate(billingCycle: 'MONTHLY' | 'YEARLY') {
  const now = new Date();
  if (billingCycle === 'YEARLY') {
    return new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
  }
  return new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

function checkPriorityAvailability(
  plan: ClientSubscriptionPlan, 
  usedThisMonth: number, 
  freePerMonth: number
): boolean {
  if (plan === 'FREE') return false;
  return usedThisMonth < freePerMonth;
}