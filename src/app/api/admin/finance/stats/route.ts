import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

/**
 * GET - Récupérer les statistiques financières (Admin seulement)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'last12months'

    const dateRange = getDateRange(period)
    const stats = await calculateFinancialStats(dateRange)

    return NextResponse.json({
      success: true,
      stats,
      period,
      dateRange
    })

  } catch (error) {
    console.error('Error fetching financial stats:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des statistiques' },
      { status: 500 }
    )
  }
}

function getDateRange(period: string) {
  const now = new Date()
  let startDate: Date
  
  switch (period) {
    case 'last30days':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      break
    case 'last3months':
      startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1)
      break
    case 'last6months':
      startDate = new Date(now.getFullYear(), now.getMonth() - 6, 1)
      break
    case 'last12months':
      startDate = new Date(now.getFullYear(), now.getMonth() - 12, 1)
      break
    case 'currentyear':
      startDate = new Date(now.getFullYear(), 0, 1)
      break
    default:
      startDate = new Date(now.getFullYear(), now.getMonth() - 12, 1)
  }
  
  return { startDate, endDate: now }
}

async function calculateFinancialStats(dateRange: { startDate: Date; endDate: Date }) {
  const { startDate, endDate } = dateRange

  // Calculer les revenus totaux (interventions terminées)
  const completedInterventions = await prisma.intervention.findMany({
    where: {
      isCompleted: true,
      completedAt: {
        gte: startDate,
        lte: endDate
      }
    },
    include: {
      booking: {
        include: {
          service: true,
          provider: {
            include: {
              user: true
            }
          }
        }
      }
    }
  })

  // Calculer le chiffre d'affaires total et les commissions
  let totalRevenue = 0
  let totalCommission = 0
  const providerCommissions = new Map<string, { name: string; revenue: number; commission: number }>()

  completedInterventions.forEach(intervention => {
    const duration = intervention.actualDuration || intervention.booking.duration
    const hourlyRate = intervention.booking.service.basePrice
    const revenue = (duration / 60) * hourlyRate
    const commission = revenue * 0.10 // 10% de commission

    totalRevenue += revenue
    totalCommission += commission

    // Grouper par prestataire
    const providerId = intervention.booking.provider.id
    const providerName = intervention.booking.provider.user.name
    
    if (!providerCommissions.has(providerId)) {
      providerCommissions.set(providerId, {
        name: providerName,
        revenue: 0,
        commission: 0
      })
    }
    
    const current = providerCommissions.get(providerId)!
    current.revenue += revenue
    current.commission += commission
  })

  // Calculer les statistiques du mois précédent pour la croissance
  const lastMonthStart = new Date(startDate.getFullYear(), startDate.getMonth() - 1, 1)
  const lastMonthEnd = new Date(startDate.getFullYear(), startDate.getMonth(), 0)
  
  const lastMonthInterventions = await prisma.intervention.count({
    where: {
      isCompleted: true,
      completedAt: {
        gte: lastMonthStart,
        lte: lastMonthEnd
      }
    }
  })

  const currentMonthInterventions = await prisma.intervention.count({
    where: {
      isCompleted: true,
      completedAt: {
        gte: new Date(endDate.getFullYear(), endDate.getMonth(), 1),
        lte: endDate
      }
    }
  })

  const revenueGrowth = lastMonthInterventions > 0 
    ? ((currentMonthInterventions - lastMonthInterventions) / lastMonthInterventions) * 100 
    : 0

  // Statistiques des transactions (paiements)
  const allPayments = await prisma.payment.findMany({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    }
  })

  const transactionStats = {
    total: allPayments.length,
    monthly: allPayments.filter(p => {
      const paymentDate = new Date(p.createdAt)
      const currentMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 1)
      return paymentDate >= currentMonth && paymentDate <= endDate
    }).length,
    completed: allPayments.filter(p => p.status === 'PAID').length,
    pending: allPayments.filter(p => p.status === 'PENDING').length,
    failed: allPayments.filter(p => p.status === 'FAILED').length
  }

  // Statistiques des utilisateurs
  const allUsers = await prisma.user.findMany({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    },
    include: {
      provider: true,
      client: true
    }
  })

  const currentMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 1)
  const newUsersThisMonth = allUsers.filter(u => 
    new Date(u.createdAt) >= currentMonth && new Date(u.createdAt) <= endDate
  ).length

  const userStats = {
    total: allUsers.length,
    activeProviders: allUsers.filter(u => u.provider && u.provider.isActive).length,
    activeClients: allUsers.filter(u => u.client).length,
    newThisMonth: newUsersThisMonth
  }

  // Top prestataires par commission
  const topProviders = Array.from(providerCommissions.entries())
    .map(([id, data]) => ({
      id,
      name: data.name,
      commission: data.commission,
      revenue: data.revenue
    }))
    .sort((a, b) => b.commission - a.commission)
    .slice(0, 10)

  const monthlyRevenue = completedInterventions
    .filter(i => {
      const completedDate = new Date(i.completedAt!)
      return completedDate >= currentMonth && completedDate <= endDate
    })
    .reduce((sum, i) => {
      const duration = i.actualDuration || i.booking.duration
      const hourlyRate = i.booking.service.basePrice
      return sum + (duration / 60) * hourlyRate
    }, 0)

  return {
    revenue: {
      total: totalRevenue,
      monthly: monthlyRevenue,
      growth: revenueGrowth,
      commission: totalCommission
    },
    transactions: transactionStats,
    users: userStats,
    commissions: {
      total: totalCommission,
      monthly: totalCommission * (monthlyRevenue / totalRevenue),
      averageRate: 10.0, // 10% fixe
      topProviders
    }
  }
}