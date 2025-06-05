import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { headers } from 'next/headers';
import { buffer } from 'node:stream/consumers';
import { db } from '@/server/db';
import { PaymentStatus, InvoiceStatus, SubscriptionStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { sendNotification } from '@/server/services/notification.service';
import { paymentService } from '@/server/services/payment.service';

// Initialiser Stripe avec la clé secrète
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-04-30.basil',
});

// Secret pour vérifier la signature du webhook
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

/**
 * Gère les requêtes POST du webhook Stripe
 */
export async function POST(req: NextRequest) {
  // Si nous sommes en mode démo et que la demande n'est pas un événement simulé,
  // nous la redirigeons vers une réponse simulée
  if (process.env.DEMO_MODE === 'true' && !req.headers.get('x-stripe-demo-webhook')) {
    console.log('[DÉMO] Redirection vers une réponse simulée');
    return NextResponse.json({
      received: true,
      demo: true,
      message: 'Mode démonstration activé. Utilisez /api/webhooks/stripe/demo pour les tests.',
    });
  }

  try {
    const body = await req.text();
    const headersList = headers();
    const signature = headersList.get('stripe-signature')!;

    let event: Stripe.Event;

    // En mode démo, nous pouvons accepter un payload direct sans vérification de signature
    if (process.env.DEMO_MODE === 'true' && req.headers.get('x-stripe-demo-webhook')) {
      try {
        event = JSON.parse(body) as Stripe.Event;
      } catch (err) {
        console.error('Erreur de parsing JSON:', err);
        return NextResponse.json({ error: 'Payload JSON invalide' }, { status: 400 });
      }
    } else {
      // Vérifier la signature du webhook
      try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      } catch (err) {
        console.error('Erreur de signature webhook:', err);
        return NextResponse.json({ error: 'Signature invalide' }, { status: 400 });
      }
    }

    // Traiter l'événement selon son type
    try {
      // Journal d'audit pour traçabilité
      await db.auditLog.create({
        data: {
          entityType: 'STRIPE_WEBHOOK',
          entityId: event.id,
          action: event.type,
          performedById: 'system',
          changes: {
            eventType: event.type,
            eventId: event.id,
            demoMode: process.env.DEMO_MODE === 'true' ? 'true' : 'false',
          },
        },
      });

      await handleStripeEvent(event);
      return NextResponse.json({ received: true });
    } catch (error) {
      console.error("Erreur lors du traitement de l'événement:", error);
      return NextResponse.json({ error: 'Erreur lors du traitement' }, { status: 500 });
    }
  } catch (error) {
    console.error('Erreur interne du webhook:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}

/**
 * Traite les différents types d'événements Stripe
 */
async function handleStripeEvent(event: Stripe.Event) {
  console.log(`Traitement de l'événement: ${event.type}`);

  switch (event.type) {
    // Événements liés aux PaymentIntent
    case 'payment_intent.succeeded':
      await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
      break;
    case 'payment_intent.payment_failed':
      await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
      break;

    // Événements liés aux abonnements
    case 'customer.subscription.created':
      await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
      break;
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
      break;
    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
      break;
    case 'invoice.payment_succeeded':
      await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
      break;
    case 'invoice.payment_failed':
      await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
      break;

    // Événements liés aux comptes Connect
    case 'account.updated':
      await handleConnectAccountUpdated(event.data.object as Stripe.Account);
      break;
    case 'payout.created':
      await handlePayoutCreated(event.data.object as Stripe.Payout);
      break;
    case 'payout.failed':
      await handlePayoutFailed(event.data.object as Stripe.Payout);
      break;

    // Événements liés aux disputes (contestations)
    case 'charge.dispute.created':
      await handleDisputeCreated(event.data.object as Stripe.Dispute);
      break;
    case 'charge.dispute.closed':
      await handleDisputeClosed(event.data.object as Stripe.Dispute);
      break;

    // Événements liés aux remboursements
    case 'charge.refunded':
      await handleChargeRefunded(event.data.object as Stripe.Charge);
      break;

    default:
      console.log(`Événement non géré: ${event.type}`);
  }
}

/**
 * Gère un PaymentIntent réussi
 */
async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  const { id, metadata, amount, currency } = paymentIntent;

  // Récupérer les métadonnées
  const userId = metadata?.userId;
  const deliveryId = metadata?.deliveryId;
  const serviceId = metadata?.serviceId;
  const subscriptionId = metadata?.subscriptionId;

  if (!userId) {
    console.error('UserId manquant dans les métadonnées du payment intent');
    return;
  }

  // Récupérer le paiement existant ou en créer un nouveau
  const existingPayment = await db.payment.findFirst({
    where: { paymentIntentId: id },
  });

  if (existingPayment) {
    // Mettre à jour le paiement existant
    const updatedPayment = await db.payment.update({
      where: { id: existingPayment.id },
      data: {
        status: PaymentStatus.COMPLETED,
        stripePaymentId: id,
        updatedAt: new Date(),
        receiptUrl: paymentIntent.charges?.data[0]?.receipt_url || null,
      },
    });

    // Si c'est lié à une livraison, mettre à jour le statut
    if (deliveryId) {
      // Ici, nous ne changeons pas le statut de la livraison automatiquement
      // car il faut attendre la confirmation de réception
      console.log(`Paiement réussi pour la livraison ${deliveryId}`);

      // Notifier le client que le paiement a été accepté
      await sendNotification({
        userId,
        title: 'Paiement de livraison accepté',
        message: `Votre paiement de ${amount / 100}${currency.toUpperCase()} pour la livraison a été accepté.`,
        type: 'PAYMENT_CONFIRMED',
        link: `/client/deliveries/${deliveryId}`,
      });
    }

    // Si c'est lié à un service, mettre à jour le statut
    if (serviceId) {
      await db.service.update({
        where: { id: serviceId },
        data: {
          bookings: {
            updateMany: {
              where: { serviceId, paymentId: existingPayment.id },
              data: { status: 'CONFIRMED' },
            },
          },
        },
      });

      // Notifier le client que le service a été confirmé
      await sendNotification({
        userId,
        title: 'Réservation de service confirmée',
        message: `Votre paiement de ${amount / 100}${currency.toUpperCase()} a été accepté. Votre réservation est confirmée.`,
        type: 'PAYMENT_CONFIRMED',
        link: `/client/services/bookings`,
      });
    }

    // Si c'est lié à un abonnement
    if (subscriptionId) {
      await sendNotification({
        userId,
        title: 'Abonnement renouvelé',
        message: `Votre abonnement a été renouvelé avec succès pour un montant de ${amount / 100}${currency.toUpperCase()}.`,
        type: 'PAYMENT_CONFIRMED',
        link: `/client/subscription`,
      });
    }
  } else {
    // Créer un nouveau paiement
    const newPayment = await db.payment.create({
      data: {
        amount: new Decimal(amount / 100), // Convertir les centimes en unités
        currency: currency.toUpperCase(),
        stripePaymentId: id,
        paymentIntentId: id,
        status: PaymentStatus.COMPLETED,
        userId,
        ...(deliveryId ? { deliveryId } : {}),
        ...(serviceId ? { serviceId } : {}),
        ...(subscriptionId ? { subscriptionId } : {}),
        metadata: metadata || {},
      },
    });

    // Notifier l'utilisateur du nouveau paiement
    await sendNotification({
      userId,
      title: 'Paiement effectué',
      message: `Votre paiement de ${amount / 100}${currency.toUpperCase()} a été traité avec succès.`,
      type: 'PAYMENT_CONFIRMED',
      link: `/payments/${newPayment.id}`,
    });
  }
}

/**
 * Gère un PaymentIntent échoué
 */
async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  const { id, metadata, amount, currency } = paymentIntent;

  // Mettre à jour le paiement en échec
  const existingPayment = await db.payment.findFirst({
    where: { paymentIntentId: id },
  });

  if (existingPayment) {
    await db.payment.update({
      where: { id: existingPayment.id },
      data: {
        status: PaymentStatus.FAILED,
        updatedAt: new Date(),
        errorMessage: paymentIntent.last_payment_error?.message || 'Paiement refusé',
      },
    });

    // Notifier l'utilisateur de l'échec du paiement
    await sendNotification({
      userId: existingPayment.userId,
      title: 'Échec de paiement',
      message: `Le paiement de ${existingPayment.amount}${existingPayment.currency} a échoué. Veuillez vérifier votre moyen de paiement.`,
      type: 'ERROR',
      link: `/payments/${existingPayment.id}`,
    });

    // Si le paiement est lié à une livraison, notifier également
    if (existingPayment.deliveryId) {
      const delivery = await db.delivery.findUnique({
        where: { id: existingPayment.deliveryId },
        select: { id: true },
      });

      if (delivery) {
        await sendNotification({
          userId: existingPayment.userId,
          title: 'Problème de paiement pour votre livraison',
          message: `Votre paiement pour la livraison a échoué. Veuillez mettre à jour votre moyen de paiement pour poursuivre.`,
          type: 'DELIVERY_PROBLEM',
          link: `/client/deliveries/${delivery.id}`,
        });
      }
    }
  }
}

