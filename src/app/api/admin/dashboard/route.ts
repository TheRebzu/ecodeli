import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { z } from 'zod'
import { handleApiError, createError } from '@/lib/errors'

const dashboardQuerySchema = z.object({
  period: z.enum(['7d', '30d', '90d', '1y']).default('30d'),
  includeDetails: z.boolean().default(false)
})

// GET - Dashboard administrateur avec KPIs et m�triques
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== 'ADMIN') {
      return handleApiError(createError.auth.insufficientPermissions())
    }

    const { searchParams } = new URL(request.url)
    const { period, includeDetails } = dashboardQuerySchema.parse({
      period: searchParams.get('period') || '30d',
      includeDetails: searchParams.get('includeDetails') === 'true'
    })

    // Calculer les dates selon la p�riode
    const periodDays = parseInt(period.replace(/[^\d]/g, ''))
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - periodDays)

    // R�cup�rer les KPIs principaux
    const [
      userStats,
      deliveryStats,
      financialStats,
      platformHealth,
      recentActivity
    ] = await Promise.all([
      getUserStats(startDate),
      getDeliveryStats(startDate),
      getFinancialStats(startDate),
      getPlatformHealth(),
      includeDetails ? getRecentActivity() : null
    ])

    // Calculer les tendances (comparaison avec la p�riode pr�c�dente)
    const previousPeriodStart = new Date(startDate)
    previousPeriodStart.setDate(previousPeriodStart.getDate() - periodDays)
    const trends = await calculateTrends(previousPeriodStart, startDate)

    return NextResponse.json({
      success: true,
      data: {
        period,
        lastUpdated: new Date().toISOString(),
        kpis: {
          users: userStats,
          deliveries: deliveryStats,
          financial: financialStats,
          platform: platformHealth
        },
        trends,
        ...(includeDetails && { recentActivity })
      }
    })

  } catch (error) {
    return handleApiError(error)
  }
}

// Statistiques utilisateurs
async function getUserStats(startDate: Date) {
  const [
    totalUsers,
    newUsers,
    activeUsers,
    usersByRole,
    pendingValidations
  ] = await Promise.all([
    // Total utilisateurs
    prisma.user.count(),
    
    // Nouveaux utilisateurs p�riode
    prisma.user.count({
      where: {
        createdAt: { gte: startDate }
      }
    }),
    
    // Utilisateurs actifs (ayant une activit� r�cente)
    prisma.user.count({
      where: {
        lastLoginAt: { gte: startDate }
      }
    }),
    
    // R�partition par r�le
    prisma.user.groupBy({
      by: ['role'],
      _count: { id: true }
    }),
    
    // Validations en attente
    prisma.documentValidation.count({
      where: {
        status: 'PENDING'
      }
    })
  ])

  return {
    total: totalUsers,
    new: newUsers,
    active: activeUsers,
    byRole: usersByRole.reduce((acc, item) => {
      acc[item.role] = item._count.id
      return acc
    }, {} as Record<string, number>),
    pendingValidations
  }
}

// Statistiques livraisons
async function getDeliveryStats(startDate: Date) {
  const [
    totalDeliveries,
    completedDeliveries,
    activeDeliveries,
    deliveriesByStatus,
    averageDeliveryTime,
    successRate
  ] = await Promise.all([
    // Total livraisons p�riode
    prisma.delivery.count({
      where: {
        createdAt: { gte: startDate }
      }
    }),
    
    // Livraisons compl�t�es
    prisma.delivery.count({
      where: {
        status: 'DELIVERED',
        updatedAt: { gte: startDate }
      }
    }),
    
    // Livraisons actives
    prisma.delivery.count({
      where: {
        status: { in: ['ACCEPTED', 'IN_PROGRESS'] }
      }
    }),
    
    // R�partition par statut
    prisma.delivery.groupBy({
      by: ['status'],
      where: {
        createdAt: { gte: startDate }
      },
      _count: { id: true }
    }),
    
    // Temps moyen de livraison
    prisma.delivery.aggregate({
      where: {
        status: 'DELIVERED',
        deliveredAt: { gte: startDate }
      },
      _avg: {
        deliveryDuration: true
      }
    }),
    
    // Taux de succ�s
    prisma.delivery.aggregate({
      where: {
        createdAt: { gte: startDate },
        status: { in: ['DELIVERED', 'CANCELLED'] }
      },
      _count: { id: true }
    }).then(async result => {
      const delivered = await prisma.delivery.count({
        where: {
          status: 'DELIVERED',
          createdAt: { gte: startDate }
        }
      })
      return result._count.id > 0 ? (delivered / result._count.id) * 100 : 0
    })
  ])

  return {
    total: totalDeliveries,
    completed: completedDeliveries,
    active: activeDeliveries,
    byStatus: deliveriesByStatus.reduce((acc, item) => {
      acc[item.status] = item._count.id
      return acc
    }, {} as Record<string, number>),
    averageTime: averageDeliveryTime._avg.deliveryDuration || 0,
    successRate: Math.round(successRate)
  }
}

