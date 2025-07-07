# EcoDeli Stripe Subscription Implementation

## Overview

This document describes the complete Stripe subscription implementation for EcoDeli, which provides three subscription tiers (Free, Starter, Premium) with different features and pricing.

## Subscription Plans

### Free Plan (€0/month)
- **Insurance**: None
- **Discount**: None  
- **Priority Shipping**: Not available
- **Features**: Basic platform access

### Starter Plan (€9.90/month)
- **Insurance**: Up to €115 per shipment
- **Discount**: 5% on all shipments
- **Priority Shipping**: Available (+5% surcharge instead of +15%)
- **Permanent Discount**: 5% on small packages

### Premium Plan (€19.99/month)
- **Insurance**: Up to €3,000 per shipment (€75 fee beyond €3,000)
- **Discount**: 9% on all shipments
- **Priority Shipping**: 3 free per month, then +5% surcharge
- **First Shipment Free**: If under €150
- **Permanent Discount**: 5% on all packages

## Architecture

### Key Components

1. **Subscription Configuration** (`src/config/subscription.ts`)
   - Plan definitions and pricing
   - Feature calculations
   - Price calculators for discounts and insurance

2. **Subscription Service** (`src/features/payments/services/subscription.service.ts`)
   - Stripe customer management
   - Subscription CRUD operations
   - Usage statistics tracking
   - Webhook handling

3. **API Routes**
   - `GET/POST/PUT/DELETE /api/subscriptions` - Main subscription management
   - `POST /api/subscriptions/create-payment-intent` - Payment processing
   - `POST /api/webhooks/stripe` - Webhook handling

4. **Database Integration**
   - Client model with subscription fields
   - Payment tracking
   - Usage statistics

## Setup Instructions

### 1. Stripe Dashboard Configuration

#### Create Products and Prices
```bash
# In Stripe Dashboard > Products
1. Create "EcoDeli Starter" product
   - Price: €9.90 EUR
   - Billing: Monthly recurring
   - Copy Price ID to STRIPE_STARTER_PRICE_ID

2. Create "EcoDeli Premium" product  
   - Price: €19.99 EUR
   - Billing: Monthly recurring
   - Copy Price ID to STRIPE_PREMIUM_PRICE_ID
```

#### Configure Webhooks
```bash
# In Stripe Dashboard > Webhooks
Endpoint URL: https://your-domain.com/api/webhooks/stripe

Select Events:
- customer.subscription.created
- customer.subscription.updated  
- customer.subscription.deleted
- invoice.payment_succeeded
- invoice.payment_failed
- payment_intent.succeeded
- payment_intent.payment_failed

Copy webhook secret to STRIPE_WEBHOOK_SECRET
```

### 2. Environment Variables

Create `.env.local` with:
```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Price IDs
STRIPE_STARTER_PRICE_ID=price_...
STRIPE_PREMIUM_PRICE_ID=price_...

# Database
DATABASE_URL=postgresql://...

# NextAuth
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:3000
```

### 3. Database Schema

The subscription system uses the existing Prisma schema with these key fields:

```prisma
model Client {
  subscriptionPlan    SubscriptionPlan   @default(FREE)
  subscriptionStart   DateTime           @default(now())
  subscriptionEnd     DateTime?
  stripeCustomerId    String?            @unique
  stripeSubscriptionId String?           @unique
}

enum SubscriptionPlan {
  FREE
  STARTER  
  PREMIUM
}
```

## API Documentation

### Get User Subscription
```bash
GET /api/subscriptions
Authorization: Required (CLIENT role)

Response:
{
  "subscription": {
    "id": "client_id",
    "userId": "user_id", 
    "plan": "STARTER",
    "status": "active",
    "startDate": "2024-01-01T00:00:00Z",
    "endDate": "2024-02-01T00:00:00Z",
    "usage": {
      "thisMonth": {
        "deliveries": 5,
        "savings": 12.50,
        "priorityShipments": 2,
        "insuranceUsed": 0
      }
    }
  },
  "availablePlans": {
    "FREE": { ... },
    "STARTER": { ... },
    "PREMIUM": { ... }
  }
}
```

### Create Subscription
```bash
POST /api/subscriptions
Authorization: Required (CLIENT role)

Body:
{
  "planId": "STARTER",
  "paymentMethodId": "pm_card_visa"
}

Response:
{
  "id": "subscription_id",
  "plan": "STARTER", 
  "status": "active",
  "clientSecret": "pi_xxx_secret_xxx"
}
```

### Update Subscription
```bash
PUT /api/subscriptions
Authorization: Required (CLIENT role)

Body:
{
  "planId": "PREMIUM"
}

Response:
{
  "id": "subscription_id",
  "plan": "PREMIUM",
  "status": "active"
}
```

### Cancel Subscription
```bash
DELETE /api/subscriptions
Authorization: Required (CLIENT role)

Response:
{
  "success": true
}
```

### Create Payment Intent
```bash
POST /api/subscriptions/create-payment-intent
Authorization: Required (CLIENT role)

Body:
{
  "planId": "STARTER"
}

Response:
{
  "clientSecret": "pi_xxx_secret_xxx",
  "subscriptionPlan": {
    "id": "starter",
    "name": "Starter", 
    "price": 9.90,
    "features": { ... }
  }
}
```

## Frontend Integration

### Using Stripe Elements

