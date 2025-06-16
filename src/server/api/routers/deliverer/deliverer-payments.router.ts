import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

/**
 * Router pour deliverer payments
 * Mission 1 - DELIVERER
 */
export const delivererPaymentsRouter = createTRPCRouter({ // Récupérer l'historique des paiements du livreur
  getMyPayments: protectedProcedure.query(async ({ ctx  }) => {
    const user = ctx.session.user; // Préfixé avec underscore

    try {
      // TODO: Implémenter la récupération des paiements
      return [];
    } catch (error) {
      // Préfixé avec underscore
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors de la récupération des paiements" });
    }
  }),

  // Demander un paiement
  requestPayment: protectedProcedure
    .input(
      z.object({ amount: z.number().positive(),
        paymentMethod: z.string() }),
    )
    .mutation(async ({ ctx: ctx, input: input  }) => {
      // Préfixés avec underscore
      try {
        // TODO: Implémenter la demande de paiement
        return { success };
      } catch (error) {
        // Préfixé avec underscore
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la demande de paiement" });
      }
    }),

  // TODO: Ajouter d'autres procédures selon les besoins Mission 1
});
