import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { handleApiError } from '@/lib/utils/api-response'
import Stripe from 'stripe'

// Initialiser Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20'
})

// Schema pour création d'intention de paiement
const createPaymentIntentSchema = z.object({
  amount: z.number().min(0.50).max(999999), // Minimum 0.50¬, maximum 999,999¬
  currency: z.enum(['EUR', 'USD']).default('EUR'),
  type: z.enum(['DELIVERY', 'SERVICE', 'STORAGE_RENTAL', 'SUBSCRIPTION', 'DEPOSIT']),
  metadata: z.object({
    deliveryId: z.string().cuid().optional(),
    serviceBookingId: z.string().cuid().optional(),
    announcementId: z.string().cuid().optional(),
    storageRentalId: z.string().cuid().optional(),
    subscriptionPlan: z.string().optional()
  }).optional(),
  description: z.string().max(200).optional(),
  receiptEmail: z.string().email().optional(),
  automaticPaymentMethods: z.boolean().default(true),
  captureMethod: z.enum(['automatic', 'manual']).default('automatic')
})

// Schema pour confirmation de paiement
const confirmPaymentSchema = z.object({
  paymentIntentId: z.string(),
  paymentMethodId: z.string().optional(),
  returnUrl: z.string().url().optional()
})

// POST - Créer une intention de paiement Stripe
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createPaymentIntentSchema.parse(body)

    // Récupérer les informations utilisateur
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        profile: true,
        client: true
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Calculer les frais de commission EcoDeli (3% + 0.25¬)
    const commissionRate = 0.03
    const fixedFee = 0.25
    const ecoDeliCommission = Math.round((validatedData.amount * commissionRate + fixedFee) * 100) / 100
    const stripeAmount = Math.round(validatedData.amount * 100) // Stripe utilise les centimes

    // Vérifier et enrichir les métadonnées
    const enrichedMetadata = await enrichPaymentMetadata(validatedData.metadata, validatedData.type)

    // Créer l'intention de paiement Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: stripeAmount,
      currency: validatedData.currency.toLowerCase(),
      customer: await getOrCreateStripeCustomer(user),
      description: validatedData.description || `Paiement EcoDeli - ${validatedData.type}`,
      receipt_email: validatedData.receiptEmail || user.email,
      metadata: {
        userId: session.user.id,
        userEmail: user.email,
        paymentType: validatedData.type,
        ecoDeliCommission: ecoDeliCommission.toString(),
        ...enrichedMetadata
      },
      automatic_payment_methods: {
        enabled: validatedData.automaticPaymentMethods,
        allow_redirects: 'always'
      },
      capture_method: validatedData.captureMethod
    })

    // Enregistrer le paiement en base de données
    const payment = await prisma.payment.create({
      data: {
        userId: session.user.id,
        stripePaymentIntentId: paymentIntent.id,
        amount: validatedData.amount,
        currency: validatedData.currency,
        type: validatedData.type,
        status: 'PENDING',
        stripeStatus: paymentIntent.status,
        paymentMethod: null, // Sera mis à jour lors de la confirmation
        metadata: validatedData.metadata ? JSON.stringify(validatedData.metadata) : null,
        commissionAmount: ecoDeliCommission,
        netAmount: validatedData.amount - ecoDeliCommission
      }
    })

    // Log pour audit
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'PAYMENT_INTENT_CREATED',
        entity: 'Payment',
        entityId: payment.id,
        details: {
          amount: validatedData.amount,
          currency: validatedData.currency,
          type: validatedData.type,
          stripePaymentIntentId: paymentIntent.id,
          commission: ecoDeliCommission
        }
      }
    })

    return NextResponse.json({
      success: true,
      paymentIntent: {
        id: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        amount: validatedData.amount,
        currency: validatedData.currency,
        status: paymentIntent.status
      },
      payment: {
        id: payment.id,
        amount: payment.amount,
        commission: ecoDeliCommission,
        netAmount: payment.netAmount
      }
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation error',
        details: error.errors
      }, { status: 400 })
    }

    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json({
        error: 'Stripe error',
        message: error.message,
        code: error.code
      }, { status: 400 })
    }

    return handleApiError(error, 'creating payment intent')
  }
}