/**
 * Gère un abonnement créé
 */
async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  const { id, customer, metadata } = subscription;

  // Récupérer l'utilisateur via le customer Stripe
  const user = await db.user.findFirst({
    where: { stripeCustomerId: customer as string },
  });

  if (!user) {
    console.error(`Utilisateur non trouvé pour customer Stripe: ${customer}`);
    return;
  }

  // Déterminer le type de plan (FREE, STARTER, PREMIUM)
  const planType = getPlanTypeFromStripePriceId(subscription.items.data[0]?.price.id);

  // Créer l'abonnement dans notre base de données
  const newSubscription = await db.subscription.create({
    data: {
      userId: user.id,
      stripeSubscriptionId: id,
      planType,
      status: SubscriptionStatus.ACTIVE,
      startDate: new Date(subscription.current_period_start * 1000),
      endDate: new Date(subscription.current_period_end * 1000),
      autoRenew: subscription.cancel_at_period_end === false,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      stripePriceId: subscription.items.data[0]?.price.id,
    },
  });

  // Notifier l'utilisateur de la création de l'abonnement
  await sendNotification({
    userId: user.id,
    title: 'Abonnement créé',
    message: `Votre abonnement ${planType} a été créé avec succès.`,
    type: 'PAYMENT_CONFIRMED',
    link: `/client/subscription`,
  });
}

