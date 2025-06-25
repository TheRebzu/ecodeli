import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { StripeService } from '@/features/payments/services/stripe.service'

const createIntentSchema = z.object({
  type: z.enum(['delivery', 'booking', 'subscription']),
  entityId: z.string().cuid().optional(), // deliveryId ou bookingId
  planType: z.enum(['STARTER', 'PREMIUM']).optional() // pour les abonnements
})

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers
    })

    if (!session?.user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const body = await request.json()
    const { type, entityId, planType } = createIntentSchema.parse(body)

    let paymentIntent

    switch (type) {
      case 'delivery':
        if (!entityId) {
          return NextResponse.json({ error: 'deliveryId requis' }, { status: 400 })
        }
        paymentIntent = await StripeService.createDeliveryPaymentIntent(entityId, session.user.id)
        break

      case 'booking':
        if (!entityId) {
          return NextResponse.json({ error: 'bookingId requis' }, { status: 400 })
        }
        paymentIntent = await StripeService.createBookingPaymentIntent(entityId, session.user.id)
        break

      case 'subscription':
        if (!planType) {
          return NextResponse.json({ error: 'planType requis' }, { status: 400 })
        }
        paymentIntent = await StripeService.createSubscriptionPaymentIntent(session.user.id, planType)
        break

      default:
        return NextResponse.json({ error: 'Type de paiement non supporté' }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      paymentIntent
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        message: 'Données invalides',
        errors: error.errors
      }, { status: 400 })
    }

    console.error('Erreur création PaymentIntent:', error)
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Erreur lors de la création du paiement'
    }, { status: 500 })
  }
}