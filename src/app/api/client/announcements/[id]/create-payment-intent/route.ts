import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20'
})

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { amount, currency = 'eur' } = await request.json()

    // Vérifier que l'annonce appartient à l'utilisateur
    const announcement = await db.announcement.findFirst({
      where: {
        id: params.id,
        authorId: session.user.id,
        status: 'ACTIVE'
      }
    })

    if (!announcement) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 })
    }

    // Créer l'intent de paiement Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        announcementId: announcement.id,
        userId: session.user.id,
        type: 'announcement_payment'
      }
    })

    // Enregistrer l'intent en base
    await db.payment.create({
      data: {
        id: paymentIntent.id,
        announcementId: announcement.id,
        userId: session.user.id,
        amount: amount / 100, // Convertir de centimes en euros
        currency,
        status: 'PENDING',
        stripePaymentIntentId: paymentIntent.id,
        method: 'STRIPE'
      }
    })

    return NextResponse.json({
      client_secret: paymentIntent.client_secret
    })
  } catch (error) {
    console.error('Error creating payment intent:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}