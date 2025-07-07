// Environment variables required for EcoDeli Stripe subscription system
// Copy this to your .env.local file and fill in the actual values

export const REQUIRED_ENV_VARS = {
  // Stripe Configuration
  STRIPE_SECRET_KEY: 'sk_test_...', // Your Stripe secret key
  STRIPE_PUBLISHABLE_KEY: 'pk_test_...', // Your Stripe publishable key
  STRIPE_WEBHOOK_SECRET: 'whsec_...', // Webhook endpoint secret
  
  // Stripe Price IDs for subscription plans (create these in Stripe Dashboard)
  STRIPE_STARTER_PRICE_ID: 'price_...', // Price ID for Starter plan (€9.90/month)
  STRIPE_PREMIUM_PRICE_ID: 'price_...', // Price ID for Premium plan (€19.99/month)

  // Database
  DATABASE_URL: 'postgresql://...',
  
  // NextAuth
  NEXTAUTH_SECRET: 'your-secret-key',
  NEXTAUTH_URL: 'http://localhost:3000',

  // OneSignal (for notifications)
  ONESIGNAL_APP_ID: 'your-onesignal-app-id',
  ONESIGNAL_API_KEY: 'your-onesignal-api-key'
}

// Instructions for setting up Stripe products and prices:
/*
1. Log in to your Stripe Dashboard
2. Go to Products tab
3. Create two products:
   
   Product 1: EcoDeli Starter
   - Price: €9.90 EUR
   - Billing: Monthly recurring
   - Copy the Price ID to STRIPE_STARTER_PRICE_ID
   
   Product 2: EcoDeli Premium  
   - Price: €19.99 EUR
   - Billing: Monthly recurring
   - Copy the Price ID to STRIPE_PREMIUM_PRICE_ID

4. Go to Webhooks tab
5. Add endpoint: https://your-domain.com/api/webhooks/stripe
6. Select events:
   - customer.subscription.created
   - customer.subscription.updated
   - customer.subscription.deleted
   - invoice.payment_succeeded
   - invoice.payment_failed
   - payment_intent.succeeded
   - payment_intent.payment_failed
7. Copy the webhook secret to STRIPE_WEBHOOK_SECRET
*/

// Subscription plan configuration
export const SUBSCRIPTION_CONFIG = {
  FREE: {
    price: 0,
    features: {
      insurance: 0,
      discount: 0,
      priorityShipping: false
    }
  },
  STARTER: {
    price: 9.90,
    features: {
      insurance: 115, // €115 insurance per shipment
      discount: 5, // 5% discount
      priorityShipping: true,
      priorityShippingDiscount: 5 // 5% surcharge instead of 15%
    }
  },
  PREMIUM: {
    price: 19.99,
    features: {
      insurance: 3000, // €3000 insurance per shipment
      discount: 9, // 9% discount
      priorityShipping: true,
      priorityShippingDiscount: 5, // 5% surcharge after 3 free
      firstShipmentFree: true, // If < €150
      freeShipments: 3 // 3 priority shipments per month
    }
  }
} as const

// Test the environment configuration
export function validateEnvironment(): { valid: boolean; missing: string[] } {
  const missing: string[] = []
  
  const requiredVars = [
    'STRIPE_SECRET_KEY',
    'STRIPE_PUBLISHABLE_KEY', 
    'STRIPE_WEBHOOK_SECRET',
    'STRIPE_STARTER_PRICE_ID',
    'STRIPE_PREMIUM_PRICE_ID',
    'DATABASE_URL'
  ]

  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missing.push(varName)
    }
  }

  return {
    valid: missing.length === 0,
    missing
  }
}

// Helper to get environment variables safely
export function getEnvVar(name: string, defaultValue?: string): string {
  const value = process.env[name]
  if (!value && !defaultValue) {
    throw new Error(`Required environment variable ${name} is not set`)
  }
  return value || defaultValue!
}