import { NextRequest, NextResponse } from 'next/server'
import { getUserFromSession } from '@/lib/auth/utils'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  const user = await getUserFromSession(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
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
      userId: user.id
    }

    if (status && status !== 'all') {
      where.status = status
    }

    // Construire les filtres metadata séparément pour éviter l'écrasement
    const metadataFilters: any[] = []
    
    if (type && type !== 'all') {
      metadataFilters.push({
        path: ['type'],
        equals: type
      })
    }

    if (search) {
      metadataFilters.push({
        path: ['description'],
        string_contains: search
      })
    }

    if (metadataFilters.length === 1) {
      where.metadata = metadataFilters[0]
    } else if (metadataFilters.length > 1) {
      where.AND = metadataFilters.map(filter => ({ metadata: filter }))
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
          user: {
            select: {
              name: true,
              email: true
            }
          },
          delivery: {
            select: {
              id: true,
              announcement: {
                select: {
                  title: true
                }
              }
            }
          },
          booking: {
            select: {
              id: true,
              status: true,
              scheduledDate: true,
              service: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                  description: true
                }
              }
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
        userId: user.id
      }
    })

    const stats = {
      totalSpent: allPayments
        .filter(p => p.status === 'COMPLETED')
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
      type: payment.metadata?.type || 'UNKNOWN',
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      description: payment.metadata?.description || `Paiement ${payment.amount}€`,
      createdAt: payment.createdAt.toISOString(),
      userName: payment.user?.name,
      deliveryId: payment.delivery?.id,
      deliveryTitle: payment.delivery?.announcement?.title,
      bookingId: payment.booking?.id,
      bookingServiceName: payment.booking?.service?.name,
      bookingServiceType: payment.booking?.service?.type,
      bookingStatus: payment.booking?.status,
      stripePaymentId: payment.stripePaymentId,
      refundAmount: payment.refundAmount,
      paymentMethod: payment.paymentMethod
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