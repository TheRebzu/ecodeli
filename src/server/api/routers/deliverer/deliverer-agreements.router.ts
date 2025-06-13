import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  // publicProcedure supprimé car non utilisé
} from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

export const delivererAgreementsRouter = createTRPCRouter({
  // Récupérer les contrats du livreur
  getMyAgreements: protectedProcedure.query(async ({ ctx }) => {
    const _user = ctx.session.user; // Préfixé avec underscore

    try {
      // TODO: Implémenter la récupération des contrats
      return [];
    } catch (_error) {
      // Préfixé avec underscore
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors de la récupération des contrats",
      });
    }
  }),

  // Générer un nouveau contrat
  generateContract: protectedProcedure
    .input(
      z.object({
        templateId: z.string(),
        data: z.record(z.any()),
      }),
    )
    .mutation(async ({ ctx: _ctx, input: _input }) => {
      // Préfixés avec underscore
      try {
        // TODO: Implémenter la génération de contrat
        return { success: true };
      } catch (_error) {
        // Préfixé avec underscore
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la génération du contrat",
        });
      }
    }),
});
