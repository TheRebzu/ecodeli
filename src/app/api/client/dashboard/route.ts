import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { handleApiError } from '@/lib/utils/api-response'

// GET - Dashboard complet du client
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const client = await prisma.client.findUnique({
      where: { userId: session.user.id },
      include: {
        profile: true,
        subscription: true,
        announcements: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: {
            deliveries: {
              include: {
                deliverer: {
                  select: { profile: { select: { firstName: true, lastName: true } } }
                }
              }
            }
          }
        },
        bookings: {
          where: {
            scheduledAt: { gte: new Date() }
          },
          orderBy: { scheduledAt: 'asc' },
          take: 3,
          include: {
            service: {
              include: {
                provider: {
                  select: { profile: { select: { firstName: true, lastName: true } } }
                }
              }
            }
          }
        },
        storageBoxRentals: {
          where: {
            endDate: { gte: new Date() }
          },
          include: {
            storageBox: {
              include: { warehouse: true }
            }
          }
        }
      }
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Statistiques générales
    const stats = await calculateClientStats(client.id)
    
    // Notifications non lues
    const unreadNotifications = await prisma.notification.count({
      where: { userId: session.user.id, isRead: false }
    })

    // Livraisons actives
    const activeDeliveries = await prisma.delivery.findMany({
      where: {
        announcement: { clientId: client.id },
        status: { in: ['ACCEPTED', 'IN_PROGRESS'] }
      },
      include: {
        announcement: true,
        deliverer: {
          select: { profile: { select: { firstName: true, lastName: true } } }
        }
      }
    })

    // Recommandations personnalisées
    const recommendations = await getPersonalizedRecommendations(client)

    // Résumé des économies
    const savingsData = await calculateSavings(client)

    // Tutoriel requis ?
    const tutorialRequired = !client.tutorialCompleted && client.user?.isFirstLogin

    return NextResponse.json({
      profile: {
        id: client.id,
        name: `${client.profile?.firstName} ${client.profile?.lastName}`,
        email: client.user?.email,
        avatar: client.profile?.avatar,
        memberSince: client.createdAt,
        subscriptionPlan: client.subscriptionPlan || 'FREE',
        completionScore: calculateProfileCompleteness(client)
      },
      stats: {
        ...stats,
        unreadNotifications,
        activeDeliveries: activeDeliveries.length
      },
      recentActivities: {
        announcements: client.announcements.map(announcement => ({
          ...announcement,
          hasActiveDelivery: announcement.deliveries.some(d => 
            ['ACCEPTED', 'IN_PROGRESS'].includes(d.status)
          )
        })),
        upcomingBookings: client.bookings.map(booking => ({
          ...booking,
          provider: booking.service.provider.profile,
          isToday: isToday(booking.scheduledAt),
          timeUntil: getTimeUntil(booking.scheduledAt)
        })),
        activeBoxes: client.storageBoxRentals.map(rental => ({
          ...rental,
          warehouse: rental.storageBox.warehouse,
          daysRemaining: Math.ceil(
            (rental.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          )
        }))
      },
      quickActions: [
        {
          id: 'create_announcement',
          title: 'Créer une annonce',
          description: 'Déposer une nouvelle demande de livraison',
          icon: 'plus',
          priority: tutorialRequired ? 'HIGH' : 'MEDIUM'
        },
        {
          id: 'browse_services',
          title: 'Services à domicile',
          description: 'Réserver un service à la personne',
          icon: 'home',
          priority: 'MEDIUM'
        },
        {
          id: 'rent_storage',
          title: 'Box de stockage',
          description: 'Louer une box temporaire',
          icon: 'box',
          priority: 'LOW'
        }
      ],
      recommendations,
      savingsData,
      tutorialRequired,
      subscription: client.subscription ? {
        plan: client.subscriptionPlan,
        status: client.subscription.status,
        renewsAt: client.subscription.currentPeriodEnd,
        features: getSubscriptionFeatures(client.subscriptionPlan || 'FREE')
      } : null
    })

  } catch (error) {
    return handleApiError(error, 'fetching client dashboard')
  }
}

