import { NextRequest, NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth/utils";
import { prisma } from "@/lib/db";
import { getStripe } from "@/lib/stripe";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getUserFromSession(request);
    if (!user || user.role !== "CLIENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Vérifier si Stripe est configuré
    let stripe;
    try {
      stripe = getStripe();
    } catch (error) {
      return NextResponse.json(
        { error: "Payment system not configured" },
        { status: 503 }
      );
    }

    const { id } = await params;
    const { amount } = await request.json();

    // Vérifier que l'application existe
    const application = await prisma.serviceApplication.findUnique({
      where: { id },
      include: {
        announcement: true,
        provider: true,
      },
    });

    if (!application) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    // Vérifier si un paiement existe déjà pour cette application
    const existingPayment = await prisma.payment.findUnique({
      where: { serviceApplicationId: id },
    });

    let paymentIntent;
    let paymentRecord;

    if (existingPayment) {
      // Si un paiement existe déjà, récupérer le Payment Intent existant
      try {
        paymentIntent = await stripe.paymentIntents.retrieve(existingPayment.stripePaymentId!);
        paymentRecord = existingPayment;
      } catch (error) {
        // Si le Payment Intent n'existe plus, créer un nouveau
        paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(amount * 100),
          currency: "eur",
          metadata: {
            applicationId: id,
            userId: user.id,
          },
        });

        // Mettre à jour le paiement existant
        paymentRecord = await prisma.payment.update({
          where: { id: existingPayment.id },
          data: {
            id: paymentIntent.id,
            stripePaymentId: paymentIntent.id,
            amount: amount,
            status: "PENDING",
          },
        });
      }
    } else {
      // Créer un nouveau Payment Intent
      paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100),
        currency: "eur",
        metadata: {
          applicationId: id,
          userId: user.id,
        },
      });

      // Enregistrer le nouveau paiement en base
      paymentRecord = await prisma.payment.create({
        data: {
          id: paymentIntent.id,
          userId: user.id,
          serviceApplicationId: id,
          amount: amount,
          currency: "eur",
          status: "PENDING",
          type: "SERVICE",
          paymentMethod: "STRIPE",
          stripePaymentId: paymentIntent.id,
        },
      });
    }

    return NextResponse.json({
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      amount,
      status: paymentIntent.status,
    });
  } catch (error) {
    console.error("Error creating payment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
