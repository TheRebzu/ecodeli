import Stripe from 'stripe';

// Initialisation de l'API Stripe avec la clé secrète
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

export interface CreateCheckoutSessionParams {
  orderId: string;
  orderNumber: string;
  customerEmail: string;
  customerName: string;
  amount: number; // en centimes
  currency?: string;
  successUrl: string;
  cancelUrl: string;
  items: {
    name: string;
    description?: string;
    amount: number; // en centimes
    quantity: number;
  }[];
}

/**
 * Crée une session de paiement Stripe Checkout
 */
export async function createCheckoutSession({
  orderId,
  orderNumber,
  customerEmail,
  customerName,
  amount,
  currency = 'eur',
  successUrl,
  cancelUrl,
  items,
}: CreateCheckoutSessionParams) {
  try {
    // Création de la session Stripe Checkout
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: customerEmail,
      client_reference_id: orderId,
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      metadata: {
        orderId,
        orderNumber,
      },
      line_items: items.map(item => ({
        price_data: {
          currency,
          product_data: {
            name: item.name,
            description: item.description,
          },
          unit_amount: item.amount, // en centimes
        },
        quantity: item.quantity,
      })),
    });

    return { sessionId: session.id, url: session.url };
  } catch (error) {
    console.error('Erreur lors de la création de la session Stripe:', error);
    throw new Error('Impossible de créer la session de paiement');
  }
}

/**
 * Récupère les détails d'une session de paiement Stripe
 */
export async function getCheckoutSession(sessionId: string) {
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    return session;
  } catch (error) {
    console.error('Erreur lors de la récupération de la session Stripe:', error);
    throw new Error('Impossible de récupérer la session de paiement');
  }
}

/**
 * Crée un remboursement pour un paiement Stripe
 */
export async function createRefund(paymentIntentId: string, amount?: number) {
  try {
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount, // Si non spécifié, rembourse le montant total
    });
    return refund;
  } catch (error) {
    console.error('Erreur lors du remboursement Stripe:', error);
    throw new Error('Impossible de créer le remboursement');
  }
}

/**
 * Gère les webhooks Stripe
 */
export async function handleStripeWebhook(rawBody: string, signature: string) {
  try {
    const event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET || ''
    );

    return event;
  } catch (error) {
    console.error('Erreur lors du traitement du webhook Stripe:', error);
    throw new Error('Impossible de traiter le webhook Stripe');
  }
}
