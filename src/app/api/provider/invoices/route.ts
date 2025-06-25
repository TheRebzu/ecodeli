import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

/**
 * GET - Récupérer les factures mensuelles du prestataire
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    
    if (!session?.user || session.user.role !== 'PROVIDER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Récupérer le profil prestataire
    const provider = await prisma.provider.findUnique({
      where: { userId: session.user.id }
    })

    if (!provider) {
      return NextResponse.json(
        { error: 'Profil prestataire non trouvé' },
        { status: 404 }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '12')
    const year = searchParams.get('year') ? parseInt(searchParams.get('year')!) : undefined

    const where: any = {
      providerId: provider.id,
      type: 'PROVIDER_MONTHLY'
    }

    if (year) {
      where.billingPeriodStart = {
        gte: new Date(year, 0, 1),
        lt: new Date(year + 1, 0, 1)
      }
    }

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: {
          items: true,
          payments: true
        },
        orderBy: { billingPeriodStart: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.invoice.count({ where })
    ])

    // Calculer les totaux annuels
    const yearlyStats = await prisma.invoice.aggregate({
      where: {
        ...where,
        status: { not: 'DRAFT' }
      },
      _sum: {
        total: true,
        subtotal: true
      },
      _count: {
        id: true
      }
    })

    return NextResponse.json({
      success: true,
      invoices,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      yearlyStats: {
        totalInvoices: yearlyStats._count.id || 0,
        totalEarnings: yearlyStats._sum.subtotal || 0,
        netAmount: yearlyStats._sum.total || 0,
        year: year || new Date().getFullYear()
      }
    })

  } catch (error) {
    console.error('Error getting provider invoices:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des factures' },
      { status: 500 }
    )
  }
}