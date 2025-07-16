import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getStripe } from "@/lib/stripe";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID manquant" },
        { status: 400 }
      );
    }

    // Vérifier si Stripe est configuré
    let stripe;
    try {
      stripe = getStripe();
    } catch (error) {
      console.error("Stripe configuration error:", error);
      return NextResponse.json(
        { error: "Payment system not configured" },
        { status: 503 }
      );
    }

    // Récupérer la session Stripe
    const stripeSession = await stripe.checkout.sessions.retrieve(sessionId);

    if (!stripeSession) {
      return NextResponse.json(
        { error: "Session de paiement non trouvée" },
        { status: 404 }
      );
    }

    if (stripeSession.payment_status !== "paid") {
      return NextResponse.json(
        { error: "Paiement non confirmé" },
        { status: 400 }
      );
    }

    // Vérifier que la session appartient à l'utilisateur et à l'annonce
    if (
      stripeSession.metadata?.userId !== session.user.id ||
      stripeSession.metadata?.announcementId !== id
    ) {
      return NextResponse.json(
        { error: "Session non autorisée" },
        { status: 403 }
      );
    }

    // Vérifier si le paiement existe déjà
    const existingPayment = await prisma.payment.findFirst({
      where: {
        stripeSessionId: sessionId,
        announcementId: id,
      },
    });

    if (existingPayment) {
      return NextResponse.json({
        success: true,
        message: "Paiement déjà traité",
        paymentId: existingPayment.id,
        announcementId: id,
      });
    }

    // Créer l'enregistrement de paiement
    const payment = await prisma.payment.create({
      data: {
        userId: session.user.id,
        announcementId: id,
        amount: Number(stripeSession.amount_total) / 100, // Convertir de centimes
        currency: stripeSession.currency?.toUpperCase() || "EUR",
        status: "COMPLETED",
        stripeSessionId: sessionId,
        stripePaymentId: stripeSession.payment_intent as string,
        type: "DELIVERY", // Type pour paiement d'annonce
        paymentMethod: "STRIPE",
        paidAt: new Date(),
      },
    });

    // Mettre à jour le statut de l'annonce
    await prisma.announcement.update({
      where: { id },
      data: {
        status: "ACTIVE", // Ou "PAID" selon votre logique métier
        finalPrice: Number(stripeSession.amount_total) / 100,
      },
    });

    console.log("Payment verified and recorded:", {
      paymentId: payment.id,
      announcementId: id,
      amount: payment.amount,
      stripeSessionId: sessionId,
    });

    return NextResponse.json({
      success: true,
      message: "Paiement confirmé avec succès",
      paymentId: payment.id,
      announcementId: id,
    });

  } catch (error) {
    console.error("Error verifying payment:", error);
    
    // Log détaillé de l'erreur
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }

    return NextResponse.json(
      { 
        error: "Erreur lors de la vérification du paiement",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
} 