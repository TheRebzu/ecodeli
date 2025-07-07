import { NextRequest, NextResponse } from 'next/server'
import { getUserFromSession } from '@/lib/auth/utils'
import { StripeService } from '@/features/payments/services/stripe.service'
import { SUBSCRIPTION_PLANS } from '@/config/subscription'

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromSession(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'CLIENT') {
      return NextResponse.json(
        { error: 'Only clients can create subscriptions' },
        { status: 403 }
      )
    }

    const { planId } = await request.json()

    if (!planId || !['STARTER', 'PREMIUM'].includes(planId)) {
      return NextResponse.json(
        { error: 'Invalid subscription plan' },
        { status: 400 }
      )
    }

    const plan = SUBSCRIPTION_PLANS[planId]
    if (!plan) {
      return NextResponse.json(
        { error: 'Subscription plan not found' },
        { status: 404 }
      )
    }

    // Créer un Payment Intent pour l'abonnement
    const paymentIntent = await StripeService.createSubscriptionPaymentIntent(
      user.id,
      planId
    )

    return NextResponse.json({
      clientSecret: paymentIntent.clientSecret,
      subscriptionPlan: {
        id: plan.id,
        name: plan.name,
        price: plan.price,
        currency: plan.currency,
        features: plan.features
      }
    })

  } catch (error) {
    console.error('Error creating subscription payment intent:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}