import { NextRequest, NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth/utils";
import { prisma } from "@/lib/db";
import { getStripe } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromSession(request);
    if (!user) {
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

    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID required" },
        { status: 400 }
      );
    }

    // Vérifier la session Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (!session || session.payment_status !== "paid") {
      return NextResponse.json(
        { error: "Payment not successful" },
        { status: 400 }
      );
    }

    const applicationId = session.metadata?.applicationId;

    if (!applicationId) {
      return NextResponse.json(
        { error: "Application ID not found in session metadata" },
        { status: 400 }
      );
    }

    // Mettre à jour le statut de l'application
    await prisma.serviceApplication.update({
      where: { id: applicationId },
      data: {
        status: "PAID",
        updatedAt: new Date(),
      },
    });

    // PATCH: Lier le paiement à l'annonce pour affichage côté provider
    // 1. Récupérer l'application et son annonce
    const application = await prisma.serviceApplication.findUnique({
      where: { id: applicationId },
      include: { announcement: true },
    });
    // 2. Récupérer le paiement pour cette application
    const payment = await prisma.payment.findFirst({
      where: { serviceApplicationId: applicationId },
    });
    // 3. Lier le paiement à l'annonce si ce n'est pas déjà fait
    if (application && payment && application.announcementId) {
      await prisma.announcement.update({
        where: { id: application.announcementId },
        data: { payment: { connect: { id: payment.id } } },
      });
    }

    return NextResponse.json({
      success: true,
      applicationId,
      status: "paid",
    });
  } catch (error) {
    console.error("Error verifying payment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
