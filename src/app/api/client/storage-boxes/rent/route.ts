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

    const { storageBoxId, duration } = await request.json();

    // Vérifier que la box existe et est disponible
    const storageBox = await prisma.storageBox.findUnique({
      where: { id: storageBoxId },
      include: { warehouse: true },
    });

    if (!storageBox) {
      return NextResponse.json({ error: "Storage box not found" }, { status: 404 });
    }

    if (storageBox.status !== "AVAILABLE") {
      return NextResponse.json({ error: "Storage box not available" }, { status: 400 });
    }

    // Calculer le montant
    const amount = storageBox.monthlyPrice * duration;

    // Créer le Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: "eur",
      metadata: {
        storageBoxId,
        userId: user.id,
        duration: duration.toString(),
      },
    });

    // Enregistrer la location
    await prisma.storageBox.update({
      where: { id: storageBoxId },
      data: {
        status: "OCCUPIED",
        clientId: user.id,
        rentStartDate: new Date(),
        rentEndDate: new Date(Date.now() + duration * 30 * 24 * 60 * 60 * 1000),
      },
    });

    return NextResponse.json({
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      amount,
      status: paymentIntent.status,
    });
  } catch (error) {
    console.error("Error renting storage box:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
