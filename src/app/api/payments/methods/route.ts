import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import Stripe from "stripe";

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2023-10-16",
});

// Schema for adding a new payment method
const addPaymentMethodSchema = z.object({
  type: z.enum(["CREDIT_CARD", "PAYPAL", "BANK_ACCOUNT"]),
  default: z.boolean().default(false),
  data: z.object({
    // Credit card data
    token: z.string().optional(), // Stripe token for credit card
    
    // PayPal data
    paypalEmail: z.string().email().optional(),
    
    // Bank account data
    accountNumber: z.string().optional(),
    routingNumber: z.string().optional(),
    accountType: z.enum(["CHECKING", "SAVINGS"]).optional(),
    accountHolderName: z.string().optional(),
    bankName: z.string().optional(),
    
    // Additional information
    billingAddress: z.object({
      line1: z.string().optional(),
      line2: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      postalCode: z.string().optional(),
      country: z.string().optional(),
    }).optional(),
  })
});

// GET: Get payment methods
export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Get user's Stripe customer ID
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { stripeCustomerId: true }
    });

    let stripePaymentMethods: any[] = [];
    
    // If user has a Stripe customer ID, get their payment methods
    if (user?.stripeCustomerId) {
      const stripeData = await stripe.paymentMethods.list({
        customer: user.stripeCustomerId,
        type: 'card'
      });

      // Format Stripe payment methods
      stripePaymentMethods = stripeData.data.map(method => ({
        id: method.id,
        type: "CREDIT_CARD",
        provider: "STRIPE",
        last4: method.card?.last4 || "****",
        brand: method.card?.brand || "unknown",
        expiryMonth: method.card?.exp_month,
        expiryYear: method.card?.exp_year,
        isDefault: method.metadata?.isDefault === "true"
      }));
    }

    // Get user's payment methods from database (like bank accounts, PayPal, etc.)
    const dbPaymentMethods = await prisma.paymentMethod.findMany({
      where: { userId: session.user.id }
    });

    // Combine payment methods and return
    return NextResponse.json({
      paymentMethods: [...stripePaymentMethods, ...dbPaymentMethods]
    });
  } catch (error) {
    console.error("Error fetching payment methods:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des méthodes de paiement" },
      { status: 500 }
    );
  }
}

// POST: Add a new payment method
export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Parse request body
    const body = await req.json();
    const validation = addPaymentMethodSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: "Données invalides", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { type, default: isDefault, data } = validation.data;

    // If setting this as default, first unset any existing default
    if (isDefault) {
      await prisma.paymentMethod.updateMany({
        where: { 
          userId: session.user.id,
          isDefault: true
        },
        data: { isDefault: false }
      });
    }

    // Handle different payment method types
    if (type === "CREDIT_CARD") {
      if (!data.token) {
        return NextResponse.json(
          { error: "Token Stripe requis pour les cartes de crédit" },
          { status: 400 }
        );
      }

      // Get or create Stripe customer
      let stripeCustomerId = await getOrCreateStripeCustomer(session.user.id);

      try {
        // Attach payment method to customer
        const paymentMethod = await stripe.paymentMethods.attach(
          data.token,
          { customer: stripeCustomerId }
        );

        // Update payment method metadata
        await stripe.paymentMethods.update(
          data.token,
          { metadata: { isDefault: isDefault ? "true" : "false" } }
        );

        // If default, update customer's default payment method
        if (isDefault) {
          await stripe.customers.update(
            stripeCustomerId,
            { invoice_settings: { default_payment_method: data.token } }
          );
        }

        return NextResponse.json({
          id: paymentMethod.id,
          type: "CREDIT_CARD",
          provider: "STRIPE",
          last4: paymentMethod.card?.last4 || "****",
          brand: paymentMethod.card?.brand || "unknown",
          expiryMonth: paymentMethod.card?.exp_month,
          expiryYear: paymentMethod.card?.exp_year,
          isDefault
        });
      } catch (stripeError) {
        console.error("Stripe error:", stripeError);
        return NextResponse.json(
          { error: "Erreur lors de l'ajout de la carte de crédit" },
          { status: 500 }
        );
      }
    } else if (type === "PAYPAL") {
      if (!data.paypalEmail) {
        return NextResponse.json(
          { error: "Email PayPal requis" },
          { status: 400 }
        );
      }

      // Create PayPal payment method in database
      const paymentMethod = await prisma.paymentMethod.create({
        data: {
          type,
          provider: "PAYPAL",
          isDefault,
          data: {
            email: data.paypalEmail,
            billingAddress: data.billingAddress
          },
          user: { connect: { id: session.user.id } }
        }
      });

      return NextResponse.json({
        id: paymentMethod.id,
        type: "PAYPAL",
        provider: "PAYPAL",
        email: data.paypalEmail,
        isDefault
      });
    } else if (type === "BANK_ACCOUNT") {
      // Validate required fields
      if (!data.accountNumber || 
          !data.routingNumber || 
          !data.accountType || 
          !data.accountHolderName || 
          !data.bankName) {
        return NextResponse.json(
          { error: "Informations bancaires incomplètes" },
          { status: 400 }
        );
      }

      // Create bank account payment method in database
      const paymentMethod = await prisma.paymentMethod.create({
        data: {
          type,
          provider: "BANK",
          isDefault,
          data: {
            accountLast4: data.accountNumber.slice(-4),
            bankName: data.bankName,
            accountType: data.accountType,
            accountHolderName: data.accountHolderName,
            billingAddress: data.billingAddress
          },
          user: { connect: { id: session.user.id } }
        }
      });

      return NextResponse.json({
        id: paymentMethod.id,
        type: "BANK_ACCOUNT",
        provider: "BANK",
        bankName: data.bankName,
        accountType: data.accountType,
        accountLast4: data.accountNumber.slice(-4),
        isDefault
      });
    }

    return NextResponse.json(
      { error: "Type de méthode de paiement non pris en charge" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error adding payment method:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'ajout de la méthode de paiement" },
      { status: 500 }
    );
  }
}

// Helper function to get or create a Stripe customer
async function getOrCreateStripeCustomer(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true, email: true, name: true }
  });

  if (user?.stripeCustomerId) {
    return user.stripeCustomerId;
  }

  // Create a new Stripe customer
  const customer = await stripe.customers.create({
    email: user?.email || undefined,
    name: user?.name || undefined,
    metadata: { userId }
  });

  // Update user with new Stripe customer ID
  await prisma.user.update({
    where: { id: userId },
    data: { stripeCustomerId: customer.id }
  });

  return customer.id;
} 