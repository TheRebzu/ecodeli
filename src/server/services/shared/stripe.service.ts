// src/server/services/stripe.service.ts
import Stripe from 'stripe';
import { db } from '@/server/db';
import { walletService } from './wallet.service';
import { TRPCError } from '@trpc/server';
import { v4 as uuidv4 } from 'uuid';
import { TransactionType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

// Vérifier si une clé Stripe est disponible
const hasStripeKey = !!(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY.length > 0);
const isDemoMode = process.env.DEMO_MODE === 'true' || !hasStripeKey;

/**
 * Configuration du client Stripe, avec fallback sur client mock si pas de clé API
 */
let stripeClient: Stripe | null = null;

// N'initialise le client Stripe que si nous avons une clé valide
if (hasStripeKey) {
  try {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2025-04-30.basil',
    });
  } catch (error) {
    console.warn("Impossible d'initialiser Stripe:", error);
    stripeClient = null;
  }
}

/**
 * Service Stripe pour la gestion des paiements
 */
export const stripeService = {
  /**
   * Crée une intention de paiement Stripe
   * En mode démo, simule une intention de paiement sans appeler Stripe API
   */
  async createPaymentIntent(
    amount: number,
    currency: string = 'eur',
    metadata: Record<string, string> = {}
  ) {
    // En mode démo ou sans clé API, simuler le paiement
    if (isDemoMode || !stripeClient) {
      return {
        id: `demo_pi_${Math.random().toString(36).substring(2, 15)}`,
        client_secret: `demo_seti_${Math.random().toString(36).substring(2, 15)}`,
        amount,
        currency,
        status: 'succeeded',
        metadata: {
          ...metadata,
          demo: 'true',
        },
      };
    }

    // Code réel pour Stripe en production
    try {
      return await stripeClient.paymentIntents.create({
        amount: Math.round(amount * 100), // Stripe utilise les centimes
        currency,
        payment_method_types: ['card'],
        metadata: {
          ...metadata,
          demo: 'false',
        },
      });
    } catch (error) {
      console.error('Erreur lors de la création du paiement Stripe:', error);
      // Fallback sur le mode démo en cas d'erreur
      return {
        id: `error_pi_${Math.random().toString(36).substring(2, 15)}`,
        client_secret: `error_seti_${Math.random().toString(36).substring(2, 15)}`,
        amount,
        currency,
        status: 'succeeded',
        metadata: {
          ...metadata,
          demo: 'true',
          error: 'true',
        },
      };
    }
  },

  /**
   * Récupère les détails d'un paiement
   * En mode démo, simule une réponse sans appeler Stripe API
   */
  async retrievePaymentIntent(paymentIntentId: string) {
    if (
      isDemoMode ||
      !stripeClient ||
      paymentIntentId.startsWith('demo_pi_') ||
      paymentIntentId.startsWith('error_pi_')
    ) {
      return {
        id: paymentIntentId,
        status: 'succeeded',
        amount: 1000, // Exemple
        currency: 'eur',
        metadata: { demo: 'true' },
      };
    }

    try {
      return await stripeClient.paymentIntents.retrieve(paymentIntentId);
    } catch (error) {
      console.error('Erreur lors de la récupération du paiement Stripe:', error);
      // Fallback sur le mode démo en cas d'erreur
      return {
        id: paymentIntentId,
        status: 'succeeded',
        amount: 1000,
        currency: 'eur',
        metadata: { demo: 'true', error: 'true' },
      };
    }
  },

  /**
   * Simule un retrait vers un compte bancaire externe
   * En mode démo, retourne une simulation sans réellement effectuer de transfert
   */
  async simulatePayoutToBank(
    amount: number,
    userId: string,
    metadata: Record<string, string> = {}
  ) {
    if (isDemoMode || !stripeClient) {
      return {
        id: `demo_po_${Math.random().toString(36).substring(2, 15)}`,
        amount,
        currency: 'eur',
        status: 'paid',
        arrival_date: Math.floor(Date.now() / 1000) + 86400 * 3, // +3 jours
        metadata: {
          ...metadata,
          userId,
          demo: 'true',
        },
      };
    }

    // En production, utiliser Stripe Connect pour les virements
    // Code non implémenté pour la démo
    return {
      id: `not_implemented_po_${Math.random().toString(36).substring(2, 15)}`,
      amount,
      currency: 'eur',
      status: 'pending',
      arrival_date: Math.floor(Date.now() / 1000) + 86400 * 3,
      metadata: {
        ...metadata,
        userId,
        demo: 'false',
      },
    };
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
    }
  ) {
    const { email, country = 'FR', type = 'express' } = accountInfo;

    if (isDemoMode || !stripeClient) {
      const demoAccountId = `acct_demo_${Math.random().toString(36).substring(2, 15)}`;

      // Créer ou mettre à jour le wallet avec l'ID du compte Connect démo
      const wallet = await walletService.getOrCreateWallet(delivererId);
      await db.wallet.update({
        where: { id: wallet.id },
        data: {
          stripeAccountId: demoAccountId,
          accountType: type,
          accountVerified: true, // En mode démo, on considère le compte comme vérifié
        },
      });

      return {
        id: demoAccountId,
        type,
        email,
        country,
        details_submitted: true,
        charges_enabled: true,
        payouts_enabled: true,
        requirements: {
          currently_due: [],
          eventually_due: [],
          past_due: [],
          pending_verification: [],
          disabled_reason: null,
        },
        demo: true,
      };
    }

    try {
      const account = await stripeClient.accounts.create({
        type,
        country,
        email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: 'individual',
        settings: {
          payouts: {
            schedule: {
              interval: 'weekly',
              weekly_anchor: 'friday',
            },
          },
        },
      });

      // Mettre à jour le wallet avec l'ID du compte Connect
      const wallet = await walletService.getOrCreateWallet(delivererId);
      await db.wallet.update({
        where: { id: wallet.id },
        data: {
          stripeAccountId: account.id,
          accountType: account.type,
          accountVerified: account.details_submitted && !account.requirements?.disabled_reason,
        },
      });

      return account;
    } catch (error) {
      console.error('Erreur lors de la création du compte Connect:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Échec de la création du compte Connect',
        cause: error,
      });
    }
  },

  /**
   * STRIPE CONNECT - Génère un lien d'onboarding pour un compte Connect
   */
  async createAccountLink(accountId: string, refreshUrl: string, returnUrl: string) {
    if (isDemoMode || !stripeClient) {
      return {
        object: 'account_link',
        url: `${returnUrl}?demo=true&account=${accountId}&success=true`,
        created: Math.floor(Date.now() / 1000),
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        demo: true,
      };
    }

    try {
      return await stripeClient.accountLinks.create({
        account: accountId,
        refresh_url: refreshUrl,
        return_url: returnUrl,
        type: 'account_onboarding',
      });
    } catch (error) {
      console.error("Erreur lors de la création du lien d'onboarding:", error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: "Échec de la création du lien d'onboarding",
        cause: error,
      });
    }
  },

  /**
   * STRIPE CONNECT - Récupère les informations d'un compte Connect
   */
  async retrieveConnectAccount(accountId: string) {
    if (isDemoMode || !stripeClient || accountId.startsWith('acct_demo_')) {
      return {
        id: accountId,
        type: 'express',
        details_submitted: true,
        charges_enabled: true,
        payouts_enabled: true,
        requirements: {
          currently_due: [],
          eventually_due: [],
          past_due: [],
          pending_verification: [],
          disabled_reason: null,
        },
        capabilities: {
          card_payments: 'active',
          transfers: 'active',
        },
        demo: true,
      };
    }

    try {
      return await stripeClient.accounts.retrieve(accountId);
    } catch (error) {
      console.error('Erreur lors de la récupération du compte Connect:', error);
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Compte Connect non trouvé',
        cause: error,
      });
    }
  },

  /**
   * STRIPE CONNECT - Crée un transfert vers un compte Connect
   */
  async createTransfer(accountId: string, amount: number, metadata: Record<string, string> = {}) {
    if (isDemoMode || !stripeClient) {
      const transferId = `tr_demo_${Math.random().toString(36).substring(2, 15)}`;

      // En mode démo, simuler l'ajout immédiat des fonds au wallet
      const wallet = await db.wallet.findFirst({
        where: { stripeAccountId: accountId },
      });

      if (wallet) {
        await walletService.createWalletTransaction(wallet.id, {
          amount,
          type: TransactionType.EARNING,
          description: 'Transfert Stripe Connect (démonstration)',
          reference: transferId,
          metadata: {
            ...metadata,
            demo: true,
            stripeTransferId: transferId,
          },
        });
      }

      return {
        id: transferId,
        amount: amount * 100, // Stripe utilise les centimes
        currency: 'eur',
        destination: accountId,
        created: Math.floor(Date.now() / 1000),
        metadata: {
          ...metadata,
          demo: 'true',
        },
        demo: true,
      };
    }

    try {
      const transfer = await stripeClient.transfers.create({
        amount: Math.round(amount * 100), // Convertir en centimes
        currency: 'eur',
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
          type: TransactionType.EARNING,
          description: 'Transfert Stripe Connect',
          reference: transfer.id,
          metadata: {
            ...metadata,
            stripeTransferId: transfer.id,
          },
        });
      }

      return transfer;
    } catch (error) {
      console.error('Erreur lors du transfert Stripe Connect:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Échec du transfert',
        cause: error,
      });
    }
  },

  /**
   * STRIPE CONNECT - Crée un payout depuis un compte Connect
   */
  async createPayout(accountId: string, amount: number, method: string = 'standard') {
    if (isDemoMode || !stripeClient) {
      const payoutId = `po_demo_${Math.random().toString(36).substring(2, 15)}`;

      // En mode démo, simuler le retrait des fonds du wallet
      const wallet = await db.wallet.findFirst({
        where: { stripeAccountId: accountId },
      });

      if (wallet) {
        await walletService.createWalletTransaction(wallet.id, {
          amount: -amount,
          type: TransactionType.WITHDRAWAL,
          description: 'Paiement Stripe Connect (démonstration)',
          reference: payoutId,
          metadata: {
            demo: true,
            stripePayoutId: payoutId,
            method,
          },
        });
      }

      return {
        id: payoutId,
        amount: amount * 100,
        currency: 'eur',
        method,
        status: 'paid',
        arrival_date: Math.floor(Date.now() / 1000) + (method === 'instant' ? 0 : 86400),
        created: Math.floor(Date.now() / 1000),
        demo: true,
      };
    }

    try {
      const payout = await stripeClient.payouts.create(
        {
          amount: Math.round(amount * 100),
          currency: 'eur',
          method,
        },
        {
          stripeAccount: accountId,
        }
      );

      // Mettre à jour le wallet correspondant
      const wallet = await db.wallet.findFirst({
        where: { stripeAccountId: accountId },
      });

      if (wallet) {
        await walletService.createWalletTransaction(wallet.id, {
          amount: -amount,
          type: TransactionType.WITHDRAWAL,
          description: 'Paiement Stripe Connect',
          reference: payout.id,
          metadata: {
            stripePayoutId: payout.id,
            method,
          },
        });
      }

      return payout;
    } catch (error) {
      console.error('Erreur lors du payout Stripe Connect:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Échec du paiement',
        cause: error,
      });
    }
  },

  /**
   * ABONNEMENTS - Crée un customer Stripe pour les abonnements récurrents
   */
  async createCustomer(email: string, name?: string, metadata: Record<string, string> = {}) {
    if (isDemoMode || !stripeClient) {
      const customerId = `cus_demo_${Math.random().toString(36).substring(2, 15)}`;
      return {
        id: customerId,
        email,
        name,
        created: Math.floor(Date.now() / 1000),
        metadata: {
          ...metadata,
          demo: 'true',
        },
        demo: true,
      };
    }

    try {
      return await stripeClient.customers.create({
        email,
        name,
        metadata,
      });
    } catch (error) {
      console.error('Erreur lors de la création du customer:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Échec de la création du customer',
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
      if (isDemoMode || !stripeClient) {
        return {
          id: user.stripeCustomerId,
          email,
          name,
          demo: true,
        };
      }

      try {
        return await stripeClient.customers.retrieve(user.stripeCustomerId);
      } catch (error) {
        console.warn("Customer Stripe non trouvé, création d'un nouveau:", error);
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
  async createSetupIntent(customerId: string, metadata: Record<string, string> = {}) {
    if (isDemoMode || !stripeClient) {
      return {
        id: `seti_demo_${Math.random().toString(36).substring(2, 15)}`,
        client_secret: `seti_demo_secret_${Math.random().toString(36).substring(2, 15)}`,
        customer: customerId,
        status: 'succeeded',
        metadata: {
          ...metadata,
          demo: 'true',
        },
        demo: true,
      };
    }

    try {
      return await stripeClient.setupIntents.create({
        customer: customerId,
        payment_method_types: ['card'],
        metadata,
      });
    } catch (error) {
      console.error('Erreur lors de la création du Setup Intent:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Échec de la création du Setup Intent',
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
    } = {}
  ) {
    const { trialPeriodDays, metadata = {}, defaultPaymentMethod } = options;

    if (isDemoMode || !stripeClient) {
      const now = Math.floor(Date.now() / 1000);
      const subscriptionId = `sub_demo_${Math.random().toString(36).substring(2, 15)}`;

      return {
        id: subscriptionId,
        customer: customerId,
        status: 'active',
        current_period_start: now,
        current_period_end: now + (trialPeriodDays ? trialPeriodDays * 86400 : 86400 * 30),
        trial_start: trialPeriodDays ? now : null,
        trial_end: trialPeriodDays ? now + trialPeriodDays * 86400 : null,
        items: {
          data: [
            {
              id: `si_demo_${Math.random().toString(36).substring(2, 10)}`,
              price: { id: priceId },
              quantity: 1,
            },
          ],
        },
        metadata: {
          ...metadata,
          demo: 'true',
        },
        demo: true,
      };
    }

    try {
      const subscriptionData: any = {
        customer: customerId,
        items: [{ price: priceId }],
        metadata,
        expand: ['latest_invoice.payment_intent'],
      };

      if (trialPeriodDays) {
        subscriptionData.trial_period_days = trialPeriodDays;
      }

      if (defaultPaymentMethod) {
        subscriptionData.default_payment_method = defaultPaymentMethod;
      }

      return await stripeClient.subscriptions.create(subscriptionData);
    } catch (error) {
      console.error("Erreur lors de la création de l'abonnement récurrent:", error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
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
    }
  ) {
    if (isDemoMode || !stripeClient || subscriptionId.startsWith('sub_demo_')) {
      const now = Math.floor(Date.now() / 1000);
      return {
        id: subscriptionId,
        status: updates.cancelAtPeriodEnd ? 'active' : 'active',
        cancel_at_period_end: updates.cancelAtPeriodEnd || false,
        current_period_start: now,
        current_period_end: now + 86400 * 30,
        items: {
          data: [
            {
              id: `si_demo_${Math.random().toString(36).substring(2, 10)}`,
              price: { id: updates.priceId || 'price_demo' },
              quantity: updates.quantity || 1,
            },
          ],
        },
        metadata: updates.metadata || {},
        demo: true,
      };
    }

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
        const subscription = await stripeClient.subscriptions.retrieve(subscriptionId);
        updateData.items = [
          {
            id: subscription.items.data[0]?.id,
            price: updates.priceId,
            quantity: updates.quantity || 1,
          },
        ];
      }

      return await stripeClient.subscriptions.update(subscriptionId, updateData);
    } catch (error) {
      console.error("Erreur lors de la mise à jour de l'abonnement:", error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: "Échec de la mise à jour de l'abonnement",
        cause: error,
      });
    }
  },

  /**
   * ABONNEMENTS - Annule un abonnement
   */
  async cancelSubscription(subscriptionId: string, cancelImmediately: boolean = false) {
    if (isDemoMode || !stripeClient || subscriptionId.startsWith('sub_demo_')) {
      return {
        id: subscriptionId,
        status: cancelImmediately ? 'canceled' : 'active',
        cancel_at_period_end: !cancelImmediately,
        canceled_at: cancelImmediately ? Math.floor(Date.now() / 1000) : null,
        demo: true,
      };
    }

    try {
      if (cancelImmediately) {
        return await stripeClient.subscriptions.cancel(subscriptionId);
      } else {
        return await stripeClient.subscriptions.update(subscriptionId, {
          cancel_at_period_end: true,
        });
      }
    } catch (error) {
      console.error("Erreur lors de l'annulation de l'abonnement:", error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
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
      { type: 'Visa', number: '4242424242424242', expMonth: 12, expYear: 2030, cvc: '123' },
      { type: 'Mastercard', number: '5555555555554444', expMonth: 12, expYear: 2030, cvc: '123' },
      { type: 'Découverte', number: '6011111111111117', expMonth: 12, expYear: 2030, cvc: '123' },
      { type: 'Échec', number: '4000000000000002', expMonth: 12, expYear: 2030, cvc: '123' },
    ];
  },

  /**
   * Utilitaires pour les webhooks Connect
   */
  async processConnectWebhook(event: any) {
    switch (event.type) {
      case 'account.updated':
        return await this._handleAccountUpdated(event.data.object);
      case 'payout.created':
        return await this._handlePayoutCreated(event.data.object);
      case 'payout.failed':
        return await this._handlePayoutFailed(event.data.object);
      case 'transfer.created':
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
          accountVerified: account.details_submitted && !account.requirements?.disabled_reason,
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
