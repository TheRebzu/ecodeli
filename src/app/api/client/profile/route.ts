import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { handleApiError } from '@/lib/utils/api-response'

// Schema pour mise à jour du profil
const updateProfileSchema = z.object({
  firstName: z.string().min(2).max(50).optional(),
  lastName: z.string().min(2).max(50).optional(),
  phone: z.string().min(10).max(15).optional(),
  address: z.string().min(5).max(200).optional(),
  city: z.string().min(2).max(100).optional(),
  postalCode: z.string().min(5).max(10).optional(),
  country: z.string().min(2).max(100).optional(),
  dateOfBirth: z.string().datetime().optional(),
  preferences: z.object({
    notifications: z.object({
      email: z.boolean().default(true),
      sms: z.boolean().default(false),
      push: z.boolean().default(true),
      marketing: z.boolean().default(false)
    }).optional(),
    delivery: z.object({
      preferredTimeSlot: z.enum(['MORNING', 'AFTERNOON', 'EVENING', 'ANYTIME']).default('ANYTIME'),
      allowWeekend: z.boolean().default(true),
      requireSignature: z.boolean().default(false),
      specialInstructions: z.string().max(200).optional()
    }).optional(),
    privacy: z.object({
      shareLocation: z.boolean().default(true),
      shareProfile: z.boolean().default(true),
      allowReviews: z.boolean().default(true)
    }).optional()
  }).optional(),
  emergencyContact: z.object({
    name: z.string().min(2),
    phone: z.string().min(10),
    relation: z.string().min(2)
  }).optional()
})

// GET - Récupérer le profil complet avec tableau de bord
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Récupérer le profil client complet
    const client = await prisma.client.findUnique({
      where: { userId: session.user.id },
      include: {
        profile: true,
        subscription: true,
        announcements: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            deliveries: {
              select: { status: true, deliverer: { select: { profile: { select: { firstName: true } } } } }
            }
          }
        },
        bookings: {
          take: 5,
          orderBy: { scheduledAt: 'desc' },
          include: {
            service: {
              select: { name: true, category: true }
            }
          }
        },
        storageBoxRentals: {
          where: { status: 'ACTIVE' },
          include: {
            storageBox: {
              include: { warehouse: { select: { name: true, city: true } } }
            }
          }
        },
        reviews: {
          take: 3,
          orderBy: { createdAt: 'desc' },
          include: {
            delivery: { select: { id: true } },
            booking: { select: { id: true } }
          }
        }
      }
    })

    if (!client) {
      return NextResponse.json({ error: 'Client profile not found' }, { status: 404 })
    }

    // Calculer les statistiques du tableau de bord
    const stats = await calculateDashboardStats(client.id, session.user.id)

    // Récupérer les activités récentes
    const recentActivities = await getRecentActivities(session.user.id)

    // Générer les recommandations personnalisées
    const recommendations = await generatePersonalizedRecommendations(client)

    // Calculer le score de profil
    const profileScore = calculateProfileCompleteness(client)

    return NextResponse.json({
      profile: {
        ...client.profile,
        subscriptionPlan: client.subscriptionPlan,
        memberSince: client.createdAt,
        profileScore,
        preferences: client.preferences || getDefaultPreferences(),
        emergencyContact: client.emergencyContact
      },
      subscription: client.subscription ? {
        plan: client.subscriptionPlan,
        status: client.subscription.status,
        currentPeriodEnd: client.subscription.currentPeriodEnd,
        cancelAtPeriodEnd: client.subscription.cancelAtPeriodEnd
      } : null,
      dashboard: {
        stats,
        recentAnnouncements: client.announcements.map(announcement => ({
          ...announcement,
          hasActiveDelivery: announcement.deliveries.some(d => ['ACCEPTED', 'IN_PROGRESS'].includes(d.status))
        })),
        recentBookings: client.bookings.map(booking => ({
          ...booking,
          isUpcoming: new Date(booking.scheduledAt) > new Date(),
          timeUntil: getTimeUntil(booking.scheduledAt)
        })),
        activeStorageBoxes: client.storageBoxRentals.map(rental => ({
          ...rental,
          daysRemaining: Math.ceil((rental.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
          warehouse: rental.storageBox.warehouse
        })),
        recentReviews: client.reviews
      },
      recommendations,
      recentActivities,
      achievements: await getClientAchievements(client.id),
      notifications: await getUnreadNotifications(session.user.id)
    })

  } catch (error) {
    return handleApiError(error, 'fetching client profile')
  }
}

