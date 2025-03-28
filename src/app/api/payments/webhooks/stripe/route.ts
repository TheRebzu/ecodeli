import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import prisma from "@/lib/prisma";
import { headers } from "next/headers";

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2023-10-16",
});
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = headers().get("stripe-signature") || "";

    // Verify webhook signature
    let event: Stripe.Event;
    
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return NextResponse.json({ error: "Webhook signature verification failed" }, { status: 400 });
    }

    // Process different event types
    switch (event.type) {
      case "payment_intent.succeeded":
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;
        
      case "payment_intent.payment_failed":
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;
        
      case "payment_method.attached":
        await handlePaymentMethodAttached(event.data.object as Stripe.PaymentMethod);
        break;
        
      case "charge.refunded":
        await handleChargeRefunded(event.data.object as Stripe.Charge);
        break;
        
      case "charge.dispute.created":
        await handleDisputeCreated(event.data.object as Stripe.Dispute);
        break;
        
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
        
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
    }

    // Return success response
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return NextResponse.json(
      { error: "Error processing webhook" },
      { status: 500 }
    );
  }
}

// Handler for successful payment intents
async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  // Extract payment ID from metadata
  const paymentId = paymentIntent.metadata?.paymentId;
  if (!paymentId) return;

  try {
    // Update payment record
    const payment = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: "COMPLETED",
        receiptUrl: paymentIntent.charges.data[0]?.receipt_url,
        updatedAt: new Date()
      },
      include: {
        delivery: true,
        service: true
      }
    });

    // Update related entity based on payment type
    if (payment.entityType === "DELIVERY" && payment.entityId) {
      await prisma.delivery.update({
        where: { id: payment.entityId },
        data: { status: "PENDING" }
      });
    } else if (payment.entityType === "SERVICE" && payment.entityId) {
      await prisma.service.update({
        where: { id: payment.entityId },
        data: { status: "CONFIRMED" }
      });
    } else if (payment.entityType === "SUBSCRIPTION" && payment.customerId) {
      const customer = await prisma.customer.findUnique({
        where: { id: payment.customerId }
      });
      
      if (customer) {
        // Calculate subscription end date (1 month from now)
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 1);
        
        await prisma.customer.update({
          where: { id: payment.customerId },
          data: {
            subscriptionPlan: "PREMIUM",
            subscriptionStartDate: new Date(),
            subscriptionEndDate: endDate
          }
        });
      }
    }

    // Create notification for payment completion
    if (payment.customerId) {
      await prisma.notification.create({
        data: {
          userId: (await prisma.customer.findUnique({
            where: { id: payment.customerId },
            select: { userId: true }
          }))?.userId || "",
          title: "Paiement réussi",
          message: `Votre paiement de ${payment.amount} ${payment.currency} a été traité avec succès.`,
          type: "PAYMENT_UPDATE",
          actionUrl: `/payments/${payment.id}`
        }
      });
    }
  } catch (error) {
    console.error("Error handling payment success:", error);
  }
}

// Handler for failed payment intents
async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  const paymentId = paymentIntent.metadata?.paymentId;
  if (!paymentId) return;

  try {
    // Update payment record
    const payment = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: "FAILED",
        updatedAt: new Date()
      }
    });

    // Create notification for payment failure
    if (payment.customerId) {
      await prisma.notification.create({
        data: {
          userId: (await prisma.customer.findUnique({
            where: { id: payment.customerId },
            select: { userId: true }
          }))?.userId || "",
          title: "Échec du paiement",
          message: `Votre paiement de ${payment.amount} ${payment.currency} a échoué. Veuillez vérifier vos informations de paiement.`,
          type: "PAYMENT_UPDATE",
          actionUrl: `/payments/${payment.id}`
        }
      });
    }
  } catch (error) {
    console.error("Error handling payment failure:", error);
  }
}

// Handler for new payment methods
async function handlePaymentMethodAttached(paymentMethod: Stripe.PaymentMethod) {
  try {
    // Get customer
    const customer = await stripe.customers.retrieve(
      paymentMethod.customer as string
    ) as Stripe.Customer;
    
    // Update user's default payment method if this is the only one
    const allMethods = await stripe.paymentMethods.list({
      customer: paymentMethod.customer as string,
      type: paymentMethod.type
    });
    
    if (allMethods.data.length === 1) {
      await stripe.customers.update(
        paymentMethod.customer as string,
        { invoice_settings: { default_payment_method: paymentMethod.id } }
      );
      
      await stripe.paymentMethods.update(
        paymentMethod.id,
        { metadata: { isDefault: "true" } }
      );
    }
    
    // Log the new payment method in system
    if (customer.metadata?.userId) {
      console.log(`Payment method ${paymentMethod.id} attached to user ${customer.metadata.userId}`);
    }
  } catch (error) {
    console.error("Error handling new payment method:", error);
  }
}

