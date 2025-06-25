import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserFromSession } from '@/lib/auth/utils'

/**
 * GET /api/client/dashboard
 * Dashboard client avec vérification tutoriel obligatoire
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromSession(request)
    
    if (!user || user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    // Récupérer profil client complet
    const client = await prisma.client.findUnique({
      where: { userId: user.id },
      include: {
        user: {
          include: {
            profile: true
          }
        },
        announcements: {
          orderBy: { createdAt: 'desc' },
          take: 5
        },
        bookings: {
          orderBy: { createdAt: 'desc' },
          take: 5
        },
        storageBoxes: {
          include: {
            box: {
              include: {
                warehouse: true
              }
            }
          }
        }
      }
    })

    if (!client) {
      return NextResponse.json({ error: 'Profil client introuvable' }, { status: 404 })
    }

    // Vérifier si tutoriel complété (OBLIGATOIRE selon cahier des charges)
    const tutorialStatus = {
      completed: client.tutorialCompleted,
      steps: {
        createAnnouncement: false,
        makeBooking: false,
        viewPayments: false,
        trackDelivery: false
      }
    }

    // Statistiques du tableau de bord
    const stats = await getClientStats(user.id)

    return NextResponse.json({
      client: {
        id: client.id,
        subscriptionPlan: client.subscriptionPlan,
        tutorialCompleted: client.tutorialCompleted,
        profile: client.user.profile
      },
      tutorial: tutorialStatus,
      stats,
      recentAnnouncements: client.announcements,
      recentBookings: client.bookings,
      storageBoxes: client.storageBoxes,
      notifications: await getUnreadNotifications(user.id)
    })

  } catch (error) {
    console.error('Erreur dashboard client:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

/**
 * Statistiques client pour dashboard
 */
async function getClientStats(userId: string) {
  const [announcementsCount, bookingsCount, deliveriesCount, totalSpent] = await Promise.all([
    prisma.announcement.count({ where: { authorId: userId } }),
    prisma.booking.count({ where: { clientId: userId } }),
    prisma.delivery.count({ 
      where: { 
        announcement: { authorId: userId }
      }
    }),
    prisma.payment.aggregate({
      where: { 
        userId,
        status: 'COMPLETED'
      },
      _sum: { amount: true }
    })
  ])

  return {
    announcements: announcementsCount,
    bookings: bookingsCount,
    deliveries: deliveriesCount,
    totalSpent: totalSpent._sum.amount || 0
  }
}

/**
 * Notifications non lues
 */
async function getUnreadNotifications(userId: string) {
  return prisma.notification.findMany({
    where: {
      userId,
      status: 'UNREAD'
    },
    orderBy: { createdAt: 'desc' },
    take: 10
  })
} 