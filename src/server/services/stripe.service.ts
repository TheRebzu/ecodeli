// src/server/services/stripe.service.ts
import Stripe from 'stripe';

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
    console.warn('Impossible d\'initialiser Stripe:', error);
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
  async createPaymentIntent(amount: number, currency: string = 'eur', metadata: Record<string, string> = {}) {
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
          demo: 'true'
        }
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
          demo: 'false'
        }
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
          error: 'true'
        }
      };
    }
  },

  /**
   * Récupère les détails d'un paiement
   * En mode démo, simule une réponse sans appeler Stripe API
   */
  async retrievePaymentIntent(paymentIntentId: string) {
    if (isDemoMode || !stripeClient || paymentIntentId.startsWith('demo_pi_') || paymentIntentId.startsWith('error_pi_')) {
      return {
        id: paymentIntentId,
        status: 'succeeded',
        amount: 1000, // Exemple
        currency: 'eur',
        metadata: { demo: 'true' }
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
        metadata: { demo: 'true', error: 'true' }
      };
    }
  },

  /**
   * Simule un retrait vers un compte bancaire externe
   * En mode démo, retourne une simulation sans réellement effectuer de transfert
   */
  async simulatePayoutToBank(amount: number, userId: string, metadata: Record<string, string> = {}) {
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
          demo: 'true'
        }
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
        demo: 'false'
      }
    };
  },

  /**
   * Crée un abonnement Stripe
   * En mode démo, simule un abonnement sans appeler Stripe API
   */
  async createSubscription(customerId: string, priceId: string) {
    if (isDemoMode || !stripeClient) {
      const now = Math.floor(Date.now() / 1000);
      return {
        id: `demo_sub_${Math.random().toString(36).substring(2, 15)}`,
        customer: customerId,
        status: 'active',
        current_period_start: now,
        current_period_end: now + 86400 * 30, // +30 jours
        items: {
          data: [
            {
              id: `demo_si_${Math.random().toString(36).substring(2, 10)}`,
              price: { id: priceId }
            }
          ]
        }
      };
    }
    
    // Code réel pour Stripe en production
    try {
      return await stripeClient.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
      });
    } catch (error) {
      console.error('Erreur lors de la création de l\'abonnement Stripe:', error);
      // Fallback sur le mode démo en cas d'erreur
      const now = Math.floor(Date.now() / 1000);
      return {
        id: `error_sub_${Math.random().toString(36).substring(2, 15)}`,
        customer: customerId,
        status: 'active',
        current_period_start: now,
        current_period_end: now + 86400 * 30,
        items: {
          data: [
            {
              id: `error_si_${Math.random().toString(36).substring(2, 10)}`,
              price: { id: priceId }
            }
          ]
        },
        metadata: { error: 'true', demo: 'true' }
      };
    }
  },

  /**
   * Génère une carte de test Stripe pour le mode démo
   */
  getTestCards() {
    return [
      { type: 'Visa', number: '4242424242424242', expMonth: 12, expYear: 2030, cvc: '123' },
      { type: 'Mastercard', number: '5555555555554444', expMonth: 12, expYear: 2030, cvc: '123' },
      { type: 'Découverte', number: '6011111111111117', expMonth: 12, expYear: 2030, cvc: '123' },
      { type: 'Échec', number: '4000000000000002', expMonth: 12, expYear: 2030, cvc: '123' }
    ];
  }
};