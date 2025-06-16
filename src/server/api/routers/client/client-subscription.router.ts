import { router, protectedProcedure } from "@/server/api/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

/**
 * Router tRPC pour la gestion des abonnements clients EcoDeli
 * Système 3-tier: FREE/STARTER(9.90€)/PREMIUM(19.99€) selon le cahier des charges
 */

type SubscriptionPlan = "FREE" | "STARTER" | "PREMIUM";

interface PlanLimits {
  maxInsurance: number;
  freeDeliveries: number;
  priorityDiscount: number;
  generalDiscount: number;
}

export const subscriptionRouter = router({ /**
   * Récupère l'abonnement actuel de l'utilisateur
   */
  getCurrentSubscription: protectedProcedure.query(async ({ ctx  }) => {
    try {
      const { user } = ctx.session;

      if (!user) {
        throw new TRPCError({ code: "UNAUTHORIZED",
          message: "Utilisateur non authentifié",
         });
      }

      // Pour l'instant, simuler un abonnement par défaut
      // TODO: Récupérer depuis la base de données
      return {
        plan: "FREE" as SubscriptionPlan,
        status: "ACTIVE",
        startDate: new Date(),
        limits: getPlanLimits("FREE"),
      };
    } catch (error: any) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors de la récupération de l'abonnement",
        cause: error,
       });
    }
  }),

  /**
   * Récupère l'utilisation mensuelle
   */
  getMonthlyUsage: protectedProcedure.query(async ({ ctx  }) => {
    try {
      const { user } = ctx.session;

      if (!user) {
        throw new TRPCError({ code: "UNAUTHORIZED",
          message: "Utilisateur non authentifié",
         });
      }

      // Pour l'instant, simuler des données d'usage
      // TODO: Récupérer depuis la base de données
      return {
        deliveries: 3,
        priorityDeliveries: 1,
        insuranceClaims: 0,
      };
    } catch (error: any) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors de la récupération de l'utilisation",
        cause: error,
       });
    }
  }),

  /**
   * Change le plan d'abonnement
   */
  changePlan: protectedProcedure
    .input(
      z.object({ plan: z.enum(["FREE", "STARTER", "PREMIUM"]),
       })
    )
    .mutation(async ({ ctx, input  }) => {
      try {
        const { user } = ctx.session;

        if (!user) {
          throw new TRPCError({ code: "UNAUTHORIZED",
            message: "Utilisateur non authentifié",
           });
        }

        const { plan } = input;

        // Pour l'instant, simuler le changement de plan
        // TODO: Implémenter la logique de changement avec Stripe
        console.log(`Changement de plan pour l'utilisateur ${user.id} vers ${plan}`);

        return {
          success: true,
          plan,
          message: `Abonnement changé vers ${plan} avec succès`,
        };
      } catch (error: any) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors du changement d'abonnement",
          cause: error,
         });
      }
    }),

  /**
   * Récupère les plans disponibles
   */
  getAvailablePlans: protectedProcedure.query(async ({ ctx  }) => {
    try {
      const { user } = ctx.session;

      if (!user) {
        throw new TRPCError({ code: "UNAUTHORIZED",
          message: "Utilisateur non authentifié",
         });
      }

      return [
        {
          id: "FREE",
          name: "Free",
          price: 0,
          period: "Gratuit",
          features: [
            { label: "Assurance colis", included: false },
            { label: "Réduction envoi", included: false },
            { label: "Envoi prioritaire", included: false, value: "15% du montant" },
            { label: "Réduction permanente", included: false },
          ],
          limits: getPlanLimits("FREE"),
        },
        {
          id: "STARTER",
          name: "Starter",
          price: 9.9,
          period: "/mois",
          features: [
            { label: "Assurance colis", included: true, value: "Jusqu'à 115€/envoi" },
            { label: "Réduction envoi", included: true, value: "5%" },
            { label: "Envoi prioritaire", included: true, value: "5% du montant" },
            { label: "Réduction permanente", included: true, value: "5% petits colis" },
          ],
          limits: getPlanLimits("STARTER"),
        },
        {
          id: "PREMIUM",
          name: "Premium",
          price: 19.99,
          period: "/mois",
          features: [
            { label: "Assurance colis", included: true, value: "Jusqu'à 3000€/envoi" },
            { label: "Réduction envoi", included: true, value: "9% + 1er gratuit" },
            { label: "Envoi prioritaire", included: true, value: "3 gratuits/mois" },
            { label: "Réduction permanente", included: true, value: "5% tous colis" },
          ],
          limits: getPlanLimits("PREMIUM"),
        },
      ];
    } catch (error: any) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors de la récupération des plans",
        cause: error,
       });
    }
  }),
});

/**
 * Récupère les limites d'un plan selon le cahier des charges
 */
function getPlanLimits(plan: SubscriptionPlan): PlanLimits {
  switch (plan) {
    case "FREE":
      return {
        maxInsurance: 0,
        freeDeliveries: 0,
        priorityDiscount: 0,
        generalDiscount: 0,
      };
    case "STARTER":
      return {
        maxInsurance: 115,
        freeDeliveries: 0,
        priorityDiscount: 5,
        generalDiscount: 5,
      };
    case "PREMIUM":
      return {
        maxInsurance: 3000,
        freeDeliveries: 3, // 3 envois prioritaires gratuits/mois
        priorityDiscount: 5,
        generalDiscount: 9,
      };
    default:
      return getPlanLimits("FREE");
  }
}

export default subscriptionRouter;