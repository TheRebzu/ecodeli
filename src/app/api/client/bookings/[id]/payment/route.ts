import { NextRequest, NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth/utils";
import { prisma } from "@/lib/db";
import { getStripe } from "@/lib/stripe";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    console.log("🔍 [Payment API] Starting payment creation...");

    const user = await getUserFromSession(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Vérifier si Stripe est configuré
    let stripe;
    try {
      stripe = getStripe();
      console.log("🔍 [Payment API] Stripe configured successfully");
    } catch (error) {
      console.log("❌ [Payment API] Stripe not configured:", error.message);
      return NextResponse.json(
        { error: "Payment system not configured" },
        { status: 503 }
      );
    }

    const { id } = await params;
    const { amount, currency = "EUR" } = await request.json();

    console.log("🔍 [Payment API] Booking ID:", id);
    console.log("🔍 [Payment API] Amount:", amount);

    // Vérifier que la réservation existe et appartient à l'utilisateur
    const booking = await prisma.booking.findFirst({
      where: {
        id: id,
        clientId: user.id,
      },
      include: {
        service: true,
        provider: true,
      },
    });

    if (!booking) {
      return NextResponse.json(
        { error: "Booking not found or access denied" },
        { status: 404 }
      );
    }

    // Créer le Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convertir en centimes
      currency: currency.toLowerCase(),
      metadata: {
        bookingId: id,
        userId: user.id,
      },
    });

    // Enregistrer le paiement en base
    await prisma.payment.create({
      data: {
        id: paymentIntent.id,
        userId: user.id,
        bookingId: id,
        amount: amount,
        currency: currency.toLowerCase(),
        status: "PENDING",
        type: "BOOKING",
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
    console.error("❌ [Payment API] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