/**
 * Gère un abonnement mis à jour
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const { id } = subscription;

  // Récupérer l'abonnement dans notre base de données
  const existingSubscription = await db.subscription.findFirst({
    where: { stripeSubscriptionId: id },
  });

  if (!existingSubscription) {
    console.error(`Abonnement non trouvé: ${id}`);
    return;
  }

  // Déterminer le statut et le type de plan
  const status = getSubscriptionStatus(subscription.status);
  const planType = getPlanTypeFromStripePriceId(subscription.items.data[0]?.price.id);

  // Mettre à jour l'abonnement
  await db.subscription.update({
    where: { id: existingSubscription.id },
    data: {
      status,
      planType,
      autoRenew: subscription.cancel_at_period_end === false,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      cancelledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
      stripePriceId: subscription.items.data[0]?.price.id,
    },
  });
}

/**
 * Gère un abonnement supprimé
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const { id } = subscription;

  // Récupérer l'abonnement dans notre base de données
  const existingSubscription = await db.subscription.findFirst({
    where: { stripeSubscriptionId: id },
  });

  if (!existingSubscription) {
    console.error(`Abonnement non trouvé: ${id}`);
    return;
  }

  // Mettre à jour l'abonnement comme terminé
  await db.subscription.update({
    where: { id: existingSubscription.id },
    data: {
      status: SubscriptionStatus.ENDED,
      endDate: new Date(),
      cancelledAt: new Date(),
      autoRenew: false,
    },
  });

  // Créer un abonnement gratuit pour l'utilisateur
  await db.subscription.create({
    data: {
      userId: existingSubscription.userId,
      planType: 'FREE',
      status: SubscriptionStatus.ACTIVE,
      startDate: new Date(),
      autoRenew: true,
    },
  });
}

/**
 * Gère un paiement de facture réussi
 */