// Calculer les statistiques du client
async function calculateClientStats(clientId: string) {
  const [
    totalAnnouncements,
    completedDeliveries,
    totalBookings,
    completedBookings,
    monthlyAnnouncements
  ] = await Promise.all([
    prisma.announcement.count({ where: { clientId } }),
    prisma.delivery.count({
      where: {
        announcement: { clientId },
        status: 'DELIVERED'
      }
    }),
    prisma.booking.count({ where: { clientId } }),
    prisma.booking.count({
      where: { clientId, status: 'COMPLETED' }
    }),
    prisma.announcement.count({
      where: {
        clientId,
        createdAt: { gte: getFirstDayOfMonth() }
      }
    })
  ])

  return {
    totalAnnouncements,
    completedDeliveries,
    totalBookings,
    completedBookings,
    monthlyAnnouncements,
    successRate: totalAnnouncements > 0 
      ? Math.round((completedDeliveries / totalAnnouncements) * 100) 
      : 0
  }
}

// Recommandations personnalisées
async function getPersonalizedRecommendations(client: any) {
  const recommendations = []

  // Si pas d'abonnement payant
  if (client.subscriptionPlan === 'FREE') {
    recommendations.push({
      type: 'UPGRADE_SUBSCRIPTION',
      title: 'Économisez avec un abonnement',
      description: 'Obtenez jusqu\'à 9% de réduction sur tous vos envois',
      action: 'Voir les plans',
      priority: 'MEDIUM'
    })
  }

  // Si beaucoup d'annonces mais peu de livraisons
  const announcements = client.announcements.length
  const completedDeliveries = client.announcements.filter(a => 
    a.deliveries.some(d => d.status === 'DELIVERED')
  ).length

  if (announcements > 5 && completedDeliveries / announcements < 0.3) {
    recommendations.push({
      type: 'OPTIMIZE_ANNOUNCEMENTS',
      title: 'Optimisez vos annonces',
      description: 'Améliorez vos prix et descriptions pour attirer plus de livreurs',
      action: 'Conseils',
      priority: 'HIGH'
    })
  }

  // Si pas de services réservés
  if (client.bookings.length === 0) {
    recommendations.push({
      type: 'TRY_SERVICES',
      title: 'Découvrez nos services',
      description: 'Ménage, jardinage, bricolage... simplifiez-vous la vie',
      action: 'Explorer',
      priority: 'LOW'
    })
  }

  return recommendations
}

// Calculer les économies
async function calculateSavings(client: any) {
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

  const totalSavings = totalSpent._sum.amount 
    ? (totalSpent._sum.amount * discount) / 100 
    : 0

  return {
    currentDiscount: discount,
    totalSavings: Math.round(totalSavings * 100) / 100,
    monthlySubscription: subscriptionPlan === 'FREE' ? 0 : 
      subscriptionPlan === 'STARTER' ? 9.90 : 19.99
  }
}

// Calculer complétude du profil
function calculateProfileCompleteness(client: any): number {
  let score = 0
  const checks = [
    client.profile?.firstName,
    client.profile?.lastName,
    client.profile?.phone,
    client.profile?.address,
    client.profile?.avatar,
    client.tutorialCompleted
  ]
  
  score = (checks.filter(Boolean).length / checks.length) * 100
  return Math.round(score)
}

// Fonctions utilitaires
function getFirstDayOfMonth(): Date {
  const date = new Date()
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function isToday(date: Date): boolean {
  const today = new Date()
  return date.toDateString() === today.toDateString()
}

function getTimeUntil(date: Date): string {
  const now = new Date()
  const diff = date.getTime() - now.getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(hours / 24)
  
  if (days > 0) return `Dans ${days} jour${days > 1 ? 's' : ''}`
  if (hours > 0) return `Dans ${hours}h`
  return 'Bientôt'
}

function getSubscriptionFeatures(plan: string) {
  const features = {
    FREE: ['5 annonces/mois', 'Matching standard', 'Support email'],
    STARTER: ['20 annonces/mois', '5% réduction', 'Assurance 115€', 'Support prioritaire'],
    PREMIUM: ['Annonces illimitées', '9% réduction', 'Assurance 3000€', 'Support 24/7']
  }
  return features[plan as keyof typeof features] || features.FREE
} 