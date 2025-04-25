import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2023-10-16",
});

// Webhook secret for verifying the event
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = headers().get("stripe-signature") || "";

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      console.error(`Webhook signature verification failed: ${err.message}`);
      return NextResponse.json(
        { error: "Webhook signature verification failed" },
        { status: 400 },
      );
    }

    // Handle the event
    switch (event.type) {
      case "payment_intent.succeeded":
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        // Update your database based on the payment intent
        await handleSuccessfulPayment(paymentIntent);
        break;

      case "payment_intent.payment_failed":
        const failedIntent = event.data.object as Stripe.PaymentIntent;
        await handleFailedPayment(failedIntent);
        break;

      // Handle other events as needed
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

async function handleSuccessfulPayment(paymentIntent: Stripe.PaymentIntent) {
  // Extract metadata to identify the purpose of the payment
  const metadata = paymentIntent.metadata || {};
  const { announcementId, paymentType } = metadata;

  if (!announcementId || !paymentType) {
    console.error("Missing metadata in payment intent:", paymentIntent.id);
    return;
  }

  try {
    // Record the payment in your database
    await prisma.payment.create({
      data: {
        stripePaymentId: paymentIntent.id,
        amount: paymentIntent.amount / 100, // Convert from cents to dollars/euros
        currency: paymentIntent.currency,
        status: "COMPLETED",
        type: paymentType as string,
        announcementId: announcementId as string,
      },
    });

    // If this is a payment for a new announcement, update the announcement status
    if (paymentType === "ANNOUNCEMENT_CREATION") {
      await prisma.announcement.update({
        where: { id: announcementId as string },
        data: { paymentStatus: "PAID" },
      });
    }

    // If this is a payment release to deliverer, update delivery status
    if (paymentType === "DELIVERER_PAYMENT") {
      // Find the delivery associated with this announcement
      const delivery = await prisma.delivery.findFirst({
        where: { announcementId: announcementId as string },
      });

      if (delivery) {
        await prisma.delivery.update({
          where: { id: delivery.id },
          data: { paymentStatus: "PAID_TO_DELIVERER" },
        });
      }
    }
  } catch (error) {
    console.error("Error processing successful payment:", error);
  }
}

async function handleFailedPayment(paymentIntent: Stripe.PaymentIntent) {
  const metadata = paymentIntent.metadata || {};
  const { announcementId, paymentType } = metadata;

  if (!announcementId || !paymentType) {
    console.error(
      "Missing metadata in failed payment intent:",
      paymentIntent.id,
    );
    return;
  }

  try {
    // Record the failed payment
    await prisma.payment.create({
      data: {
        stripePaymentId: paymentIntent.id,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
        status: "FAILED",
        type: paymentType as string,
        announcementId: announcementId as string,
      },
    });

    // Update announcement payment status if needed
    if (paymentType === "ANNOUNCEMENT_CREATION") {
      await prisma.announcement.update({
        where: { id: announcementId as string },
        data: { paymentStatus: "FAILED" },
      });
    }
  } catch (error) {
    console.error("Error processing failed payment:", error);
  }
}