// PUT - Mettre à jour le profil
export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = updateProfileSchema.parse(body)

    const client = await prisma.client.findUnique({
      where: { userId: session.user.id },
      include: { profile: true }
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Séparer les données du profil et du client
    const { preferences, emergencyContact, ...profileData } = validatedData

    // Mettre à jour le profil utilisateur
    const updatedProfile = await prisma.profile.update({
      where: { userId: session.user.id },
      data: profileData
    })

    // Mettre à jour les données spécifiques au client
    const clientUpdateData: any = {}
    if (preferences) clientUpdateData.preferences = preferences
    if (emergencyContact) clientUpdateData.emergencyContact = emergencyContact

    if (Object.keys(clientUpdateData).length > 0) {
      await prisma.client.update({
        where: { id: client.id },
        data: clientUpdateData
      })
    }

    // Log de l'activité
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'PROFILE_UPDATED',
        details: {
          updatedFields: Object.keys(validatedData),
          timestamp: new Date()
        },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown'
      }
    })

    // Calculer le nouveau score de profil
    const updatedClient = await prisma.client.findUnique({
      where: { id: client.id },
      include: { profile: true }
    })

    const newProfileScore = calculateProfileCompleteness(updatedClient!)

    return NextResponse.json({
      success: true,
      message: 'Profil mis à jour avec succès',
      profile: updatedProfile,
      profileScore: newProfileScore,
      improvements: getProfileImprovements(updatedClient!)
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return handleApiError(error, 'updating profile')
  }
}

// Fonctions utilitaires
async function calculateDashboardStats(clientId: string, userId: string) {
  const currentMonth = new Date()
  currentMonth.setDate(1)
  currentMonth.setHours(0, 0, 0, 0)

  const [
    totalAnnouncements,
    monthlyAnnouncements,
    totalBookings,
    monthlyBookings,
    totalSpent,
    monthlySpent,
    activeDeliveries,
    completedDeliveries
  ] = await Promise.all([
    prisma.announcement.count({ where: { clientId } }),
    prisma.announcement.count({ where: { clientId, createdAt: { gte: currentMonth } } }),
    prisma.booking.count({ where: { clientId } }),
    prisma.booking.count({ where: { clientId, createdAt: { gte: currentMonth } } }),
    prisma.payment.aggregate({ 
      where: { userId, status: 'COMPLETED' },
      _sum: { amount: true }
    }),
    prisma.payment.aggregate({
      where: { userId, status: 'COMPLETED', createdAt: { gte: currentMonth } },
      _sum: { amount: true }
    }),
    prisma.delivery.count({
      where: {
        announcement: { clientId },
        status: { in: ['ACCEPTED', 'PICKED_UP', 'IN_TRANSIT'] }
      }
    }),
    prisma.delivery.count({
      where: {
        announcement: { clientId },
        status: 'DELIVERED'
      }
    })
  ])

  return {
    announcements: {
      total: totalAnnouncements,
      monthly: monthlyAnnouncements,
      active: activeDeliveries
    },
    bookings: {
      total: totalBookings,
      monthly: monthlyBookings
    },
    spending: {
      total: totalSpent._sum.amount || 0,
      monthly: monthlySpent._sum.amount || 0,
      average: totalBookings > 0 ? (totalSpent._sum.amount || 0) / totalBookings : 0
    },
    deliveries: {
      active: activeDeliveries,
      completed: completedDeliveries,
      successRate: completedDeliveries > 0 ? (completedDeliveries / (completedDeliveries + activeDeliveries)) * 100 : 0
    }
  }
}

async function getRecentActivities(userId: string) {
  return await prisma.activityLog.findMany({
    where: { userId },
    take: 10,
    orderBy: { createdAt: 'desc' },
    select: {
      action: true,
      details: true,
      createdAt: true
    }
  })
}

