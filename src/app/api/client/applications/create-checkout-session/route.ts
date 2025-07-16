import { NextRequest, NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth/utils";
import { z } from "zod";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";

const checkoutSessionSchema = z.object({
  applicationId: z.string(),
  amount: z.number().positive(),
  currency: z.string().default("EUR"),
  description: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    console.log(
      "🔍 [POST /api/client/applications/create-checkout-session] Création session Stripe Checkout",
    );

    const user = await getUserFromSession(request);
    if (!user || user.role !== "CLIENT") {
      console.log("❌ Utilisateur non authentifié ou non client");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Vérifier si Stripe est configuré
    let stripe;
    try {
      stripe = getStripe();
    } catch (error) {
      console.log("❌ Stripe not configured:", error.message);
      return NextResponse.json(
        { error: "Payment system not configured" },
        { status: 503 }
      );
    }

    const body = await request.json();
    const validatedData = checkoutSessionSchema.parse(body);

    // Vérifier que l'application existe
    const application = await prisma.serviceApplication.findUnique({
      where: { id: validatedData.applicationId },
      include: {
        announcement: true,
        provider: true,
      },
    });

    if (!application) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    // Créer la session Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: validatedData.currency.toLowerCase(),
            product_data: {
              name: validatedData.description,
            },
            unit_amount: Math.round(validatedData.amount * 100),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.NEXTAUTH_URL}/client/applications/success?session_id={CHECKOUT_SESSION_ID}&application_id=${validatedData.applicationId}`,
      cancel_url: `${process.env.NEXTAUTH_URL}/client/applications/cancel`,
      metadata: {
        applicationId: validatedData.applicationId,
        userId: user.id,
        amount: validatedData.amount.toString(),
      },
    });

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error("❌ Error creating checkout session:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.issues },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
