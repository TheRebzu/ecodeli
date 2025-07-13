import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/utils";
import { prisma } from "@/lib/db";

// GET - Récupérer l'abonnement actuel de l'utilisateur
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Récupérer l'abonnement actuel
    const subscription = await prisma.subscription.findFirst({
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

    // Si aucun abonnement actif, créer un abonnement gratuit par défaut
    if (!subscription) {
      const defaultSubscription = await prisma.subscription.create({
        data: {
          userId: user.id,
          plan: "FREE",
          status: "active",
          startDate: new Date(),
        },
      });

      return NextResponse.json({
        subscription: {
          id: defaultSubscription.id,
          plan: defaultSubscription.plan,
          status: defaultSubscription.status,
          startDate: defaultSubscription.startDate.toISOString(),
          endDate: defaultSubscription.endDate?.toISOString(),
          nextBillingDate: null,
          amount: 0,
        },
      });
    }

    // Calculer la prochaine date de facturation
    let nextBillingDate = null;
    if (subscription.status === "active" && subscription.plan !== "FREE") {
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
        amount:
          subscription.plan === "FREE"
            ? 0
            : subscription.plan === "STARTER"
              ? 9.9
              : 19.99,
      },
    });
  } catch (error) {
    console.error("Error fetching current subscription:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
