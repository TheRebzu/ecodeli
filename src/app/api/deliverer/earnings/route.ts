import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { handleApiError } from '@/lib/utils/api-response'

// GET - Récupérer les gains et statistiques du livreur
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'DELIVERER') {
      return NextResponse.json({ error: 'Forbidden - Deliverer access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'month' // month, week, year, all
    const year = searchParams.get('year')
    const month = searchParams.get('month')

    // Récupérer le profil livreur
    const deliverer = await prisma.deliverer.findUnique({
      where: { userId: session.user.id },
      include: {
        wallet: true
      }
    })

    if (!deliverer) {
      return NextResponse.json({ error: 'Deliverer profile not found' }, { status: 404 })
    }

    // Définir la période de calcul
    let startDate: Date
    let endDate: Date
    const now = new Date()

    switch (period) {
      case 'week':
        const startOfWeek = new Date(now)
        startOfWeek.setDate(now.getDate() - now.getDay())
        startOfWeek.setHours(0, 0, 0, 0)
        startDate = startOfWeek
        endDate = new Date(startOfWeek)
        endDate.setDate(startOfWeek.getDate() + 6)
        endDate.setHours(23, 59, 59, 999)
        break
      case 'month':
        if (year && month) {
          startDate = new Date(parseInt(year), parseInt(month) - 1, 1)
          endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999)
        } else {
          startDate = new Date(now.getFullYear(), now.getMonth(), 1)
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
        }
        break
      case 'year':
        const targetYear = year ? parseInt(year) : now.getFullYear()
        startDate = new Date(targetYear, 0, 1)
        endDate = new Date(targetYear, 11, 31, 23, 59, 59, 999)
        break
      case 'all':
        startDate = new Date(0)
        endDate = now
        break
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
    }

    // Récupérer les livraisons complétées dans la période
    const completedDeliveries = await prisma.delivery.findMany({
      where: {
        delivererId: deliverer.id,
        status: 'DELIVERED',
        completedAt: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        announcement: {
          select: {
            title: true,
            type: true,
            price: true,
            pickupLocation: true,
            deliveryLocation: true
          }
        },
        payment: {
          select: {
            amount: true,
            status: true,
            createdAt: true
          }
        }
      },
      orderBy: {
        completedAt: 'desc'
      }
    })

    // Récupérer les transactions du portefeuille dans la période
    const walletTransactions = await prisma.walletTransaction.findMany({
      where: {
        walletId: deliverer.wallet?.id,
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Calculer les statistiques de gains
    const earnings = {
      totalEarnings: 0,
      platformFee: 0,
      netEarnings: 0,
      totalDeliveries: completedDeliveries.length,
      averageEarningPerDelivery: 0,
      totalDistance: 0,
      averageRating: 0,
      bonuses: 0
    }

    const dailyEarnings: { [key: string]: number } = {}
    const monthlyEarnings: { [key: string]: number } = {}
    const deliveryTypeStats: { [key: string]: { count: number, earnings: number } } = {}

    completedDeliveries.forEach(delivery => {
      const basePrice = parseFloat(delivery.announcement.price.toString())
      const delivererShare = basePrice * 0.85 // 85% pour le livreur, 15% pour la plateforme
      const platformFee = basePrice * 0.15

      earnings.totalEarnings += basePrice
      earnings.platformFee += platformFee
      earnings.netEarnings += delivererShare

      // Statistiques par jour
      const dayKey = delivery.completedAt?.toISOString().split('T')[0] || ''
      if (dayKey) {
        dailyEarnings[dayKey] = (dailyEarnings[dayKey] || 0) + delivererShare
      }

      // Statistiques par mois
      const monthKey = delivery.completedAt?.toISOString().substring(0, 7) || '' // YYYY-MM
      if (monthKey) {
        monthlyEarnings[monthKey] = (monthlyEarnings[monthKey] || 0) + delivererShare
      }

      // Statistiques par type de livraison
      const type = delivery.announcement.type
      if (!deliveryTypeStats[type]) {
        deliveryTypeStats[type] = { count: 0, earnings: 0 }
      }
      deliveryTypeStats[type].count++
      deliveryTypeStats[type].earnings += delivererShare

      // Estimation de distance (à implémenter avec service de géolocalisation)
      earnings.totalDistance += 10 // Placeholder: 10km par livraison
    })

    // Calculer la moyenne des gains par livraison
    if (earnings.totalDeliveries > 0) {
      earnings.averageEarningPerDelivery = earnings.netEarnings / earnings.totalDeliveries
    }

    // Calculer les bonus depuis les transactions du portefeuille
    earnings.bonuses = walletTransactions
      .filter(t => t.type === 'CREDIT' && t.description?.includes('bonus'))
      .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0)

    // Récupérer la note moyenne (à partir des évaluations)
    const ratings = await prisma.rating.findMany({
      where: {
        deliveryId: {
          in: completedDeliveries.map(d => d.id)
        }
      }
    })

    if (ratings.length > 0) {
      earnings.averageRating = ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length
    }

    // Comparaison avec la période précédente
    let previousPeriodStart: Date
    let previousPeriodEnd: Date

    switch (period) {
      case 'week':
        previousPeriodStart = new Date(startDate)
        previousPeriodStart.setDate(startDate.getDate() - 7)
        previousPeriodEnd = new Date(endDate)
        previousPeriodEnd.setDate(endDate.getDate() - 7)
        break
      case 'month':
        previousPeriodStart = new Date(startDate)
        previousPeriodStart.setMonth(startDate.getMonth() - 1)
        previousPeriodEnd = new Date(endDate)
        previousPeriodEnd.setMonth(endDate.getMonth() - 1)
        break
      case 'year':
        previousPeriodStart = new Date(startDate)
        previousPeriodStart.setFullYear(startDate.getFullYear() - 1)
        previousPeriodEnd = new Date(endDate)
        previousPeriodEnd.setFullYear(endDate.getFullYear() - 1)
        break
      default:
        previousPeriodStart = startDate
        previousPeriodEnd = endDate
    }

    const previousDeliveries = await prisma.delivery.count({
      where: {
        delivererId: deliverer.id,
        status: 'DELIVERED',
        completedAt: {
          gte: previousPeriodStart,
          lte: previousPeriodEnd
        }
      }
    })

    const previousEarnings = await prisma.delivery.findMany({
      where: {
        delivererId: deliverer.id,
        status: 'DELIVERED',
        completedAt: {
          gte: previousPeriodStart,
          lte: previousPeriodEnd
        }
      },
      include: {
        announcement: {
          select: {
            price: true
          }
        }
      }
    })

    const previousNetEarnings = previousEarnings.reduce((sum, delivery) => {
      return sum + (parseFloat(delivery.announcement.price.toString()) * 0.85)
    }, 0)

    const comparison = {
      deliveriesChange: earnings.totalDeliveries - previousDeliveries,
      earningsChange: earnings.netEarnings - previousNetEarnings,
      deliveriesChangePercent: previousDeliveries > 0 ? 
        ((earnings.totalDeliveries - previousDeliveries) / previousDeliveries) * 100 : 0,
      earningsChangePercent: previousNetEarnings > 0 ? 
        ((earnings.netEarnings - previousNetEarnings) / previousNetEarnings) * 100 : 0
    }

    // Objectifs et défis
    const goals = {
      monthlyTarget: 1000, // Objectif mensuel par défaut
      weeklyTarget: 250,   // Objectif hebdomadaire par défaut
      currentProgress: earnings.netEarnings,
      progressPercent: 0
    }

    if (period === 'month') {
      goals.progressPercent = (earnings.netEarnings / goals.monthlyTarget) * 100
    } else if (period === 'week') {
      goals.progressPercent = (earnings.netEarnings / goals.weeklyTarget) * 100
    }

    return NextResponse.json({
      period: {
        start: startDate,
        end: endDate,
        type: period
      },
      earnings,
      dailyEarnings,
      monthlyEarnings,
      deliveryTypeStats,
      comparison,
      goals,
      wallet: {
        balance: deliverer.wallet?.balance || 0,
        pendingAmount: deliverer.wallet?.pendingAmount || 0,
        totalWithdrawn: walletTransactions
          .filter(t => t.type === 'DEBIT' && t.description?.includes('withdrawal'))
          .reduce((sum, t) => sum + Math.abs(parseFloat(t.amount.toString())), 0)
      },
      recentDeliveries: completedDeliveries.slice(0, 10), // Les 10 dernières livraisons
      transactions: walletTransactions.slice(0, 20) // Les 20 dernières transactions
    })

  } catch (error) {
    return handleApiError(error, 'fetching deliverer earnings')
  }
}
