import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/utils";
import { prisma } from "@/lib/db";

// GET - Récupérer l'abonnement actuel du client
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Récupérer l'abonnement actuel
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId: user.id,
        status: "active",
      },
      orderBy: {
        startDate: "desc",
      },
    });

    // Si pas d'abonnement actif, créer un abonnement FREE par défaut
    if (!subscription) {
      const freeSubscription = await prisma.subscription.create({
        data: {
          userId: user.id,
          plan: "FREE",
          status: "active",
          startDate: new Date(),
        },
      });

      return NextResponse.json({
        subscription: {
          id: freeSubscription.id,
          plan: freeSubscription.plan,
          status: freeSubscription.status,
          startDate: freeSubscription.startDate.toISOString(),
          endDate: freeSubscription.endDate?.toISOString(),
          nextBillingDate: null, // Pas de facturation pour FREE
        },
      });
    }

    // Calculer la prochaine date de facturation
    let nextBillingDate = null;
    if (subscription.plan !== "FREE") {
      const startDate = new Date(subscription.startDate);
      const nextBilling = new Date(startDate);
      nextBilling.setMonth(nextBilling.getMonth() + 1);
      nextBillingDate = nextBilling.toISOString();
    }

    return NextResponse.json({
      subscription: {
        id: subscription.id,
        plan: subscription.plan,
        status: subscription.status,
        startDate: subscription.startDate.toISOString(),
        endDate: subscription.endDate?.toISOString(),
        nextBillingDate,
      },
    });
  } catch (error) {
    console.error("Error fetching subscription:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération de l'abonnement" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { plan } = await request.json();

    if (!["FREE", "STARTER", "PREMIUM"].includes(plan)) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const clientProfile = await prisma.client.findUnique({
      where: { userId: user.id },
    });

    if (!clientProfile) {
      return NextResponse.json(
        { error: "Client profile not found" },
        { status: 404 },
      );
    }

    let subscription;
    const now = new Date();

    if (plan === "FREE") {
      // Annuler l'abonnement payant
      await prisma.client.update({
        where: { id: clientProfile.id },
        data: {
          subscriptionPlan: "FREE",
          subscriptionEnd: now,
        },
      });
      subscription = {
        id: clientProfile.id,
        plan: "FREE",
        status: "active",
        startDate: now.toISOString(),
        endDate: null,
        autoRenew: false,
      };
    } else {
      // Créer ou mettre à jour l'abonnement payant
      const price = plan === "STARTER" ? 9.9 : 19.99;
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1);

      // Mettre à jour l'abonnement
      const updatedClient = await prisma.client.update({
        where: { id: clientProfile.id },
        data: {
          subscriptionPlan: plan,
          subscriptionStart: now,
          subscriptionEnd: endDate,
        },
      });

      subscription = {
        id: updatedClient.id,
        plan: updatedClient.subscriptionPlan,
        status: "active",
        startDate: updatedClient.subscriptionStart.toISOString(),
        endDate: updatedClient.subscriptionEnd?.toISOString(),
        autoRenew: true,
      };

      // Créer un paiement pour l'abonnement
      await prisma.payment.create({
        data: {
          userId: user.id,
          clientId: clientProfile.id,
          amount: price,
          currency: "EUR",
          paymentMethod: "STRIPE",
          status: "COMPLETED",
          paidAt: now,
          metadata: {
            type: "SUBSCRIPTION",
            plan: plan,
            description: `Abonnement ${plan} - ${new Date().toLocaleDateString("fr-FR")}`,
          },
        },
      });
    }

    return NextResponse.json({ subscription });
  } catch (error) {
    console.error("Error updating subscription:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clientProfile = await prisma.client.findUnique({
      where: { userId: user.id },
    });

    if (clientProfile.subscriptionPlan === "FREE") {
      return NextResponse.json(
        { error: "No subscription to cancel" },
        { status: 404 },
      );
    }

    // Annuler l'abonnement (il reste actif jusqu'à la fin de la période)
    // On ne change pas immédiatement en FREE, on garde le plan actuel jusqu'à la fin
    // mais on note que c'est annulé en ajoutant une date de fin si elle n'existe pas
    const endDate = clientProfile.subscriptionEnd || new Date();
    await prisma.client.update({
      where: { id: clientProfile.id },
      data: {
        subscriptionEnd: endDate,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Subscription cancelled successfully",
    });
  } catch (error) {
    console.error("Error cancelling subscription:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