// PUT - Confirmer un paiement
export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = confirmPaymentSchema.parse(body)

    // Récupérer le paiement en base
    const payment = await prisma.payment.findUnique({
      where: {
        stripePaymentIntentId: validatedData.paymentIntentId,
        userId: session.user.id
      }
    })

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    // Confirmer le paiement avec Stripe
    const confirmParams: any = {}
    if (validatedData.paymentMethodId) {
      confirmParams.payment_method = validatedData.paymentMethodId
    }
    if (validatedData.returnUrl) {
      confirmParams.return_url = validatedData.returnUrl
    }

    const confirmedPaymentIntent = await stripe.paymentIntents.confirm(
      validatedData.paymentIntentId,
      confirmParams
    )

    // Mettre à jour le paiement en base
    const updatedPayment = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        stripeStatus: confirmedPaymentIntent.status,
        status: mapStripeStatusToLocal(confirmedPaymentIntent.status),
        paymentMethod: confirmedPaymentIntent.payment_method_types?.[0] || 'card',
        confirmedAt: confirmedPaymentIntent.status === 'succeeded' ? new Date() : null
      }
    })

    // Si le paiement est réussi, traiter les actions post-paiement
    if (confirmedPaymentIntent.status === 'succeeded') {
      await processSuccessfulPayment(updatedPayment)
    }

    return NextResponse.json({
      success: true,
      paymentIntent: {
        id: confirmedPaymentIntent.id,
        status: confirmedPaymentIntent.status,
        clientSecret: confirmedPaymentIntent.client_secret
      },
      payment: {
        id: updatedPayment.id,
        status: updatedPayment.status,
        confirmedAt: updatedPayment.confirmedAt
      },
      nextAction: confirmedPaymentIntent.next_action
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation error',
        details: error.errors
      }, { status: 400 })
    }

    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json({
        error: 'Stripe error',
        message: error.message,
        code: error.code
      }, { status: 400 })
    }

    return handleApiError(error, 'confirming payment')
  }
}

// GET - Récupérer le statut d'un paiement
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const paymentIntentId = searchParams.get('paymentIntentId')
    const paymentId = searchParams.get('paymentId')

    if (!paymentIntentId && !paymentId) {
      return NextResponse.json({ 
        error: 'Payment intent ID or payment ID required' 
      }, { status: 400 })
    }

    // Récupérer le paiement
    const whereCondition = paymentIntentId 
      ? { stripePaymentIntentId: paymentIntentId }
      : { id: paymentId }

    const payment = await prisma.payment.findFirst({
      where: {
        ...whereCondition,
        userId: session.user.id
      }
    })

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    // Récupérer les informations Stripe actualisées
    let stripePaymentIntent = null
    if (payment.stripePaymentIntentId) {
      try {
        stripePaymentIntent = await stripe.paymentIntents.retrieve(payment.stripePaymentIntentId)
        
        // Mettre à jour le statut si différent
        if (stripePaymentIntent.status !== payment.stripeStatus) {
          await prisma.payment.update({
            where: { id: payment.id },
            data: {
              stripeStatus: stripePaymentIntent.status,
              status: mapStripeStatusToLocal(stripePaymentIntent.status)
            }
          })
        }
      } catch (error) {
        console.warn('Failed to retrieve Stripe payment intent:', error)
      }
    }

    return NextResponse.json({
      payment: {
        id: payment.id,
        amount: payment.amount,
        currency: payment.currency,
        type: payment.type,
        status: payment.status,
        stripeStatus: stripePaymentIntent?.status || payment.stripeStatus,
        paymentMethod: payment.paymentMethod,
        createdAt: payment.createdAt,
        confirmedAt: payment.confirmedAt,
        commission: payment.commissionAmount,
        netAmount: payment.netAmount
      },
      stripeInfo: stripePaymentIntent ? {
        clientSecret: stripePaymentIntent.client_secret,
        nextAction: stripePaymentIntent.next_action,
        charges: stripePaymentIntent.charges?.data?.[0] ? {
          receiptUrl: stripePaymentIntent.charges.data[0].receipt_url,
          paymentMethodDetails: stripePaymentIntent.charges.data[0].payment_method_details
        } : null
      } : null
    })

  } catch (error) {
    return handleApiError(error, 'fetching payment status')
  }
}

// Fonctions utilitaires
async function getOrCreateStripeCustomer(user: any): Promise<string> {
  // Vérifier si l'utilisateur a déjà un customer Stripe
  if (user.stripeCustomerId) {
    return user.stripeCustomerId
  }

  // Créer un nouveau customer Stripe
  const customer = await stripe.customers.create({
    email: user.email,
    name: user.profile ? `${user.profile.firstName} ${user.profile.lastName}` : undefined,
    metadata: {
      userId: user.id,
      role: user.role
    }
  })

  // Sauvegarder l'ID customer en base
  await prisma.user.update({
    where: { id: user.id },
    data: { stripeCustomerId: customer.id }
  })

  return customer.id
}

