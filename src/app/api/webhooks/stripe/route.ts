// Webhook Stripe pour traiter les �v�nements de paiement EcoDeli
import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { db as prisma } from "@/lib/db";
import { OneSignalService } from "@/lib/onesignal";
import { SubscriptionService } from "@/features/payments/services/subscription.service";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-06-30.basil",
});

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get("stripe-signature")!;

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, endpointSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    // Traitement des �v�nements Stripe
    switch (event.type) {
      case "payment_intent.succeeded":
        await handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;

      case "payment_intent.payment_failed":
        await handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      case "customer.subscription.created":
        await handleSubscriptionCreated(event.data.object);
        break;

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionCancelled(event.data.object);
        break;

      case "invoice.payment_succeeded":
        await handleInvoicePaymentSucceeded(
          event.data.object as Stripe.Invoice,
        );
        break;

      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case "charge.dispute.created":
        await handleChargeDispute(event.data.object as Stripe.Dispute);
        break;

      case "transfer.created":
        await handleTransferCreated(event.data.object as Stripe.Transfer);
        break;

      case "payout.paid":
        await handlePayoutPaid(event.data.object as Stripe.Payout);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 },
    );
  }
}

async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  try {
    const payment = await prisma.payment.findUnique({
      where: { stripePaymentId: paymentIntent.id },
      include: {
        user: true,
        client: { include: { user: true } },
        delivery: {
          include: {
            announcement: true,
            deliverer: { include: { user: true } },
          },
        },
        booking: {
          include: {
            service: true,
            provider: { include: { user: true } },
          },
        },
      },
    });

    if (!payment) {
      console.error("Payment not found:", paymentIntent.id);
      return;
    }

    // Mettre � jour le statut du paiement
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "COMPLETED",
        paidAt: new Date(),
        metadata: {
          ...payment.metadata,
          stripeEvent: "payment_intent.succeeded",
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
        },
      },
    });

    // Traitement spécifique selon le type de paiement
    if (payment.delivery) {
      await handleDeliveryPaymentSucceeded(payment, paymentIntent);
    } else if (payment.booking) {
      await handleBookingPaymentSucceeded(payment, paymentIntent);
    } else if (payment.type === "STORAGE_RENTAL") {
      await handleStorageRentalPaymentSucceeded(payment, paymentIntent);
    }

    // Notification � l'utilisateur
    await OneSignalService.notifyPaymentReceived(
      payment.userId,
      paymentIntent.amount / 100,
      payment.delivery ? "livraison" : "service",
      payment.delivery ? "delivery" : "booking",
    );

    // Log d'activit�
    await prisma.activityLog.create({
      data: {
        userId: payment.userId,
        action: "PAYMENT_RECEIVED",
        entityType: payment.delivery ? "DELIVERY" : "BOOKING",
        entityId: payment.delivery?.id || payment.booking?.id || payment.id,
        metadata: {
          amount: paymentIntent.amount / 100,
          currency: paymentIntent.currency,
          stripePaymentId: paymentIntent.id,
        },
      },
    });
  } catch (error) {
    console.error("Error handling payment succeeded:", error);
  }
}

