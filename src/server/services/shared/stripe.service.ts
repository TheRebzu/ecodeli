// src/server/services/stripe.service.ts
import { TRPCError } from "@trpc/server";
import Stripe from "stripe";
import { db } from "@/server/db";

/**
 * Vérifie la disponibilité de Stripe
 */
export function checkStripeAvailability(): { isAvailable: boolean; reason?: string } {
  if (!process.env.STRIPE_SECRET_KEY) {
    return {
      isAvailable: false,
      reason: "STRIPE_SECRET_KEY manquante dans la configuration"
    };
  }

  try {
    // Test basique de création du client Stripe
    new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-05-28.basil"
    });
    return { isAvailable: true };
  } catch (error) {
    return {
      isAvailable: false,
      reason: `Erreur d'initialisation Stripe: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
    };
  }
}

// Vérification de la disponibilité de Stripe
const isStripeAvailable = Boolean(process.env.STRIPE_SECRET_KEY);

/**
 * Configuration du client Stripe
 */
let stripeClient: Stripe | null = null;

if (process.env.STRIPE_SECRET_KEY) {
  try {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-05-28.basil"
    });
  } catch (error) {
    console.error("Erreur lors de l'initialisation de Stripe:", error);
  }
}

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
  requireStripe(): Stripe {
    if (!this.isAvailable() || !stripeClient) {
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
    captureMethod: "automatic" | "manual" = "automatic",
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
        amount: Math.round(amount), // Stripe utilise les centimes
        currency, 
        payment_method_types: ["card"],
        capture_method: captureMethod,
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
    const { email, country = "FR", type = "express" } = accountInfo;

    try {
      const stripe = this.requireStripe();
      const account = await stripe.accounts.create({
        type: type as Stripe.AccountCreateParams.Type,
        country,
        email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true }
        }
      });

      // Créer ou mettre à jour le wallet avec l'ID du compte Connect
      // TODO: Implémenter la logique wallet quand le service sera disponible
      // const wallet = await walletService.getOrCreateWallet(delivererId);
      // await db.wallet.update({
      //   where: { id: wallet.id },
      //   data: {
      //     stripeAccountId: account.id,
      //     accountType: type,
      //     accountVerified: account.details_submitted || false
      //   }
      // });

      return account;
    } catch (error) {
      console.error("Erreur lors de la création du compte Connect:", error);
      throw new TRPCError({ 
        code: "INTERNAL_SERVER_ERROR",
        message: "Impossible de créer le compte Connect",
        cause: error 
      });
    }
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
    try {
      const stripe = this.requireStripe();
      const transfer = await stripe.transfers.create({ 
        amount: Math.round(amount * 100), // Convertir en centimes
        currency: "eur",
        destination: accountId,
        metadata 
      });

      // Mettre à jour le wallet correspondant
      // TODO: Implémenter la logique wallet quand le service sera disponible
      // const wallet = await db.wallet.findFirst({
      //   where: { stripeAccountId: accountId }
      // });

      // if (wallet) {
      //   await walletService.createWalletTransaction(wallet.id, {
      //     amount,
      //     type: "EARNING",
      //     description: "Transfert Stripe Connect",
      //     reference: transfer.id,
      //     metadata: {
      //       ...metadata,
      //       stripeTransferId: transfer.id
      //     }
      //   });
      // }

      return transfer;
    } catch (error) {
      console.error("Erreur lors du transfert Stripe Connect:", error);
      throw new TRPCError({ 
        code: "INTERNAL_SERVER_ERROR",
        message: "Échec du transfert",
        cause: error 
      });
    }
  },

  async createPayout(
    accountId: string,
    amount: number,
    method: "standard" | "instant" = "standard",
  ) {
    try {
      const stripe = this.requireStripe();
      const payout = await stripe.payouts.create(
        {
          amount: Math.round(amount * 100),
          currency: "eur",
          method},
        { stripeAccount: accountId },
      );

      // Mettre à jour le wallet correspondant
      // TODO: Implémenter la logique wallet quand le service sera disponible
      // const wallet = await db.wallet.findFirst({
      //   where: { stripeAccountId: accountId }
      // });

      // if (wallet) {
      //   await walletService.createWalletTransaction(wallet.id, {
      //     amount: -amount,
      //     type: "WITHDRAWAL",
      //     description: "Paiement Stripe Connect",
      //     reference: payout.id,
      //     metadata: {
      //       stripePayoutId: payout.id,
      //       method
      //     }
      //   });
      // }

      return payout;
    } catch (error) {
      console.error("Erreur lors du payout Stripe Connect:", error);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
        message: "Échec du paiement",
        cause: error });
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
        message: "Les paiements par carte ne sont pas disponibles actuellement"
      });
    }

    try {
      const stripe = this.requireStripe();
      return await stripe.customers.create({
        email,
        name,
        metadata,
      });
    } catch (error) {
      console.error("Erreur lors de la création du client Stripe:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Impossible de créer le client",
        cause: error
      });
    }
  },

  async getOrCreateCustomer(userId: string, email: string, name?: string) {
    // Vérifier si l'utilisateur a déjà un customer ID
    const user = await db.user.findUnique({
      where: { id: userId }});

    if (user?.stripeCustomerId) {
      // Récupérer le customer existant
      try {
        const stripe = this.requireStripe();
      return await stripe.customers.retrieve(user.stripeCustomerId);
      } catch (error) {
        console.warn(
          "Customer Stripe non trouvé, création d'un nouveau:",
          error,
        );
        // Continuer pour créer un nouveau customer
      }
    }

    // Créer un nouveau customer
    const customer = await this.createCustomer(email, name, { userId });

    // Mettre à jour l'utilisateur avec le customer ID
    await db.user.update({
      where: { id: userId },
      data: { stripeCustomerId: customer.id }});

    return customer;
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
    const { trialPeriodDays, metadata = {}, defaultPaymentMethod } = options;

    try {
      const stripe = this.requireStripe();
      const subscriptionData: any = {
        customer: customerId,
        items: [{ price: priceId }],
        metadata,
        expand: ["latest_invoice.payment_intent"]};

      if (trialPeriodDays) {
        subscriptionData.trial_period_days = trialPeriodDays;
      }

      if (defaultPaymentMethod) {
        subscriptionData.default_payment_method = defaultPaymentMethod;
      }

      return await stripe.subscriptions.create(subscriptionData);
    } catch (error) {
      console.error(
        "Erreur lors de la création de l'abonnement récurrent:",
        error,
      );
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
        message: "Échec de la création de l'abonnement",
        cause: error });
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
    try {
      if (cancelImmediately) {
        const stripe = this.requireStripe();
      return await stripe.subscriptions.cancel(subscriptionId);
              } else {
          const stripe = this.requireStripe();
          return await stripe.subscriptions.update(subscriptionId, {
          cancel_at_period_end: true});
      }
    } catch (error) {
      console.error("Erreur lors de l'annulation de l'abonnement:", error);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
        message: "Échec de l'annulation de l'abonnement",
        cause: error });
    }

    // TODO: Implémenter avec les vraies méthodes Stripe
    throw new TRPCError({
      code: "NOT_IMPLEMENTED",
      message: "Fonctionnalité en cours de développement"
    });
  },

  async createSubscription(customerId: string, priceId: string) {
    if (!this.isAvailable()) {
      throw new TRPCError({
        code: "SERVICE_UNAVAILABLE",
        message: "Les abonnements ne sont pas disponibles actuellement"
      });
    }

    try {
      const stripe = this.requireStripe();
      return await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
      });
    } catch (error) {
      console.error("Erreur lors de la création de l'abonnement:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Impossible de créer l'abonnement",
        cause: error
      });
    }
  },

  /**
   * Génère des cartes de test Stripe complètes pour différents scénarios
   */
  getTestCards() {
    const currentYear = new Date().getFullYear();
    const testYear = currentYear + 5; // Cartes valides pour 5 ans
    
    return {
      // Cartes de paiement réussies
      success: [
        {
          type: "Visa",
          number: "4242424242424242",
          expMonth: 12,
          expYear: testYear,
          cvc: "123",
          description: "Carte Visa générique - Paiement réussi",
          country: "US"
        },
        {
          type: "Visa (débit)",
          number: "4000056655665556",
          expMonth: 12,
          expYear: testYear,
          cvc: "123",
          description: "Carte Visa débit - Paiement réussi",
          country: "US"
        },
        {
          type: "Mastercard",
          number: "5555555555554444",
          expMonth: 12,
          expYear: testYear,
          cvc: "123",
          description: "Carte Mastercard - Paiement réussi",
          country: "US"
        },
        {
          type: "American Express",
          number: "378282246310005",
          expMonth: 12,
          expYear: testYear,
          cvc: "1234", // Amex utilise 4 chiffres
          description: "Carte American Express - Paiement réussi",
          country: "US"
        },
        {
          type: "Visa (France)",
          number: "4000002500003155",
          expMonth: 12,
          expYear: testYear,
          cvc: "123",
          description: "Carte Visa française - Paiement réussi",
          country: "FR"
        }
      ],
      
      // Cartes nécessitant une authentification 3D Secure
      authentication: [
        {
          type: "Visa (3D Secure)",
          number: "4000002760003184",
          expMonth: 12,
          expYear: testYear,
          cvc: "123",
          description: "Carte nécessitant une authentification 3D Secure",
          country: "FR"
        },
        {
          type: "Mastercard (3D Secure)",
          number: "5200828282828210",
          expMonth: 12,
          expYear: testYear,
          cvc: "123",
          description: "Mastercard avec authentification 3D Secure",
          country: "FR"
        }
      ],
      
      // Cartes de test pour les échecs
      declined: [
        {
          type: "Visa (fonds insuffisants)",
          number: "4000000000000002",
          expMonth: 12,
          expYear: testYear,
          cvc: "123",
          description: "Carte déclinée - Fonds insuffisants",
          errorCode: "card_declined",
          country: "US"
        },
        {
          type: "Visa (carte expirée)",
          number: "4000000000000069",
          expMonth: 12,
          expYear: testYear,
          cvc: "123",
          description: "Carte déclinée - Carte expirée",
          errorCode: "expired_card",
          country: "US"
        },
        {
          type: "Visa (CVC incorrect)",
          number: "4000000000000127",
          expMonth: 12,
          expYear: testYear,
          cvc: "123",
          description: "Carte déclinée - CVC incorrect",
          errorCode: "incorrect_cvc",
          country: "US"
        },
        {
          type: "Visa (traitement erreur)",
          number: "4000000000000119",
          expMonth: 12,
          expYear: testYear,
          cvc: "123",
          description: "Erreur de traitement général",
          errorCode: "processing_error",
          country: "US"
        }
      ],
      
      // Cartes de test spéciales
      special: [
        {
          type: "Visa (dispute)",
          number: "4000000000000259",
          expMonth: 12,
          expYear: testYear,
          cvc: "123",
          description: "Paiement qui sera disputé automatiquement",
          warningEarly: true,
          country: "US"
        },
        {
          type: "Visa (fraud)",
          number: "4100000000000019",
          expMonth: 12,
          expYear: testYear,
          cvc: "123",
          description: "Carte signalée comme frauduleuse",
          riskLevel: "highest",
          country: "US"
        }
      ],
      
      // Cartes par région
      international: [
        {
          type: "Visa (Allemagne)",
          number: "4000000000003220",
          expMonth: 12,
          expYear: testYear,
          cvc: "123",
          description: "Carte Visa allemande",
          country: "DE"
        },
        {
          type: "Visa (Canada)",
          number: "4000001240000000",
          expMonth: 12,
          expYear: testYear,
          cvc: "123",
          description: "Carte Visa canadienne",
          country: "CA"
        },
        {
          type: "Visa (Royaume-Uni)",
          number: "4000000000000002",
          expMonth: 12,
          expYear: testYear,
          cvc: "123",
          description: "Carte Visa britannique",
          country: "GB"
        }
      ],
      
      // Informations utiles pour les développeurs
      metadata: {
        generatedAt: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        stripeMode: process.env.STRIPE_SECRET_KEY?.includes('sk_test') ? 'test' : 'live',
        documentation: "https://stripe.com/docs/testing#cards",
        note: "Ces cartes ne sont valides qu'en mode test Stripe"
      }
    };
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
