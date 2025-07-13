import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { StripeService } from "@/features/payments/services/stripe.service";

const paymentSchema = z.object({
  rentalId: z.string().cuid(),
});

/**
 * POST - Créer un Payment Intent pour une location de storage box
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "CLIENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = paymentSchema.parse(body);

    // Créer le Payment Intent
    const paymentIntent = await StripeService.createStorageRentalPaymentIntent(
      validatedData.rentalId,
      session.user.id,
    );

    return NextResponse.json({
      success: true,
      payment: {
        clientSecret: paymentIntent.clientSecret,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        id: paymentIntent.id,
      },
    });
  } catch (error) {
    console.error("Error creating storage payment intent:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Données invalides",
          details: error.errors.map((e) => ({
            field: e.path.join("."),
            message: e.message,
          })),
        },
        { status: 400 },
      );
    }

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Erreur lors de la création du paiement" },
      { status: 500 },
    );
  }
}
