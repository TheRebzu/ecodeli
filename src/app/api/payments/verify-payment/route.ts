import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-11-20.acacia",
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { paymentIntentId } = await request.json();

    if (!paymentIntentId) {
      return NextResponse.json(
        { error: "Payment Intent ID required" },
        { status: 400 },
      );
    }

    // Récupérer les détails du Payment Intent depuis Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (!paymentIntent) {
      return NextResponse.json(
        { error: "Payment Intent not found" },
        { status: 404 },
      );
    }

    // Vérifier que le paiement a réussi
    if (paymentIntent.status !== "succeeded") {
      return NextResponse.json(
        {
          error: "Payment not succeeded",
          status: paymentIntent.status,
        },
        { status: 400 },
      );
    }

    // Récupérer le bookingId depuis les metadata
    const bookingId = paymentIntent.metadata?.bookingId;

    if (!bookingId) {
      return NextResponse.json(
        { error: "Booking ID not found in payment metadata" },
        { status: 400 },
      );
    }

    // Vérifier que la booking existe et appartient au client
    const booking = await db.booking.findFirst({
      where: {
        id: bookingId,
        client: {
          userId: session.user.id,
        },
      },
      include: {
        service: {
          select: {
            name: true,
            provider: {
              select: {
                user: {
                  select: {
                    email: true,
                    profile: {
                      select: {
                        firstName: true,
                        lastName: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Créer ou mettre à jour l'enregistrement Payment
    const payment = await db.payment.upsert({
      where: {
        stripePaymentId: paymentIntentId,
      },
      update: {
        status: "COMPLETED",
        amount: paymentIntent.amount / 100, // Convert from cents
        currency: paymentIntent.currency.toUpperCase(),
        paidAt: new Date(),
      },
      create: {
        userId: session.user.id,
        bookingId: booking.id,
        amount: paymentIntent.amount / 100, // Convert from cents
        currency: paymentIntent.currency.toUpperCase(),
        status: "COMPLETED",
        type: "SERVICE",
        paymentMethod: "STRIPE",
        stripePaymentId: paymentIntentId,
        paidAt: new Date(),
      },
    });

    // Mettre à jour le statut de la booking
    const updatedBooking = await db.booking.update({
      where: { id: bookingId },
      data: {
        status: "PAID",
      },
    });

    console.log("✅ Payment verified and booking updated:", {
      bookingId,
      paymentId: payment.id,
      amount: payment.amount,
      status: updatedBooking.status,
    });

    // TODO: Envoyer notification au provider que le paiement est confirmé
    // TODO: Envoyer email de confirmation au client

    return NextResponse.json({
      success: true,
      bookingId,
      paymentId: payment.id,
      amount: payment.amount,
      currency: payment.currency,
      bookingStatus: updatedBooking.status,
    });
  } catch (error) {
    console.error("Error verifying payment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
