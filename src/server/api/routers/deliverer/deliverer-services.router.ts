import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

export const delivererServicesRouter = createTRPCRouter({
  // Récupérer les services disponibles pour le livreur
  getAvailableServices: protectedProcedure.query(async ({ ctx }) => {
    const _user = ctx.session.user; // Préfixé avec underscore

    try {
      // TODO: Implémenter la récupération des services
      return [];
    } catch (_error) {
      // Préfixé avec underscore
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
        plan: z.string(),
      }),
    )
    .mutation(async ({ ctx: _ctx, input: _input }) => {
      // Préfixés avec underscore
      try {
        // TODO: Implémenter la souscription au service
        return { success: true };
      } catch (_error) {
        // Préfixé avec underscore
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la souscription au service",
        });
      }
    }),
});
