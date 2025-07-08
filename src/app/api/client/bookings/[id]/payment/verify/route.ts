import { NextRequest, NextResponse } from 'next/server'
import { getUserFromSession } from '@/lib/auth/utils'
import { db } from '@/lib/db'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20'
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromSession(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const { sessionId } = await request.json()

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 })
    }

    // Récupérer le profil client
    const client = await db.client.findUnique({
      where: { userId: user.id }
    })

    if (!client) {
      return NextResponse.json({ error: 'Client profile not found' }, { status: 404 })
    }

    // Vérifier la session Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (!session || session.payment_status !== 'paid') {
      return NextResponse.json({ error: 'Payment not completed' }, { status: 400 })
    }

    // Récupérer les détails du paiement
    const paymentIntent = await stripe.paymentIntents.retrieve(session.payment_intent as string)

    // Récupérer la réservation
    const booking = await db.booking.findFirst({
      where: {
        id: id,
        clientId: client.id
      },
      include: {
        provider: {
          include: {
            user: {
              select: {
                id: true,
                profile: {
                  select: {
                    firstName: true,
                    lastName: true
                  }
                }
              }
            }
          }
        },
        service: {
          select: {
            name: true
          }
        },
        payment: true
      }
    })

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    // Mettre à jour le paiement et la réservation
    await db.$transaction(async (tx) => {
      // Mettre à jour le paiement
      await tx.payment.update({
        where: { bookingId: booking.id },
        data: {
          status: 'COMPLETED',
          stripePaymentId: paymentIntent.id,
          paidAt: new Date(),
          metadata: {
            stripeSessionId: sessionId,
            stripePaymentIntentId: paymentIntent.id
          }
        }
      })

      // Mettre à jour le statut de la réservation si nécessaire
      if (booking.status === 'PENDING') {
        await tx.booking.update({
          where: { id: booking.id },
          data: { status: 'CONFIRMED' }
        })
      }

      // Créer une notification pour le prestataire
      await tx.notification.create({
        data: {
          userId: booking.provider.user.id,
          type: 'PAYMENT_RECEIVED',
          title: 'Paiement reçu',
          message: `Vous avez reçu un paiement de ${session.amount_total! / 100}€ pour votre service.`,
          isRead: false,
          data: {
            bookingId: booking.id,
            amount: session.amount_total! / 100,
            sessionId: sessionId
          }
        }
      })

      // Créer une notification pour le client
      await tx.notification.create({
        data: {
          userId: user.id,
          type: 'PAYMENT_COMPLETED',
          title: 'Paiement confirmé',
          message: `Votre paiement de ${session.amount_total! / 100}€ a été confirmé. Le prestataire va vous contacter.`,
          isRead: false,
          data: {
            bookingId: booking.id,
            amount: session.amount_total! / 100,
            sessionId: sessionId
          }
        }
      })
    })

    // Préparer les détails du paiement pour le frontend
    const paymentDetails = {
      bookingId: booking.id,
      amount: session.amount_total! / 100,
      currency: session.currency!,
      status: 'COMPLETED',
      paidAt: new Date().toISOString(),
      sessionId: sessionId,
      booking: {
        id: booking.id,
        providerName: booking.provider.user.profile 
          ? `${booking.provider.user.profile.firstName || ''} ${booking.provider.user.profile.lastName || ''}`.trim()
          : 'Prestataire',
        serviceName: booking.service?.name || 'Service',
        scheduledDate: booking.scheduledDate.toISOString().split('T')[0],
        scheduledTime: booking.scheduledTime,
        location: typeof booking.address === 'object' && booking.address && 'address' in booking.address
          ? `${booking.address.address}, ${booking.address.city}` 
          : booking.address?.toString() || 'Non spécifié',
      }
    }

    return NextResponse.json({
      success: true,
      payment: paymentDetails
    })
  } catch (error) {
    console.error('Error verifying payment:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 