async function handleDeliveryPaymentSucceeded(
  payment: any,
  paymentIntent: Stripe.PaymentIntent,
) {
  const delivery = payment.delivery;
  const amount = paymentIntent.amount / 100;

  // Calculer les commissions
  const platformFee = amount * 0.15; // 15% pour la plateforme
  const delivererFee = amount - platformFee;

      // Utiliser une transaction pour assurer la cohérence
    await prisma.$transaction(async (tx: any) => {
    // Mettre à jour la livraison - maintenant ACCEPTED (prêt pour récupération)
    await tx.delivery.update({
      where: { id: delivery.id },
      data: {
        delivererFee,
        platformFee,
        status: "ACCEPTED", // Le livreur peut maintenant commencer
      },
    });

    // Mettre à jour l'annonce - maintenant IN_PROGRESS (paiement confirmé)
    await tx.announcement.update({
      where: { id: delivery.announcementId },
      data: {
        status: "IN_PROGRESS", // Paiement confirmé, livraison peut commencer
      },
    });

    // Vérifier si le livreur a un portefeuille, sinon le créer
    const delivererWallet = await tx.wallet.upsert({
      where: { userId: delivery.delivererId },
      update: {
        balance: {
          increment: delivererFee,
        },
      },
      create: {
        userId: delivery.delivererId,
        balance: delivererFee,
        currency: "EUR",
      },
    });

    // Créer l'opération de portefeuille (sera payé après validation)
    await tx.walletOperation.create({
      data: {
        walletId: delivererWallet.id,
        userId: delivery.delivererId,
        type: "CREDIT",
        amount: delivererFee,
        description: `Paiement livraison: ${delivery.announcement.title}`,
        reference: delivery.id,
        status: "PENDING", // Sera confirmé après validation de livraison
        scheduledAt: new Date(), // Disponible immédiatement mais retenu
      },
    });
  });

  // Notification au livreur
  await OneSignalService.sendToUser(
    delivery.delivererId,
    "Paiement confirmé - Récupération autorisée !",
    `Le client a payé pour "${delivery.announcement.title}". Vous pouvez maintenant récupérer le colis.`,
    {
      type: "payment_confirmed",
      deliveryId: delivery.id,
      amount: delivererFee,
      action: "start_pickup",
    },
  );

  // Notification au client
  await OneSignalService.sendToUser(
    delivery.clientId,
    "Paiement confirmé - Livraison en cours",
    "Votre paiement a été confirmé. Le livreur va maintenant récupérer votre colis.",
    {
      type: "payment_confirmed",
      deliveryId: delivery.id,
      trackingUrl: `/client/deliveries/${delivery.id}/tracking`,
    },
  );
}

async function handleBookingPaymentSucceeded(
  payment: any,
  paymentIntent: Stripe.PaymentIntent,
) {
  const booking = payment.booking;
  const amount = paymentIntent.amount / 100;

  // Calculer les commissions
  const platformFee = amount * 0.15; // 15% pour la plateforme
  const providerFee = amount - platformFee;

  // Mettre � jour la r�servation
  await prisma.booking.update({
    where: { id: booking.id },
    data: {
      status: "CONFIRMED",
    },
  });

  // Le paiement du prestataire sera trait� lors de la facturation mensuelle
  // On cr�e juste un record pour le tracking
  await prisma.walletOperation.create({
    data: {
      walletId: booking.provider.user.wallet?.id || "",
      userId: booking.provider.user.id,
      type: "CREDIT",
      amount: providerFee,
      description: `R�servation: ${booking.service.name}`,
      reference: booking.id,
      status: "PENDING", // Sera pay� en fin de mois
    },
  });

  // Notification au prestataire
  await OneSignalService.notifyNewBooking(
    booking.provider.user.id,
    booking.id,
    booking.service.name,
    booking.client.user.name || "Client",
    booking.scheduledDate.toLocaleDateString("fr-FR"),
    amount,
  );
}