async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  const { id, customer, subscription } = invoice;

  if (!subscription) return;

  // Récupérer l'utilisateur via le customer Stripe
  const user = await db.user.findFirst({
    where: { stripeCustomerId: customer as string },
  });

  if (!user) {
    console.error(`Utilisateur non trouvé pour customer Stripe: ${customer}`);
    return;
  }

  // Récupérer l'abonnement dans notre base de données
  const existingSubscription = await db.subscription.findFirst({
    where: { stripeSubscriptionId: subscription as string },
  });

  if (!existingSubscription) {
    console.error(`Abonnement non trouvé: ${subscription}`);
    return;
  }

  // Créer une facture dans notre base de données
  const dbInvoice = await db.invoice.create({
    data: {
      number: `INV-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${id.substring(0, 8)}`,
      userId: user.id,
      subscriptionId: existingSubscription.id,
      amount: new Decimal(invoice.total / 100),
      currency: invoice.currency.toUpperCase(),
      status: InvoiceStatus.PAID,
      dueDate: new Date(invoice.due_date ? invoice.due_date * 1000 : Date.now()),
      issuedDate: new Date(invoice.created * 1000),
      paidDate: new Date(),
      stripeInvoiceId: id,
      pdfUrl: invoice.invoice_pdf,
    },
  });

  // Ajouter les éléments de la facture
  for (const item of invoice.lines.data) {
    const amount = item.amount / 100;
    // Pour la France, TVA à 20%
    const taxRate = new Decimal(20);
    const preTaxAmount = new Decimal(amount).div(new Decimal(1).add(taxRate.div(100)));
    const taxAmount = new Decimal(amount).sub(preTaxAmount);

    await db.invoiceItem.create({
      data: {
        invoiceId: dbInvoice.id,
        description: item.description || `Abonnement ${existingSubscription.planType}`,
        quantity: item.quantity || 1,
        unitPrice: preTaxAmount,
        taxRate,
        taxAmount,
        totalAmount: new Decimal(amount),
      },
    });
  }
}

/**
 * Gère un paiement de facture échoué
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const { customer, subscription } = invoice;

  if (!subscription) return;

  // Récupérer l'utilisateur via le customer Stripe
  const user = await db.user.findFirst({
    where: { stripeCustomerId: customer as string },
  });

  if (!user) {
    console.error(`Utilisateur non trouvé pour customer Stripe: ${customer}`);
    return;
  }

  // Récupérer l'abonnement dans notre base de données
  const existingSubscription = await db.subscription.findFirst({
    where: { stripeSubscriptionId: subscription as string },
  });

  if (!existingSubscription) {
    console.error(`Abonnement non trouvé: ${subscription}`);
    return;
  }

  // Mettre à jour l'abonnement comme impayé
  await db.subscription.update({
    where: { id: existingSubscription.id },
    data: {
      status: SubscriptionStatus.PAST_DUE,
    },
  });

  // Notifier l'utilisateur
  await db.notification.create({
    data: {
      userId: user.id,
      title: "Paiement d'abonnement échoué",
      content: `Le paiement de votre abonnement ${existingSubscription.planType} a échoué. Veuillez mettre à jour votre méthode de paiement pour éviter l'interruption de service.`,
      type: 'SUBSCRIPTION_PAYMENT_FAILED',
      isRead: false,
    },
  });
}

/**
 * Gère une mise à jour de compte Connect
 */
