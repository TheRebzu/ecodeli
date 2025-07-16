// Webhook Stripe pour traiter les événements de paiement EcoDeli
import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";

export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = headers().get("stripe-signature");

    if (!signature) {
      return NextResponse.json({ error: "No signature" }, { status: 400 });
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
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

    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.log("Webhook signature verification failed:", err);
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    // Traiter l'événement
    switch (event.type) {
      case "checkout.session.completed":
        const session = event.data.object;
        
        if (session.payment_status === "paid" && session.metadata?.announcementId) {
          const announcementId = session.metadata.announcementId;
          const userId = session.metadata.userId;
          
          // Vérifier si le paiement existe déjà
          const existingPayment = await prisma.payment.findFirst({
            where: {
              stripeSessionId: session.id,
              announcementId: announcementId,
            },
          });

          if (!existingPayment) {
            // Créer l'enregistrement de paiement
            const payment = await prisma.payment.create({
              data: {
                userId: userId,
                announcementId: announcementId,
                amount: Number(session.amount_total) / 100,
                currency: session.currency?.toUpperCase() || "EUR",
                status: "COMPLETED",
                stripeSessionId: session.id,
                stripePaymentId: session.payment_intent as string,
                type: "DELIVERY",
                paymentMethod: "STRIPE",
                paidAt: new Date(),
              },
            });

            // Mettre à jour le statut de l'annonce
            await prisma.announcement.update({
              where: { id: announcementId },
              data: {
                status: "ACTIVE",
                finalPrice: Number(session.amount_total) / 100,
              },
            });

            console.log("Checkout session completed - payment created:", payment.id);
          } else {
            console.log("Payment already exists for session:", session.id);
          }
        }
        break;

      case "payment_intent.succeeded":
        const paymentIntent = event.data.object;
        
        // Mettre à jour le paiement en base
        await prisma.payment.updateMany({
          where: { stripePaymentId: paymentIntent.id },
          data: { 
            status: "COMPLETED",
            paidAt: new Date(),
          },
        });
        
        console.log("Payment succeeded:", paymentIntent.id);
        break;

      case "payment_intent.payment_failed":
        const failedPayment = event.data.object;
        
        // Mettre à jour le paiement en base
        await prisma.payment.updateMany({
          where: { stripePaymentId: failedPayment.id },
          data: { 
            status: "FAILED",
            failedAt: new Date(),
          },
        });
        
        console.log("Payment failed:", failedPayment.id);
        break;

      default:
        console.log("Unhandled event type:", event.type);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook error" },
      { status: 500 }
    );
  }
}
