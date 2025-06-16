import { z } from "zod";
import { router, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

/**
 * Router simplifié pour le système de tutoriel client Mission 1
 * Compatible avec MandatoryTutorialWrapper
 */

// Schémas de validation
const completeTutorialSchema = z.object({ tutorialType: z.enum(["MISSION_1"]),
  completedSteps: z.number().min(1).max(10),
 });

export const clientTutorialRouter = router({ /**
   * Obtenir le statut du tutoriel Mission 1
   */
  getTutorialStatus: protectedProcedure.query(async ({ ctx  }) => {
    const { user } = ctx.session;

    if (user.role !== "CLIENT") {
      throw new TRPCError({ code: "FORBIDDEN",
        message: "Seuls les clients peuvent accéder au tutoriel",
       });
    }

    try {
      // Récupérer le profil client
      const client = await ctx.db.client.findUnique({
        where: { userId: user.id },
      });

      if (!client) {
        throw new TRPCError({ code: "NOT_FOUND",
          message: "Profil client non trouvé",
         });
      }

      // Vérifier si Mission 1 est complétée
      // Pour le moment, simulons avec un champ sur le client
      const mission1Completed = client.tutorialMission1Completed || false;
      const mission1Progress = client.tutorialMission1Progress || 0;

      return {
        mission1Completed,
        mission1Progress,
        canSkip: false, // Mission 1 est obligatoire
      };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors de la récupération du statut",
       });
    }
  }),

  /**
   * Marquer Mission 1 comme complétée
   */
  completeTutorial: protectedProcedure
    .input(completeTutorialSchema)
    .mutation(async ({ ctx, input  }) => {
      const { user } = ctx.session;

      if (user.role !== "CLIENT") {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Seuls les clients peuvent terminer leur tutoriel",
         });
      }

      try {
        const client = await ctx.db.client.findUnique({
          where: { userId: user.id },
        });

        if (!client) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Profil client non trouvé",
           });
        }

        // Marquer Mission 1 comme complétée
        await ctx.db.client.update({
          where: { id: client.id },
          data: {
            tutorialMission1Completed: true,
            tutorialMission1Progress: input.completedSteps,
            tutorialMission1CompletedAt: new Date(),
          },
        });

        return {
          success: true,
          message: "Mission 1 complétée avec succès !",
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la finalisation du tutoriel",
         });
      }
    }),

  /**
   * Réinitialiser le tutoriel Mission 1
   */
  resetTutorial: protectedProcedure.mutation(async ({ ctx  }) => {
    const { user } = ctx.session;

    if (user.role !== "CLIENT") {
      throw new TRPCError({ code: "FORBIDDEN",
        message: "Seuls les clients peuvent réinitialiser leur tutoriel",
       });
    }

    try {
      const client = await ctx.db.client.findUnique({
        where: { userId: user.id },
      });

      if (!client) {
        throw new TRPCError({ code: "NOT_FOUND",
          message: "Profil client non trouvé",
         });
      }

      // Réinitialiser Mission 1
      await ctx.db.client.update({
        where: { id: client.id },
        data: {
          tutorialMission1Completed: false,
          tutorialMission1Progress: 0,
          tutorialMission1CompletedAt: null,
        },
      });

      return {
        success: true,
        message: "Tutoriel réinitialisé avec succès",
      };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors de la réinitialisation",
       });
    }
  }),
});