async function handleStorageRentalPaymentSucceeded(
  payment: any,
  paymentIntent: Stripe.PaymentIntent,
) {
  try {
    const amount = paymentIntent.amount / 100;

    // Récupérer les informations de la location depuis les métadonnées du paiement
    const metadata = payment.metadata as any;
    const rentalId = metadata.rentalId;

    if (!rentalId) {
      console.error("Rental ID not found in payment metadata");
      return;
    }

    // Mettre à jour la location existante
    const rental = await prisma.storageBoxRental.update({
      where: { id: rentalId },
      data: {
        isPaid: true,
      },
      include: {
        storageBox: {
          include: {
            location: true,
          },
        },
        client: {
          include: {
            user: true,
          },
        },
      },
    });

    // Marquer la box comme occupée
    await prisma.storageBox.update({
      where: { id: rental.storageBoxId },
      data: {
        isAvailable: false,
      },
    });

    // Mettre à jour le paiement
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "COMPLETED",
        paidAt: new Date(),
        metadata: {
          ...payment.metadata,
          stripeEvent: "payment_intent.succeeded",
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          rentalId: rental.id,
        },
      },
    });

    // Notification au client
    await OneSignalService.sendToUser(
      payment.userId,
      "Paiement confirmé - Location de stockage",
      `Votre paiement de ${amount}€ pour la location de stockage a été confirmé. Votre box ${rental.storageBox.boxNumber} est maintenant active.`,
      {
        type: "storage_rental_confirmed",
        rentalId: rental.id,
        amount: amount,
        boxNumber: rental.storageBox.boxNumber,
        location: rental.storageBox.location.name,
      },
    );

    console.log("Location activée après paiement réussi:", {
      rentalId: rental.id,
      paymentId: payment.id,
      amount: amount,
      boxNumber: rental.storageBox.boxNumber,
    });
  } catch (error) {
    console.error(
      "Erreur lors de l'activation de la location après paiement:",
      error,
    );

    // En cas d'erreur, marquer le paiement comme échoué
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "FAILED",
        failedAt: new Date(),
        metadata: {
          ...payment.metadata,
          error:
            error instanceof Error ? error.message : "Erreur activation location",
        },
      },
    });
  }
}

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  try {
    const payment = await prisma.payment.findUnique({
      where: { stripePaymentId: paymentIntent.id },
      include: {
        user: true,
        client: { include: { user: true } },
        delivery: {
          include: {
            announcement: true,
            deliverer: { include: { user: true } },
          },
        },
        booking: {
          include: {
            service: true,
            provider: { include: { user: true } },
          },
        },
      },
    });

    if (!payment) {
      console.error("Payment not found for failed payment:", paymentIntent.id);
      return;
    }

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "FAILED",
        failedAt: new Date(),
        metadata: {
          ...payment.metadata,
          stripeEvent: "payment_intent.payment_failed",
          error: paymentIntent.last_payment_error?.message || "Paiement échoué",
        },
      },
    });

    // Traitement spécifique selon le type de paiement
    if (payment.delivery) {
      await handleDeliveryPaymentFailed(payment, paymentIntent);
    } else if (payment.booking) {
      await handleBookingPaymentFailed(payment, paymentIntent);
    } else if (payment.type === "STORAGE_RENTAL") {
      await handleStorageRentalPaymentFailed(payment, paymentIntent);
    }

    // Notification à l'utilisateur
    const amount = paymentIntent.amount / 100;
    const serviceType = payment.delivery
      ? "livraison"
      : payment.booking
        ? "service"
        : "location de stockage";

    await OneSignalService.sendToUser(
      payment.userId,
      "Paiement échoué",
      `Votre paiement de ${amount}€ pour votre ${serviceType} a échoué. Veuillez réessayer.`,
      {
        type: "payment_failed",
        paymentId: payment.id,
        amount: amount,
        serviceType: payment.delivery
          ? "delivery"
          : payment.booking
            ? "booking"
            : "storage_rental",
      },
    );
  } catch (error) {
    console.error("Error handling payment failed:", error);
  }
}

async function handleStorageRentalPaymentFailed(
  payment: any,
  paymentIntent: Stripe.PaymentIntent,
) {
  try {
    const amount = paymentIntent.amount / 100;

    console.log("Échec de paiement pour location de stockage:", {
      paymentId: payment.id,
      amount: amount,
      error: paymentIntent.last_payment_error?.message,
    });

    // Pas besoin de créer de location car le paiement a échoué
    // Le box reste disponible pour d'autres clients
  } catch (error) {
    console.error(
      "Erreur lors du traitement de l'échec de paiement location:",
      error,
    );
  }
}

async function handleDeliveryPaymentFailed(
  payment: any,
  paymentIntent: Stripe.PaymentIntent,
) {
  try {
    const delivery = payment.delivery;
    const amount = paymentIntent.amount / 100;

    console.log("Échec de paiement pour livraison:", {
      deliveryId: delivery?.id,
      paymentId: payment.id,
      amount: amount,
      error: paymentIntent.last_payment_error?.message,
    });

    // Marquer la livraison comme échouée
    if (delivery) {
      await prisma.delivery.update({
        where: { id: delivery.id },
        data: {
          status: "CANCELLED",
        },
      });
    }
  } catch (error) {
    console.error(
      "Erreur lors du traitement de l'échec de paiement livraison:",
      error,
    );
  }
}

