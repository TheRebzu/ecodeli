import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { MerchantAnalyticsService, analyticsTimeRangeSchema } from '@/features/merchant/services/analytics.service'
import { z } from 'zod'
import { prisma } from '@/lib/db'

const dashboardRequestSchema = z.object({
  merchantId: z.string(),
  timeRange: analyticsTimeRangeSchema
})

export async function POST(request: NextRequest) {
  try {
    // Vérification de l'authentification
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

    // Vérification du rôle
    if (session.user.role !== 'MERCHANT' && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Accès refusé' },
        { status: 403 }
      )
    }

    // Validation des données
    const body = await request.json()
    const { merchantId, timeRange } = dashboardRequestSchema.parse(body)

    // Vérification que le merchant peut accéder à ses propres données
    if (session.user.role === 'MERCHANT' && session.user.id !== merchantId) {
      return NextResponse.json(
        { error: 'Accès refusé à ces données' },
        { status: 403 }
      )
    }

    // Récupération du dashboard
    const dashboard = await MerchantAnalyticsService.getDashboard(merchantId, timeRange)

    return NextResponse.json(dashboard)

  } catch (error) {
    console.error('Erreur API dashboard analytics:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Données invalides', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    if (session.user.role !== 'MERCHANT') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const timeRange = searchParams.get('timeRange') || '30d'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Calculer les dates selon la période
    let dateRange
    const now = new Date()
    
    if (startDate && endDate) {
      dateRange = {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        period: 'day' as const
      }
    } else {
      switch (timeRange) {
        case '7d':
          dateRange = {
            startDate: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
            endDate: now,
            period: 'day' as const
          }
          break
        case '30d':
          dateRange = {
            startDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
            endDate: now,
            period: 'day' as const
          }
          break
        case '90d':
          dateRange = {
            startDate: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
            endDate: now,
            period: 'week' as const
          }
          break
        case '1y':
          dateRange = {
            startDate: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000),
            endDate: now,
            period: 'month' as const
          }
          break
        default:
          dateRange = {
            startDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
            endDate: now,
            period: 'day' as const
          }
      }
    }

    // Récupérer l'ID du merchant
    const merchant = await prisma.merchant.findUnique({
      where: { userId: session.user.id }
    })

    if (!merchant) {
      return NextResponse.json({ error: 'Profil merchant non trouvé' }, { status: 404 })
    }

    // Récupérer les données analytics
    const dashboard = await MerchantAnalyticsService.getDashboard(merchant.id, dateRange)

    return NextResponse.json(dashboard)

  } catch (error) {
    console.error('Erreur API analytics dashboard:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
} 