import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import prisma from "@/lib/prisma";
import Stripe from "stripe";

// Initialize Stripe with secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2023-10-16",
});

// Schema for payment intent creation
const paymentIntentSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().default("EUR"),
  description: z.string().optional(),
  entityType: z.enum(["DELIVERY", "SERVICE", "SUBSCRIPTION", "FOREIGN_PURCHASE", "CART_DROP"]),
  entityId: z.string(),
  paymentMethod: z.enum([
    "CREDIT_CARD", 
    "PAYPAL", 
    "BANK_TRANSFER", 
    "WALLET", 
    "CASH", 
    "APPLE_PAY", 
    "GOOGLE_PAY"
  ]).default("CREDIT_CARD"),
  metadata: z.record(z.string()).optional(),
});

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Parse request body
    const body = await req.json();
    const validation = paymentIntentSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: "Données invalides", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { amount, currency, description, entityType, entityId, paymentMethod, metadata } = validation.data;

    // Validate entity exists based on entityType
    let entityExists = false;
    let customerId = null;
    let recipientInfo = null;

    switch (entityType) {
      case "DELIVERY":
        const delivery = await prisma.delivery.findUnique({ 
          where: { id: entityId },
          include: { 
            customer: true,
            deliveryPerson: true
          }
        });
        
        if (delivery) {
          entityExists = true;
          customerId = delivery.customerId;
          
          // Set recipient info if it's a payment to a delivery person
          if (delivery.deliveryPersonId) {
            recipientInfo = {
              type: "DELIVERY_PERSON",
              id: delivery.deliveryPersonId
            };
          }
        }
        break;
      
      case "SERVICE":
        const service = await prisma.service.findUnique({ 
          where: { id: entityId },
          include: { 
            customer: true,
            serviceProvider: true
          }
        });
        
        if (service) {
          entityExists = true;
          customerId = service.customerId;
          
          if (service.serviceProviderId) {
            recipientInfo = {
              type: "SERVICE_PROVIDER",
              id: service.serviceProviderId
            };
          }
        }
        break;
      
      case "SUBSCRIPTION":
        // For subscription, we're just checking the customer exists
        const customer = await prisma.customer.findFirst({
          where: { userId: session.user.id }
        });
        
        if (customer) {
          entityExists = true;
          customerId = customer.id;
        }
        break;
      
      case "FOREIGN_PURCHASE":
        const foreignPurchase = await prisma.foreignPurchase.findUnique({
          where: { id: entityId },
          include: { customer: true }
        });
        
        if (foreignPurchase) {
          entityExists = true;
          customerId = foreignPurchase.customerId;
        }
        break;
      
      case "CART_DROP":
        const cartDrop = await prisma.cartDrop.findUnique({
          where: { id: entityId },
          include: { 
            customer: true,
            merchant: true
          }
        });
        
        if (cartDrop) {
          entityExists = true;
          customerId = cartDrop.customerId;
          
          if (cartDrop.merchantId) {
            recipientInfo = {
              type: "MERCHANT",
              id: cartDrop.merchantId
            };
          }
        }
        break;
    }

    if (!entityExists) {
      return NextResponse.json(
        { error: `Entité ${entityType} avec l'identifiant ${entityId} introuvable` },
        { status: 404 }
      );
    }

    // Create payment record in database
    const payment = await prisma.payment.create({
      data: {
        amount,
        currency,
        description: description || `Paiement pour ${entityType} #${entityId}`,
        status: "PENDING",
        paymentMethod,
        entityType,
        entityId,
        metadata: metadata || {},
        customerId,
        ...(recipientInfo?.type === "DELIVERY_PERSON" && { deliveryPersonId: recipientInfo.id }),
        ...(recipientInfo?.type === "SERVICE_PROVIDER" && { serviceProviderId: recipientInfo.id }),
        ...(recipientInfo?.type === "MERCHANT" && { merchantId: recipientInfo.id }),
      }
    });

    // For card payments, create a Stripe payment intent
    if (["CREDIT_CARD", "APPLE_PAY", "GOOGLE_PAY"].includes(paymentMethod)) {
      // Check if customer has a Stripe customer ID, or create one
      let stripeCustomerId;
      const userProfile = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { stripeCustomerId: true, email: true, name: true }
      });

      if (userProfile?.stripeCustomerId) {
        stripeCustomerId = userProfile.stripeCustomerId;
      } else if (userProfile) {
        // Create a new Stripe customer
        const customer = await stripe.customers.create({
          email: userProfile.email || undefined,
          name: userProfile.name || undefined,
        });
        stripeCustomerId = customer.id;
        
        // Update user with Stripe customer ID
        await prisma.user.update({
          where: { id: session.user.id },
          data: { stripeCustomerId: customer.id }
        });
      }

      // Create Stripe payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency.toLowerCase(),
        customer: stripeCustomerId,
        description: description || `Paiement pour ${entityType} #${entityId}`,
        metadata: {
          paymentId: payment.id,
          entityType,
          entityId,
          userId: session.user.id,
          ...metadata
        }
      });

      // Update payment with Stripe payment info
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          stripePaymentId: paymentIntent.id,
          stripeCustomerId,
        }
      });

      // Return client secret for frontend to complete payment
      return NextResponse.json({
        clientSecret: paymentIntent.client_secret,
        paymentId: payment.id,
        stripePaymentId: paymentIntent.id
      });
    } else if (paymentMethod === "PAYPAL") {
      // For PayPal, we would initialize a PayPal payment here
      // This is a placeholder for PayPal integration
      return NextResponse.json({
        paymentId: payment.id,
        redirectUrl: `/api/payments/paypal/initialize?paymentId=${payment.id}`
      });
    } else if (paymentMethod === "WALLET") {
      // For wallet payments, check balance and process immediately
      const wallet = await prisma.wallet.findFirst({
        where: { deliveryPerson: { userId: session.user.id } }
      });

      if (!wallet) {
        return NextResponse.json({ error: "Portefeuille introuvable" }, { status: 404 });
      }

      if (wallet.balance < amount) {
        return NextResponse.json({ error: "Solde insuffisant" }, { status: 400 });
      }

      // Update wallet balance
      await prisma.wallet.update({
        where: { id: wallet.id },
        data: { balance: wallet.balance - amount }
      });

      // Create wallet transaction
      await prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          amount: -amount,
          type: "PAYMENT",
          description: description || `Paiement pour ${entityType} #${entityId}`,
          referenceId: payment.id
        }
      });

      // Update payment to completed
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: "COMPLETED" }
      });

      return NextResponse.json({
        paymentId: payment.id,
        status: "COMPLETED",
        walletTransaction: true
      });
    }

    // Return payment ID for other payment methods
    return NextResponse.json({
      paymentId: payment.id,
      status: "PENDING",
      nextStep: paymentMethod === "BANK_TRANSFER" 
        ? "Veuillez effectuer un virement bancaire en utilisant les instructions envoyées par email"
        : "Votre paiement a été initié"
    });
  } catch (error) {
    console.error("Error creating payment intent:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création du paiement" },
      { status: 500 }
    );
  }
} 