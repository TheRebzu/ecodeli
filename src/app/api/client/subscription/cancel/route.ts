import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/utils";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Récupérer l'abonnement actuel
    const currentSubscription = await prisma.subscription.findFirst({
      where: {
        userId: user.id,
        status: "active",
      },
    });

    if (!currentSubscription) {
      return NextResponse.json(
        { error: "Aucun abonnement actif trouvé" },
        { status: 404 },
      );
    }

    if (currentSubscription.plan === "FREE") {
      return NextResponse.json(
        { error: "Impossible d'annuler un abonnement gratuit" },
        { status: 400 },
      );
    }

    // Calculer la date de fin (fin du mois en cours)
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);
    endDate.setDate(1);
    endDate.setHours(0, 0, 0, 0);

    // Mettre à jour l'abonnement pour l'annuler
    await prisma.subscription.update({
      where: { id: currentSubscription.id },
      data: {
        status: "cancelled",
        endDate: endDate,
      },
    });

    // Créer un abonnement FREE pour remplacer l'abonnement payant
    await prisma.subscription.create({
      data: {
        userId: user.id,
        plan: "FREE",
        status: "active",
        startDate: endDate, // Commencer après la fin de l'abonnement payant
      },
    });

    return NextResponse.json({
      success: true,
      message: "Abonnement annulé avec succès",
      subscription: {
        plan: "FREE",
        status: "active",
        endDate: endDate.toISOString(),
      },
    });
  } catch (error) {
    console.error("Error cancelling subscription:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'annulation de l'abonnement" },
      { status: 500 },
    );
  }
}
