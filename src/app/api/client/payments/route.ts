import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const status = searchParams.get('status')
    const type = searchParams.get('type')
    const search = searchParams.get('search')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const offset = (page - 1) * limit

    // Construire les filtres
    const where: any = {
      payerId: session.user.id
    }

    if (status) {
      where.status = status
    }

    if (type) {
      where.type = type
    }

    if (search) {
      where.description = {
        contains: search,
        mode: 'insensitive'
      }
    }

    if (dateFrom || dateTo) {
      where.createdAt = {}
      if (dateFrom) {
        where.createdAt.gte = new Date(dateFrom)
      }
      if (dateTo) {
        where.createdAt.lte = new Date(dateTo)
      }
    }

    // Récupérer les paiements
    const [payments, total] = await Promise.all([
      db.payment.findMany({
        where,
        include: {
          recipient: {
            select: {
              name: true
            }
          },
          delivery: {
            select: {
              id: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit
      }),
      db.payment.count({ where })
    ])

    // Calculer les statistiques
    const allPayments = await db.payment.findMany({
      where: {
        payerId: session.user.id
      }
    })

    const stats = {
      totalSpent: allPayments
        .filter(p => p.status === 'COMPLETED' && p.type !== 'INSURANCE_CLAIM')
        .reduce((sum, p) => sum + p.amount, 0),
      totalRefunds: allPayments
        .filter(p => p.status === 'REFUNDED')
        .reduce((sum, p) => sum + (p.refundAmount || p.amount), 0),
      totalPending: allPayments
        .filter(p => p.status === 'PENDING')
        .reduce((sum, p) => sum + p.amount, 0),
      monthlySpending: [] // À implémenter si nécessaire
    }

    // Transformer les données
    const transformedPayments = payments.map(payment => ({
      id: payment.id,
      type: payment.type,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      description: payment.description,
      createdAt: payment.createdAt.toISOString(),
      recipientName: payment.recipient?.name,
      deliveryId: payment.delivery?.id,
      stripePaymentId: payment.stripePaymentId,
      refundAmount: payment.refundAmount
    }))

    return NextResponse.json({
      payments: transformedPayments,
      stats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching payments:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}