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
    console.log('🔍 [Payment API] Starting payment creation...');
    console.log('🔍 [Payment API] Stripe Secret Key configured:', !!process.env.STRIPE_SECRET_KEY);
    
    const user = await getUserFromSession(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const { amount, currency = 'EUR' } = await request.json()
    
    console.log('🔍 [Payment API] Booking ID:', id);
    console.log('🔍 [Payment API] Amount:', amount);
    console.log('🔍 [Payment API] Currency:', currency);

    // Récupérer le profil client
    const client = await db.client.findUnique({
      where: { userId: user.id }
    })

    if (!client) {
      return NextResponse.json({ error: 'Client profile not found' }, { status: 404 })
    }

    console.log('🔍 [Payment API] Client found:', client.id);

    // Récupérer la réservation
    const booking = await db.booking.findFirst({
      where: {
        id: id,
        clientId: client.id
      },
      include: {
        payment: true,
        provider: {
          include: {
            user: {
              select: {
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
        }
      }
    })

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    console.log('🔍 [Payment API] Booking found:', booking.id);

    // Vérifier si déjà payé
    if (booking.payment && booking.payment.status === 'COMPLETED') {
      return NextResponse.json({ error: 'Booking already paid' }, { status: 400 })
    }

    console.log('🔍 [Payment API] Creating Stripe session...');

    // Utiliser les variables d'environnement pour les URLs
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const successUrl = `${baseUrl}/fr/client/bookings/${booking.id}/payment/success?session_id={CHECKOUT_SESSION_ID}`
    const cancelUrl = `${baseUrl}/fr/client/bookings/${booking.id}/payment?cancelled=true`

    console.log('🔍 [Payment API] Success URL:', successUrl);
    console.log('🔍 [Payment API] Cancel URL:', cancelUrl);

    // Créer une session de paiement Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: currency.toLowerCase(),
            product_data: {
              name: `Service: ${booking.service?.name || 'Service à la personne'}`,
              description: `Réservation avec ${booking.provider.user.profile?.firstName} ${booking.provider.user.profile?.lastName}`,
            },
            unit_amount: Math.round(amount * 100), // Montant en centimes
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        bookingId: booking.id,
        clientId: client.id,
        providerId: booking.providerId,
        userId: user.id
      },
      customer_email: user.email || undefined,
      billing_address_collection: 'required',
    })

    console.log('🔍 [Payment API] Stripe session created:', session.id);

    // Créer ou mettre à jour l'enregistrement de paiement
    const payment = await db.payment.upsert({
      where: { bookingId: booking.id },
      update: {
        stripeSessionId: session.id,
        status: 'PENDING',
        updatedAt: new Date()
      },
      create: {
        userId: user.id,
        bookingId: booking.id,
        clientId: client.id,
        amount: amount,
        currency: currency,
        status: 'PENDING',
        type: 'SERVICE',
        paymentMethod: 'STRIPE',
        stripeSessionId: session.id
      }
    })

    console.log('🔍 [Payment API] Payment record created/updated:', payment.id);

    return NextResponse.json({
      success: true,
      checkoutUrl: session.url,
      sessionId: session.id
    })
  } catch (error) {
    console.error('Error creating payment session:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 