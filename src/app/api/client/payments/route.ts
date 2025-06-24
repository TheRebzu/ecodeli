import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia'
})

// Schema pour créer un paiement
const createPaymentSchema = z.object({
  type: z.enum(['DELIVERY', 'SUBSCRIPTION', 'SERVICE', 'STORAGE']),
  announcementId: z.string().optional(),
  bookingId: z.string().optional(),
  storageBoxId: z.string().optional(),
  subscriptionPlan: z.enum(['STARTER', 'PREMIUM']).optional(),
  amount: z.number().positive('Le montant doit être positif'),
  currency: z.string().default('EUR'),
  description: z.string().optional()
})

// GET - Historique des paiements du client
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    if (session.user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const type = searchParams.get('type')
    const status = searchParams.get('status')

    const skip = (page - 1) * limit

    // Construire les filtres
    const where: any = {
      userId: session.user.id
    }

    if (type && ['DELIVERY', 'SUBSCRIPTION', 'SERVICE', 'STORAGE'].includes(type)) {
      where.type = type
    }

    if (status && ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED', 'REFUNDED'].includes(status)) {
      where.status = status
    }

    // Récupérer les paiements
    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          announcement: {
            select: {
              id: true,
              title: true,
              serviceType: true
            }
          },
          booking: {
            select: {
              id: true,
              service: {
                select: {
                  name: true,
                  category: true
                }
              }
            }
          },
          storageBox: {
            select: {
              id: true,
              number: true,
              warehouse: {
                select: {
                  name: true,
                  city: true
                }
              }
            }
          }
        }
      }),
      prisma.payment.count({ where })
    ])

    // Récupérer les informations d'abonnement actuel
    const subscription = await prisma.subscription.findUnique({
      where: { userId: session.user.id }
    })

    return NextResponse.json({
      payments: payments.map(payment => ({
        id: payment.id,
        type: payment.type,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        description: payment.description,
        stripePaymentIntentId: payment.stripePaymentIntentId,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt,
        relatedItem: getRelatedItemInfo(payment)
      })),
      subscription: subscription ? {
        plan: subscription.plan,
        status: subscription.status,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd
      } : null,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    console.error('Error fetching client payments:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}

// POST - Créer un nouveau paiement
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    if (session.user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = createPaymentSchema.parse(body)

    // Vérifier le client Stripe ou le créer
    let stripeCustomerId = session.user.stripeCustomerId

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: session.user.email,
        metadata: {
          userId: session.user.id
        }
      })

      // Mettre à jour l'utilisateur avec l'ID Stripe
      await prisma.user.update({
        where: { id: session.user.id },
        data: { stripeCustomerId: customer.id }
      })

      stripeCustomerId = customer.id
    }

    // Calculer le montant final avec réductions d'abonnement si applicable
    let finalAmount = validatedData.amount
    let discountApplied = 0

    if (validatedData.type === 'DELIVERY') {
      const userSubscription = await prisma.subscription.findUnique({
        where: { userId: session.user.id }
      })

      if (userSubscription && userSubscription.status === 'ACTIVE') {
        if (userSubscription.plan === 'STARTER') {
          discountApplied = finalAmount * 0.05 // 5% réduction
          finalAmount = finalAmount * 0.95
        } else if (userSubscription.plan === 'PREMIUM') {
          discountApplied = finalAmount * 0.09 // 9% réduction
          finalAmount = finalAmount * 0.91
        }
      }
    }

    // Créer le PaymentIntent Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(finalAmount * 100), // Stripe utilise les centimes
      currency: validatedData.currency.toLowerCase(),
      customer: stripeCustomerId,
      metadata: {
        userId: session.user.id,
        type: validatedData.type,
        ...(validatedData.announcementId && { announcementId: validatedData.announcementId }),
        ...(validatedData.bookingId && { bookingId: validatedData.bookingId }),
        ...(validatedData.storageBoxId && { storageBoxId: validatedData.storageBoxId }),
        ...(discountApplied > 0 && { discountApplied: discountApplied.toString() })
      },
      description: validatedData.description || `Paiement ${validatedData.type}`
    })

    // Créer l'enregistrement de paiement dans la base
    const payment = await prisma.payment.create({
      data: {
        userId: session.user.id,
        type: validatedData.type,
        amount: finalAmount,
        currency: validatedData.currency,
        status: 'PENDING',
        stripePaymentIntentId: paymentIntent.id,
        description: validatedData.description,
        announcementId: validatedData.announcementId,
        bookingId: validatedData.bookingId,
        storageBoxId: validatedData.storageBoxId,
        metadata: discountApplied > 0 ? {
          originalAmount: validatedData.amount,
          discountApplied,
          subscriptionDiscount: true
        } : undefined
      }
    })

    return NextResponse.json({
      payment: {
        id: payment.id,
        clientSecret: paymentIntent.client_secret,
        amount: finalAmount,
        originalAmount: validatedData.amount,
        discountApplied,
        currency: validatedData.currency,
        status: payment.status
      }
    })

  } catch (error) {
    console.error('Error creating payment:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Données invalides', 
          details: error.errors.map(e => ({ 
            field: e.path.join('.'), 
            message: e.message 
          }))
        },
        { status: 400 }
      )
    }

    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: 'Erreur de paiement', details: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}

// Helper function pour obtenir les informations de l'élément lié
function getRelatedItemInfo(payment: any) {
  if (payment.announcement) {
    return {
      type: 'announcement',
      title: payment.announcement.title,
      serviceType: payment.announcement.serviceType
    }
  }
  
  if (payment.booking) {
    return {
      type: 'booking',
      title: payment.booking.service.name,
      category: payment.booking.service.category
    }
  }
  
  if (payment.storageBox) {
    return {
      type: 'storage',
      title: `Box ${payment.storageBox.number}`,
      location: `${payment.storageBox.warehouse.name} - ${payment.storageBox.warehouse.city}`
    }
  }

  return null
}
