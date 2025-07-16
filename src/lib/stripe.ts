import Stripe from "stripe";

// Fonction pour créer l'instance Stripe de manière sécurisée
function createStripeInstance() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  
  if (!secretKey || secretKey === "sk_test_your_stripe_secret_key") {
    throw new Error("Stripe secret key is not configured");
  }
  
  return new Stripe(secretKey, {
    apiVersion: "2025-06-30.basil",
  });
}

// Instance Stripe lazy-loaded
let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeInstance) {
    stripeInstance = createStripeInstance();
  }
  return stripeInstance;
}

// Export pour compatibilité avec le code existant
export const stripe = {
  get instance() {
    return getStripe();
  }
};

// Export par défaut pour compatibilité
export default stripe;
