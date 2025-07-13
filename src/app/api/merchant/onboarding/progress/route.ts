import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET /api/merchant/onboarding/progress - Récupérer le progrès d'onboarding
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    // Vérifier que l'utilisateur est un commerçant
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!user || user.role !== "MERCHANT") {
      return NextResponse.json(
        { error: "Accès non autorisé" },
        { status: 403 },
      );
    }

    // Récupérer le progrès d'onboarding
    const onboardingProgress = await prisma.merchantOnboarding.findUnique({
      where: { merchantId: session.user.id },
      include: {
        completedSteps: true,
        earnedBadges: {
          include: {
            badge: true,
          },
        },
      },
    });

    // Si pas d'enregistrement, créer un nouveau
    if (!onboardingProgress) {
      const newProgress = await prisma.merchantOnboarding.create({
        data: {
          merchantId: session.user.id,
          currentLevel: "beginner",
          totalSteps: 25, // Nombre total d'étapes définies
          completedSteps: 0,
          estimatedTimeRemaining: 120, // minutes
        },
        include: {
          completedSteps: true,
          earnedBadges: {
            include: {
              badge: true,
            },
          },
        },
      });

      return NextResponse.json({
        progress: {
          totalSteps: newProgress.totalSteps,
          completedSteps: newProgress.completedSteps,
          currentLevel: newProgress.currentLevel,
          badges: [],
          estimatedTimeRemaining: newProgress.estimatedTimeRemaining,
        },
      });
    }

    // Calculer le niveau basé sur les étapes complétées
    const completedCount = onboardingProgress.completedSteps.length;
    const completionPercentage =
      (completedCount / onboardingProgress.totalSteps) * 100;

    let currentLevel = "beginner";
    if (completionPercentage >= 80) currentLevel = "expert";
    else if (completionPercentage >= 60) currentLevel = "advanced";
    else if (completionPercentage >= 30) currentLevel = "intermediate";

    // Mettre à jour le niveau si nécessaire
    if (currentLevel !== onboardingProgress.currentLevel) {
      await prisma.merchantOnboarding.update({
        where: { id: onboardingProgress.id },
        data: { currentLevel },
      });
    }

    // Estimer le temps restant basé sur les étapes non complétées
    const averageTimePerStep = 8; // minutes moyennes par étape
    const remainingSteps = onboardingProgress.totalSteps - completedCount;
    const estimatedTimeRemaining = remainingSteps * averageTimePerStep;

    return NextResponse.json({
      progress: {
        totalSteps: onboardingProgress.totalSteps,
        completedSteps: completedCount,
        currentLevel: currentLevel,
        badges: onboardingProgress.earnedBadges.map((eb: any) => ({
          id: eb.badge.id,
          name: eb.badge.name,
          description: eb.badge.description,
          earnedAt: eb.earnedAt.toISOString(),
          icon: eb.badge.icon,
        })),
        estimatedTimeRemaining: estimatedTimeRemaining,
      },
    });
  } catch (error) {
    console.error("Erreur récupération progrès onboarding:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 },
    );
  }
}
