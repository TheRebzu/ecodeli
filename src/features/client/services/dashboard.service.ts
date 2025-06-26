import { prisma } from '@/lib/db'
import type { 
  ClientDashboardData, 
  ClientStats, 
  AnnouncementSummary,
  BookingSummary,
  StorageBoxSummary,
  DeliverySummary,
  TutorialStatus,
  DashboardNotification,
  QuickAction
} from '../types/dashboard.types'

/**
 * Service de gestion du dashboard client EcoDeli
 * Implémente les exigences Mission 1 - Partie dédiée aux clients
 */
export class ClientDashboardService {
  
  /**
   * Récupérer toutes les données du dashboard client
   */
  async getDashboardData(userId: string): Promise<ClientDashboardData> {
    // Récupération des données client

    // Récupérer le client avec ses relations
    let client = await prisma.client.findUnique({
      where: { userId },
      include: {
        user: {
          include: {
            profile: true
          }
        }
      }
    })

    // Si le client n'existe pas, le créer automatiquement
    if (!client) {
      // Profil client manquant, création automatique
      
      // Vérifier que l'utilisateur existe et a le bon rôle
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { profile: true }
      })
      
      if (!user || user.role !== 'CLIENT') {
        throw new Error('Utilisateur CLIENT introuvable')
      }
      
      // Créer le profil si manquant
      if (!user.profile) {
        await prisma.profile.create({
          data: {
            userId: user.id,
            firstName: user.name?.split(' ')[0] || 'Client',
            lastName: user.name?.split(' ')[1] || 'Test',
            country: 'France',
            language: 'fr',
            timezone: 'Europe/Paris'
          }
        })
      }
      
      // Créer le profil client
      client = await prisma.client.create({
        data: {
          userId: user.id,
          subscriptionPlan: 'FREE',
          tutorialCompleted: false,
          emailNotifications: true,
          pushNotifications: true,
          smsNotifications: false
        },
        include: {
          user: {
            include: {
              profile: true
            }
          }
        }
      })
      
