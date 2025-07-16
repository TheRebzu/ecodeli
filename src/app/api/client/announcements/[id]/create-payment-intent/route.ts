import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getStripe } from "@/lib/stripe";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) {
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

    const { amount, currency = "eur" } = await request.json();

    // Vérifier que l'annonce appartient à l'utilisateur
    const { id } = await params;
    const announcement = await prisma.announcement.findFirst({
      where: {
        id: id,
        authorId: session.user.id,
        status: "ACTIVE",
      },
    });

    if (!announcement) {
      return NextResponse.json(
        { error: "Announcement not found or not accessible" },
        { status: 404 }
      );
    }

    // Créer le Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convertir en centimes
      currency,
      metadata: {
        announcementId: id,
        userId: session.user.id,
      },
    });

    // Enregistrer le paiement en base
    await prisma.payment.create({
      data: {
        id: paymentIntent.id,
        userId: session.user.id,
        announcementId: id,
        amount: amount,
        currency,
        status: "PENDING",
        type: "DELIVERY",
        paymentMethod: "STRIPE",
        stripePaymentId: paymentIntent.id,
      },
    });

    return NextResponse.json({
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      amount,
      status: paymentIntent.status,
    });
  } catch (error) {
    console.error("Error creating payment intent:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
