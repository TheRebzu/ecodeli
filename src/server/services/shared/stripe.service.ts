// src/server/services/stripe.service.ts
import Stripe from "stripe";
import { db } from "@/server/db";
import { walletService } from "@/server/services/shared/wallet.service";
import { TRPCError } from "@trpc/server";
import { v4 as uuidv4 } from "uuid";

import { Decimal } from "@prisma/client/runtime/library";

/**
 * Configuration du client Stripe
 */
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY est requis pour le service Stripe");
}

const stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-12-18.acacia"});

/**
 * Service Stripe pour la gestion des paiements
 */
export const stripeService = {
  /**
   * Crée une intention de paiement Stripe
   */
  async createPaymentIntent(
    amount: number,
    currency: string = "eur",
    metadata: Record<string, string> = {},
    captureMethod: "automatic" | "manual" = "automatic",
  ) {
    try {
      return await stripeClient.paymentIntents.create({ 
        amount: Math.round(amount), // Stripe utilise les centimes
        currency, 
        payment_method_types: ["card"],
        capture_method: captureMethod,
        metadata 
      });
    } catch (error) {
      console.error("Erreur lors de la création du paiement Stripe:", error);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
        message: "Impossible de créer l'intention de paiement",
        cause: error });
    }
  },

  /**
   * Récupère les détails d'un paiement
   */
  async retrievePaymentIntent(paymentIntentId: string) {
    try {
      return await stripeClient.paymentIntents.retrieve(paymentIntentId);
    } catch (error) {
      console.error(
        "Erreur lors de la récupération du paiement Stripe:",
        error,
      );
      throw new TRPCError({ code: "NOT_FOUND",
        message: "Paiement introuvable",
        cause: error });
    }
  },

  /**
   * Effectue un retrait vers un compte bancaire externe
   */
  async createPayoutToBank(
    amount: number,
    userId: string,
    metadata: Record<string, string> = {},
  ) {
    try {
      // Récupérer le compte Connect de l'utilisateur
      const wallet = await walletService.getOrCreateWallet(userId);

      if (!wallet.stripeAccountId) {
        throw new TRPCError({ code: "PRECONDITION_FAILED",
          message: "Compte Stripe Connect non configuré" });
      }

      return await stripeClient.transfers.create({
        amount: Math.round(amount * 100),
        currency: "eur",
        destination: wallet.stripeAccountId,
        metadata: {
          ...metadata,
          userId}});
    } catch (error) {
      console.error("Erreur lors du retrait Stripe:", error);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
        message: "Impossible d'effectuer le retrait",
        cause: error });
    }
  },

  /**
   * STRIPE CONNECT - Crée un compte Connect pour un livreur
   */
  async createConnectAccount(
    delivererId: string,
    accountInfo: {
      email: string;
      country?: string;
      type?: string;
    },
  ) {
    const { email: email, country = "FR", type = "express" } = accountInfo;

    try {
      const account = await stripeClient.accounts.create({
        type: type as Stripe.AccountCreateParams.Type,
        country,
        email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true }}});

      // Créer ou mettre à jour le wallet avec l'ID du compte Connect
      const wallet = await walletService.getOrCreateWallet(delivererId);
      await db.wallet.update({
        where: { id: wallet.id },
        data: {
          stripeAccountId: account.id,
          accountType: type,
          accountVerified: account.details_submitted || false}});

      return account;
    } catch (error) {
      console.error("Erreur lors de la création du compte Connect:", error);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
        message: "Impossible de créer le compte Connect",
        cause: error });
    }
  },

  /**
   * STRIPE CONNECT - Génère un lien d'onboarding pour un compte Connect
   */
  async createAccountLink(
    accountId: string,
    refreshUrl: string,
    returnUrl: string,
  ) {
    try {
      return await stripeClient.accountLinks.create({ account: accountId, refresh_url: refreshUrl, return_url: returnUrl,
        type: "account_onboarding" });
    } catch (error) {
      console.error("Erreur lors de la création du lien d'onboarding:", error);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
        message: "Échec de la création du lien d'onboarding",
        cause: error });
    }
  },

  /**
   * STRIPE CONNECT - Récupère les informations d'un compte Connect
   */
  async retrieveConnectAccount(accountId: string) {
    try {
      return await stripeClient.accounts.retrieve(accountId);
    } catch (error) {
      console.error("Erreur lors de la récupération du compte Connect:", error);
      throw new TRPCError({ code: "NOT_FOUND",
        message: "Compte Connect non trouvé",
        cause: error });
    }
  },

  /**
   * STRIPE CONNECT - Crée un transfert vers un compte Connect
   */
  async createTransfer(
    accountId: string,
    amount: number,
    metadata: Record<string, string> = {},
  ) {
    try {
      const transfer = await stripeClient.transfers.create({ amount: Math.round(amount * 100), // Convertir en centimes
        currency: "eur",
        destination: accountId,
        metadata });

      // Mettre à jour le wallet correspondant
      const wallet = await db.wallet.findFirst({
        where: { stripeAccountId: accountId }});

      if (wallet) {
        await walletService.createWalletTransaction(wallet.id, {
          amount,
          type: "EARNING",
          description: "Transfert Stripe Connect",
          reference: transfer.id,
          metadata: {
            ...metadata,
            stripeTransferId: transfer.id}});
      }

      return transfer;
    } catch (error) {
      console.error("Erreur lors du transfert Stripe Connect:", error);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
        message: "Échec du transfert",
        cause: error });
    }
  },

  /**
   * STRIPE CONNECT - Crée un payout depuis un compte Connect
   */
  async createPayout(
    accountId: string,
    amount: number,
    method: "standard" | "instant" = "standard",
  ) {
    try {
      const payout = await stripeClient.payouts.create(
        {
          amount: Math.round(amount * 100),
          currency: "eur",
          method},
        { stripeAccount: accountId },
      );

      // Mettre à jour le wallet correspondant
      const wallet = await db.wallet.findFirst({
        where: { stripeAccountId: accountId }});

      if (wallet) {
        await walletService.createWalletTransaction(wallet.id, {
          amount: -amount,
          type: "WITHDRAWAL",
          description: "Paiement Stripe Connect",
          reference: payout.id,
          metadata: {
            stripePayoutId: payout.id,
            method}});
      }

      return payout;
    } catch (error) {
      console.error("Erreur lors du payout Stripe Connect:", error);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
        message: "Échec du paiement",
        cause: error });
    }
  },

  /**
   * ABONNEMENTS - Crée un customer Stripe pour les abonnements récurrents
   */
  async createCustomer(
    email: string,
    name?: string,
    metadata: Record<string, string> = {},
  ) {
    try {
      return await stripeClient.customers.create({ email,
        name,
        metadata });
    } catch (error) {
      console.error("Erreur lors de la création du customer:", error);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
        message: "Échec de la création du customer",
        cause: error });
    }
  },

  /**
   * ABONNEMENTS - Récupère ou crée un customer Stripe
   */
  async getOrCreateCustomer(userId: string, email: string, name?: string) {
    // Vérifier si l'utilisateur a déjà un customer ID
    const user = await db.user.findUnique({
      where: { id: userId }});

    if (user?.stripeCustomerId) {
      // Récupérer le customer existant
      try {
        return await stripeClient.customers.retrieve(user.stripeCustomerId);
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

  /**
   * ABONNEMENTS - Crée un Setup Intent pour enregistrer une méthode de paiement
   */
  async createSetupIntent(
    customerId: string,
    metadata: Record<string, string> = {},
  ) {
    try {
      return await stripeClient.setupIntents.create({ customer: customerId, payment_method_types: ["card"],
        metadata });
    } catch (error) {
      console.error("Erreur lors de la création du Setup Intent:", error);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
        message: "Échec de la création du Setup Intent",
        cause: error });
    }
  },

  /**
   * ABONNEMENTS - Crée un abonnement récurrent pour un marchand
   */
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

      return await stripeClient.subscriptions.create(subscriptionData);
    } catch (error) {
      console.error(
        "Erreur lors de la création de l'abonnement récurrent:",
        error,
      );
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
        message: "Échec de la création de l'abonnement",
        cause: error });
    }
  },

  /**
   * ABONNEMENTS - Met à jour un abonnement existant
   */
  async updateSubscription(
    subscriptionId: string,
    updates: {
      priceId?: string;
      quantity?: number;
      metadata?: Record<string, string>;
      cancelAtPeriodEnd?: boolean;
    },
  ) {
    try {
      const updateData: any = {};

      if (updates.cancelAtPeriodEnd !== undefined) {
        updateData.cancel_at_period_end = updates.cancelAtPeriodEnd;
      }

      if (updates.metadata) {
        updateData.metadata = updates.metadata;
      }

      if (updates.priceId) {
        // Pour changer le prix, il faut mettre à jour les items
        const subscription =
          await stripeClient.subscriptions.retrieve(subscriptionId);
        updateData.items = [
          {
            id: subscription.items.data[0]?.id,
            price: updates.priceId,
            quantity: updates.quantity || 1}];
      }

      return await stripeClient.subscriptions.update(
        subscriptionId,
        updateData,
      );
    } catch (error) {
      console.error("Erreur lors de la mise à jour de l'abonnement:", error);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
        message: "Échec de la mise à jour de l'abonnement",
        cause: error });
    }
  },

  /**
   * ABONNEMENTS - Annule un abonnement
   */
  async cancelSubscription(
    subscriptionId: string,
    cancelImmediately: boolean = false,
  ) {
    try {
      if (cancelImmediately) {
        return await stripeClient.subscriptions.cancel(subscriptionId);
      } else {
        return await stripeClient.subscriptions.update(subscriptionId, {
          cancel_at_period_end: true});
      }
    } catch (error) {
      console.error("Erreur lors de l'annulation de l'abonnement:", error);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
        message: "Échec de l'annulation de l'abonnement",
        cause: error });
    }
  },

  /**
   * Crée un abonnement Stripe (méthode legacy, maintenant redirigée vers createRecurringSubscription)
   */
  async createSubscription(customerId: string, priceId: string) {
    return this.createRecurringSubscription(customerId, priceId);
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

  /**
   * Utilitaires pour les webhooks Connect
   */
  async processConnectWebhook(event: any) {
    switch (event.type) {
      case "account.updated":
        return await this.handleAccountUpdated(event.data.object);
      case "payout.created":
        return await this.handlePayoutCreated(event.data.object);
      case "payout.failed":
        return await this.handlePayoutFailed(event.data.object);
      case "transfer.created":
        return await this.handleTransferCreated(event.data.object);
      default:
        console.log(`Événement Connect non géré: ${event.type}`);
    }
  },

  async handleAccountUpdated(account: any) {
    const wallet = await db.wallet.findFirst({
      where: { stripeAccountId: account.id }});

    if (wallet) {
      await db.wallet.update({
        where: { id: wallet.id },
        data: {
          accountVerified:
            account.details_submitted && !account.requirements?.disabled_reason,
          accountType: account.type}});
    }
  },

  async handlePayoutCreated(payout: any) {
    // Géré par le webhook principal
  },

  async handlePayoutFailed(payout: any) {
    // Géré par le webhook principal
  },

  async handleTransferCreated(transfer: any) {
    // Géré automatiquement par createTransfer
  }};
