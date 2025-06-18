// src/server/services/stripe.service.ts
import { TRPCError } from "@trpc/server";

// Vérification de la disponibilité de Stripe
const isStripeAvailable = Boolean(process.env.STRIPE_SECRETKEY);

// Import conditionnel de Stripe
let Stripe: any = null;
let stripeClient: any = null;

if (isStripeAvailable) {
  try {
    Stripe = require("stripe");
    stripeClient = new Stripe(process.env.STRIPE_SECRETKEY, {
      apiVersion: "2025-05-28.basil"
    });
    console.log("✅ Stripe configuré et prêt à utiliser");
  } catch (error) {
    console.error("❌ Erreur lors de l'initialisation de Stripe:", error);
  }
} else {
  console.warn("⚠️  Stripe non configuré - les fonctionnalités de paiement seront désactivées");
}

/**
 * Helper pour vérifier la disponibilité de Stripe
 */
export const checkStripeAvailability = () => {
  return {
    isAvailable: isStripeAvailable && stripeClient !== null,
    message: isStripeAvailable 
      ? "Stripe est configuré" 
      : "Stripe n'est pas configuré sur ce serveur"
  };
};

/**
 * Service Stripe avec gestion gracieuse de l'indisponibilité
 */
export const stripeService = {
  /**
   * Vérifie si Stripe est disponible
   */
  isAvailable(): boolean {
    return checkStripeAvailability().isAvailable;
  },

  /**
   * Helper pour les méthodes qui nécessitent Stripe
   */
  requireStripe() {
    if (!this.isAvailable()) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Les paiements par carte ne sont pas disponibles sur ce serveur. Contactez l'administrateur."
      });
    }
    return stripeClient;
  },

  async createPaymentIntent(
    amount: number,
    currency: string = "eur",
    metadata: Record<string, string> = {},
  ) {
    if (!this.isAvailable()) {
      throw new TRPCError({
        code: "SERVICE_UNAVAILABLE",
        message: "Les paiements par carte ne sont pas disponibles actuellement"
      });
    }

    try {
      const stripe = this.requireStripe();
      return await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Stripe utilise les centimes
        currency,
        payment_method_types: ["card"],
        metadata
      });
    } catch (error) {
      console.error("Erreur lors de la création du paiement Stripe:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Impossible de créer l'intention de paiement",
        cause: error
      });
    }
  },

  async retrievePaymentIntent(paymentIntentId: string) {
    if (!this.isAvailable()) {
      throw new TRPCError({
        code: "SERVICE_UNAVAILABLE",
        message: "Les paiements par carte ne sont pas disponibles actuellement"
      });
    }

    try {
      const stripe = this.requireStripe();
      return await stripe.paymentIntents.retrieve(paymentIntentId);
    } catch (error) {
      console.error("Erreur lors de la récupération du paiement Stripe:", error);
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Paiement introuvable",
        cause: error
      });
    }
  },

  async createPayoutToBank(
    amount: number,
    userId: string,
    metadata: Record<string, string> = {},
  ) {
    if (!this.isAvailable()) {
      throw new TRPCError({
        code: "SERVICE_UNAVAILABLE",
        message: "Les retraits ne sont pas disponibles actuellement"
      });
    }

    // TODO: Implémenter avec les vraies méthodes Stripe
    throw new TRPCError({
      code: "NOT_IMPLEMENTED",
      message: "Fonctionnalité en cours de développement"
    });
  },

  async createConnectAccount(
    delivererId: string,
    accountInfo: {
      email: string;
      country?: string;
      type?: string;
    },
  ) {
    if (!this.isAvailable()) {
      throw new TRPCError({
        code: "SERVICE_UNAVAILABLE",
        message: "La création de comptes de paiement n'est pas disponible actuellement"
      });
    }

    // TODO: Implémenter avec les vraies méthodes Stripe Connect
    throw new TRPCError({
      code: "NOT_IMPLEMENTED",
      message: "Fonctionnalité en cours de développement"
    });
  },

  async createAccountLink(
    accountId: string,
    refreshUrl: string,
    returnUrl: string,
  ) {
    if (!this.isAvailable()) {
      throw new TRPCError({
        code: "SERVICE_UNAVAILABLE",
        message: "Les liens de configuration de compte ne sont pas disponibles actuellement"
      });
    }

    // TODO: Implémenter avec les vraies méthodes Stripe Connect
    throw new TRPCError({
      code: "NOT_IMPLEMENTED",
      message: "Fonctionnalité en cours de développement"
    });
  },

  async retrieveConnectAccount(accountId: string) {
    if (!this.isAvailable()) {
      throw new TRPCError({
        code: "SERVICE_UNAVAILABLE",
        message: "Les informations de compte ne sont pas disponibles actuellement"
      });
    }

    // TODO: Implémenter avec les vraies méthodes Stripe Connect
    throw new TRPCError({
      code: "NOT_IMPLEMENTED",
      message: "Fonctionnalité en cours de développement"
    });
  },

  async createTransfer(
    accountId: string,
    amount: number,
    metadata: Record<string, string> = {},
  ) {
    if (!this.isAvailable()) {
      throw new TRPCError({
        code: "SERVICE_UNAVAILABLE",
        message: "Les transferts ne sont pas disponibles actuellement"
      });
    }

    // TODO: Implémenter avec les vraies méthodes Stripe Connect
    throw new TRPCError({
      code: "NOT_IMPLEMENTED",
      message: "Fonctionnalité en cours de développement"
    });
  },

  async createPayout(
    accountId: string,
    amount: number,
    method: "standard" | "instant" = "standard",
  ) {
    if (!this.isAvailable()) {
      throw new TRPCError({
        code: "SERVICE_UNAVAILABLE",
        message: "Les paiements ne sont pas disponibles actuellement"
      });
    }

    // TODO: Implémenter avec les vraies méthodes Stripe Connect
    throw new TRPCError({
      code: "NOT_IMPLEMENTED",
      message: "Fonctionnalité en cours de développement"
    });
  },

  async createCustomer(
    email: string,
    name?: string,
    metadata: Record<string, string> = {},
  ) {
    if (!this.isAvailable()) {
      throw new TRPCError({
        code: "SERVICE_UNAVAILABLE",
        message: "La création de comptes client n'est pas disponible actuellement"
      });
    }

    try {
      const stripe = this.requireStripe();
      return await stripe.customers.create({
        email,
        name,
        metadata
      });
    } catch (error) {
      console.error("Erreur lors de la création du customer:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Échec de la création du compte client",
        cause: error
      });
    }
  },

  async getOrCreateCustomer(userId: string, email: string, name?: string) {
    if (!this.isAvailable()) {
      throw new TRPCError({
        code: "SERVICE_UNAVAILABLE",
        message: "La gestion des comptes client n'est pas disponible actuellement"
      });
    }

    // TODO: Implémenter avec la base de données et Stripe
    throw new TRPCError({
      code: "NOT_IMPLEMENTED",
      message: "Fonctionnalité en cours de développement"
    });
  },

  async createSetupIntent(
    customerId: string,
    metadata: Record<string, string> = {},
  ) {
    if (!this.isAvailable()) {
      throw new TRPCError({
        code: "SERVICE_UNAVAILABLE",
        message: "L'enregistrement de moyens de paiement n'est pas disponible actuellement"
      });
    }

    try {
      const stripe = this.requireStripe();
      return await stripe.setupIntents.create({
        customer: customerId,
        payment_method_types: ["card"],
        metadata
      });
    } catch (error) {
      console.error("Erreur lors de la création du Setup Intent:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Échec de la création du Setup Intent",
        cause: error
      });
    }
  },

  async createRecurringSubscription(
    customerId: string,
    priceId: string,
    options: {
      trialPeriodDays?: number;
      metadata?: Record<string, string>;
      defaultPaymentMethod?: string;
    } = {},
  ) {
    if (!this.isAvailable()) {
      throw new TRPCError({
        code: "SERVICE_UNAVAILABLE",
        message: "Les abonnements ne sont pas disponibles actuellement"
      });
    }

    // TODO: Implémenter avec les vraies méthodes Stripe
    throw new TRPCError({
      code: "NOT_IMPLEMENTED",
      message: "Fonctionnalité en cours de développement"
    });
  },

  async updateSubscription(
    subscriptionId: string,
    updates: {
      priceId?: string;
      quantity?: number;
      metadata?: Record<string, string>;
      cancelAtPeriodEnd?: boolean;
    },
  ) {
    if (!this.isAvailable()) {
      throw new TRPCError({
        code: "SERVICE_UNAVAILABLE",
        message: "La modification d'abonnements n'est pas disponible actuellement"
      });
    }

    // TODO: Implémenter avec les vraies méthodes Stripe
    throw new TRPCError({
      code: "NOT_IMPLEMENTED",
      message: "Fonctionnalité en cours de développement"
    });
  },

  async cancelSubscription(
    subscriptionId: string,
    cancelImmediately: boolean = false,
  ) {
    if (!this.isAvailable()) {
      throw new TRPCError({
        code: "SERVICE_UNAVAILABLE",
        message: "L'annulation d'abonnements n'est pas disponible actuellement"
      });
    }

    // TODO: Implémenter avec les vraies méthodes Stripe
    throw new TRPCError({
      code: "NOT_IMPLEMENTED",
      message: "Fonctionnalité en cours de développement"
    });
  },

  async createSubscription(customerId: string, priceId: string) {
    return this.createRecurringSubscription(customerId, priceId);
  },

  getTestCards() {
    if (!this.isAvailable()) {
      return [];
    }

    return [
      {
        type: "Visa",
        number: "4242424242424242",
        expMonth: 12,
        expYear: 2030,
        cvc: "123"
      },
      {
        type: "Mastercard",
        number: "5555555555554444",
        expMonth: 12,
        expYear: 2030,
        cvc: "123"
      },
      {
        type: "Découverte",
        number: "6011111111111117",
        expMonth: 12,
        expYear: 2030,
        cvc: "123"
      },
      {
        type: "Échec",
        number: "4000000000000002",
        expMonth: 12,
        expYear: 2030,
        cvc: "123"
      }
    ];
  },

  async processConnectWebhook(event: any) {
    if (!this.isAvailable()) {
      console.warn("Webhook Stripe reçu mais Stripe n'est pas configuré");
      return;
    }

    // TODO: Implémenter le traitement des webhooks
    console.log("Webhook Stripe reçu:", event.type);
  },

  async handleAccountUpdated(account: any) {
    if (!this.isAvailable()) {
      console.warn("handleAccountUpdated appelé mais Stripe n'est pas configuré");
      return;
    }
    
    console.log("handleAccountUpdated:", account.id);
  },

  async handlePayoutCreated(payout: any) {
    if (!this.isAvailable()) {
      console.warn("handlePayoutCreated appelé mais Stripe n'est pas configuré");
      return;
    }
    
    console.log("handlePayoutCreated:", payout.id);
  },

  async handlePayoutFailed(payout: any) {
    if (!this.isAvailable()) {
      console.warn("handlePayoutFailed appelé mais Stripe n'est pas configuré");
      return;
    }
    
    console.log("handlePayoutFailed:", payout.id);
  },

  async handleTransferCreated(transfer: any) {
    if (!this.isAvailable()) {
      console.warn("handleTransferCreated appelé mais Stripe n'est pas configuré");
      return;
    }
    
    console.log("handleTransferCreated:", transfer.id);
  }
};
