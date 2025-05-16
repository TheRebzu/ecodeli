import { db } from '../db';
import Stripe from 'stripe';
import { Decimal } from '@prisma/client/runtime/library';
import { PaymentService } from './payment.service';
import { NotificationService } from './notification.service';
import { PlanType, SubscriptionStatus } from '@prisma/client';

// Initialiser le client Stripe
let _stripe: Stripe | null = null;
const getStripeClient = (): Stripe => {
  if (!_stripe) {
    const apiKey = process.env.STRIPE_SECRET_KEY;
    if (!apiKey) {
      throw new Error("STRIPE_SECRET_KEY n'est pas définie dans les variables d'environnement");
    }
    _stripe = new Stripe(apiKey, {
      maxNetworkRetries: 2,
    });
  }
  return _stripe;
};

// Plans d'abonnement disponibles
export const SUBSCRIPTION_PLANS = {
  FREE: {
    id: 'free',
    name: 'Free',
    price: 0,
    stripePriceId: '',
    features: ['Accès de base à la plateforme', 'Assurance limitée (50€/envoi)'],
    discountPercent: 0,
    insuranceAmount: 50,
    isPriority: false,
  },
  STARTER: {
    id: 'starter',
    name: 'Starter',
    price: 9.9,
    stripePriceId: process.env.STRIPE_PRICE_ID_STARTER || 'price_starter',
    features: [
      "Assurance jusqu'à 115€/envoi",
      "Réduction 5% sur l'envoi de colis",
      'Support client standard',
    ],
    discountPercent: 5,
    insuranceAmount: 115,
    isPriority: false,
  },
  PREMIUM: {
    id: 'premium',
    name: 'Premium',
    price: 19.99,
    stripePriceId: process.env.STRIPE_PRICE_ID_PREMIUM || 'price_premium',
    features: [
      "Assurance jusqu'à 3000€/envoi",
      "Réduction 9% sur l'envoi de colis",
      'Support prioritaire',
      'Livraison express prioritaire',
    ],
    discountPercent: 9,
    insuranceAmount: 3000,
    isPriority: true,
  },
};

/**
 * Service de gestion des abonnements
 */
