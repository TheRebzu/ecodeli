import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { handleApiError } from '@/lib/utils/api-response'

// Schema pour recherche de paiements
const searchPaymentsSchema = z.object({
  page: z.string().transform(Number).pipe(z.number().min(1)).default('1'),
  limit: z.string().transform(Number).pipe(z.number().min(1).max(50)).default('20'),
  type: z.enum(['DELIVERY', 'SERVICE_BOOKING', 'STORAGE_RENTAL', 'SUBSCRIPTION', 'REFUND']).optional(),
  status: z.enum(['PENDING', 'COMPLETED', 'FAILED', 'CANCELLED', 'REFUNDED']).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  amountMin: z.string().transform(Number).pipe(z.number().positive()).optional(),
  amountMax: z.string().transform(Number).pipe(z.number().positive()).optional(),
  sortBy: z.enum(['createdAt', 'amount', 'status']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
})

// Schema pour ajouter une méthode de paiement
const addPaymentMethodSchema = z.object({
  type: z.enum(['CARD', 'PAYPAL', 'BANK_TRANSFER', 'APPLE_PAY', 'GOOGLE_PAY']),
  cardToken: z.string().optional(), // Token Stripe pour les cartes
  paypalEmail: z.string().email().optional(),
  bankAccount: z.object({
    iban: z.string().min(15),
    bic: z.string().min(8),
    holderName: z.string().min(2)
  }).optional(),
  isDefault: z.boolean().default(false),
  nickname: z.string().max(50).optional()
})

// Schema pour demande de remboursement
const refundRequestSchema = z.object({
  paymentId: z.string().cuid(),
  reason: z.enum(['SERVICE_NOT_PROVIDED', 'POOR_QUALITY', 'CANCELLED_BY_PROVIDER', 'TECHNICAL_ISSUE', 'OTHER']),
  description: z.string().min(10).max(500),
  amount: z.number().positive().optional(), // Pour remboursement partiel
  evidence: z.array(z.string().url()).max(5).optional() // Photos/documents
})

// GET - Historique des paiements
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const validatedParams = searchPaymentsSchema.parse(Object.fromEntries(searchParams))

    const client = await prisma.client.findUnique({
      where: { userId: session.user.id }
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Construire les filtres
    const where: any = {
      userId: session.user.id
    }

    if (validatedParams.type) {
      where.type = validatedParams.type
    }

    if (validatedParams.status) {
      where.status = validatedParams.status
    }

    if (validatedParams.dateFrom || validatedParams.dateTo) {
      where.createdAt = {}
      if (validatedParams.dateFrom) where.createdAt.gte = new Date(validatedParams.dateFrom)
      if (validatedParams.dateTo) where.createdAt.lte = new Date(validatedParams.dateTo)
    }

    if (validatedParams.amountMin || validatedParams.amountMax) {
      where.amount = {}
      if (validatedParams.amountMin) where.amount.gte = validatedParams.amountMin
      if (validatedParams.amountMax) where.amount.lte = validatedParams.amountMax
    }

    const skip = (validatedParams.page - 1) * validatedParams.limit
    const orderBy: any = {}
    orderBy[validatedParams.sortBy] = validatedParams.sortOrder

    // Récupérer les paiements
    const [payments, totalCount] = await Promise.all([
      prisma.payment.findMany({
        where,
        skip,
        take: validatedParams.limit,
        orderBy,
        include: {
          refunds: true
        }
      }),
      prisma.payment.count({ where })
    ])

    // Calculer les statistiques
    const stats = await calculatePaymentStats(session.user.id)

    // Récupérer les méthodes de paiement
    const paymentMethods = await prisma.paymentMethod.findMany({
      where: { userId: session.user.id },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' }
      ]
    })

    return NextResponse.json({
      payments: payments.map(payment => ({
        ...payment,
        canRefund: canRequestRefund(payment),
        refundAmount: payment.refunds.reduce((sum, refund) => sum + refund.amount, 0),
        netAmount: payment.amount - payment.refunds.reduce((sum, refund) => sum + refund.amount, 0)
      })),
      pagination: {
        page: validatedParams.page,
        limit: validatedParams.limit,
        total: totalCount,
        pages: Math.ceil(totalCount / validatedParams.limit)
      },
      stats,
      paymentMethods: paymentMethods.map(method => ({
        ...method,
        // Masquer les données sensibles
        cardLast4: method.cardLast4,
        cardBrand: method.cardBrand,
        expiryMonth: method.expiryMonth,
        expiryYear: method.expiryYear
      })),
      summary: {
        totalSpent: stats.totalAmount,
        averageTransaction: stats.averageAmount,
        monthlySpending: stats.monthlyAmount,
        savedWithSubscription: stats.totalSavings
      }
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return handleApiError(error, 'fetching payments')
  }
}

// POST - Ajouter une méthode de paiement
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = addPaymentMethodSchema.parse(body)

    const client = await prisma.client.findUnique({
      where: { userId: session.user.id }
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Si c'est la méthode par défaut, désactiver les autres
    if (validatedData.isDefault) {
      await prisma.paymentMethod.updateMany({
        where: { userId: session.user.id },
        data: { isDefault: false }
      })
    }

    // Créer la méthode de paiement selon le type
    let paymentMethodData: any = {
      userId: session.user.id,
      type: validatedData.type,
      isDefault: validatedData.isDefault,
      nickname: validatedData.nickname
    }

    switch (validatedData.type) {
      case 'CARD':
        if (!validatedData.cardToken) {
          return NextResponse.json({ error: 'Card token required' }, { status: 400 })
        }
        
        // TODO: Traiter le token Stripe et récupérer les infos de carte
        // const cardInfo = await stripe.paymentMethods.retrieve(validatedData.cardToken)
        
        // Simulation pour le développement
        paymentMethodData = {
          ...paymentMethodData,
          stripePaymentMethodId: validatedData.cardToken,
          cardLast4: '4242',
          cardBrand: 'visa',
          expiryMonth: 12,
          expiryYear: 2025
        }
        break

      case 'PAYPAL':
        if (!validatedData.paypalEmail) {
          return NextResponse.json({ error: 'PayPal email required' }, { status: 400 })
        }
        paymentMethodData.paypalEmail = validatedData.paypalEmail
        break

      case 'BANK_TRANSFER':
        if (!validatedData.bankAccount) {
          return NextResponse.json({ error: 'Bank account details required' }, { status: 400 })
        }
        paymentMethodData = {
          ...paymentMethodData,
          iban: validatedData.bankAccount.iban,
          bic: validatedData.bankAccount.bic,
          accountHolderName: validatedData.bankAccount.holderName
        }
        break
    }

    const paymentMethod = await prisma.paymentMethod.create({
      data: paymentMethodData
    })

    // Si c'est la première méthode, la rendre par défaut
    if (!validatedData.isDefault) {
      const methodCount = await prisma.paymentMethod.count({
        where: { userId: session.user.id }
      })
      
      if (methodCount === 1) {
        await prisma.paymentMethod.update({
          where: { id: paymentMethod.id },
          data: { isDefault: true }
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Méthode de paiement ajoutée avec succès',
      paymentMethod: {
        id: paymentMethod.id,
        type: paymentMethod.type,
        nickname: paymentMethod.nickname,
        isDefault: paymentMethod.isDefault,
        ...(paymentMethod.type === 'CARD' && {
          cardLast4: paymentMethod.cardLast4,
          cardBrand: paymentMethod.cardBrand,
          expiryMonth: paymentMethod.expiryMonth,
          expiryYear: paymentMethod.expiryYear
        })
      }
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return handleApiError(error, 'adding payment method')
  }
}

// Fonctions utilitaires
async function calculatePaymentStats(userId: string) {
  const payments = await prisma.payment.findMany({
    where: { 
      userId,
      status: 'COMPLETED'
    }
  })

  const currentMonth = new Date()
  currentMonth.setDate(1)
  currentMonth.setHours(0, 0, 0, 0)

  const monthlyPayments = payments.filter(p => p.createdAt >= currentMonth)

  // Calculer les économies grâce à l'abonnement
  const client = await prisma.client.findUnique({
    where: { userId },
    include: { subscription: true }
  })

  const totalSavings = calculateSubscriptionSavings(client?.subscriptionPlan || 'FREE', payments)

  return {
    totalCount: payments.length,
    totalAmount: payments.reduce((sum, p) => sum + p.amount, 0),
    averageAmount: payments.length > 0 ? payments.reduce((sum, p) => sum + p.amount, 0) / payments.length : 0,
    monthlyCount: monthlyPayments.length,
    monthlyAmount: monthlyPayments.reduce((sum, p) => sum + p.amount, 0),
    totalSavings,
    byType: groupPaymentsByType(payments),
    byStatus: groupPaymentsByStatus(payments)
  }
}

function calculateSubscriptionSavings(plan: string, payments: any[]): number {
  const discounts = { FREE: 0, STARTER: 5, PREMIUM: 8 }
  const discount = discounts[plan as keyof typeof discounts] || 0
  
  if (discount === 0) return 0
  
  const totalSpent = payments.reduce((sum, p) => sum + p.amount, 0)
  return Math.round(totalSpent * (discount / 100) * 100) / 100
}

function groupPaymentsByType(payments: any[]) {
  return payments.reduce((acc, payment) => {
    acc[payment.type] = (acc[payment.type] || 0) + payment.amount
    return acc
  }, {})
}

function groupPaymentsByStatus(payments: any[]) {
  return payments.reduce((acc, payment) => {
    acc[payment.status] = (acc[payment.status] || 0) + 1
    return acc
  }, {})
}

function canRequestRefund(payment: any): boolean {
  // Règles de remboursement
  if (payment.status !== 'COMPLETED') return false
  
  const daysSincePayment = (Date.now() - payment.createdAt.getTime()) / (1000 * 60 * 60 * 24)
  
  // Délai de remboursement selon le type
  const refundDeadlines = {
    DELIVERY: 7,
    SERVICE_BOOKING: 24, // 24 heures
    STORAGE_RENTAL: 48, // 48 heures
    SUBSCRIPTION: 14
  }
  
  const deadline = refundDeadlines[payment.type as keyof typeof refundDeadlines] || 7
  
  return daysSincePayment <= deadline
}