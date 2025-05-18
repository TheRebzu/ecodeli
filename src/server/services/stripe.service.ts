// src/server/services/stripe.service.ts
import Stripe from 'stripe';
import { env } from '@/env.mjs';

/**
 * Configuration du client Stripe
 */
export const stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

/**
 * Service Stripe pour la gestion des paiements
 */
export const stripeService = {
  /**
   * Crée une intention de paiement Stripe
   * En mode démo, simule une intention de paiement sans appeler Stripe API
   */
  async createPaymentIntent(amount: number, currency: string = 'eur', metadata: Record<string, string> = {}) {
    // En mode démo, simuler le paiement sans réellement charger Stripe
    if (process.env.DEMO_MODE === 'true') {
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
    return await stripeClient.paymentIntents.create({
      amount: Math.round(amount * 100), // Stripe utilise les centimes
      currency,
      payment_method_types: ['card'],
      metadata: {
        ...metadata,
        demo: process.env.DEMO_MODE === 'true' ? 'true' : 'false'
      }
    });
  },

  /**
   * Récupère les détails d'un paiement
   * En mode démo, simule une réponse sans appeler Stripe API
   */
  async retrievePaymentIntent(paymentIntentId: string) {
    if (process.env.DEMO_MODE === 'true' && paymentIntentId.startsWith('demo_pi_')) {
      return {
        id: paymentIntentId,
        status: 'succeeded',
        amount: 1000, // Exemple
        currency: 'eur',
        metadata: { demo: 'true' }
      };
    }
    
    return await stripeClient.paymentIntents.retrieve(paymentIntentId);
  },

  /**
   * Simule un retrait vers un compte bancaire externe
   * En mode démo, retourne une simulation sans réellement effectuer de transfert
   */
  async simulatePayoutToBank(amount: number, userId: string, metadata: Record<string, string> = {}) {
    if (process.env.DEMO_MODE === 'true') {
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
    throw new Error("Cette fonctionnalité n'est pas disponible hors mode démonstration");
  },

  /**
   * Crée un abonnement Stripe
   * En mode démo, simule un abonnement sans appeler Stripe API
   */
  async createSubscription(customerId: string, priceId: string) {
    if (process.env.DEMO_MODE === 'true') {
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
    return await stripeClient.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
    });
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