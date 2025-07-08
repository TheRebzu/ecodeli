# 🚨 URGENT: Fix Stripe Secret Key

## Current Problem
Your `.env` file has the wrong Stripe secret key:
```
❌ STRIPE_SECRET_KEY=pk_test_... (This is a PUBLISHABLE key, not secret!)
```

## Immediate Fix Required

### Step 1: Get Your Real Secret Key
1. Go to: https://dashboard.stripe.com/test/apikeys
2. Look for **"Secret key"** (NOT "Publishable key")
3. Click "Reveal test key token"
4. Copy the key that starts with `sk_test_...`

### Step 2: Update Your .env File
Replace this line in your `.env`:
```bash
❌ STRIPE_SECRET_KEY=pk_test_51RiEFKGhcgIsYtVUfrxyqG0IM7N0l4uvxryKdWWdpj4okfxipEsgZvF8B9OXWkMQoJrr6PIkEXKBaSPernGNnVGe001xonHcnw

✅ STRIPE_SECRET_KEY=sk_test_YOUR_ACTUAL_SECRET_KEY_HERE
```

### Step 3: Keep Publishable Keys As They Are
These are CORRECT (keep them):
```bash
✅ STRIPE_PUBLISHABLE_KEY=pk_test_51RiEFKGhcgIsYtVUfrxyqG0IM7N0l4uvxryKdWWdpj4okfxipEsgZvF8B9OXWkMQoJrr6PIkEXKBaSPernGNnVGe001xonHcnw
✅ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51RiEFKGhcgIsYtVUfrxyqG0IM7N0l4uvxryKdWWdpj4okfxipEsgZvF8B9OXWkMQoJrr6PIkEXKBaSPernGNnVGe001xonHcnw
```

### Step 4: Restart Server
```bash
pnpm dev
```

## After Fix - Payment Flow Will Work
1. ✅ User clicks "Payer" button
2. ✅ API creates Stripe session successfully  
3. ✅ User redirected to Stripe Checkout page
4. ✅ User enters credit card info on Stripe's secure page
5. ✅ Payment completes successfully

## Test with Stripe Test Card
- Card Number: `4242 4242 4242 4242`
- Expiry: Any future date
- CVC: Any 3 digits
- Name: Any name

## Why This Happens
- **Secret Key** (`sk_test_`): Server-side API calls to Stripe
- **Publishable Key** (`pk_test_`): Client-side/frontend integration
- You accidentally used publishable key for server-side calls

The payment form code is perfect - just need the right Stripe configuration! 