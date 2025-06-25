import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { z } from 'zod'
import { AnalyticsService, AnalyticsTimeframe } from '@/features/analytics/services/analytics.service'

const analyticsQuerySchema = z.object({
  period: z.enum(['daily', 'weekly', 'monthly', 'yearly']).default('monthly'),
  startDate: z.string().optional(),
  endDate: z.string().optional()
})

/**
 * GET - Récupérer les statistiques du dashboard
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    
    if (!session?.user || !['ADMIN', 'MERCHANT', 'PROVIDER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = analyticsQuerySchema.parse({
      period: searchParams.get('period'),
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate')
    })

    // Définir la période d'analyse
    const timeframe: AnalyticsTimeframe = this.getTimeframe(query)

    // Récupérer toutes les données analytiques
    const [
      dashboardStats,
      performanceMetrics,
      revenueBreakdown,
      geographicStats
    ] = await Promise.all([
      AnalyticsService.getDashboardStats(timeframe),
      AnalyticsService.getPerformanceMetrics(timeframe),
      AnalyticsService.getRevenueBreakdown(timeframe),
      AnalyticsService.getGeographicStats(timeframe)
    ])

    // Filtrer les données selon le rôle
    const filteredData = this.filterDataByRole(session.user.role, {
      dashboard: dashboardStats,
      performance: performanceMetrics,
      revenue: revenueBreakdown,
      geographic: geographicStats,
      timeframe: {
        start: timeframe.start.toISOString(),
        end: timeframe.end.toISOString(),
        period: timeframe.period
      }
    })

    return NextResponse.json({
      success: true,
      analytics: filteredData
    })

  } catch (error) {
    console.error('Error getting analytics dashboard:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Paramètres invalides',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Erreur lors de la récupération des analytics' },
      { status: 500 }
    )
  }
}

/**
 * Définir la période d'analyse selon les paramètres
 */
function getTimeframe(query: any): AnalyticsTimeframe {
  const now = new Date()
  let start: Date, end: Date = now

  if (query.startDate && query.endDate) {
    start = new Date(query.startDate)
    end = new Date(query.endDate)
  } else {
    switch (query.period) {
      case 'daily':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
        break
      case 'weekly':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7)
        break
      case 'monthly':
        start = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
        break
      case 'yearly':
        start = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
        break
      default:
        start = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
    }
  }

  return { start, end, period: query.period }
}

/**
 * Filtrer les données selon le rôle utilisateur
 */
function filterDataByRole(role: string, data: any): any {
  switch (role) {
    case 'ADMIN':
      // Admin voit tout
      return data

    case 'MERCHANT':
      // Merchant voit les données liées au commerce
      return {
        dashboard: {
          totalUsers: data.dashboard.totalUsers,
          totalDeliveries: data.dashboard.totalDeliveries,
          averageRating: data.dashboard.averageRating,
          growthMetrics: data.dashboard.growthMetrics
        },
        performance: {
          deliverySuccessRate: data.performance.deliverySuccessRate,
          customerSatisfaction: data.performance.customerSatisfaction,
          repeatCustomerRate: data.performance.repeatCustomerRate
        },
        revenue: {
          deliveries: data.revenue.deliveries,
          commissions: data.revenue.commissions
        },
        geographic: data.geographic,
        timeframe: data.timeframe
      }

    case 'PROVIDER':
      // Provider voit les données de services
      return {
        dashboard: {
          totalUsers: data.dashboard.totalUsers,
          averageRating: data.dashboard.averageRating
        },
        performance: {
          customerSatisfaction: data.performance.customerSatisfaction,
          repeatCustomerRate: data.performance.repeatCustomerRate
        },
        revenue: {
          services: data.revenue.services
        },
        timeframe: data.timeframe
      }

    default:
      return {
        dashboard: {
          averageRating: data.dashboard.averageRating
        },
        timeframe: data.timeframe
      }
  }
}