// Statistiques financi�res
async function getFinancialStats(startDate: Date) {
  const [
    totalRevenue,
    commissionsEarned,
    paymentVolume,
    refunds,
    topEarners,
    paymentMethods
  ] = await Promise.all([
    // Revenus totaux
    prisma.payment.aggregate({
      where: {
        status: 'COMPLETED',
        paidAt: { gte: startDate }
      },
      _sum: { amount: true }
    }),
    
    // Commissions gagn�es
    prisma.payment.aggregate({
      where: {
        status: 'COMPLETED',
        paidAt: { gte: startDate }
      },
      _sum: { platformFee: true }
    }),
    
    // Volume de paiements
    prisma.payment.count({
      where: {
        status: 'COMPLETED',
        paidAt: { gte: startDate }
      }
    }),
    
    // Remboursements
    prisma.payment.aggregate({
      where: {
        status: 'REFUNDED',
        updatedAt: { gte: startDate }
      },
      _sum: { amount: true },
      _count: { id: true }
    }),
    
    // Top prestataires par revenus
    prisma.monthlyProviderInvoice.findMany({
      where: {
        invoiceDate: { gte: startDate }
      },
      include: {
        provider: {
          select: { firstName: true, lastName: true }
        }
      },
      orderBy: { totalAmount: 'desc' },
      take: 5
    }),
    
    // R�partition des m�thodes de paiement
    prisma.payment.groupBy({
      by: ['paymentMethod'],
      where: {
        status: 'COMPLETED',
        paidAt: { gte: startDate }
      },
      _count: { id: true },
      _sum: { amount: true }
    })
  ])

  return {
    revenue: totalRevenue._sum.amount || 0,
    commissions: commissionsEarned._sum.platformFee || 0,
    volume: paymentVolume,
    refunds: {
      amount: refunds._sum.amount || 0,
      count: refunds._count.id || 0
    },
    topEarners: topEarners.map(invoice => ({
      name: `${invoice.provider.firstName} ${invoice.provider.lastName}`,
      amount: invoice.totalAmount
    })),
    paymentMethods: paymentMethods.reduce((acc, method) => {
      acc[method.paymentMethod] = {
        count: method._count.id,
        amount: method._sum.amount || 0
      }
      return acc
    }, {} as Record<string, any>)
  }
}

// Sant� de la plateforme
async function getPlatformHealth() {
  const [
    systemErrors,
    apiResponse,
    pendingIssues,
    serverLoad
  ] = await Promise.all([
    // Erreurs syst�me derni�res 24h
    prisma.auditLog.count({
      where: {
        level: 'ERROR',
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      }
    }),
    
    // Temps de r�ponse API moyen (simul�)
    Promise.resolve(Math.random() * 200 + 50),
    
    // Issues en attente
    prisma.supportTicket.count({
      where: {
        status: { in: ['OPEN', 'IN_PROGRESS'] }
      }
    }),
    
    // Charge serveur (simul�e)
    Promise.resolve({
      cpu: Math.random() * 30 + 20,
      memory: Math.random() * 40 + 30,
      disk: Math.random() * 20 + 15
    })
  ])

  return {
    status: systemErrors < 10 ? 'healthy' : systemErrors < 50 ? 'warning' : 'critical',
    errors24h: systemErrors,
    avgApiResponse: Math.round(apiResponse),
    pendingIssues,
    serverLoad
  }
}

// Activit� r�cente
async function getRecentActivity() {
  const recentLogs = await prisma.auditLog.findMany({
    where: {
      level: { in: ['INFO', 'WARN', 'ERROR'] }
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: {
      user: {
        select: { firstName: true, lastName: true, role: true }
      }
    }
  })

  return recentLogs.map(log => ({
    id: log.id,
    timestamp: log.createdAt,
    level: log.level,
    action: log.action,
    description: log.description,
    user: log.user ? {
      name: `${log.user.firstName} ${log.user.lastName}`,
      role: log.user.role
    } : null,
    metadata: log.metadata
  }))
}

// Calcul des tendances
async function calculateTrends(previousStart: Date, currentStart: Date) {
  const [currentPeriod, previousPeriod] = await Promise.all([
    getUserStats(currentStart),
    getUserStats(previousStart)
  ])

  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0
    return Math.round(((current - previous) / previous) * 100)
  }

  return {
    users: {
      total: calculateChange(currentPeriod.total, previousPeriod.total),
      new: calculateChange(currentPeriod.new, previousPeriod.new),
      active: calculateChange(currentPeriod.active, previousPeriod.active)
    }
  }
}