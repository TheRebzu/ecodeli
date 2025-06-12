import { z } from 'zod';
import { router, protectedProcedure } from '@/server/api/trpc';
import { TRPCError } from '@trpc/server';
import { TutorialStepType, TutorialOverlayType } from '@prisma/client';

/**
 * Router pour le syst�me de tutoriel client selon le cahier des charges
 * Tutoriel de premi�re connexion avec overlays bloquants
 */

// Sch�mas de validation
const updateProgressSchema = z.object({
  stepId: z.string().cuid(),
  completed: z.boolean(),
  skipped: z.boolean().default(false),
  timeSpent: z.number().min(0).optional(), // secondes
  userAction: z.string().max(200).optional(),
});

const tutorialConfigSchema = z.object({
  isEnabled: z.boolean(),
  allowSkipping: z.boolean(),
  showOnEveryLogin: z.boolean(),
  language: z.enum(['fr', 'en']).default('fr'),
});

export const clientTutorialRouter = router({
  /**
   * Obtenir la configuration et le progr�s du tutoriel pour le client
   */
  getTutorialState: protectedProcedure.query(async ({ ctx }) => {
    const { user } = ctx.session;

    if (user.role !== 'CLIENT') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Seuls les clients peuvent acc�der au tutoriel',
      });
    }

    try {
      // R�cup�rer le profil client
      const client = await ctx.db.client.findUnique({
        where: { userId: user.id },
      });

      if (!client) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Profil client non trouv�',
        });
      }

      // R�cup�rer la configuration du tutoriel
      let tutorialConfig = await ctx.db.clientTutorialConfig.findUnique({
        where: { clientId: client.id },
        include: {
          progress: {
            include: {
              step: {
                orderBy: { sequence: 'asc' },
              },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      // Si pas de config, cr�er une par d�faut
      if (!tutorialConfig) {
        tutorialConfig = await createDefaultTutorialConfig(ctx, client.id);
      }

      // R�cup�rer toutes les �tapes disponibles
      const allSteps = await ctx.db.clientTutorialStep.findMany({
        orderBy: { sequence: 'asc' },
      });

      // Calculer le progr�s
      const completedSteps = tutorialConfig.progress.filter(p => p.completed);
      const totalSteps = allSteps.length;
      const progressPercentage = totalSteps > 0 ? (completedSteps.length / totalSteps) * 100 : 0;

      // D�terminer l'�tape actuelle
      const currentStep = allSteps.find(
        step => !tutorialConfig.progress.some(p => p.stepId === step.id && p.completed)
      );

      // V�rifier si le tutoriel doit �tre affich�
      const shouldShowTutorial =
        tutorialConfig.isEnabled && (progressPercentage < 100 || tutorialConfig.showOnEveryLogin);

      return {
        success: true,
        data: {
          config: tutorialConfig,
          progress: {
            percentage: Math.round(progressPercentage),
            completedSteps: completedSteps.length,
            totalSteps,
            currentStep,
            isCompleted: progressPercentage >= 100,
          },
          steps: allSteps.map(step => ({
            ...step,
            isCompleted: tutorialConfig.progress.some(p => p.stepId === step.id && p.completed),
            isSkipped: tutorialConfig.progress.some(p => p.stepId === step.id && p.skipped),
            timeSpent: tutorialConfig.progress.find(p => p.stepId === step.id)?.timeSpent || 0,
          })),
          shouldShow: shouldShowTutorial,
          canSkip: tutorialConfig.allowSkipping,
        },
      };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Erreur lors de la r�cup�ration du tutoriel',
      });
    }
  }),

  /**
   * Mettre � jour le progr�s d'une �tape
   */
  updateStepProgress: protectedProcedure
    .input(updateProgressSchema)
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx.session;

      if (user.role !== 'CLIENT') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Seuls les clients peuvent mettre � jour leur progr�s',
        });
      }

      try {
        const client = await ctx.db.client.findUnique({
          where: { userId: user.id },
        });

        if (!client) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Profil client non trouv�',
          });
        }

        // V�rifier que l'�tape existe
        const step = await ctx.db.clientTutorialStep.findUnique({
          where: { id: input.stepId },
        });

        if (!step) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: '�tape de tutoriel non trouv�e',
          });
        }

        // R�cup�rer ou cr�er la configuration
        let tutorialConfig = await ctx.db.clientTutorialConfig.findUnique({
          where: { clientId: client.id },
        });

        if (!tutorialConfig) {
          tutorialConfig = await createDefaultTutorialConfig(ctx, client.id);
        }

        // Mettre � jour ou cr�er le progr�s
        const existingProgress = await ctx.db.clientTutorialProgress.findFirst({
          where: {
            configId: tutorialConfig.id,
            stepId: input.stepId,
          },
        });

        let progress;
        if (existingProgress) {
          progress = await ctx.db.clientTutorialProgress.update({
            where: { id: existingProgress.id },
            data: {
              completed: input.completed,
              skipped: input.skipped,
              timeSpent: input.timeSpent,
              userAction: input.userAction,
              completedAt: input.completed ? new Date() : null,
              updatedAt: new Date(),
            },
          });
        } else {
          progress = await ctx.db.clientTutorialProgress.create({
            data: {
              configId: tutorialConfig.id,
              stepId: input.stepId,
              completed: input.completed,
              skipped: input.skipped,
              timeSpent: input.timeSpent,
              userAction: input.userAction,
              completedAt: input.completed ? new Date() : null,
            },
          });
        }

        // V�rifier si le tutoriel est termin�
        const allSteps = await ctx.db.clientTutorialStep.count();
        const completedSteps = await ctx.db.clientTutorialProgress.count({
          where: {
            configId: tutorialConfig.id,
            completed: true,
          },
        });

        const isCompleted = completedSteps >= allSteps;

        // Mettre � jour la configuration si termin�
        if (isCompleted && !tutorialConfig.completedAt) {
          await ctx.db.clientTutorialConfig.update({
            where: { id: tutorialConfig.id },
            data: {
              completedAt: new Date(),
            },
          });
        }

        return {
          success: true,
          data: {
            progress,
            tutorialCompleted: isCompleted,
            nextStep: await getNextStep(ctx, tutorialConfig.id),
          },
          message: input.completed
            ? '�tape marqu�e comme termin�e'
            : input.skipped
              ? '�tape ignor�e'
              : 'Progr�s mis � jour',
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erreur lors de la mise � jour du progr�s',
        });
      }
    }),

  /**
   * R�initialiser le tutoriel
   */
  resetTutorial: protectedProcedure.mutation(async ({ ctx }) => {
    const { user } = ctx.session;

    if (user.role !== 'CLIENT') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Seuls les clients peuvent r�initialiser leur tutoriel',
      });
    }

    try {
      const client = await ctx.db.client.findUnique({
        where: { userId: user.id },
      });

      if (!client) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Profil client non trouv�',
        });
      }

      // Supprimer l'ancienne configuration et progr�s
      await ctx.db.clientTutorialConfig.deleteMany({
        where: { clientId: client.id },
      });

      // Cr�er une nouvelle configuration
      const newConfig = await createDefaultTutorialConfig(ctx, client.id);

      return {
        success: true,
        data: newConfig,
        message: 'Tutoriel r�initialis� avec succ�s',
      };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Erreur lors de la r�initialisation',
      });
    }
  }),

  /**
   * Mettre � jour la configuration du tutoriel
   */
  updateConfig: protectedProcedure.input(tutorialConfigSchema).mutation(async ({ ctx, input }) => {
    const { user } = ctx.session;

    if (user.role !== 'CLIENT') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Seuls les clients peuvent modifier leur configuration',
      });
    }

    try {
      const client = await ctx.db.client.findUnique({
        where: { userId: user.id },
      });

      if (!client) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Profil client non trouv�',
        });
      }

      // R�cup�rer ou cr�er la configuration
      let tutorialConfig = await ctx.db.clientTutorialConfig.findUnique({
        where: { clientId: client.id },
      });

      if (!tutorialConfig) {
        tutorialConfig = await createDefaultTutorialConfig(ctx, client.id);
      }

      // Mettre � jour la configuration
      const updatedConfig = await ctx.db.clientTutorialConfig.update({
        where: { id: tutorialConfig.id },
        data: {
          isEnabled: input.isEnabled,
          allowSkipping: input.allowSkipping,
          showOnEveryLogin: input.showOnEveryLogin,
          language: input.language,
          updatedAt: new Date(),
        },
      });

      return {
        success: true,
        data: updatedConfig,
        message: 'Configuration mise � jour',
      };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Erreur lors de la mise � jour de la configuration',
      });
    }
  }),

  /**
   * Marquer le tutoriel comme termin� (skip all)
   */
  completeTutorial: protectedProcedure.mutation(async ({ ctx }) => {
    const { user } = ctx.session;

    if (user.role !== 'CLIENT') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Seuls les clients peuvent terminer leur tutoriel',
      });
    }

    try {
      const client = await ctx.db.client.findUnique({
        where: { userId: user.id },
      });

      if (!client) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Profil client non trouv�',
        });
      }

      // R�cup�rer ou cr�er la configuration
      let tutorialConfig = await ctx.db.clientTutorialConfig.findUnique({
        where: { clientId: client.id },
      });

      if (!tutorialConfig) {
        tutorialConfig = await createDefaultTutorialConfig(ctx, client.id);
      }

      // V�rifier si le skip est autoris�
      if (!tutorialConfig.allowSkipping) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Le tutoriel ne peut pas �tre ignor�',
        });
      }

      // Marquer toutes les �tapes comme skipped
      const allSteps = await ctx.db.clientTutorialStep.findMany();

      await Promise.all(
        allSteps.map(async step => {
          const existingProgress = await ctx.db.clientTutorialProgress.findFirst({
            where: {
              configId: tutorialConfig.id,
              stepId: step.id,
            },
          });

          if (!existingProgress) {
            await ctx.db.clientTutorialProgress.create({
              data: {
                configId: tutorialConfig.id,
                stepId: step.id,
                completed: false,
                skipped: true,
                userAction: 'TUTORIAL_SKIPPED_ALL',
              },
            });
          } else if (!existingProgress.completed) {
            await ctx.db.clientTutorialProgress.update({
              where: { id: existingProgress.id },
              data: {
                skipped: true,
                userAction: 'TUTORIAL_SKIPPED_ALL',
              },
            });
          }
        })
      );

      // Marquer la configuration comme termin�e
      const updatedConfig = await ctx.db.clientTutorialConfig.update({
        where: { id: tutorialConfig.id },
        data: {
          completedAt: new Date(),
          isEnabled: false,
        },
      });

      return {
        success: true,
        data: updatedConfig,
        message: 'Tutoriel termin�',
      };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Erreur lors de la finalisation du tutoriel',
      });
    }
  }),

  /**
   * Obtenir l'�tape actuelle avec overlay
   */
  getCurrentOverlay: protectedProcedure.query(async ({ ctx }) => {
    const { user } = ctx.session;

    if (user.role !== 'CLIENT') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Acc�s non autoris�',
      });
    }

    try {
      const client = await ctx.db.client.findUnique({
        where: { userId: user.id },
      });

      if (!client) {
        return { success: true, data: null };
      }

      const tutorialConfig = await ctx.db.clientTutorialConfig.findUnique({
        where: { clientId: client.id },
        include: {
          progress: {
            include: { step: true },
          },
        },
      });

      if (!tutorialConfig || !tutorialConfig.isEnabled || tutorialConfig.completedAt) {
        return { success: true, data: null };
      }

      // Trouver la prochaine �tape non termin�e
      const allSteps = await ctx.db.clientTutorialStep.findMany({
        orderBy: { sequence: 'asc' },
      });

      const nextStep = allSteps.find(
        step =>
          !tutorialConfig.progress.some(p => p.stepId === step.id && (p.completed || p.skipped))
      );

      if (!nextStep) {
        return { success: true, data: null };
      }

      return {
        success: true,
        data: {
          step: nextStep,
          config: tutorialConfig,
          shouldBlock: nextStep.overlayType === 'BLOCKING',
          canSkip: tutorialConfig.allowSkipping,
        },
      };
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: "Erreur lors de la r�cup�ration de l'overlay",
      });
    }
  }),
});

// Helper functions
async function createDefaultTutorialConfig(ctx: any, clientId: string) {
  return await ctx.db.clientTutorialConfig.create({
    data: {
      clientId,
      isEnabled: true,
      allowSkipping: true,
      showOnEveryLogin: false,
      language: 'fr',
    },
    include: {
      progress: {
        include: { step: true },
      },
    },
  });
}

async function getNextStep(ctx: any, configId: string) {
  const allSteps = await ctx.db.clientTutorialStep.findMany({
    orderBy: { sequence: 'asc' },
  });

  const progress = await ctx.db.clientTutorialProgress.findMany({
    where: { configId },
  });

  return allSteps.find(
    step => !progress.some(p => p.stepId === step.id && (p.completed || p.skipped))
  );
}