      // Profil client créé automatiquement
    }

    // Récupérer les données essentielles d'abord
    const [stats, tutorial, notifications] = await Promise.all([
      this.getClientStats(userId),
      this.getTutorialStatus(userId),
      this.getNotifications(userId, 10)
    ])

    // Récupérer les données d'activité avec gestion d'erreurs
    const [announcements, bookings, storageBoxes, deliveries] = await Promise.all([
      this.getRecentAnnouncements(userId, 5).catch(() => []),
      this.getRecentBookings(userId, 5).catch(() => []),
      this.getActiveStorageBoxes(userId, 3).catch(() => []),
      this.getActiveDeliveries(userId, 5).catch(() => [])
    ])

    const quickActions = this.generateQuickActions(client.subscriptionPlan, tutorial.completed)

    return {
      client,
      stats,
      recentActivity: {
        announcements,
        bookings,
        storageBoxes,
        deliveries
      },
      tutorial,
      notifications,
      quickActions
    }
  }

  /**
   * Statistiques du client
   */
  async getClientStats(userId: string): Promise<ClientStats> {
    // Calcul des statistiques client

    // Fonctions helper pour gérer les erreurs
    const safeCount = async (query: any) => {
      try {
        return await query
      } catch (error) {
        return 0
      }
    }

    const safeAggregate = async (query: any) => {
      try {
        return await query
      } catch (error) {
        return { _sum: { amount: 0 }, _avg: { rating: null } }
      }
    }

    const [
      totalAnnouncements,
      activeDeliveries,
      completedDeliveries,
      totalSpent,
      storageBoxesActive,
      bookingsThisMonth,
      averageRating,
      client
    ] = await Promise.all([
      // Nombre total d'annonces
      safeCount(prisma.announcement.count({
        where: { authorId: userId }
      })),
      
      // Livraisons actives
      safeCount(prisma.delivery.count({
        where: {
          announcement: { authorId: userId },
          status: { in: ['PENDING', 'ACCEPTED', 'IN_PROGRESS'] }
        }
      })),
      
      // Livraisons terminées
      safeCount(prisma.delivery.count({
        where: {
          announcement: { authorId: userId },
          status: 'DELIVERED'
        }
      })),
      
      // Total dépensé (paiements complétés)
      safeAggregate(prisma.payment.aggregate({
        where: {
          userId,
          status: 'COMPLETED'
        },
        _sum: { amount: true }
      })),
      
      // Box de stockage actives
      safeCount(prisma.storageBoxRental.count({
        where: {
          clientId: userId,
          endDate: { gte: new Date() }
        }
      })),
      
      // Réservations ce mois
      safeCount(prisma.booking.count({
        where: {
          clientId: userId,
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        }
      })),
      
      // Note moyenne des services utilisés
      safeAggregate(prisma.review.aggregate({
        where: {
          clientId: userId
        },
        _avg: { rating: true }
      })),
      
      // Infos client
      prisma.client.findUnique({
        where: { userId },
        select: {
          subscriptionPlan: true
        }
      })
    ])

    // Calculer les économies liées à l'abonnement
    const subscriptionSavings = this.calculateSubscriptionSavings(
      client?.subscriptionPlan || 'FREE',
      totalSpent._sum?.amount || 0
    )

    return {
      totalAnnouncements,
      activeDeliveries,
      completedDeliveries,
      totalSpent: totalSpent._sum?.amount || 0,
      currentSubscription: client?.subscriptionPlan || 'FREE',
      storageBoxesActive,
      bookingsThisMonth,
      averageRating: averageRating._avg?.rating || null,
      walletBalance: 0, // Pas de wallet pour l'instant
      subscriptionSavings
    }
  }

  /**
   * Annonces récentes du client
   */
  async getRecentAnnouncements(userId: string, limit: number = 5): Promise<AnnouncementSummary[]> {
    try {
      const announcements = await prisma.announcement.findMany({
        where: { authorId: userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
          delivery: {
            include: {
              deliverer: {
                select: {
                  id: true,
                  name: true,
                  profile: {
                    select: { phone: true }
                  }
                }
              }
            }
          }
        }
      })

      return announcements.map(announcement => ({
        id: announcement.id,
        title: announcement.title,
        type: announcement.type as any,
        status: announcement.status as any,
        price: Number(announcement.price) || 0,
        pickupAddress: announcement.pickupAddress || '',
        deliveryAddress: announcement.deliveryAddress || '',
        scheduledDate: announcement.scheduledDate || new Date(),
        createdAt: announcement.createdAt,
        deliverer: announcement.delivery?.deliverer ? {
          id: announcement.delivery.deliverer.id,
          name: announcement.delivery.deliverer.name || 'Livreur',
          rating: 4.5, // Valeur par défaut pour éviter l'erreur
          phone: announcement.delivery.deliverer.profile?.phone
        } : null,
        trackingCode: announcement.delivery?.trackingNumber || `TRK${announcement.id.slice(-6).toUpperCase()}`,
        estimatedDelivery: announcement.delivery?.deliveryDate || new Date(Date.now() + 24 * 60 * 60 * 1000)
      }))
    } catch (error) {
      console.log('⚠️ [DashboardService] Erreur récupération annonces:', error.message)
      return []
    }
  }

  /**
   * Réservations récentes
   */
  async getRecentBookings(userId: string, limit: number = 5): Promise<BookingSummary[]> {
    try {
      const bookings = await prisma.booking.findMany({
        where: { clientId: userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
          service: {
            include: {
              provider: {
                include: {
                  user: {
                    include: { profile: true }
                  }
                }
              }
            }
          },
          review: true
        }
      })

      return bookings.map(booking => ({
        id: booking.id,
        serviceType: booking.service.title,
        provider: {
          id: booking.service.provider.id,
          name: booking.service.provider.user.name,
          rating: booking.service.provider.averageRating,
          avatar: booking.service.provider.user.profile?.avatar
        },
        scheduledDate: booking.scheduledDate,
        duration: booking.duration,
        totalPrice: booking.totalPrice,
        status: booking.status as any,
        rating: booking.review?.rating,
        canRate: booking.status === 'COMPLETED' && !booking.review,
        address: booking.address,
        notes: booking.notes
      }))
    } catch (error) {
      console.log('⚠️ [DashboardService] Erreur récupération bookings:', error.message)
      return []
    }
  }

  /**
   * Box de stockage actives
   */
  async getActiveStorageBoxes(userId: string, limit: number = 3): Promise<StorageBoxSummary[]> {
    try {
      const rentals = await prisma.storageBoxRental.findMany({
        where: {
          clientId: userId,
          endDate: { gte: new Date() }
        },
        take: limit,
        include: {
          storageBox: {
            include: {
              location: true
            }
          }
        }
      })

      return rentals.map(rental => ({
        id: rental.id,
        boxNumber: rental.storageBox.boxNumber,
        size: rental.storageBox.size as any,
        warehouse: {
          name: rental.storageBox.location.name,
          address: rental.storageBox.location.address,
          city: rental.storageBox.location.city,
          accessHours: rental.storageBox.location.openingHours
        },
        startDate: rental.startDate,
        endDate: rental.endDate,
        monthlyPrice: rental.storageBox.pricePerDay * 30,
        accessCode: rental.accessCode,
        itemsCount: 0,
        lastAccess: null,
        expiresInDays: Math.ceil((rental.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      }))
    } catch (error) {
      console.log('⚠️ [DashboardService] Erreur récupération storage boxes:', error.message)
      return []
    }
  }

  /**
   * Livraisons actives avec suivi
   */
  async getActiveDeliveries(userId: string, limit: number = 5): Promise<DeliverySummary[]> {
    try {
      const deliveries = await prisma.delivery.findMany({
        where: {
          announcement: { authorId: userId },
          status: { in: ['PENDING', 'ACCEPTED', 'IN_PROGRESS'] }
        },
        take: limit,
        include: {
          announcement: true,
          deliverer: {
            include: { profile: true }
          },
          tracking: {
            orderBy: { timestamp: 'desc' }
          }
        }
      })

      return deliveries.map(delivery => ({
        id: delivery.id,
        announcementTitle: delivery.announcement.title,
        status: delivery.status as any,
        deliverer: delivery.deliverer ? {
          name: delivery.deliverer.name,
          phone: delivery.deliverer.profile?.phone,
          vehicleInfo: null // Info véhicule sera récupérée depuis le modèle Deliverer séparé si nécessaire
        } : null,
        currentLocation: delivery.currentLocation ? {
          latitude: delivery.currentLocation.latitude,
          longitude: delivery.currentLocation.longitude,
          lastUpdate: delivery.updatedAt
        } : undefined,
        estimatedArrival: delivery.deliveryDate,
        validationCode: delivery.validationCode,
        trackingHistory: delivery.tracking.map(point => ({
          id: point.id,
          status: point.status,
          location: point.location,
          timestamp: point.timestamp,
          notes: point.message
        }))
      }))
    } catch (error) {
      console.log('⚠️ [DashboardService] Erreur récupération deliveries:', error.message)
      return []
    }
  }

  /**
   * Statut du tutoriel obligatoire
   */
  async getTutorialStatus(userId: string): Promise<TutorialStatus> {
    const client = await prisma.client.findUnique({
      where: { userId },
      select: {
        tutorialCompleted: true,
        tutorialCompletedAt: true,
        user: {
          select: {
            profile: {
              select: {
                firstName: true,
                lastName: true,
                phone: true
              }
            }
          }
        }
      }
    })

    if (!client) {
      throw new Error('Client introuvable')
    }

    // Vérifier quelles étapes sont complétées
    const hasProfile = !!(client.user.profile?.firstName && client.user.profile?.lastName)
    const hasAnnouncement = await prisma.announcement.count({
      where: { authorId: userId }
    }) > 0

    const stepsCompleted = {
      welcome: true, // Toujours true car ils sont connectés
      profile: hasProfile,
      subscription: true, // Ils ont un plan, même FREE
      firstAnnouncement: hasAnnouncement,
      completion: client.tutorialCompleted
    }

    const completedStepsCount = Object.values(stepsCompleted).filter(Boolean).length
    const currentStep = completedStepsCount < 5 ? completedStepsCount + 1 : 5

    return {
      completed: client.tutorialCompleted,
      currentStep,
      stepsCompleted,
      completedAt: client.tutorialCompletedAt,
      timeSpent: 0, // À implémenter avec tracking côté client
      skippedSteps: [],
      isBlocking: !client.tutorialCompleted // Bloque l'interface tant que pas terminé
    }
  }

  /**
   * Notifications du dashboard
   */
  async getNotifications(userId: string, limit: number = 10): Promise<DashboardNotification[]> {
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit
    })

    return notifications.map(notif => ({
      id: notif.id,
      type: notif.type as any,
      title: notif.title,
      message: notif.message,
      read: notif.isRead,
      actionUrl: notif.data ? (notif.data as any).actionUrl || undefined : undefined,
      createdAt: notif.createdAt,
      priority: 'medium' as any, // Pas de priority dans le schema
      category: this.categorizeNotification(notif.type)
    }))
  }

  /**
   * Actions rapides disponibles selon abonnement
   */
  private generateQuickActions(subscriptionPlan: string, tutorialCompleted: boolean): QuickAction[] {
    const baseActions: QuickAction[] = [
      {
        id: 'create-announcement',
        title: 'Nouvelle annonce',
        description: 'Publier une demande de livraison',
        href: '/client/announcements/create',
        icon: '📦',
        available: tutorialCompleted,
        color: 'bg-blue-500'
      },
      {
        id: 'book-service',
        title: 'Réserver un service',
        description: 'Trouver un prestataire qualifié',
        href: '/client/services',
        icon: '🔧',
        available: true,
        color: 'bg-green-500'
      },
      {
        id: 'track-deliveries',
        title: 'Suivi livraisons',
        description: 'Suivre vos colis en temps réel',
        href: '/client/deliveries',
        icon: '🚚',
        available: true,
        color: 'bg-orange-500'
      }
    ]

    // Actions spécifiques aux abonnements
    if (subscriptionPlan !== 'FREE') {
      baseActions.push({
        id: 'storage-box',
        title: 'Louer une box',
        description: 'Stockage temporaire sécurisé',
        href: '/client/storage',
        icon: '📦',
        available: true,
        requiresSubscription: 'STARTER',
        color: 'bg-purple-500'
      })
    }

    if (subscriptionPlan === 'PREMIUM') {
      baseActions.push({
        id: 'priority-support',
        title: 'Support prioritaire',
        description: 'Assistance dédiée 24/7',
        href: '/client/support',
        icon: '🎧',
        available: true,
        requiresSubscription: 'PREMIUM',
        badge: 'Premium',
        color: 'bg-yellow-500'
      })
    }

    return baseActions
  }

  /**
   * Calculer les économies liées à l'abonnement
   */
  private calculateSubscriptionSavings(subscriptionPlan: string, totalSpent: number): number {
    const discountRates = {
      FREE: 0,
      STARTER: 0.05, // 5% de réduction
      PREMIUM: 0.09  // 9% de réduction
    }

    const rate = discountRates[subscriptionPlan as keyof typeof discountRates] || 0
    return totalSpent * rate
  }

  /**
   * Catégoriser les notifications
   */
  private categorizeNotification(type: string): 'delivery' | 'booking' | 'payment' | 'storage' | 'system' {
    if (type.includes('DELIVERY')) return 'delivery'
    if (type.includes('BOOKING')) return 'booking'
    if (type.includes('PAYMENT')) return 'payment'
    if (type.includes('STORAGE')) return 'storage'
    return 'system'
  }
}