async function enrichPaymentMetadata(metadata: any, type: string): Promise<Record<string, string>> {
  const enriched: Record<string, string> = {}

  if (metadata?.deliveryId) {
    const delivery = await prisma.delivery.findUnique({
      where: { id: metadata.deliveryId },
      select: { id: true, announcement: { select: { title: true } } }
    })
    if (delivery) {
      enriched.deliveryTitle = delivery.announcement.title
    }
  }

  if (metadata?.serviceBookingId) {
    const booking = await prisma.serviceBooking.findUnique({
      where: { id: metadata.serviceBookingId },
      select: { id: true, service: { select: { name: true } } }
    })
    if (booking) {
      enriched.serviceName = booking.service.name
    }
  }

  if (metadata?.announcementId) {
    const announcement = await prisma.announcement.findUnique({
      where: { id: metadata.announcementId },
      select: { title: true }
    })
    if (announcement) {
      enriched.announcementTitle = announcement.title
    }
  }

  return enriched
}

function mapStripeStatusToLocal(stripeStatus: string): string {
  const statusMap: Record<string, string> = {
    'requires_payment_method': 'PENDING',
    'requires_confirmation': 'PENDING',
    'requires_action': 'PENDING',
    'processing': 'PROCESSING',
    'requires_capture': 'AUTHORIZED',
    'succeeded': 'COMPLETED',
    'canceled': 'CANCELLED'
  }

  return statusMap[stripeStatus] || 'PENDING'
}

async function processSuccessfulPayment(payment: any) {
  try {
    // Traiter selon le type de paiement
    const metadata = payment.metadata ? JSON.parse(payment.metadata) : {}

    switch (payment.type) {
      case 'DELIVERY':
        await processDeliveryPayment(payment, metadata)
        break
      case 'SERVICE':
        await processServicePayment(payment, metadata)
        break
      case 'STORAGE_RENTAL':
        await processStoragePayment(payment, metadata)
        break
      case 'SUBSCRIPTION':
        await processSubscriptionPayment(payment, metadata)
        break
    }

    // Créer une transaction de commission pour EcoDeli
    await prisma.payment.create({
      data: {
        userId: 'system', // ID système pour EcoDeli
        amount: payment.commissionAmount,
        currency: payment.currency,
        type: 'COMMISSION',
        status: 'COMPLETED',
        metadata: JSON.stringify({
          originalPaymentId: payment.id,
          commissionType: 'PLATFORM_FEE'
        })
      }
    })

    // Notification de succès
    await prisma.notification.create({
      data: {
        userId: payment.userId,
        type: 'PAYMENT_SUCCESS',
        title: 'Paiement confirmé',
        message: `Votre paiement de ${payment.amount}¬ a été confirmé avec succès.`,
        data: {
          paymentId: payment.id,
          amount: payment.amount,
          type: payment.type
        }
      }
    })

  } catch (error) {
    console.error('Error processing successful payment:', error)
    
    // Créer une alerte pour les admins
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { id: true }
    })

    for (const admin of admins) {
      await prisma.notification.create({
        data: {
          userId: admin.id,
          type: 'PAYMENT_PROCESSING_ERROR',
          title: 'Erreur traitement paiement',
          message: `Erreur lors du traitement du paiement ${payment.id}`,
          data: {
            paymentId: payment.id,
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        }
      })
    }
  }
}

async function processDeliveryPayment(payment: any, metadata: any) {
  if (metadata.deliveryId) {
    await prisma.delivery.update({
      where: { id: metadata.deliveryId },
      data: { 
        paymentStatus: 'PAID',
        paidAt: new Date()
      }
    })
  }
}

async function processServicePayment(payment: any, metadata: any) {
  if (metadata.serviceBookingId) {
    await prisma.serviceBooking.update({
      where: { id: metadata.serviceBookingId },
      data: { 
        paymentStatus: 'PAID',
        paidAt: new Date()
      }
    })
  }
}

async function processStoragePayment(payment: any, metadata: any) {
  if (metadata.storageRentalId) {
    await prisma.storageBoxRental.update({
      where: { id: metadata.storageRentalId },
      data: { 
        status: 'ACTIVE',
        paidAt: new Date()
      }
    })
  }
}

async function processSubscriptionPayment(payment: any, metadata: any) {
  if (metadata.subscriptionPlan) {
    const endDate = new Date()
    endDate.setMonth(endDate.getMonth() + 1) // 1 mois d'abonnement

    await prisma.user.update({
      where: { id: payment.userId },
      data: {
        subscriptionPlan: metadata.subscriptionPlan,
        subscriptionEndDate: endDate
      }
    })

    if (payment.userId.startsWith('client_')) {
      await prisma.client.update({
        where: { userId: payment.userId },
        data: {
          subscriptionPlan: metadata.subscriptionPlan,
          subscriptionEndDate: endDate
        }
      })
    }
  }
}