// Handler for refunded charges
async function handleChargeRefunded(charge: Stripe.Charge) {
  if (!charge.payment_intent) return;
  
  try {
    // Find payment by Stripe payment intent ID
    const payment = await prisma.payment.findFirst({
      where: { stripePaymentId: charge.payment_intent as string }
    });
    
    if (!payment) return;
    
    // Update payment status
    await prisma.payment.update({
      where: { id: payment.id },
      data: { 
        status: charge.refunded ? "REFUNDED" : "COMPLETED",
        updatedAt: new Date()
      }
    });
    
    // Create refund record
    if (charge.refunded) {
      await prisma.refund.create({
        data: {
          paymentId: payment.id,
          amount: charge.amount_refunded ? charge.amount_refunded / 100 : payment.amount,
          currency: charge.currency.toUpperCase(),
          status: "COMPLETED",
          stripeRefundId: charge.refunds.data[0]?.id,
          reason: "CUSTOMER_REQUEST",
          description: "Refund processed through Stripe",
          initiatedBy: "system",
          processedAt: new Date()
        }
      });
      
      // Create notification for refund
      if (payment.customerId) {
        await prisma.notification.create({
          data: {
            userId: (await prisma.customer.findUnique({
              where: { id: payment.customerId },
              select: { userId: true }
            }))?.userId || "",
            title: "Remboursement traité",
            message: `Votre remboursement de ${charge.amount_refunded ? charge.amount_refunded / 100 : payment.amount} ${charge.currency.toUpperCase()} a été traité.`,
            type: "PAYMENT_UPDATE",
            actionUrl: `/payments/${payment.id}`
          }
        });
      }
    }
  } catch (error) {
    console.error("Error handling refund:", error);
  }
}

// Handler for disputes
async function handleDisputeCreated(dispute: Stripe.Dispute) {
  if (!dispute.payment_intent) return;
  
  try {
    // Find payment by Stripe payment intent ID
    const payment = await prisma.payment.findFirst({
      where: { stripePaymentId: dispute.payment_intent as string }
    });
    
    if (!payment) return;
    
    // Create support ticket for the dispute
    await prisma.supportTicket.create({
      data: {
        userId: (await prisma.customer.findUnique({
          where: { id: payment.customerId || "" },
          select: { userId: true }
        }))?.userId || "",
        subject: `Litige de paiement - ${payment.id}`,
        description: `Un litige a été ouvert pour le paiement ${payment.id} (${payment.amount} ${payment.currency}). Raison: ${dispute.reason}`,
        priority: "HIGH",
        status: "OPEN",
        category: "BILLING"
      }
    });
    
    // Create notification for admin about dispute
    const admins = await prisma.admin.findMany({
      select: { userId: true }
    });
    
    for (const admin of admins) {
      await prisma.notification.create({
        data: {
          userId: admin.userId,
          title: "Nouveau litige de paiement",
          message: `Un litige a été ouvert pour le paiement ${payment.id}. Veuillez vérifier le tableau de bord Stripe.`,
          type: "PAYMENT_UPDATE",
          actionUrl: `/admin/payments/disputes`
        }
      });
    }
  } catch (error) {
    console.error("Error handling dispute:", error);
  }
}

// Handler for subscription updates
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  try {
    // Find user by customer ID
    const user = await prisma.user.findFirst({
      where: { stripeCustomerId: subscription.customer as string },
      include: { customer: true }
    });
    
    if (!user || !user.customer) return;
    
    // Determine subscription plan based on price
    let subscriptionPlan = "FREE";
    if (subscription.items.data.some(item => item.price.product === process.env.STRIPE_PREMIUM_PRODUCT_ID)) {
      subscriptionPlan = "PREMIUM";
    } else if (subscription.items.data.some(item => item.price.product === process.env.STRIPE_PRO_PRODUCT_ID)) {
      subscriptionPlan = "PRO";
    }
    
    // Update customer subscription details
    await prisma.customer.update({
      where: { id: user.customer.id },
      data: {
        subscriptionPlan,
        subscriptionStartDate: new Date(subscription.current_period_start * 1000),
        subscriptionEndDate: new Date(subscription.current_period_end * 1000)
      }
    });
    
    // Create notification for subscription update
    await prisma.notification.create({
      data: {
        userId: user.id,
        title: "Abonnement mis à jour",
        message: `Votre abonnement a été mis à jour vers ${subscriptionPlan}.`,
        type: "INFO",
        actionUrl: `/account/subscription`
      }
    });
  } catch (error) {
    console.error("Error handling subscription update:", error);
  }
}

// Handler for subscription cancellations
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  try {
    // Find user by customer ID
    const user = await prisma.user.findFirst({
      where: { stripeCustomerId: subscription.customer as string },
      include: { customer: true }
    });
    
    if (!user || !user.customer) return;
    
    // Update customer subscription details
    await prisma.customer.update({
      where: { id: user.customer.id },
      data: {
        subscriptionPlan: "FREE",
        subscriptionEndDate: new Date(subscription.canceled_at ? subscription.canceled_at * 1000 : Date.now())
      }
    });
    
    // Create notification for subscription cancellation
    await prisma.notification.create({
      data: {
        userId: user.id,
        title: "Abonnement annulé",
        message: "Votre abonnement a été annulé. Vous serez rétrogradé à un compte gratuit à la fin de la période de facturation actuelle.",
        type: "INFO",
        actionUrl: `/account/subscription`
      }
    });
  } catch (error) {
    console.error("Error handling subscription cancellation:", error);
  }
} 