async function handleConnectAccountUpdated(account: Stripe.Account) {
  // Récupérer le wallet associé au compte Stripe Connect
  const wallet = await db.wallet.findFirst({
    where: { stripeAccountId: account.id },
  });

  if (!wallet) {
    console.error(`Wallet non trouvé pour le compte Stripe: ${account.id}`);
    return;
  }

  // Mettre à jour le statut de vérification du compte
  await db.wallet.update({
    where: { id: wallet.id },
    data: {
      accountVerified: account.details_submitted && !account.requirements?.disabled_reason,
      accountType: account.type,
    },
  });

  // Si le compte est maintenant vérifié, notifier l'utilisateur
  if (
    account.details_submitted &&
    !account.requirements?.disabled_reason &&
    !wallet.accountVerified
  ) {
    await db.notification.create({
      data: {
        userId: wallet.userId,
        title: 'Compte de paiement vérifié',
        content:
          'Votre compte de paiement a été vérifié avec succès. Vous pouvez maintenant recevoir des paiements.',
        type: 'WALLET_VERIFIED',
        isRead: false,
      },
    });
  }
}

/**
 * Gère un payout créé
 */
async function handlePayoutCreated(payout: Stripe.Payout) {
  // Pour les payouts, nous devons lier à une demande de retrait
  // Ce code suppose qu'il y a des métadonnées sur le payout liant à withdrawalRequestId
  const { id, metadata, amount, currency, destination } = payout;

  const withdrawalRequestId = metadata?.withdrawalRequestId;

  if (withdrawalRequestId) {
    await db.withdrawalRequest.update({
      where: { id: withdrawalRequestId },
      data: {
        status: 'PROCESSING',
        stripePayoutId: id,
      },
    });
  } else {
    // Essayer de trouver le wallet par le compte destination
    const wallet = await db.wallet.findFirst({
      where: { stripeAccountId: destination as string },
    });

    if (wallet) {
      // Créer une transaction dans le wallet
      await db.walletTransaction.create({
        data: {
          walletId: wallet.id,
          amount: new Decimal((-1 * amount) / 100), // Montant négatif car c'est un retrait
          currency: currency.toUpperCase(),
          type: 'WITHDRAWAL',
          status: 'PENDING',
          description: 'Retrait automatique via Stripe',
          stripeTransferId: id,
        },
      });
    }
  }
}

/**
 * Gère un payout échoué
 */
async function handlePayoutFailed(payout: Stripe.Payout) {
  const { id, metadata, failure_code, failure_message } = payout;

  const withdrawalRequestId = metadata?.withdrawalRequestId;

  if (withdrawalRequestId) {
    await db.withdrawalRequest.update({
      where: { id: withdrawalRequestId },
      data: {
        status: 'FAILED',
        rejectionReason: `${failure_code}: ${failure_message}`,
      },
    });

    // Récupérer la demande complète
    const request = await db.withdrawalRequest.findUnique({
      where: { id: withdrawalRequestId },
      include: { wallet: true },
    });

    if (request) {
      // Notifier l'utilisateur
      await db.notification.create({
        data: {
          userId: request.wallet.userId,
          title: 'Échec du virement',
          content: `Votre demande de virement de ${request.amount} ${request.currency} a échoué: ${failure_message}`,
          type: 'WITHDRAWAL_FAILED',
          isRead: false,
        },
      });
    }
  } else {
    // Si nous n'avons pas de lien direct, essayer de trouver via stripePayoutId
    const withdrawalRequest = await db.withdrawalRequest.findFirst({
      where: { stripePayoutId: id },
      include: { wallet: true },
    });

    if (withdrawalRequest) {
      await db.withdrawalRequest.update({
        where: { id: withdrawalRequest.id },
        data: {
          status: 'FAILED',
          rejectionReason: `${failure_code}: ${failure_message}`,
        },
      });

      // Notifier l'utilisateur
      await db.notification.create({
        data: {
          userId: withdrawalRequest.wallet.userId,
          title: 'Échec du virement',
          content: `Votre demande de virement de ${withdrawalRequest.amount} ${withdrawalRequest.currency} a échoué: ${failure_message}`,
          type: 'WITHDRAWAL_FAILED',
          isRead: false,
        },
      });
    }
  }
}