async function generatePersonalizedRecommendations(client: any) {
  const recommendations = []

  // Basé sur l'abonnement
  if (client.subscriptionPlan === 'FREE') {
    recommendations.push({
      type: 'UPGRADE',
      title: 'Passez au plan Starter',
      description: 'Économisez 5% sur vos livraisons et bénéficiez d\'une assurance 115€',
      action: 'upgrade_subscription',
      priority: 'HIGH'
    })
  }

  // Basé sur l'activité
  const monthlyAnnouncements = await prisma.announcement.count({
    where: {
      clientId: client.id,
      createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    }
  })

  if (monthlyAnnouncements === 0) {
    recommendations.push({
      type: 'ENGAGEMENT',
      title: 'Créez votre première annonce',
      description: 'Commencez à utiliser EcoDeli pour vos livraisons',
      action: 'create_announcement',
      priority: 'MEDIUM'
    })
  }

  // Basé sur les box de stockage
  const hasStorageBoxes = await prisma.storageBoxRental.count({
    where: { clientId: client.id, status: 'ACTIVE' }
  })

  if (hasStorageBoxes === 0 && client.subscriptionPlan !== 'FREE') {
    recommendations.push({
      type: 'SERVICE',
      title: 'Découvrez nos box de stockage',
      description: 'Stockez temporairement vos biens en toute sécurité',
      action: 'explore_storage',
      priority: 'LOW'
    })
  }

  return recommendations
}

function calculateProfileCompleteness(client: any): number {
  let score = 0
  const maxScore = 100

  // Informations de base (40 points)
  if (client.profile?.firstName) score += 10
  if (client.profile?.lastName) score += 10
  if (client.profile?.phone) score += 10
  if (client.profile?.address) score += 10

  // Préférences (30 points)
  if (client.preferences?.notifications) score += 10
  if (client.preferences?.delivery) score += 10
  if (client.preferences?.privacy) score += 10

  // Contact d'urgence (20 points)
  if (client.emergencyContact) score += 20

  // Avatar (10 points)
  if (client.profile?.avatar) score += 10

  return Math.round((score / maxScore) * 100)
}

function getDefaultPreferences() {
  return {
    notifications: {
      email: true,
      sms: false,
      push: true,
      marketing: false
    },
    delivery: {
      preferredTimeSlot: 'ANYTIME',
      allowWeekend: true,
      requireSignature: false
    },
    privacy: {
      shareLocation: true,
      shareProfile: true,
      allowReviews: true
    }
  }
}

function getProfileImprovements(client: any): string[] {
  const improvements = []

  if (!client.profile?.phone) improvements.push('Ajoutez votre numéro de téléphone')
  if (!client.profile?.address) improvements.push('Complétez votre adresse')
  if (!client.emergencyContact) improvements.push('Définissez un contact d\'urgence')
  if (!client.profile?.avatar) improvements.push('Ajoutez une photo de profil')

  return improvements
}

function getTimeUntil(date: string | Date): string {
  const now = new Date()
  const target = new Date(date)
  const diffMs = target.getTime() - now.getTime()
  
  if (diffMs < 0) return 'Passé'
  
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffHours / 24)
  
  if (diffDays > 0) return `Dans ${diffDays} jour${diffDays > 1 ? 's' : ''}`
  if (diffHours > 0) return `Dans ${diffHours} heure${diffHours > 1 ? 's' : ''}`
  
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  return `Dans ${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`
}

async function getClientAchievements(clientId: string) {
  const achievements = []

  // Première annonce
  const firstAnnouncement = await prisma.announcement.findFirst({
    where: { clientId },
    orderBy: { createdAt: 'asc' }
  })

  if (firstAnnouncement) {
    achievements.push({
      id: 'first_announcement',
      title: 'Premier pas',
      description: 'Première annonce créée',
      earnedAt: firstAnnouncement.createdAt,
      icon: '🎯'
    })
  }

  // Client fidèle (10 annonces)
  const announcementCount = await prisma.announcement.count({ where: { clientId } })
  if (announcementCount >= 10) {
    achievements.push({
      id: 'loyal_client',
      title: 'Client fidèle',
      description: '10 annonces créées',
      icon: '⭐'
    })
  }

  return achievements
}

async function getUnreadNotifications(userId: string) {
  return await prisma.notification.count({
    where: { userId, read: false }
  })
}