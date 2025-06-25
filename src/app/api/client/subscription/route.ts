import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { handleApiError } from '@/lib/utils/api-response'

// Schema pour la gestion des abonnements
const subscriptionSchema = z.object({
  plan: z.enum(['FREE', 'STARTER', 'PREMIUM']),
  paymentMethodId: z.string().optional(), // Stripe payment method ID
  promoCode: z.string().optional()
})

const cancelSubscriptionSchema = z.object({
  reason: z.enum(['TOO_EXPENSIVE', 'NOT_USEFUL', 'TECHNICAL_ISSUES', 'OTHER']),
  feedback: z.string().max(500).optional(),
  cancelAtPeriodEnd: z.boolean().default(true)
})

// Plans d'abonnement obligatoires selon les specs
const SUBSCRIPTION_PLANS = {
  FREE: {
    price: 0,
    stripePriceId: null,
    features: {
      insurance: 0, // €
      discount: 0, // %
      priorityShipping: 15, // % supplement
      monthlyAnnouncements: 5,
      supportLevel: 'STANDARD'
    },
    limits: {
      maxAnnouncementsPerMonth: 5,
      maxStorageBoxes: 0,
      maxConcurrentDeliveries: 2
    }
  },
  STARTER: {
    price: 9.90,
    stripePriceId: process.env.STRIPE_STARTER_PRICE_ID,
    features: {
      insurance: 115, // € par envoi
      discount: 5, // %
      priorityShipping: 5, // % supplement
      monthlyAnnouncements: 20,
      supportLevel: 'PRIORITY',
      permanentDiscount: 5 // % sur petits colis
    },
    limits: {
      maxAnnouncementsPerMonth: 20,
      maxStorageBoxes: 2,
      maxConcurrentDeliveries: 5
    }
  },
  PREMIUM: {
    price: 19.99,
    stripePriceId: process.env.STRIPE_PREMIUM_PRICE_ID,
    features: {
      insurance: 3000, // € max par envoi, au-delà +75€
      discount: 9, // %
      priorityShipping: 3, // envois offerts/mois, puis +5%
      firstShipmentFree: true, // si < 150€
      monthlyAnnouncements: -1, // illimité
      supportLevel: 'VIP',
      permanentDiscount: 5, // % sur tous colis
      dedicatedSupport: true
    },
    limits: {
      maxAnnouncementsPerMonth: -1, // illimité
      maxStorageBoxes: 5,
      maxConcurrentDeliveries: 10
    }
  }
} as const

// GET - Récupérer l'abonnement actuel du client
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Forbidden - Client access required' }, { status: 403 })
    }

    // Simuler les données d'abonnement
    const mockSubscription = {
      id: 'sub_1234567890',
      plan: 'FREE',
      status: 'active',
      startDate: new Date('2024-01-01').toISOString(),
      endDate: null,
      autoRenew: false
    }

    const mockUsageStats = {
      thisMonth: {
        deliveries: 5,
        savings: 23.50,
        priorityShipments: 1,
        insuranceUsed: 0
      },
      lastMonth: {
        deliveries: 3,
        savings: 15.20
      }
    }

    return NextResponse.json({
      subscription: mockSubscription,
      usageStats: mockUsageStats
    })

  } catch (error) {
    return handleApiError(error, 'fetching subscription')
  }
}

// PUT - Modifier un abonnement
export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Forbidden - Client access required' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = subscriptionSchema.parse(body)

    // Simuler la mise à jour
    const updatedSubscription = {
      id: 'sub_1234567890',
      plan: validatedData.plan,
      status: 'active',
      startDate: new Date().toISOString(),
      endDate: validatedData.plan === 'FREE' ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      autoRenew: validatedData.plan !== 'FREE'
    }

    return NextResponse.json({
      subscription: updatedSubscription,
      message: `Abonnement mis à jour vers ${validatedData.plan}`
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return handleApiError(error, 'updating subscription')
  }
}

// DELETE - Annuler un abonnement
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Forbidden - Client access required' }, { status: 403 })
    }

    // Simuler l'annulation
    return NextResponse.json({
      message: 'Abonnement annulé avec succès',
      canceledAt: new Date().toISOString(),
      willCancelAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    })

  } catch (error) {
    return handleApiError(error, 'canceling subscription')
  }
}

// Fonctions utilitaires
async function calculateMonthlySavings(clientId: string, plan: string): Promise<number> {
  // Simuler le calcul des économies
  const planDetails = SUBSCRIPTION_PLANS[plan as keyof typeof SUBSCRIPTION_PLANS]
  if (!planDetails || plan === 'FREE') return 0
  
  return planDetails.features.discount * 5 // Simulation basique
} 