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

// Schema for payment confirmation
const confirmPaymentSchema = z.object({
  paymentId: z.string(),
  paymentMethodId: z.string().optional(), 
  stripePaymentIntentId: z.string().optional(),
  verificationCode: z.string().optional(), // For bank transfers or other methods
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
    const validation = confirmPaymentSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: "Données invalides", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { paymentId, paymentMethodId, stripePaymentIntentId, verificationCode } = validation.data;

    // Fetch payment from database
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId }
    });

    if (!payment) {
      return NextResponse.json({ error: "Paiement introuvable" }, { status: 404 });
    }

    // Check if payment is already completed
    if (payment.status === "COMPLETED") {
      return NextResponse.json({
        paymentId,
        status: "COMPLETED",
        message: "Le paiement a déjà été traité"
      });
    }

    // Check if payment is already failed
    if (payment.status === "FAILED") {
      return NextResponse.json({
        paymentId,
        status: "FAILED",
        message: "Le paiement a échoué et ne peut être confirmé"
      }, { status: 400 });
    }

    // Handle confirmation based on payment method
    if (["CREDIT_CARD", "APPLE_PAY", "GOOGLE_PAY"].includes(payment.paymentMethod)) {
      // For Stripe payments, confirm using paymentIntentId
      const intentId = stripePaymentIntentId || payment.stripePaymentId;
      
      if (!intentId) {
        return NextResponse.json(
          { error: "ID d'intention de paiement Stripe manquant" },
          { status: 400 }
        );
      }

      try {
        // Verify payment intent status
        const paymentIntent = await stripe.paymentIntents.retrieve(intentId);
        
        if (paymentIntent.status === "succeeded") {
          // Update payment status to completed
          await prisma.payment.update({
            where: { id: paymentId },
            data: {
              status: "COMPLETED",
              updatedAt: new Date(),
              receiptUrl: paymentIntent.charges.data[0]?.receipt_url
            }
          });

          // Update related entity status based on entity type
          await updateEntityStatus(payment.entityType, payment.entityId, "PAID");

          return NextResponse.json({
            paymentId,
            status: "COMPLETED",
            receiptUrl: paymentIntent.charges.data[0]?.receipt_url
          });
        } else if (paymentIntent.status === "requires_payment_method" ||
                  paymentIntent.status === "requires_action") {
          // Payment requires further action
          return NextResponse.json({
            paymentId,
            status: "PENDING",
            requiresAction: true,
            clientSecret: paymentIntent.client_secret
          });
        } else if (paymentIntent.status === "canceled") {
          // Payment was canceled
          await prisma.payment.update({
            where: { id: paymentId },
            data: { status: "FAILED", updatedAt: new Date() }
          });
          
          return NextResponse.json({
            paymentId,
            status: "FAILED",
            message: "Le paiement a été annulé"
          }, { status: 400 });
        } else {
          // Other statuses - payment is still processing
          return NextResponse.json({
            paymentId,
            status: "PROCESSING",
            message: "Le paiement est en cours de traitement"
          });
        }
      } catch (stripeError) {
        console.error("Stripe error:", stripeError);
        await prisma.payment.update({
          where: { id: paymentId },
          data: { status: "FAILED", updatedAt: new Date() }
        });
        
        return NextResponse.json({
          paymentId,
          status: "FAILED",
          message: "Erreur lors de la vérification du paiement"
        }, { status: 500 });
      }
    } else if (payment.paymentMethod === "PAYPAL") {
      // PayPal confirmation would go here
      // This is a placeholder for PayPal integration
      
      // For demo purposes, we'll just mark it as completed
      await prisma.payment.update({
        where: { id: paymentId },
        data: { status: "COMPLETED", updatedAt: new Date() }
      });
      
      // Update related entity status
      await updateEntityStatus(payment.entityType, payment.entityId, "PAID");
      
      return NextResponse.json({
        paymentId,
        status: "COMPLETED"
      });
    } else if (payment.paymentMethod === "BANK_TRANSFER") {
      // For bank transfers, we might verify against a reference code
      if (!verificationCode) {
        return NextResponse.json(
          { error: "Code de vérification requis pour les virements bancaires" },
          { status: 400 }
        );
      }
      
      // In a real system, you would verify the code against expected transfer information
      // This is a simplified demo version
      if (verificationCode === "DEMO123" || verificationCode === payment.id.substring(0, 8)) {
        await prisma.payment.update({
          where: { id: paymentId },
          data: { status: "COMPLETED", updatedAt: new Date() }
        });
        
        // Update related entity status
        await updateEntityStatus(payment.entityType, payment.entityId, "PAID");
        
        return NextResponse.json({
          paymentId,
          status: "COMPLETED"
        });
      } else {
        return NextResponse.json({
          error: "Code de vérification invalide"
        }, { status: 400 });
      }
    } else if (payment.paymentMethod === "CASH") {
      // For cash payments, we might have an admin or delivery person confirm receipt
      // For demo, we'll just mark it as completed
      await prisma.payment.update({
        where: { id: paymentId },
        data: { status: "COMPLETED", updatedAt: new Date() }
      });
      
      // Update related entity status
      await updateEntityStatus(payment.entityType, payment.entityId, "PAID");
      
      return NextResponse.json({
        paymentId,
        status: "COMPLETED"
      });
    }

    // For any other payment method
    return NextResponse.json({
      paymentId,
      status: payment.status,
      message: "La méthode de paiement n'est pas prise en charge pour la confirmation"
    }, { status: 400 });
  } catch (error) {
    console.error("Error confirming payment:", error);
    return NextResponse.json(
      { error: "Erreur lors de la confirmation du paiement" },
      { status: 500 }
    );
  }
}

// Helper function to update the related entity's status
async function updateEntityStatus(entityType: string, entityId: string, status: string) {
  try {
    switch (entityType) {
      case "DELIVERY":
        await prisma.delivery.update({
          where: { id: entityId },
          data: { status: "PENDING" } // Move to next state after payment
        });
        break;
      
      case "SERVICE":
        await prisma.service.update({
          where: { id: entityId },
          data: { status: "CONFIRMED" } // Move to confirmed state after payment
        });
        break;
      
      case "SUBSCRIPTION":
        // Update customer subscription status
        const payment = await prisma.payment.findFirst({
          where: { entityId, entityType }
        });
        
        if (payment?.customerId) {
          const customer = await prisma.customer.findUnique({
            where: { id: payment.customerId }
          });
          
          if (customer) {
            // Calculate new subscription end date (e.g., add 30 days for monthly)
            const currentEndDate = customer.subscriptionEndDate || new Date();
            const newEndDate = new Date(currentEndDate);
            newEndDate.setDate(newEndDate.getDate() + 30);
            
            await prisma.customer.update({
              where: { id: payment.customerId },
              data: {
                subscriptionPlan: "PREMIUM", // Example: upgrade to premium
                subscriptionStartDate: customer.subscriptionStartDate || new Date(),
                subscriptionEndDate: newEndDate
              }
            });
          }
        }
        break;
      
      case "FOREIGN_PURCHASE":
        await prisma.foreignPurchase.update({
          where: { id: entityId },
          data: { status: "REQUESTED" } // Update to appropriate status
        });
        break;
      
      case "CART_DROP":
        await prisma.cartDrop.update({
          where: { id: entityId },
          data: { status: "PROCESSING" } // Move to processing after payment
        });
        break;
    }
  } catch (error) {
    console.error(`Error updating ${entityType} status:`, error);
    // We don't throw here to avoid breaking the payment confirmation flow
    // The payment is still considered successful even if entity update fails
  }
} 