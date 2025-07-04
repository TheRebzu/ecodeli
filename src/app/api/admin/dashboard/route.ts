import { NextRequest, NextResponse } from 'next/server'
import { getUserFromSession } from '@/lib/auth/utils'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromSession(request)
    
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Accès refusé - Rôle ADMIN requis' }, 
        { status: 403 }
      )
    }

    // Récupérer les statistiques générales
    const [
      totalUsers,
      totalAnnouncements,
      totalDeliveries,
      totalPayments,
      pendingValidations,
      activeDeliveries,
      recentUsers,
      recentAnnouncements
    ] = await Promise.all([
      // Total utilisateurs par rôle
      db.user.groupBy({
        by: ['role'],
        _count: { _all: true }
      }),
      
      // Total annonces
      db.announcement.count(),
      
      // Total livraisons
      db.delivery.count(),
      
      // Total paiements
      db.payment.aggregate({
        _sum: { amount: true },
        _count: { _all: true }
      }),
      
      // Validations en attente
      db.user.count({
        where: {
          OR: [
            { role: 'DELIVERER', validationStatus: 'PENDING' },
            { role: 'PROVIDER', validationStatus: 'PENDING' }
          ]
        }
      }),
      
      // Livraisons actives
      db.delivery.count({
        where: {
          OR: [
            { status: 'ACCEPTED' },
            { status: 'IN_TRANSIT' },
            { status: 'PICKED_UP' }
          ]
        }
      }),
      
      // Utilisateurs récents (7 derniers jours)
      db.user.findMany({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        },
        include: {
          profile: true
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      }),
      
      // Annonces récentes
      db.announcement.findMany({
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      })
    ])

    // Formater les statistiques par rôle
    const usersByRole = totalUsers.reduce((acc, item) => {
      acc[item.role] = item._count._all
      return acc
    }, {} as Record<string, number>)

    // Statistiques financières
    const revenue = {
      total: totalPayments._sum.amount || 0,
      transactions: totalPayments._count || 0,
      averageTransaction: totalPayments._count > 0 
        ? (totalPayments._sum.amount || 0) / totalPayments._count 
        : 0
    }

    const dashboardData = {
      stats: {
        users: {
          total: Object.values(usersByRole).reduce((sum, count) => sum + count, 0),
          byRole: {
            clients: usersByRole.CLIENT || 0,
            deliverers: usersByRole.DELIVERER || 0,
            merchants: usersByRole.MERCHANT || 0,
            providers: usersByRole.PROVIDER || 0,
            admins: usersByRole.ADMIN || 0
          }
        },
        platform: {
          totalAnnouncements,
          totalDeliveries,
          activeDeliveries,
          pendingValidations
        },
        financial: {
          totalRevenue: Math.round((revenue.total || 0) * 100) / 100,
          totalTransactions: revenue.transactions,
          averageTransaction: Math.round((revenue.averageTransaction || 0) * 100) / 100
        }
      },
      
      recentActivity: {
        users: recentUsers.map(user => ({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          validationStatus: user.validationStatus,
          createdAt: user.createdAt.toISOString(),
          profile: user.profile ? {
            firstName: user.profile.firstName,
            lastName: user.profile.lastName,
            phone: user.profile.phone
          } : null
        })),
        
        announcements: recentAnnouncements.map(announcement => ({
          id: announcement.id,
          title: announcement.title,
          type: announcement.type,
          status: announcement.status,
          price: announcement.price,
          createdAt: announcement.createdAt.toISOString(),
          author: {
            id: announcement.author.id,
            name: announcement.author.name,
            email: announcement.author.email,
            role: announcement.author.role
          }
        }))
      },
      
      alerts: {
        pendingValidations,
        activeDeliveries,
        systemHealth: 'OK' // TODO: Implémenter vérification système
      }
    }

    return NextResponse.json(dashboardData)

  } catch (error) {
    console.error('❌ [API Admin Dashboard] Erreur:', error)
    return NextResponse.json({
      error: 'Erreur serveur lors de la récupération du dashboard admin',
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    }, { status: 500 })
  }
} 