/**
 * Détermine le statut d'abonnement à partir du statut Stripe
 */
function getSubscriptionStatus(stripeStatus: string): SubscriptionStatus {
  switch (stripeStatus) {
    case 'active':
      return SubscriptionStatus.ACTIVE;
    case 'past_due':
      return SubscriptionStatus.PAST_DUE;
    case 'unpaid':
      return SubscriptionStatus.UNPAID;
    case 'canceled':
      return SubscriptionStatus.CANCELLED;
    case 'trialing':
      return SubscriptionStatus.TRIAL;
    default:
      return SubscriptionStatus.ACTIVE;
  }
}

/**
 * Détermine le type de plan à partir de l'ID de prix Stripe
 */
function getPlanTypeFromStripePriceId(priceId?: string) {
  if (!priceId) return 'FREE';

  if (priceId === process.env.STRIPE_PRICE_STARTER) {
    return 'STARTER';
  } else if (priceId === process.env.STRIPE_PRICE_PREMIUM) {
    return 'PREMIUM';
  }

  return 'FREE';
}

/**
 * Gère la création d'un litige (dispute)
 */
async function handleDisputeCreated(dispute: any) {
  // Le payment_intent est disponible dans dispute.payment_intent
  const paymentIntentId = dispute.payment_intent;

  if (!paymentIntentId) {
    console.error('PaymentIntent manquant dans le litige');
    return;
  }

  // Récupérer le paiement associé au PaymentIntent
  const payment = await db.payment.findFirst({
    where: { paymentIntentId },
    include: { user: true },
  });

  if (!payment) {
    console.error(`Paiement non trouvé pour PaymentIntent: ${paymentIntentId}`);
    return;
  }

  // Mettre à jour le paiement avec le statut DISPUTED
  await db.payment.update({
    where: { id: payment.id },
    data: {
      status: 'DISPUTED',
      metadata: {
        ...payment.metadata,
        disputeId: dispute.id,
        disputeReason: dispute.reason,
        disputeAmount: dispute.amount,
        disputeCreatedAt: new Date().toISOString(),
        disputeStatus: dispute.status,
      },
    },
  });

  // Notifier l'utilisateur du litige
  await sendNotification({
    userId: payment.userId,
    title: 'Paiement contesté',
    message: `Votre paiement de ${payment.amount}${payment.currency} fait l'objet d'une contestation. Notre équipe étudie le dossier.`,
    type: 'WARNING',
    link: `/payments/${payment.id}`,
  });

  // Notifier également les administrateurs
  const admins = await db.user.findMany({
    where: { role: 'ADMIN' },
  });

  for (const admin of admins) {
    await sendNotification({
      userId: admin.id,
      title: 'Litige de paiement',
      message: `Un paiement de ${payment.amount}${payment.currency} a été contesté. Raison: ${dispute.reason || 'Non spécifiée'}`,
      type: 'ADMIN_ALERT',
      link: `/admin/payments/${payment.id}`,
    });
  }
}

/**
 * Gère la fermeture d'un litige (dispute)
 */
