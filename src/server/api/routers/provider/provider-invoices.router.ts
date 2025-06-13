import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

/**
 * Router pour provider invoices
 * Mission 1 - PROVIDER
 */
export const providerInvoicesRouter = createTRPCRouter({
  // Récupérer les factures du prestataire
  getMyInvoices: protectedProcedure.query(async ({ _ctx }) => {
    const _user = ctx.session.user; // Préfixé avec underscore

    try {
      // TODO: Implémenter la récupération des factures
      return [];
    } catch (_error) {
      // Préfixé avec underscore
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors de la récupération des factures",
      });
    }
  }),

  // Créer une facture
  createInvoice: protectedProcedure
    .input(
      z.object({
        clientId: z.string(),
        amount: z.number().positive(),
        items: z.array(
          z.object({
            description: z.string(),
            quantity: z.number(),
            unitPrice: z.number(),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx: _ctx, input: _input }) => {
      // Préfixés avec underscore
      try {
        // TODO: Implémenter la création de facture
        return { success: true };
      } catch (_error) {
        // Préfixé avec underscore
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la création de la facture",
        });
      }
    }),

  // TODO: Ajouter d'autres procédures selon les besoins Mission 1
});
