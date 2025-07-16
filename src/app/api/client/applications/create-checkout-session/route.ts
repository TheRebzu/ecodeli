import { NextRequest, NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth/utils";
import { z } from "zod";
import { getStripe } from "@/lib/stripe";

const checkoutSessionSchema = z.object({
  applicationId: z.string(),
  amount: z.number().positive(),
  currency: z.string().default("EUR"),
  description: z.string(),
  paymentIntentId: z.string(),
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
      success_url: `${process.env.NEXTAUTH_URL}/client/applications/success`,
      cancel_url: `${process.env.NEXTAUTH_URL}/client/applications/cancel`,
      metadata: {
        applicationId: validatedData.applicationId,
        userId: user.id,
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