```tsx
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

export function SubscriptionForm({ planId }: { planId: 'STARTER' | 'PREMIUM' }) {
  const stripe = useStripe()
  const elements = useElements()

  const handleSubmit = async (event) => {
    event.preventDefault()
    
    if (!stripe || !elements) return

    // Create payment intent
    const response = await fetch('/api/subscriptions/create-payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId })
    })
    
    const { clientSecret } = await response.json()

    // Confirm payment
    const result = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: elements.getElement(CardElement)!
      }
    })

    if (result.error) {
      console.error(result.error.message)
    } else {
      // Payment succeeded - subscription created
      console.log('Subscription created successfully!')
    }
  }

  return (
    <Elements stripe={stripePromise}>
      <form onSubmit={handleSubmit}>
        <CardElement />
        <button type="submit" disabled={!stripe}>
          Subscribe to {planId}
        </button>
      </form>
    </Elements>
  )
}
```

## Webhook Event Handling

The system handles these Stripe webhook events:

### customer.subscription.created
- Updates client subscription plan in database
- Sets subscription start/end dates
- Sends welcome notification

### customer.subscription.updated  
- Updates subscription plan changes
- Handles plan upgrades/downgrades
- Processes prorations

### customer.subscription.deleted
- Downgrades client to FREE plan
- Sends cancellation notification
- Clears Stripe subscription ID

### invoice.payment_succeeded
- Confirms monthly subscription payment
- Extends subscription period
- Updates payment records

### invoice.payment_failed
- Handles failed subscription payments
- Sends payment failure notifications
- May suspend subscription after retries

## Testing

### Run Test Suite
```bash
# Run comprehensive subscription tests
node scripts/test-subscription-api.js

# Test specific functionality
npm run test:subscription
```

### Test Cases

1. **Plan Retrieval**: Get available subscription plans
2. **User Subscription**: Retrieve current user subscription status
3. **Payment Intent**: Create subscription payment intent
4. **Plan Updates**: Change subscription plans
5. **Cancellation**: Cancel active subscriptions
6. **Webhook Processing**: Handle Stripe webhook events
7. **Feature Calculations**: Test pricing and discount logic

### Manual Testing with Stripe

1. Use Stripe test cards:
   - `4242424242424242` - Successful payment
   - `4000000000000002` - Declined payment
   - `4000000000000341` - Requires authentication

2. Test webhook events in Stripe Dashboard > Webhooks > Test

3. Monitor webhook logs for processing errors

## Error Handling

### Common Errors

1. **Invalid Plan ID**: Returns 400 with error message
2. **Unauthorized Access**: Returns 401 for non-authenticated users  
3. **Insufficient Permissions**: Returns 403 for non-CLIENT users
4. **Stripe API Errors**: Returns 500 with Stripe error details
5. **Database Errors**: Returns 500 with generic error message

### Error Response Format
```json
{
  "error": "Error message",
  "details": "Additional error details (optional)"
}
```

## Monitoring and Analytics

### Key Metrics to Track

1. **Subscription Conversions**: Free → Paid plan conversion rate
2. **Plan Upgrades**: Starter → Premium upgrade rate  
3. **Churn Rate**: Monthly subscription cancellation rate
4. **Revenue Metrics**: Monthly recurring revenue (MRR)
5. **Feature Usage**: Usage of premium features by plan

### Database Queries

```sql
-- Monthly subscription revenue
SELECT 
  DATE_TRUNC('month', subscription_start) as month,
  subscription_plan,
  COUNT(*) as subscribers,
  SUM(CASE 
    WHEN subscription_plan = 'STARTER' THEN 9.90
    WHEN subscription_plan = 'PREMIUM' THEN 19.99  
    ELSE 0
  END) as revenue
FROM clients 
WHERE subscription_plan != 'FREE'
GROUP BY month, subscription_plan;

-- Subscription usage statistics  
SELECT 
  c.subscription_plan,
  AVG(deliveries_count) as avg_deliveries,
  AVG(total_savings) as avg_savings
FROM clients c
JOIN user_monthly_stats ums ON c.user_id = ums.user_id
GROUP BY c.subscription_plan;
```

## Security Considerations

1. **Webhook Verification**: Always verify Stripe webhook signatures
2. **API Authentication**: Require valid user sessions for all endpoints
3. **Role Authorization**: Restrict subscription operations to CLIENT role
4. **Environment Variables**: Keep Stripe keys secure and never expose in client
5. **Error Messages**: Don't expose sensitive information in error responses

## Troubleshooting

### Common Issues

1. **Webhook Signature Verification Failed**
   - Check webhook secret configuration
   - Verify endpoint URL in Stripe Dashboard
   - Ensure raw body is used for signature verification

2. **Payment Intent Creation Failed**
   - Verify Stripe keys are correctly configured
   - Check price IDs exist in Stripe Dashboard
   - Ensure customer has valid payment method

3. **Subscription Not Updated After Payment**
   - Check webhook event processing logs
   - Verify database connection
   - Ensure metadata is correctly set on subscription

4. **Database Connection Errors**
   - Verify DATABASE_URL is correct
   - Check Prisma client generation
   - Ensure database migrations are up to date

## Deployment Checklist

- [ ] Stripe live keys configured in production
- [ ] Webhook endpoint accessible from Stripe
- [ ] Database migrations applied
- [ ] Environment variables set
- [ ] SSL certificate installed
- [ ] Monitoring and logging configured
- [ ] Error tracking enabled
- [ ] Backup procedures in place

## Support and Maintenance

### Regular Tasks

1. Monitor webhook processing logs
2. Review failed payment notifications
3. Update subscription pricing as needed
4. Analyze subscription metrics monthly
5. Test payment flows with new Stripe features

### Emergency Procedures

1. **Webhook Outage**: Queue events for replay when service restored
2. **Payment Failures**: Notify affected users and provide payment retry options
3. **Database Issues**: Use read replicas and ensure data consistency
4. **Stripe API Issues**: Implement retry logic and fallback mechanisms

For additional support, contact the development team or refer to Stripe's documentation.