import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/utils";
import { prisma } from "@/lib/db";
import { z } from "zod";

const upgradeSchema = z.object({
  plan: z.enum(["FREE", "STARTER", "PREMIUM"]),
});

// POST - Mettre à niveau l'abonnement de l'utilisateur
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Vérifier que l'utilisateur est un client
    if (user.role !== "CLIENT") {
      return NextResponse.json(
        { error: "Only clients can manage subscriptions" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const validatedData = upgradeSchema.parse(body);

    // Récupérer l'abonnement actuel
    const currentSubscription = await prisma.subscription.findFirst({
      where: {
        userId: user.id,
        status: {
          in: ["active", "pending"],
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Déterminer le prix du nouveau plan
    const planPrices = {
      FREE: 0,
      STARTER: 9.9,
      PREMIUM: 19.99,
    };

    const newPlanPrice = planPrices[validatedData.plan];

    // Annuler l'abonnement actuel s'il existe
    if (currentSubscription) {
      await prisma.subscription.update({
        where: { id: currentSubscription.id },
        data: {
          status: "cancelled",
          endDate: new Date(),
        },
      });
    }

    // Créer le nouvel abonnement
    const newSubscription = await prisma.subscription.create({
      data: {
        userId: user.id,
        plan: validatedData.plan,
        status: validatedData.plan === "FREE" ? "active" : "pending",
        startDate: new Date(),
      },
    });

    // Si le plan n'est pas gratuit, créer un paiement
    if (validatedData.plan !== "FREE") {
      const payment = await prisma.payment.create({
        data: {
          userId: user.id,
          amount: newPlanPrice,
          currency: "EUR",
          status: "PENDING",
          type: "SUBSCRIPTION",
          stripePaymentId: null, // Sera mis à jour lors du paiement Stripe
        },
      });

      // Associer le paiement à l'abonnement
      await prisma.subscription.update({
        where: { id: newSubscription.id },
        data: { paymentId: payment.id },
      });

      // Ici, vous pourriez intégrer Stripe pour le paiement
      // Pour l'instant, on simule un paiement réussi
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: "COMPLETED" },
      });

      await prisma.subscription.update({
        where: { id: newSubscription.id },
        data: { status: "active" },
      });
    }

    // Récupérer l'abonnement mis à jour
    const updatedSubscription = await prisma.subscription.findUnique({
      where: { id: newSubscription.id },
    });

    return NextResponse.json(
      {
        subscription: {
          id: updatedSubscription!.id,
          plan: updatedSubscription!.plan,
          status: updatedSubscription!.status,
          startDate: updatedSubscription!.startDate.toISOString(),
          endDate: updatedSubscription!.endDate?.toISOString(),
          nextBillingDate:
            validatedData.plan === "FREE"
              ? null
              : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          amount: newPlanPrice,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 },
      );
    }

    console.error("Error upgrading subscription:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
