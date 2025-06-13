import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

/**
 * Router pour provider interventions
 * Mission 1 - PROVIDER
 */
export const providerInterventionsRouter = createTRPCRouter({
  // Récupérer les interventions du prestataire
  getMyInterventions: protectedProcedure.query(async ({ _ctx }) => {
    const _user = ctx.session.user; // Préfixé avec underscore

    try {
      // TODO: Implémenter la récupération des interventions
      return [];
    } catch (_error) {
      // Préfixé avec underscore
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors de la récupération des interventions",
      });
    }
  }),

  // Créer une intervention
  createIntervention: protectedProcedure
    .input(
      z.object({
        clientId: z.string(),
        serviceId: z.string(),
        scheduledDate: z.date(),
      }),
    )
    .mutation(async ({ ctx: _ctx, input: _input }) => {
      // Préfixés avec underscore
      try {
        // TODO: Implémenter la création d'intervention
        return { success: true };
      } catch (_error) {
        // Préfixé avec underscore
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la création de l'intervention",
        });
      }
    }),

  // TODO: Ajouter d'autres procédures selon les besoins Mission 1
});
