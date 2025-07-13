import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth/utils";

/**
 * Schéma de validation pour compléter le tutoriel
 */
const completeTutorialSchema = z.object({
  step: z.enum([
    "CREATE_ANNOUNCEMENT",
    "MAKE_BOOKING",
    "VIEW_PAYMENTS",
    "TRACK_DELIVERY",
  ]),
  completed: z.boolean(),
});

/**
 * POST /api/client/tutorial/complete
 * Marquer une étape du tutoriel comme terminée
 * OBLIGATOIRE selon cahier des charges : tutoriel bloquant première connexion
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(request, ["CLIENT"]).catch(() => null);

    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }
    const body = await request.json();

    const { step, completed } = completeTutorialSchema.parse(body);

    // Récupérer le profil client
    const client = await prisma.client.findUnique({
      where: { userId: user.id },
    });

    if (!client) {
      return NextResponse.json(
        { error: "Profil client introuvable" },
        { status: 404 },
      );
    }

    // Si déjà complété, pas besoin de refaire
    if (client.tutorialCompleted) {
      return NextResponse.json({
        success: true,
        tutorialCompleted: true,
        message: "Tutoriel déjà complété",
      });
    }

    // Récupérer ou créer le progrès du tutoriel
    let tutorialProgress = await prisma.clientTutorialProgress.findUnique({
      where: { clientId: client.id },
    });

    if (!tutorialProgress) {
      tutorialProgress = await prisma.clientTutorialProgress.create({
        data: {
          clientId: client.id,
          createAnnouncement: false,
          makeBooking: false,
          viewPayments: false,
          trackDelivery: false,
        },
      });
    }

    // Mettre à jour l'étape spécifique
    const updateData: any = {};
    switch (step) {
      case "CREATE_ANNOUNCEMENT":
        updateData.createAnnouncement = completed;
        break;
      case "MAKE_BOOKING":
        updateData.makeBooking = completed;
        break;
      case "VIEW_PAYMENTS":
        updateData.viewPayments = completed;
        break;
      case "TRACK_DELIVERY":
        updateData.trackDelivery = completed;
        break;
    }

    const updatedProgress = await prisma.clientTutorialProgress.update({
      where: { id: tutorialProgress.id },
      data: updateData,
    });

    // Vérifier si toutes les étapes sont complétées
    const allStepsCompleted =
      updatedProgress.createAnnouncement &&
      updatedProgress.makeBooking &&
      updatedProgress.viewPayments &&
      updatedProgress.trackDelivery;

    // Si toutes les étapes sont terminées, marquer le tutoriel comme complété
    if (allStepsCompleted && !client.tutorialCompleted) {
      await prisma.client.update({
        where: { id: client.id },
        data: {
          tutorialCompleted: true,
          tutorialCompletedAt: new Date(),
        },
      });

      // Notification de félicitations
      await prisma.notification.create({
        data: {
          userId: user.id,
          title: "Tutoriel terminé !",
          message:
            "Félicitations ! Vous maîtrisez maintenant toutes les fonctionnalités EcoDeli.",
          type: "SYSTEM",
          status: "UNREAD",
        },
      });
    }

    return NextResponse.json({
      success: true,
      tutorialProgress: {
        createAnnouncement: updatedProgress.createAnnouncement,
        makeBooking: updatedProgress.makeBooking,
        viewPayments: updatedProgress.viewPayments,
        trackDelivery: updatedProgress.trackDelivery,
        completed: allStepsCompleted,
      },
      tutorialCompleted: allStepsCompleted,
      nextStep: getNextStep(updatedProgress),
    });
  } catch (error) {
    console.error("Erreur completion tutoriel:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Données invalides", details: error.errors },
        { status: 422 },
      );
    }

    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

/**
 * GET /api/client/tutorial/complete
 * Récupérer le statut du tutoriel client
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireRole(request, ["CLIENT"]);

    const client = await prisma.client.findUnique({
      where: { userId: user.id },
      include: {
        tutorialProgress: true,
      },
    });

    if (!client) {
      return NextResponse.json(
        { error: "Profil client introuvable" },
        { status: 404 },
      );
    }

    // Si pas de progrès enregistré, créer un nouveau
    if (!client.tutorialProgress) {
      const newProgress = await prisma.clientTutorialProgress.create({
        data: {
          clientId: client.id,
          createAnnouncement: false,
          makeBooking: false,
          viewPayments: false,
          trackDelivery: false,
        },
      });

      return NextResponse.json({
        tutorialCompleted: false,
        progress: {
          createAnnouncement: false,
          makeBooking: false,
          viewPayments: false,
          trackDelivery: false,
        },
        nextStep: "CREATE_ANNOUNCEMENT",
        blocksNavigation: true, // CRITIQUE : bloquer navigation si pas terminé
      });
    }

    const progress = client.tutorialProgress;
    const isCompleted = client.tutorialCompleted;

    return NextResponse.json({
      tutorialCompleted: isCompleted,
      progress: {
        createAnnouncement: progress.createAnnouncement,
        makeBooking: progress.makeBooking,
        viewPayments: progress.viewPayments,
        trackDelivery: progress.trackDelivery,
      },
      nextStep: isCompleted ? null : getNextStep(progress),
      blocksNavigation: !isCompleted, // CRITIQUE : bloquer si pas terminé
    });
  } catch (error) {
    console.error("Erreur récupération tutoriel:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

/**
 * Déterminer la prochaine étape du tutoriel
 */
function getNextStep(progress: any): string | null {
  if (!progress.createAnnouncement) return "CREATE_ANNOUNCEMENT";
  if (!progress.makeBooking) return "MAKE_BOOKING";
  if (!progress.viewPayments) return "VIEW_PAYMENTS";
  if (!progress.trackDelivery) return "TRACK_DELIVERY";
  return null; // Tutoriel terminé
}