async function handleBookingPaymentFailed(
  payment: any,
  paymentIntent: Stripe.PaymentIntent,
) {
  try {
    const booking = payment.booking;
    const amount = paymentIntent.amount / 100;

    console.log("Échec de paiement pour réservation:", {
      bookingId: booking?.id,
      paymentId: payment.id,
      amount: amount,
      error: paymentIntent.last_payment_error?.message,
    });

    // Marquer la réservation comme échouée
    if (booking) {
      await prisma.booking.update({
        where: { id: booking.id },
        data: {
          status: "CANCELLED",
        },
      });
    }
  } catch (error) {
    console.error(
      "Erreur lors du traitement de l'échec de paiement réservation:",
      error,
    );
  }
}

async function handleSubscriptionCreated(subscription: any) {
  try {
    const customerId = subscription.customer as string;

    // Trouver l'utilisateur par customer ID Stripe
    const user = await prisma.user.findFirst({
      where: {
        client: {
          stripeCustomerId: customerId,
        },
      },
      include: { client: true },
    });

    if (!user || !user.client) return;

    // D�terminer le plan d'abonnement
    const plan = subscription.items.data[0]?.price.lookup_key || "STARTER";

    // Mettre � jour l'abonnement client
    await prisma.client.update({
      where: { id: user.client.id },
      data: {
        subscriptionPlan: plan.toUpperCase() as any,
        subscriptionStart: new Date(subscription.current_period_start * 1000),
        subscriptionEnd: new Date(subscription.current_period_end * 1000),
      },
    });

    // Notification de bienvenue
    await OneSignalService.sendToUser(
      user.id,
      "<� Abonnement activ�",
      `Votre abonnement ${plan} est maintenant actif !`,
      {
        type: "subscription_activated",
        plan,
      },
    );
  } catch (error) {
    console.error("Error handling subscription created:", error);
  }
}

async function handleSubscriptionUpdated(subscription: any) {
  try {
    const customerId = subscription.customer as string;

    const user = await prisma.user.findFirst({
      where: {
        client: {
          stripeCustomerId: customerId,
        },
      },
      include: { client: true },
    });

    if (!user || !user.client) return;

    const plan = subscription.items.data[0]?.price.lookup_key || "STARTER";

    await prisma.client.update({
      where: { id: user.client.id },
      data: {
        subscriptionPlan: plan.toUpperCase() as any,
        subscriptionEnd: new Date(subscription.current_period_end * 1000),
      },
    });
  } catch (error) {
    console.error("Error handling subscription updated:", error);
  }
}

async function handleSubscriptionCancelled(subscription: any) {
  try {
    const customerId = subscription.customer as string;

    const user = await prisma.user.findFirst({
      where: {
        client: {
          stripeCustomerId: customerId,
        },
      },
      include: { client: true },
    });

    if (!user || !user.client) return;

    await prisma.client.update({
      where: { id: user.client.id },
      data: {
        subscriptionPlan: "FREE",
        subscriptionEnd: new Date(),
      },
    });

    await OneSignalService.sendToUser(
      user.id,
      "Abonnement annul�",
      "Votre abonnement a �t� annul�. Vous avez �t� r�trograd� au plan gratuit.",
      {
        type: "subscription_cancelled",
      },
    );
  } catch (error) {
    console.error("Error handling subscription cancelled:", error);
  }
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  // Traitement des factures pay�es (abonnements, etc.)
  console.log("Invoice payment succeeded:", invoice.id);
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  // Traitement des �checs de paiement de factures
  console.log("Invoice payment failed:", invoice.id);
}

async function handleChargeDispute(dispute: Stripe.Dispute) {
  // Notifier les admins d'un litige
  await OneSignalService.sendWithFilters(
    [{ field: "tag", key: "role", relation: "=", value: "ADMIN" }],
    "� Nouveau litige",
    `Un litige de ${dispute.amount / 100}� a �t� ouvert (${dispute.reason})`,
    {
      type: "charge_dispute",
      disputeId: dispute.id,
      amount: dispute.amount / 100,
      reason: dispute.reason,
    },
  );
}

async function handleTransferCreated(transfer: Stripe.Transfer) {
  // Log des transferts vers les comptes connect�s
  console.log("Transfer created:", transfer.id, transfer.amount / 100);
}

async function handlePayoutPaid(payout: Stripe.Payout) {
  // Traitement des virements effectu�s
  console.log("Payout paid:", payout.id, payout.amount / 100);
}
