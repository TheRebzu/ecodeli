import { NextRequest, NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth/utils";
import { announcementService } from "@/features/announcements/services/announcement.service";
import Stripe from "stripe";
import { prisma } from "@/lib/db";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-06-30.basil", // Use the correct type
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let user = undefined;
  let announcement = undefined;
  try {
    const { id: announcementId } = await params;
    user = await getUserFromSession(request);
    if (!user || user.role !== "CLIENT") {
      return NextResponse.json({ error: "Accès refusé - Rôle CLIENT requis" }, { status: 403 });
    }

    // Récupérer l'annonce pour validation
    announcement = await announcementService.getAnnouncementById(announcementId);
    if (!announcement) {
      return NextResponse.json({ error: "Annonce non trouvée" }, { status: 404 });
    }
    // Use optional chaining and fallback for property names
    const authorId = (announcement as any).authorId || announcement.author_id || announcement.userId;
    if (authorId !== user.id) {
      return NextResponse.json({ error: "Annonce non autorisée" }, { status: 403 });
    }
    const finalPrice = (announcement as any).finalPrice ?? (announcement as any).price ?? (announcement as any).basePrice;
    if (!finalPrice) {
      return NextResponse.json({ error: "Prix de l'annonce non défini" }, { status: 400 });
    }
    // Only block payment if already paid or deleted/cancelled
    const status = (announcement as any).status;
    if (["PAID", "COMPLETED", "CANCELLED", "EXPIRED"].includes(status)) {
      let reason = "";
      switch (status) {
        case "PAID":
          reason = "L'annonce a déjà été payée.";
          break;
        case "COMPLETED":
          reason = "La livraison est terminée, paiement impossible.";
          break;
        case "CANCELLED":
          reason = "L'annonce a été annulée.";
          break;
        case "EXPIRED":
          reason = "L'annonce a expiré.";
          break;
        default:
          reason = `Statut actuel: ${status}`;
      }
      return NextResponse.json({ error: "Cette annonce ne peut plus être payée", status, reason }, { status: 400 });
    }

    const amount = Math.round(finalPrice * 100); // cents
    const currency = (announcement as any).currency || "EUR";

    // Vérifier s'il existe déjà une livraison pour cette annonce
    const delivery = await prisma.delivery.findFirst({
      where: { announcementId: announcementId },
    });

    // Créer le Payment en base (s'il n'existe pas déjà)
    let payment = await prisma.payment.findFirst({
      where: {
        announcementId: announcementId,
        deliveryId: delivery?.id,
        userId: user.id,
        type: "DELIVERY",
        status: { in: ["PENDING", "PROCESSING"] },
      },
    });
    if (!payment) {
      payment = await prisma.payment.create({
        data: {
          userId: user.id,
          announcementId: announcementId,
          deliveryId: delivery?.id,
          amount: finalPrice,
          currency: currency,
          status: "PENDING",
          type: "DELIVERY",
          paymentMethod: "STRIPE",
        },
      });
    }

    // Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: currency.toLowerCase(),
            product_data: {
              name: (announcement as any).title || "Annonce EcoDeli",
              description: (announcement as any).description?.slice(0, 200) || "Annonce EcoDeli",
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/fr/client/announcements/${announcementId}?payment=success`,
      cancel_url: `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/fr/client/announcements/${announcementId}?payment=cancelled`,
      metadata: {
        announcementId,
        userId: user.id,
        deliveryId: delivery?.id || "",
        paymentId: payment.id,
        type: "announcement_payment",
      },
      customer_email: user.email || undefined,
      billing_address_collection: "required",
    });

    // Mettre à jour le Payment avec le stripePaymentId
    if (session.payment_intent) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { stripePaymentId: typeof session.payment_intent === 'string' ? session.payment_intent : (session.payment_intent as any).id },
      });
    }

    return NextResponse.json({ checkoutUrl: session.url });
  } catch (error) {
    // Add detailed error logging
    console.error("[Stripe Checkout ERROR]", {
      error,
      announcementId: params ? (await params).id : undefined,
      userId: user?.id,
      announcement,
      env: {
        STRIPE_SECRET_KEY: !!process.env.STRIPE_SECRET_KEY,
        NEXTAUTH_URL: process.env.NEXTAUTH_URL,
      },
    });
    return NextResponse.json({ error: "Erreur lors de la création de la session Stripe", details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
} 