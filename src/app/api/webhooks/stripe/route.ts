// Webhook Stripe pour traiter les �v�nements de paiement EcoDeli
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { db as prisma } from "@/lib/db";

export const config = {
  api: {
    bodyParser: false,
  },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-06-30.basil" });
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature") as string;

  // Lire le body brut (buffer)
  const rawBody = await req.arrayBuffer();
  const buf = Buffer.from(rawBody);

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(buf, signature, endpointSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Traitement des événements Stripe
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const paymentId = session.metadata?.paymentId;
      const announcementId = session.metadata?.announcementId;
      console.log("[Stripe] checkout.session.completed", { paymentId, announcementId });
      if (paymentId) {
        await prisma.payment.update({
          where: { id: paymentId },
          data: { status: "COMPLETED" },
        });
        console.log("[Stripe] Payment status updated to COMPLETED", paymentId);
      }
      if (announcementId) {
        await prisma.announcement.update({
          where: { id: announcementId },
          data: { status: "IN_PROGRESS" },
        });
        console.log("[Stripe] Announcement status updated to IN_PROGRESS", announcementId);
      }
      break;
    }
    // Ajoute d'autres cas si besoin (paiement échoué, abonnement, etc.)
    default:
      console.log(`[Stripe] Unhandled event type: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
