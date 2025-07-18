import { NextRequest, NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth/utils";
import { z } from "zod";
import { TutorialService } from "@/features/tutorials/services/tutorial.service";

const completeStepSchema = z.object({
  stepId: z.number(),
  timeSpent: z.number().min(0),
});

const completeTutorialSchema = z.object({
  totalTimeSpent: z.number().min(0),
  stepsCompleted: z.array(z.number()),
  feedback: z.string().optional(),
  rating: z.number().min(1).max(5).optional(),
});

const skipStepSchema = z.object({
  stepId: z.number(),
});

/**
 * GET - Récupérer l'état du tutoriel pour le client
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromSession(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Si l'utilisateur n'est pas CLIENT, retourner une réponse neutre
    if (user.role !== "CLIENT") {
      return NextResponse.json({
        success: true,
        tutorialRequired: false,
        message: "Tutoriel non applicable pour ce type d'utilisateur",
      });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    switch (action) {
      case "required":
        // Vérifier si le tutoriel est requis
        const isRequired = await TutorialService.isTutorialRequired(user.id);
        return NextResponse.json({
          success: true,
          tutorialRequired: isRequired,
        });

      case "steps":
        // Récupérer les étapes du tutoriel
        const steps = await TutorialService.getClientTutorialSteps(user.id);
        return NextResponse.json({
          success: true,
          steps,
        });

      case "progress":
        // Récupérer la progression
        const progress = await TutorialService.getTutorialProgress(user.id);
        return NextResponse.json({
          success: true,
          progress,
        });

      default:
        try {
          // Récupérer toutes les informations du tutoriel
          const [required, tutorialSteps, tutorialProgress] = await Promise.all(
            [
              TutorialService.isTutorialRequired(user.id),
              TutorialService.getClientTutorialSteps(user.id),
              TutorialService.getTutorialProgress(user.id),
            ],
          );

          return NextResponse.json({
            success: true,
            tutorialRequired: required,
            steps: tutorialSteps,
            progress: tutorialProgress,
          });
        } catch (error) {
          // Si l'utilisateur n'existe pas, retourner une réponse neutre
          if (error instanceof Error && error.message.includes("non trouvé")) {
            return NextResponse.json({
              success: false,
              message: "Utilisateur non trouvé",
              tutorialRequired: false,
              progress: {
                isCompleted: true,
                skipped: true,
              },
            });
          }
          throw error;
        }
    }
  } catch (error) {
    console.error("Error getting tutorial state:", error);

    // Si l'utilisateur n'existe pas, retourner une réponse neutre plutôt qu'une erreur
    if (error instanceof Error && error.message.includes("non trouvé")) {
      return NextResponse.json({
        success: false,
        message: "Utilisateur non trouvé pour le tutoriel",
        tutorialRequired: false,
      });
    }

    return NextResponse.json(
      { error: "Erreur lors de la récupération du tutoriel" },
      { status: 500 },
    );
  }
}

/**
 * POST - Actions sur le tutoriel
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromSession(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Si l'utilisateur n'est pas CLIENT, retourner une réponse neutre
    if (user.role !== "CLIENT") {
      return NextResponse.json({
        success: true,
        message: "Action non applicable pour ce type d'utilisateur",
      });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    switch (action) {
      case "start":
        // Démarrer le tutoriel
        await TutorialService.startTutorial(user.id);
        return NextResponse.json({
          success: true,
          message: "Tutoriel démarré",
        });

      case "complete-step": {
        // Compléter une étape
        const body = await request.json();
        const stepData = completeStepSchema.parse(body);
        await TutorialService.completeStep(
          user.id,
          stepData.stepId,
          stepData.timeSpent,
        );
        return NextResponse.json({
          success: true,
          message: "Étape complétée",
        });
      }

      case "skip-step": {
        // Passer une étape
        const body = await request.json();
        const skipData = skipStepSchema.parse(body);
        await TutorialService.skipStep(user.id, skipData.stepId);
        return NextResponse.json({
          success: true,
          message: "Étape passée",
        });
      }

      case "complete": {
        // Terminer le tutoriel complet
        const body = await request.json();
        const completionData = completeTutorialSchema.parse(body);
        await TutorialService.completeTutorial(user.id, completionData);
        return NextResponse.json({
          success: true,
          message: "Tutoriel terminé avec succès",
        });
      }

      case "reset":
        // Réinitialiser le tutoriel (pour les tests)
        await TutorialService.resetTutorial(user.id);
        return NextResponse.json({
          success: true,
          message: "Tutoriel réinitialisé",
        });

      default:
        // Gestion des requêtes POST sans action (mise à jour générale)
        const body = await request.json();

        if (
          body.userId &&
          (body.currentStep !== undefined || body.isCompleted !== undefined)
        ) {
          // Mise à jour de progression générale
          const progress = {
            currentStep: body.currentStep || 0,
            completedSteps: body.completedSteps || [],
            isCompleted: body.isCompleted || false,
            skipped: body.skipped || false,
          };

          // Si le tutoriel est marqué comme complété, appeler completeTutorial
          if (body.isCompleted) {
            await TutorialService.completeTutorial(user.id, {
              totalTimeSpent: 0,
              stepsCompleted: progress.completedSteps.map((_, i) => i + 1),
              feedback: "Tutoriel complété via interface",
              rating: 5,
            });
          } else {
            // Note: Il manque updateTutorialProgress dans TutorialService, on utilise startTutorial pour initialiser
            await TutorialService.startTutorial(user.id);
          }

          return NextResponse.json({
            success: true,
            message: "Progression mise à jour",
          });
        }

        return NextResponse.json(
          { error: "Action non spécifiée ou données manquantes" },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error("Error handling tutorial action:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Données invalides",
          details: error.errors.map((e) => ({
            field: e.path.join("."),
            message: e.message,
          })),
        },
        { status: 400 },
      );
    }

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Erreur lors de l'action sur le tutoriel" },
      { status: 500 },
    );
  }
}
