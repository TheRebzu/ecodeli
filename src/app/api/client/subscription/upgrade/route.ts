import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/utils";
import { prisma } from "@/lib/db";
import { z } from "zod";

const upgradeSchema = z.object({
  plan: z.enum(["STARTER", "PREMIUM"], {
    errorMap: () => ({ message: "Plan invalide" }),
  }),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = upgradeSchema.parse(body);

    // Récupérer l'abonnement actuel
    const currentSubscription = await prisma.subscription.findFirst({
      where: {
        userId: user.id,
        status: "active",
      },
    });

    // Définir les prix des plans
    const planPrices = {
      FREE: 0,
      STARTER: 9.9,
      PREMIUM: 19.99,
    };

    const newPlanPrice = planPrices[validatedData.plan];
    const currentPlanPrice = currentSubscription
      ? planPrices[currentSubscription.plan as keyof typeof planPrices]
      : 0;
    const priceDifference = newPlanPrice - currentPlanPrice;

    // Si c'est une mise à niveau gratuite (FREE -> STARTER/PREMIUM), procéder directement
    if (priceDifference <= 0) {
      // Mettre à jour l'abonnement existant ou en créer un nouveau
      if (currentSubscription) {
        await prisma.subscription.update({
          where: { id: currentSubscription.id },
          data: {
            plan: validatedData.plan,
            status: "active",
            startDate: new Date(),
          },
        });
      } else {
        await prisma.subscription.create({
          data: {
            userId: user.id,
            plan: validatedData.plan,
            status: "active",
            startDate: new Date(),
          },
        });
      }

      return NextResponse.json({
        success: true,
        message: "Abonnement mis à jour avec succès",
        subscription: {
          plan: validatedData.plan,
          status: "active",
        },
      });
    }

    // Pour les mises à niveau payantes, créer un paiement
    const payment = await prisma.payment.create({
      data: {
        userId: user.id,
        amount: priceDifference,
        currency: "EUR",
        status: "PENDING",
        type: "SUBSCRIPTION",
        paymentMethod: "STRIPE",
        description: `Mise à niveau vers ${validatedData.plan}`,
      },
    });

    // Créer ou mettre à jour l'abonnement
    if (currentSubscription) {
      await prisma.subscription.update({
        where: { id: currentSubscription.id },
        data: {
          plan: validatedData.plan,
          status: "pending_payment",
          startDate: new Date(),
        },
      });
    } else {
      await prisma.subscription.create({
        data: {
          userId: user.id,
          plan: validatedData.plan,
          status: "pending_payment",
          startDate: new Date(),
        },
      });
    }

    // Ici, vous pourriez intégrer avec Stripe pour créer une session de paiement
    // Pour l'instant, on simule un paiement réussi
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "COMPLETED",
        stripePaymentId: `sim_${Date.now()}`, // Simulation
      },
    });

    // Activer l'abonnement après paiement
    await prisma.subscription.updateMany({
      where: {
        userId: user.id,
        plan: validatedData.plan,
        status: "pending_payment",
      },
      data: {
        status: "active",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Abonnement mis à niveau avec succès",
      payment: {
        id: payment.id,
        amount: payment.amount,
        status: payment.status,
      },
      subscription: {
        plan: validatedData.plan,
        status: "active",
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Données invalides", details: error.errors },
        { status: 400 },
      );
    }

    console.error("Error upgrading subscription:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à niveau de l'abonnement" },
      { status: 500 },
    );
  }
}
