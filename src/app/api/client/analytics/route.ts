import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { handleApiError } from '@/lib/utils/api-response'

// Schema pour les paramètres d'analyse
const analyticsSchema = z.object({
  period: z.enum(['week', 'month', 'quarter', 'year']).default('month'),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  category: z.enum(['deliveries', 'services', 'spending', 'all']).default('all')
})

// GET - Statistiques et analyses client
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
    const validatedParams = analyticsSchema.parse(Object.fromEntries(searchParams))

    const client = await prisma.client.findUnique({
      where: { userId: session.user.id }
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Calculer les dates de la période
    const { startDate, endDate } = calculatePeriodDates(
      validatedParams.period,
      validatedParams.startDate,
      validatedParams.endDate
    )

    // Analyses par catégorie
    const analytics = await Promise.all([
      getDeliveryAnalytics(client.id, startDate, endDate),
      getServiceAnalytics(client.id, startDate, endDate),
      getSpendingAnalytics(client.id, startDate, endDate),
      getUsagePatterns(client.id, startDate, endDate),
      getSavingsAnalytics(client),
      getComparativeAnalytics(client.id, startDate, endDate)
    ])

    const [
      deliveryStats,
      serviceStats,
      spendingStats,
      usagePatterns,
      savingsData,
      comparative
    ] = analytics

    return NextResponse.json({
      period: {
        type: validatedParams.period,
        startDate,
        endDate,
        daysInPeriod: Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      },
      summary: {
        totalOrders: deliveryStats.totalDeliveries + serviceStats.totalBookings,
        totalSpent: spendingStats.totalAmount,
        totalSavings: savingsData.totalSavings,
        averageOrderValue: spendingStats.averageOrderValue,
        successRate: calculateOverallSuccessRate(deliveryStats, serviceStats)
      },
      deliveries: deliveryStats,
      services: serviceStats,
      spending: spendingStats,
      patterns: usagePatterns,
      savings: savingsData,
      comparative,
      insights: generateInsights(analytics, client),
      recommendations: generateRecommendations(analytics, client)
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return handleApiError(error, 'fetching analytics')
  }
}

// Analyses des livraisons
async function getDeliveryAnalytics(clientId: string, startDate: Date, endDate: Date) {
  const deliveries = await prisma.delivery.findMany({
    where: {
      announcement: { clientId },
      createdAt: { gte: startDate, lte: endDate }
    },
    include: { announcement: true }
  })

  const byStatus = deliveries.reduce((acc, delivery) => {
    acc[delivery.status] = (acc[delivery.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const byType = deliveries.reduce((acc, delivery) => {
    const type = delivery.announcement.type
    acc[type] = (acc[type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Analyse temporelle
  const dailyDeliveries = generateDailyStats(deliveries, startDate, endDate, 'createdAt')

  return {
    totalDeliveries: deliveries.length,
    completedDeliveries: byStatus['DELIVERED'] || 0,
    successRate: deliveries.length > 0 ? 
      ((byStatus['DELIVERED'] || 0) / deliveries.length * 100) : 0,
    averageDeliveryTime: await calculateAverageDeliveryTime(clientId, startDate, endDate),
    byStatus,
    byType,
    dailyStats: dailyDeliveries,
    popularRoutes: await getPopularRoutes(clientId, startDate, endDate)
  }
}

// Analyses des services
async function getServiceAnalytics(clientId: string, startDate: Date, endDate: Date) {
  const bookings = await prisma.booking.findMany({
    where: {
      clientId,
      createdAt: { gte: startDate, lte: endDate }
    },
    include: { service: true }
  })

  const byStatus = bookings.reduce((acc, booking) => {
    acc[booking.status] = (acc[booking.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const byCategory = bookings.reduce((acc, booking) => {
    const category = booking.service.category
    acc[category] = (acc[category] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const dailyBookings = generateDailyStats(bookings, startDate, endDate, 'createdAt')

  return {
    totalBookings: bookings.length,
    completedBookings: byStatus['COMPLETED'] || 0,
    successRate: bookings.length > 0 ? 
      ((byStatus['COMPLETED'] || 0) / bookings.length * 100) : 0,
    averageRating: await calculateAverageClientRating(clientId, startDate, endDate),
    byStatus,
    byCategory,
    dailyStats: dailyBookings,
    favoriteProviders: await getFavoriteProviders(clientId, startDate, endDate)
  }
}

// Analyses de dépenses
async function getSpendingAnalytics(clientId: string, startDate: Date, endDate: Date) {
  const payments = await prisma.payment.findMany({
    where: {
      userId: clientId,
      status: 'COMPLETED',
      createdAt: { gte: startDate, lte: endDate }
    }
  })

  const totalAmount = payments.reduce((sum, payment) => sum + payment.amount, 0)
  const averageOrderValue = payments.length > 0 ? totalAmount / payments.length : 0

  const byType = payments.reduce((acc, payment) => {
    acc[payment.type] = (acc[payment.type] || 0) + payment.amount
    return acc
  }, {} as Record<string, number>)

  const dailySpending = generateDailyStats(payments, startDate, endDate, 'createdAt', 'amount')

  return {
    totalAmount: Math.round(totalAmount * 100) / 100,
    averageOrderValue: Math.round(averageOrderValue * 100) / 100,
    totalTransactions: payments.length,
    byType,
    dailyStats: dailySpending,
    largestOrder: Math.max(...payments.map(p => p.amount), 0),
    smallestOrder: Math.min(...payments.map(p => p.amount), totalAmount)
  }
}

// Analyse des patterns d'usage
async function getUsagePatterns(clientId: string, startDate: Date, endDate: Date) {
  // Analyse par jour de la semaine
  const activities = await prisma.$queryRaw`
    SELECT 
      EXTRACT(DOW FROM created_at) as day_of_week,
      COUNT(*) as count
    FROM (
      SELECT created_at FROM announcements WHERE client_id = ${clientId} 
        AND created_at >= ${startDate} AND created_at <= ${endDate}
      UNION ALL
      SELECT created_at FROM bookings WHERE client_id = ${clientId}
        AND created_at >= ${startDate} AND created_at <= ${endDate}
    ) activities
    GROUP BY day_of_week
    ORDER BY day_of_week
  ` as any[]

  // Analyse par heure
  const hourlyActivity = await prisma.$queryRaw`
    SELECT 
      EXTRACT(HOUR FROM created_at) as hour,
      COUNT(*) as count
    FROM (
      SELECT created_at FROM announcements WHERE client_id = ${clientId}
        AND created_at >= ${startDate} AND created_at <= ${endDate}
      UNION ALL
      SELECT created_at FROM bookings WHERE client_id = ${clientId}
        AND created_at >= ${startDate} AND created_at <= ${endDate}
    ) activities
    GROUP BY hour
    ORDER BY hour
  ` as any[]

  return {
    byDayOfWeek: activities.map(item => ({
      day: getDayName(parseInt(item.day_of_week)),
      count: parseInt(item.count)
    })),
    byHour: hourlyActivity.map(item => ({
      hour: parseInt(item.hour),
      count: parseInt(item.count)
    })),
    peakDay: activities.length > 0 ? 
      getDayName(activities.reduce((max, curr) => 
        parseInt(curr.count) > parseInt(max.count) ? curr : max
      ).day_of_week) : null,
    peakHour: hourlyActivity.length > 0 ? 
      hourlyActivity.reduce((max, curr) => 
        parseInt(curr.count) > parseInt(max.count) ? curr : max
      ).hour : null
  }
}

// Analyse des économies
async function getSavingsAnalytics(client: any) {
  const subscriptionPlan = client.subscriptionPlan || 'FREE'
  const discounts = { FREE: 0, STARTER: 5, PREMIUM: 9 }
  const discount = discounts[subscriptionPlan as keyof typeof discounts]

  const totalSpent = await prisma.payment.aggregate({
    where: {
      userId: client.userId,
      status: 'COMPLETED'
    },
    _sum: { amount: true }
  })

  const totalAmount = totalSpent._sum.amount || 0
  const totalSavings = (totalAmount * discount) / 100
  const monthlySubscriptionCost = subscriptionPlan === 'FREE' ? 0 : 
    subscriptionPlan === 'STARTER' ? 9.90 : 19.99

  return {
    currentDiscount: discount,
    totalSavings: Math.round(totalSavings * 100) / 100,
    monthlySubscriptionCost,
    netSavings: Math.round((totalSavings - monthlySubscriptionCost) * 100) / 100,
    breakEvenAmount: monthlySubscriptionCost > 0 ? 
      Math.round((monthlySubscriptionCost / (discount / 100)) * 100) / 100 : 0
  }
}

// Analyses comparatives
async function getComparativeAnalytics(clientId: string, startDate: Date, endDate: Date) {
  // Comparer avec la période précédente
  const periodLength = endDate.getTime() - startDate.getTime()
  const previousStart = new Date(startDate.getTime() - periodLength)
  const previousEnd = new Date(endDate.getTime() - periodLength)

  const [currentDeliveries, previousDeliveries] = await Promise.all([
    prisma.delivery.count({
      where: {
        announcement: { clientId },
        createdAt: { gte: startDate, lte: endDate }
      }
    }),
    prisma.delivery.count({
      where: {
        announcement: { clientId },
        createdAt: { gte: previousStart, lte: previousEnd }
      }
    })
  ])

  const deliveryChange = previousDeliveries > 0 ? 
    ((currentDeliveries - previousDeliveries) / previousDeliveries * 100) : 0

  return {
    deliveries: {
      current: currentDeliveries,
      previous: previousDeliveries,
      change: Math.round(deliveryChange * 100) / 100
    }
  }
}

// Fonctions utilitaires
function calculatePeriodDates(period: string, customStart?: string, customEnd?: string) {
  if (customStart && customEnd) {
    return {
      startDate: new Date(customStart),
      endDate: new Date(customEnd)
    }
  }

  const now = new Date()
  let startDate: Date

  switch (period) {
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      break
    case 'quarter':
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
      break
    case 'year':
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
      break
    default: // month
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  }

  return { startDate, endDate: now }
}

function generateDailyStats(items: any[], startDate: Date, endDate: Date, dateField: string, valueField?: string) {
  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  const stats = []

  for (let i = 0; i < days; i++) {
    const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000)
    const dayItems = items.filter(item => {
      const itemDate = new Date(item[dateField])
      return itemDate.toDateString() === date.toDateString()
    })

    stats.push({
      date: date.toISOString().split('T')[0],
      count: dayItems.length,
      value: valueField ? dayItems.reduce((sum, item) => sum + item[valueField], 0) : dayItems.length
    })
  }

  return stats
}

function calculateOverallSuccessRate(deliveryStats: any, serviceStats: any): number {
  const totalOrders = deliveryStats.totalDeliveries + serviceStats.totalBookings
  const completedOrders = deliveryStats.completedDeliveries + serviceStats.completedBookings
  
  return totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0
}

function getDayName(dayNumber: number): string {
  const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
  return days[dayNumber] || 'Inconnu'
}

// Fonctions d'aide (à implémenter selon les modèles de données)
async function calculateAverageDeliveryTime(clientId: string, startDate: Date, endDate: Date): Promise<number> {
  // TODO: Implémenter le calcul du temps moyen de livraison
  return 0
}

async function getPopularRoutes(clientId: string, startDate: Date, endDate: Date): Promise<any[]> {
  // TODO: Implémenter les routes populaires
  return []
}

async function calculateAverageClientRating(clientId: string, startDate: Date, endDate: Date): Promise<number> {
  const reviews = await prisma.review.aggregate({
    where: {
      clientId,
      createdAt: { gte: startDate, lte: endDate }
    },
    _avg: { rating: true }
  })
  
  return reviews._avg.rating || 0
}

async function getFavoriteProviders(clientId: string, startDate: Date, endDate: Date): Promise<any[]> {
  // TODO: Implémenter les prestataires favoris
  return []
}

function generateInsights(analytics: any[], client: any): string[] {
  const insights = []
  // TODO: Générer des insights personnalisés basés sur les données
  return insights
}

function generateRecommendations(analytics: any[], client: any): any[] {
  const recommendations = []
  // TODO: Générer des recommandations personnalisées
  return recommendations
} 