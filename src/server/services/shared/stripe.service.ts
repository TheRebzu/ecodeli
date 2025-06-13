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
  apiVersion: "2025-05-28.basil",
});

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
  ) {
    try {
      return await stripeClient.paymentIntents.create({
        amount: Math.round(amount * 100), // Stripe utilise les centimes
        currency,
        payment_method_types: ["card"],
        metadata,
      });
    } catch (_error) {
      console.error("Erreur lors de la création du paiement Stripe:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Impossible de créer l'intention de paiement",
        cause: error,
      });
    }
  },

  /**
   * Récupère les détails d'un paiement
   */
  async retrievePaymentIntent(paymentIntentId: string) {
    try {
      return await stripeClient.paymentIntents.retrieve(paymentIntentId);
    } catch (_error) {
      console.error(
        "Erreur lors de la récupération du paiement Stripe:",
        error,
      );
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Paiement introuvable",
        cause: error,
      });
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
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Compte Stripe Connect non configuré",
        });
      }

      return await stripeClient.transfers.create({
        amount: Math.round(amount * 100),
        currency: "eur",
        destination: wallet.stripeAccountId,
        metadata: {
          ...metadata,
          userId,
        },
      });
    } catch (_error) {
      console.error("Erreur lors du retrait Stripe:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Impossible d'effectuer le retrait",
        cause: error,
      });
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
    const { email: _email, country = "FR", type = "express" } = accountInfo;

    try {
      const account = await stripeClient.accounts.create({
        type: type as Stripe.AccountCreateParams.Type,
        country,
        email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });

      // Créer ou mettre à jour le wallet avec l'ID du compte Connect
      const wallet = await walletService.getOrCreateWallet(delivererId);
      await db.wallet.update({
        where: { id: wallet.id },
        data: {
          stripeAccountId: account.id,
          accountType: type,
          accountVerified: account.details_submitted || false,
        },
      });

      return account;
    } catch (_error) {
      console.error("Erreur lors de la création du compte Connect:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Impossible de créer le compte Connect",
        cause: error,
      });
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
      return await stripeClient.accountLinks.create({
        account: accountId,
        refresh_url: refreshUrl,
        return_url: returnUrl,
        type: "account_onboarding",
      });
    } catch (_error) {
      console.error("Erreur lors de la création du lien d'onboarding:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Échec de la création du lien d'onboarding",
        cause: error,
      });
    }
  },

  /**
   * STRIPE CONNECT - Récupère les informations d'un compte Connect
   */
  async retrieveConnectAccount(accountId: string) {
    try {
      return await stripeClient.accounts.retrieve(accountId);
    } catch (_error) {
      console.error("Erreur lors de la récupération du compte Connect:", error);
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Compte Connect non trouvé",
        cause: error,
      });
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
      const transfer = await stripeClient.transfers.create({
        amount: Math.round(amount * 100), // Convertir en centimes
        currency: "eur",
        destination: accountId,
        metadata,
      });

      // Mettre à jour le wallet correspondant
      const wallet = await db.wallet.findFirst({
        where: { stripeAccountId: accountId },
      });

      if (wallet) {
        await walletService.createWalletTransaction(wallet.id, {
          amount,
          type: "EARNING",
          description: "Transfert Stripe Connect",
          reference: transfer.id,
          metadata: {
            ...metadata,
            stripeTransferId: transfer.id,
          },
        });
      }

      return transfer;
    } catch (_error) {
      console.error("Erreur lors du transfert Stripe Connect:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Échec du transfert",
        cause: error,
      });
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
          method,
        },
        {
          stripeAccount: accountId,
        },
      );

      // Mettre à jour le wallet correspondant
      const wallet = await db.wallet.findFirst({
        where: { stripeAccountId: accountId },
      });

      if (wallet) {
        await walletService.createWalletTransaction(wallet.id, {
          amount: -amount,
          type: "WITHDRAWAL",
          description: "Paiement Stripe Connect",
          reference: payout.id,
          metadata: {
            stripePayoutId: payout.id,
            method,
          },
        });
      }

      return payout;
    } catch (_error) {
      console.error("Erreur lors du payout Stripe Connect:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Échec du paiement",
        cause: error,
      });
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
      return await stripeClient.customers.create({
        email,
        name,
        metadata,
      });
    } catch (_error) {
      console.error("Erreur lors de la création du customer:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Échec de la création du customer",
        cause: error,
      });
    }
  },

  /**
   * ABONNEMENTS - Récupère ou crée un customer Stripe
   */
  async getOrCreateCustomer(userId: string, email: string, name?: string) {
    // Vérifier si l'utilisateur a déjà un customer ID
    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (user?.stripeCustomerId) {
      // Récupérer le customer existant
      try {
        return await stripeClient.customers.retrieve(user.stripeCustomerId);
      } catch (_error) {
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
      data: { stripeCustomerId: customer.id },
    });

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
      return await stripeClient.setupIntents.create({
        customer: customerId,
        payment_method_types: ["card"],
        metadata,
      });
    } catch (_error) {
      console.error("Erreur lors de la création du Setup Intent:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Échec de la création du Setup Intent",
        cause: error,
      });
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
        expand: ["latest_invoice.payment_intent"],
      };

      if (trialPeriodDays) {
        subscriptionData.trial_period_days = trialPeriodDays;
      }

      if (defaultPaymentMethod) {
        subscriptionData.default_payment_method = defaultPaymentMethod;
      }

      return await stripeClient.subscriptions.create(subscriptionData);
    } catch (_error) {
      console.error(
        "Erreur lors de la création de l'abonnement récurrent:",
        error,
      );
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Échec de la création de l'abonnement",
        cause: error,
      });
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
            quantity: updates.quantity || 1,
          },
        ];
      }

      return await stripeClient.subscriptions.update(
        subscriptionId,
        updateData,
      );
    } catch (_error) {
      console.error("Erreur lors de la mise à jour de l'abonnement:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Échec de la mise à jour de l'abonnement",
        cause: error,
      });
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
          cancel_at_period_end: true,
        });
      }
    } catch (_error) {
      console.error("Erreur lors de l'annulation de l'abonnement:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Échec de l'annulation de l'abonnement",
        cause: error,
      });
    }
  },

  /**
   * Crée un abonnement Stripe (méthode legacy, maintenant redirigée vers createRecurringSubscription)
   */
  async createSubscription(customerId: string, priceId: string) {
    return this.createRecurringSubscription(customerId, priceId);
  },

  /**
   * Génère une carte de test Stripe pour le mode démo
   */
  getTestCards() {
    return [
      {
        type: "Visa",
        number: "4242424242424242",
        expMonth: 12,
        expYear: 2030,
        cvc: "123",
      },
      {
        type: "Mastercard",
        number: "5555555555554444",
        expMonth: 12,
        expYear: 2030,
        cvc: "123",
      },
      {
        type: "Découverte",
        number: "6011111111111117",
        expMonth: 12,
        expYear: 2030,
        cvc: "123",
      },
      {
        type: "Échec",
        number: "4000000000000002",
        expMonth: 12,
        expYear: 2030,
        cvc: "123",
      },
    ];
  },

  /**
   * Utilitaires pour les webhooks Connect
   */
  async processConnectWebhook(event: any) {
    switch (event.type) {
      case "account.updated":
        return await this._handleAccountUpdated(event.data.object);
      case "payout.created":
        return await this._handlePayoutCreated(event.data.object);
      case "payout.failed":
        return await this._handlePayoutFailed(event.data.object);
      case "transfer.created":
        return await this._handleTransferCreated(event.data.object);
      default:
        console.log(`Événement Connect non géré: ${event.type}`);
    }
  },

  async _handleAccountUpdated(account: any) {
    const wallet = await db.wallet.findFirst({
      where: { stripeAccountId: account.id },
    });

    if (wallet) {
      await db.wallet.update({
        where: { id: wallet.id },
        data: {
          accountVerified:
            account.details_submitted && !account.requirements?.disabled_reason,
          accountType: account.type,
        },
      });
    }
  },

  async _handlePayoutCreated(payout: any) {
    // Géré par le webhook principal
  },

  async _handlePayoutFailed(payout: any) {
    // Géré par le webhook principal
  },

  async _handleTransferCreated(transfer: any) {
    // Géré automatiquement par createTransfer
  },
};