async function handleDisputeClosed(dispute: any) {
  // Le payment_intent est disponible dans dispute.payment_intent
  const paymentIntentId = dispute.payment_intent;

  if (!paymentIntentId) {
    console.error('PaymentIntent manquant dans le litige');
    return;
  }

  // Récupérer le paiement associé au PaymentIntent
  const payment = await db.payment.findFirst({
    where: { paymentIntentId },
    include: { user: true },
  });

  if (!payment) {
    console.error(`Paiement non trouvé pour PaymentIntent: ${paymentIntentId}`);
    return;
  }

  // Déterminer le statut final en fonction du résultat du litige
  const finalStatus = dispute.status === 'lost' ? 'REFUNDED' : 'COMPLETED';

  // Mettre à jour le paiement avec le statut final
  await db.payment.update({
    where: { id: payment.id },
    data: {
      status: finalStatus,
      metadata: {
        ...payment.metadata,
        disputeId: dispute.id,
        disputeStatus: dispute.status,
        disputeClosedAt: new Date().toISOString(),
        disputeOutcome: dispute.status,
      },
    },
  });

  // Notifier l'utilisateur du résultat du litige
  await sendNotification({
    userId: payment.userId,
    title:
      dispute.status === 'lost' ? 'Remboursement effectué suite à litige' : 'Paiement confirmé',
    message:
      dispute.status === 'lost'
        ? `Suite à votre contestation, le paiement de ${payment.amount}${payment.currency} a été remboursé.`
        : `La contestation concernant votre paiement de ${payment.amount}${payment.currency} a été résolue en notre faveur. Le paiement est confirmé.`,
    type: dispute.status === 'lost' ? 'PAYMENT_REFUNDED' : 'PAYMENT_CONFIRMED',
    link: `/payments/${payment.id}`,
  });
}

/**
 * Gère un remboursement
 */
async function handleChargeRefunded(charge: any) {
  // Récupérer le paiement associé
  const payment = await db.payment.findFirst({
    where: { stripePaymentId: charge.payment_intent || charge.id },
    include: { user: true },
  });

  if (!payment) {
    console.error(`Paiement non trouvé pour charge: ${charge.id}`);
    return;
  }

  // Déterminer si c'est un remboursement total ou partiel
  const isFullRefund = charge.amount_refunded === charge.amount;

  // Mettre à jour le paiement
  await db.payment.update({
    where: { id: payment.id },
    data: {
      status: isFullRefund ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
      refundedAmount: new Decimal(charge.amount_refunded / 100),
      metadata: {
        ...payment.metadata,
        refundId: charge.refunds?.data[0]?.id,
        refundedAt: new Date().toISOString(),
        refundReason: charge.refunds?.data[0]?.reason || 'Demande client',
        isFullRefund: isFullRefund,
      },
    },
  });

  // Notifier l'utilisateur du remboursement
  await sendNotification({
    userId: payment.userId,
    title: 'Remboursement effectué',
    message: isFullRefund
      ? `Votre paiement de ${payment.amount}${payment.currency} a été intégralement remboursé.`
      : `Un remboursement partiel de ${charge.amount_refunded / 100}${charge.currency.toUpperCase()} a été effectué sur votre paiement.`,
    type: 'PAYMENT_REFUNDED',
    link: `/payments/${payment.id}`,
  });

  // Si le paiement est lié à une livraison ou un service, envoyer une notification supplémentaire
  if (payment.deliveryId) {
    await sendNotification({
      userId: payment.userId,
      title: 'Livraison remboursée',
      message: `Votre livraison a été remboursée. Consultez votre compte pour plus d'informations.`,
      type: 'DELIVERY_PROBLEM',
      link: `/client/deliveries/${payment.deliveryId}`,
    });
  } else if (payment.serviceId) {
    await sendNotification({
      userId: payment.userId,
      title: 'Service remboursé',
      message: `Votre réservation de service a été remboursée. Consultez votre compte pour plus d'informations.`,
      type: 'INFO',
      link: `/client/services/bookings`,
    });
  }
}
