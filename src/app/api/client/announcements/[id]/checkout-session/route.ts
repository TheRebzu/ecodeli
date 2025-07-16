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

    const { id } = await params;
    
    // Parse le body JSON avec gestion d'erreur
    let requestBody;
    try {
      const bodyText = await request.text();
      console.log("Request body text:", bodyText);
      
      if (!bodyText || bodyText.trim() === '') {
        requestBody = {};
      } else {
        requestBody = JSON.parse(bodyText);
      }
    } catch (error) {
      console.error("Error parsing request body:", error);
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const { amount, currency = "eur" } = requestBody;

    // Vérifier l'annonce
    const announcement = await prisma.announcement.findUnique({
      where: { id },
      include: { author: true }
    });

    if (!announcement) {
      return NextResponse.json({ error: "Announcement not found" }, { status: 404 });
    }

    // Utiliser le prix de l'annonce si amount n'est pas fourni
    // Préférer finalPrice, puis basePrice
    const announcementPrice = announcement.finalPrice || announcement.basePrice;
    const paymentAmount = amount ? Number(amount) : announcementPrice;
    
    console.log("Price calculation:", {
      requestAmount: amount,
      announcementBasePrice: announcement.basePrice,
      announcementFinalPrice: announcement.finalPrice,
      calculatedPaymentAmount: paymentAmount
    });
    
    if (!paymentAmount || paymentAmount <= 0) {
      return NextResponse.json(
        { 
          error: "Invalid payment amount", 
          details: `Amount: ${paymentAmount}, Base price: ${announcement.basePrice}, Final price: ${announcement.finalPrice}` 
        },
        { status: 400 }
      );
    }

    console.log("Creating checkout session for:", {
      announcementId: id,
      amount: paymentAmount,
      currency,
      userId: session.user.id
    });

    // Créer la session de checkout
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency,
            product_data: {
              name: announcement.title,
              description: announcement.description.substring(0, 200),
            },
            unit_amount: Math.round(paymentAmount * 100),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.NEXTAUTH_URL}/client/announcements/${id}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXTAUTH_URL}/client/announcements/${id}/cancel`,
      metadata: {
        announcementId: id,
        userId: session.user.id,
        amount: paymentAmount.toString(),
      },
    });

    console.log("Checkout session created successfully:", checkoutSession.id);

    return NextResponse.json({
      sessionId: checkoutSession.id,
      url: checkoutSession.url,
    });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    
    // Log plus détaillé de l'erreur
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
} 