export const SubscriptionService = {
  /**
   * Récupère les détails d'un plan d'abonnement
   */
  getPlanDetails(planType: PlanType) {
    switch (planType) {
      case 'FREE':
        return SUBSCRIPTION_PLANS.FREE;
      case 'STARTER':
        return SUBSCRIPTION_PLANS.STARTER;
      case 'PREMIUM':
        return SUBSCRIPTION_PLANS.PREMIUM;
      default:
        throw new Error("Plan d'abonnement non reconnu");
    }
  },

  /**
   * Récupère tous les plans disponibles
   */
  getAllPlans() {
    return {
      FREE: SUBSCRIPTION_PLANS.FREE,
      STARTER: SUBSCRIPTION_PLANS.STARTER,
      PREMIUM: SUBSCRIPTION_PLANS.PREMIUM,
    };
  },

  /**
   * Récupère l'abonnement actif d'un utilisateur
   */
  async getCurrentSubscription(userId: string) {
    const subscription = await db.subscription.findFirst({
      where: {
        userId,
        status: {
          in: ['ACTIVE', 'TRIAL'],
        },
      },
    });

    if (!subscription) {
      // Créer un abonnement FREE par défaut si aucun n'existe
      return this.createFreeSubscription(userId);
    }

    return subscription;
  },

  /**
   * Crée un abonnement gratuit pour un nouvel utilisateur
   */
  async createFreeSubscription(userId: string) {
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new Error('Utilisateur non trouvé');
    }

    // Vérifier s'il existe déjà un abonnement actif
    const existingSubscription = await db.subscription.findFirst({
      where: {
        userId,
        status: {
          in: ['ACTIVE', 'TRIAL'],
        },
      },
    });

    if (existingSubscription) {
      return existingSubscription;
    }

    // Récupérer les détails du plan FREE
    const planDetails = SUBSCRIPTION_PLANS.FREE;

    // Créer un nouvel abonnement FREE
    const subscription = await db.subscription.create({
      data: {
        userId,
        status: 'ACTIVE',
        planType: 'FREE',
        startDate: new Date(),
        autoRenew: true,
        planName: planDetails.name,
        planDescription: 'Plan gratuit avec fonctionnalités de base',
        planFeatures: planDetails.features,
        planPrice: new Decimal(0),
        discountPercent: new Decimal(planDetails.discountPercent),
        insuranceAmount: new Decimal(planDetails.insuranceAmount),
        isPriority: planDetails.isPriority,
      },
    });

    return subscription;
  },

  /**
   * Souscrit à un nouvel abonnement payant
   */
  async subscribeToNewPlan(userId: string, planType: PlanType, paymentMethodId: string) {
    // Vérifier que le plan n'est pas FREE (qui utilise createFreeSubscription)
    if (planType === 'FREE') {
      return this.createFreeSubscription(userId);
    }

    // Récupérer l'utilisateur
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new Error('Utilisateur non trouvé');
    }

    // Récupérer les détails du plan
    const planDetails = this.getPlanDetails(planType);
    if (!planDetails.stripePriceId) {
      throw new Error('Identifiant de prix Stripe non configuré pour ce plan');
    }

    // Récupérer ou créer le client Stripe
    const customer = await PaymentService.getOrCreateStripeCustomer(userId, user.email);
    if (!customer) {
      throw new Error('Impossible de créer le client Stripe');
    }

    // Vérifier les abonnements existants et les annuler si nécessaire
    const existingSubscription = await db.subscription.findFirst({
      where: {
        userId,
        status: {
          in: ['ACTIVE', 'TRIAL'],
        },
      },
    });

    // Si un abonnement Stripe existe déjà, le mettre à jour
    if (existingSubscription?.stripeSubscriptionId) {
      const stripe = getStripeClient();
      await stripe.subscriptions.update(existingSubscription.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });

      // Mettre à jour l'abonnement dans la base de données
      await db.subscription.update({
        where: { id: existingSubscription.id },
        data: {
          cancelAtPeriodEnd: true,
          cancelledAt: new Date(),
          status: 'CANCELLED',
        },
      });
    }

    // Créer l'abonnement dans Stripe
    const stripe = getStripeClient();
    const stripeSubscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: planDetails.stripePriceId }],
      default_payment_method: paymentMethodId,
      expand: ['latest_invoice.payment_intent'],
    });

    // Récupérer les périodes de facturation
    const currentPeriodStart = new Date(stripeSubscription.current_period_start * 1000);
    const currentPeriodEnd = new Date(stripeSubscription.current_period_end * 1000);

    // Créer l'abonnement dans la base de données
    const subscription = await db.subscription.create({
      data: {
        userId,
        status: stripeSubscription.status === 'active' ? 'ACTIVE' : 'PENDING',
        planType,
        stripePriceId: planDetails.stripePriceId,
        stripeSubscriptionId: stripeSubscription.id,
        startDate: new Date(),
        autoRenew: true,
        currentPeriodStart,
        currentPeriodEnd,
        planName: planDetails.name,
        planDescription: `Plan ${planDetails.name}`,
        planFeatures: planDetails.features,
        planPrice: new Decimal(planDetails.price),
        discountPercent: new Decimal(planDetails.discountPercent),
        insuranceAmount: new Decimal(planDetails.insuranceAmount),
        isPriority: planDetails.isPriority,
        previousPlanType: existingSubscription?.planType || null,
      },
    });

    // Enregistrer le paiement initial
    const invoice = stripeSubscription.latest_invoice as Stripe.Invoice;
    if (invoice && invoice.payment_intent) {
      const paymentIntent = invoice.payment_intent as Stripe.PaymentIntent;

      await db.payment.create({
        data: {
          amount: new Decimal(planDetails.price),
          currency: 'EUR',
          status: paymentIntent.status === 'succeeded' ? 'COMPLETED' : 'PENDING',
          subscriptionId: subscription.id,
          userId,
          stripePaymentId: paymentIntent.id,
          paymentIntentId: paymentIntent.id,
          metadata: { type: 'subscription_payment', planType },
        },
      });
    }

    // Notifier l'utilisateur
    await NotificationService.sendNotification({
      userId,
      title: 'Abonnement activé',
      content: `Votre abonnement ${planDetails.name} a été activé avec succès.`,
      type: 'SUBSCRIPTION_ACTIVATED',
    });

    return { subscription, stripeSubscription };
  },

  /**
   * Annule un abonnement
   */
  async cancelSubscription(subscriptionId: string, cancelImmediately = false) {
    const subscription = await db.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      throw new Error('Abonnement non trouvé');
    }

    if (subscription.status !== 'ACTIVE' && subscription.status !== 'TRIAL') {
      throw new Error("Cet abonnement n'est pas actif");
    }

    // Si c'est un abonnement gratuit, le mettre à jour dans la base de données seulement
    if (subscription.planType === 'FREE') {
      await db.subscription.update({
        where: { id: subscriptionId },
        data: {
          status: 'CANCELLED',
          autoRenew: false,
          cancelAtPeriodEnd: true,
          cancelledAt: new Date(),
        },
      });

      // Créer automatiquement un nouvel abonnement FREE
      await this.createFreeSubscription(subscription.userId);

      return { success: true, message: 'Abonnement gratuit annulé' };
    }

    // Pour les abonnements payants, annuler via Stripe
    if (!subscription.stripeSubscriptionId) {
      throw new Error("Identifiant d'abonnement Stripe manquant");
    }

    const stripe = getStripeClient();

    if (cancelImmediately) {
      // Annulation immédiate
      const canceledSubscription = await stripe.subscriptions.cancel(
        subscription.stripeSubscriptionId
      );

      await db.subscription.update({
        where: { id: subscriptionId },
        data: {
          status: 'CANCELLED',
          autoRenew: false,
          cancelAtPeriodEnd: false,
          cancelledAt: new Date(),
        },
      });

      // Créer automatiquement un nouvel abonnement FREE
      await this.createFreeSubscription(subscription.userId);

      return { success: true, message: 'Abonnement annulé immédiatement', canceledSubscription };
    } else {
      // Annulation à la fin de la période
      const updatedSubscription = await stripe.subscriptions.update(
        subscription.stripeSubscriptionId,
        { cancel_at_period_end: true }
      );

      await db.subscription.update({
        where: { id: subscriptionId },
        data: {
          cancelAtPeriodEnd: true,
          cancelledAt: new Date(),
        },
      });

      return {
        success: true,
        message: 'Abonnement sera annulé à la fin de la période',
        updatedSubscription,
      };
    }
  },

  /**
   * Change le plan d'abonnement (upgrade ou downgrade)
   */
  async changePlan(subscriptionId: string, newPlanType: PlanType, paymentMethodId?: string) {
    const subscription = await db.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      throw new Error('Abonnement non trouvé');
    }

    if (subscription.status !== 'ACTIVE' && subscription.status !== 'TRIAL') {
      throw new Error("Cet abonnement n'est pas actif");
    }

    // Si le plan est le même, ne rien faire
    if (subscription.planType === newPlanType) {
      return {
        success: true,
        message: "Aucun changement nécessaire, l'utilisateur utilise déjà ce plan",
      };
    }

    // Traitement spécial pour le passage de/vers FREE
    if (newPlanType === 'FREE') {
      // Annuler l'abonnement payant existant
      await this.cancelSubscription(subscriptionId, true);
      // Créer un abonnement FREE
      const freeSubscription = await this.createFreeSubscription(subscription.userId);
      return { success: true, subscription: freeSubscription };
    }

    if (subscription.planType === 'FREE') {
      // Passer de FREE à un plan payant est traité comme une nouvelle souscription
      const result = await this.subscribeToNewPlan(
        subscription.userId,
        newPlanType,
        paymentMethodId || ''
      );
      return { success: true, subscription: result.subscription };
    }

    // Pour les changements entre plans payants, mettre à jour via Stripe
    if (!subscription.stripeSubscriptionId) {
      throw new Error("Identifiant d'abonnement Stripe manquant");
    }

    const newPlanDetails = this.getPlanDetails(newPlanType);

    if (!newPlanDetails.stripePriceId) {
      throw new Error('Identifiant de prix Stripe non configuré pour ce plan');
    }

    const stripe = getStripeClient();

    // Récupérer l'abonnement Stripe
    const stripeSubscription = await stripe.subscriptions.retrieve(
      subscription.stripeSubscriptionId
    );

    // Mettre à jour l'abonnement avec le nouveau prix
    const updatedSubscription = await stripe.subscriptions.update(
      subscription.stripeSubscriptionId,
      {
        items: [
          {
            id: stripeSubscription.items.data[0].id,
            price: newPlanDetails.stripePriceId,
          },
        ],
        proration_behavior: 'create_prorations',
        ...(paymentMethodId ? { default_payment_method: paymentMethodId } : {}),
      }
    );

    // Mettre à jour dans la base de données
    const dbUpdatedSubscription = await db.subscription.update({
      where: { id: subscriptionId },
      data: {
        planType: newPlanType,
        stripePriceId: newPlanDetails.stripePriceId,
        planName: newPlanDetails.name,
        planDescription: `Plan ${newPlanDetails.name}`,
        planFeatures: newPlanDetails.features,
        planPrice: new Decimal(newPlanDetails.price),
        discountPercent: new Decimal(newPlanDetails.discountPercent),
        insuranceAmount: new Decimal(newPlanDetails.insuranceAmount),
        isPriority: newPlanDetails.isPriority,
        previousPlanType: subscription.planType,
        planChangedAt: new Date(),
      },
    });

    // Déterminer si c'est un upgrade ou downgrade
    const isUpgrade =
      newPlanType === 'PREMIUM' || (newPlanType === 'STARTER' && subscription.planType === 'FREE');

    // Notifier l'utilisateur
    await NotificationService.sendNotification({
      userId: subscription.userId,
      title: isUpgrade ? 'Plan mis à niveau' : 'Plan modifié',
      content: `Votre abonnement a été ${isUpgrade ? 'mis à niveau' : 'modifié'} vers le plan ${newPlanDetails.name}.`,
      type: isUpgrade ? 'SUBSCRIPTION_UPGRADED' : 'SUBSCRIPTION_CHANGED',
    });

    return {
      success: true,
      subscription: dbUpdatedSubscription,
      stripeSubscription: updatedSubscription,
    };
  },

  /**
   * Met à jour le moyen de paiement d'un abonnement
   */
  async updatePaymentMethod(subscriptionId: string, paymentMethodId: string) {
    const subscription = await db.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      throw new Error('Abonnement non trouvé');
    }

    if (!subscription.stripeSubscriptionId) {
      throw new Error("Identifiant d'abonnement Stripe manquant");
    }

    const stripe = getStripeClient();

    // Mettre à jour l'abonnement Stripe avec le nouveau moyen de paiement
    const updatedSubscription = await stripe.subscriptions.update(
      subscription.stripeSubscriptionId,
      {
        default_payment_method: paymentMethodId,
      }
    );

    return { success: true, stripeSubscription: updatedSubscription };
  },

  /**
   * Gère le webhook de Stripe pour les événements d'abonnement
   */
  async handleSubscriptionWebhook(event: any) {
    const stripe = getStripeClient();

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;

        // Trouver l'abonnement dans la base de données
        const dbSubscription = await db.subscription.findFirst({
          where: { stripeSubscriptionId: subscription.id },
        });

        if (!dbSubscription) {
          console.log(`Abonnement Stripe non trouvé dans la base de données: ${subscription.id}`);
          return { success: false, error: 'Abonnement non trouvé' };
        }

        // Mise à jour des informations de période
        await db.subscription.update({
          where: { id: dbSubscription.id },
          data: {
            status: this.mapStripeStatus(subscription.status),
            currentPeriodStart: new Date(subscription.current_period_start * 1000),
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            updatedAt: new Date(),
          },
        });

        return { success: true };
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;

        // Trouver l'abonnement dans la base de données
        const dbSubscription = await db.subscription.findFirst({
          where: { stripeSubscriptionId: subscription.id },
        });

        if (!dbSubscription) {
          return { success: false, error: 'Abonnement non trouvé' };
        }

        // Mettre à jour le statut de l'abonnement
        await db.subscription.update({
          where: { id: dbSubscription.id },
          data: {
            status: 'CANCELLED',
            cancelledAt: new Date(),
            updatedAt: new Date(),
          },
        });

        // Créer automatiquement un nouvel abonnement FREE
        await this.createFreeSubscription(dbSubscription.userId);

        return { success: true };
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;

        if (!invoice.subscription) {
          return { success: true, message: 'Invoice sans abonnement' };
        }

        // Trouver l'abonnement dans la base de données
        const dbSubscription = await db.subscription.findFirst({
          where: { stripeSubscriptionId: invoice.subscription as string },
        });

        if (!dbSubscription) {
          return { success: false, error: 'Abonnement non trouvé' };
        }

        // Enregistrer le paiement dans la base de données
        if (invoice.payment_intent) {
          await db.payment.create({
            data: {
              amount: new Decimal(invoice.amount_paid / 100), // Conversion de centimes en euros
              currency: invoice.currency.toUpperCase(),
              status: 'COMPLETED',
              subscriptionId: dbSubscription.id,
              userId: dbSubscription.userId,
              stripePaymentId: invoice.payment_intent as string,
              paymentIntentId: invoice.payment_intent as string,
              metadata: {
                type: 'subscription_payment',
                invoiceId: invoice.id,
              },
            },
          });
        }

        // Mettre à jour le statut de l'abonnement
        await db.subscription.update({
          where: { id: dbSubscription.id },
          data: {
            status: 'ACTIVE',
            updatedAt: new Date(),
          },
        });

        return { success: true };
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;

        if (!invoice.subscription) {
          return { success: true, message: 'Invoice sans abonnement' };
        }

        // Trouver l'abonnement dans la base de données
        const dbSubscription = await db.subscription.findFirst({
          where: { stripeSubscriptionId: invoice.subscription as string },
        });

        if (!dbSubscription) {
          return { success: false, error: 'Abonnement non trouvé' };
        }

        // Mettre à jour le statut de l'abonnement
        await db.subscription.update({
          where: { id: dbSubscription.id },
          data: {
            status: 'PAST_DUE',
            updatedAt: new Date(),
          },
        });

        // Notifier l'utilisateur
        await NotificationService.sendNotification({
          userId: dbSubscription.userId,
          title: 'Paiement échoué',
          content:
            'Le paiement de votre abonnement a échoué. Veuillez mettre à jour vos informations de paiement.',
          type: 'PAYMENT_FAILED',
        });

        return { success: true };
      }

      default:
        return { success: true, message: `Événement non traité: ${event.type}` };
    }
  },

  /**
   * Convertit le statut Stripe en statut de l'application
   */
  mapStripeStatus(stripeStatus: string): SubscriptionStatus {
    switch (stripeStatus) {
      case 'active':
        return 'ACTIVE';
      case 'trialing':
        return 'TRIAL';
      case 'past_due':
        return 'PAST_DUE';
      case 'unpaid':
        return 'UNPAID';
      case 'canceled':
        return 'CANCELLED';
      default:
        return 'ACTIVE';
    }
  },
};
