import { z } from "zod";
import {
  router as router,
  protectedProcedure,
  publicProcedure,
} from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

/**
 * Router pour deliverer payments
 * Mission 1 - DELIVERER
 */
export const delivererPaymentsRouter = router({
  // Récupérer toutes les données
  getAll: protectedProcedure.query(async ({ ctx }) => {
    try {
      // TODO: Vérifier les permissions selon le rôle
      const { user } = ctx.session;

      // TODO: Implémenter la logique métier
      return {
        success: true,
        data: [],
      };
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors de la récupération des données",
      });
    }
  }),

  // Créer une nouvelle entrée
  create: protectedProcedure
    .input(
      z.object({
        // TODO: Définir le schéma de validation
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // TODO: Vérifier les permissions
        // TODO: Implémenter la création
        return {
          success: true,
          data: null,
        };
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Erreur lors de la création",
        });
      }
    }),

  // TODO: Ajouter d'autres procédures selon les besoins Mission 1
});
