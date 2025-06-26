import { prisma } from '@/lib/db'
import { 
  CreateAnnouncementInput,
  UpdateAnnouncementInput,
  AnnouncementQuery,
  AnnouncementType
} from '../schemas/announcement.schema'
import { 
  AnnouncementWithDetails,
  AnnouncementListResponse,
  AnnouncementStats,
  SubscriptionLimits,
  RouteMatch
} from '../types/announcement.types'
import { notificationService } from '@/features/notifications/services/notification.service'

class AnnouncementService {
  
  /**
   * Crée une nouvelle annonce
   */
  async createAnnouncement(
    userId: string, 
    data: CreateAnnouncementInput, 
    userRole: 'CLIENT' | 'MERCHANT' = 'CLIENT'
  ): Promise<AnnouncementWithDetails> {
    try {
      // Vérifier les limites d'abonnement pour les clients
      if (userRole === 'CLIENT') {
        await this.checkSubscriptionLimits(userId)
      }

      // Créer l'annonce avec ses détails spécifiques
      const announcement = await prisma.$transaction(async (tx) => {
        // Créer l'annonce principale
        const newAnnouncement = await tx.announcement.create({
          data: {
            authorId: userId,
            type: data.type,
            title: data.title,
            description: data.description,
            pickupAddress: data.pickupAddress,
            pickupLatitude: data.pickupLatitude,
            pickupLongitude: data.pickupLongitude,
            deliveryAddress: data.deliveryAddress,
            deliveryLatitude: data.deliveryLatitude,
            deliveryLongitude: data.deliveryLongitude,
            pickupDate: data.pickupDate ? new Date(data.pickupDate) : null,
            deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : null,
            isFlexibleDate: data.isFlexibleDate || false,
            preferredTimeSlot: data.preferredTimeSlot,
            isUrgent: data.isUrgent || false,
            basePrice: data.basePrice,
            finalPrice: data.finalPrice || data.basePrice,
            currency: data.currency || 'EUR',
            isPriceNegotiable: data.isPriceNegotiable || false,
            urgencyFee: data.urgencyFee,
            insuranceFee: data.insuranceFee,
            platformFee: data.platformFee,
            packageDetails: data.packageDetails,
            personDetails: data.personDetails,
            shoppingDetails: data.shoppingDetails,
            petDetails: data.petDetails,
            serviceDetails: data.serviceDetails,
            requiresValidation: data.requiresValidation !== false,
            requiresInsurance: data.requiresInsurance || false,
            allowsPartialDelivery: data.allowsPartialDelivery || false,
            maxDeliverers: data.maxDeliverers || 1,
            estimatedDuration: data.estimatedDuration,
            weight: data.weight,
            volume: data.volume,
            specialInstructions: data.specialInstructions,
            customerNotes: data.customerNotes,
            status: 'ACTIVE',
            publishedAt: new Date()
          },
          include: {
            author: {
              include: {
                profile: {
                  select: { firstName: true, lastName: true, avatar: true }
                }
              }
            }
          }
        })

        return newAnnouncement
      })

      // Lancer le matching automatique avec les trajets
      this.triggerRouteMatching(announcement.id).catch(console.error)

      // Récupérer l'annonce complète avec tous les détails
      return await this.getAnnouncementById(announcement.id)

    } catch (error) {
      console.error('Error creating announcement:', error)
      throw new Error('Erreur lors de la création de l\'annonce')
    }
  }

  /**
   * Récupère une annonce par son ID
   */
  async getAnnouncementById(id: string): Promise<AnnouncementWithDetails> {
    const announcement = await prisma.announcement.findUnique({
      where: { id },
      include: {
        client: {
          include: {
            profile: {
              select: { firstName: true, lastName: true, avatar: true }
            }
          }
        },
        merchant: {
          select: { id: true, companyName: true, contactEmail: true }
        },
        packageDetails: true,
        serviceDetails: true,
        delivery: {
          select: { id: true, status: true, delivererId: true }
        },
        routeMatches: {
          include: {
            route: {
              include: {
                deliverer: {
                  include: {
                    profile: {
                      select: { firstName: true, lastName: true, avatar: true }
                    }
                  }
                }
              }
            }
          },
          orderBy: { matchScore: 'desc' }
        },
        _count: {
          select: {
            delivery: true,
            routeMatches: true
          }
        }
      }
    })

    if (!announcement) {
      throw new Error('Annonce non trouvée')
    }

    return announcement as AnnouncementWithDetails
  }

  /**
   * Liste les annonces avec filtres et pagination
   */
  async listAnnouncements(
    query: AnnouncementQuery,
    userId?: string,
    userRole?: 'CLIENT' | 'MERCHANT' | 'DELIVERER' | 'ADMIN'
  ): Promise<AnnouncementListResponse> {
    const { page, limit, search, type, status, minPrice, maxPrice, city, urgent, sortBy, sortOrder } = query

    // Construction de la clause WHERE
    const where: any = {}

    // Filtrer par utilisateur selon le rôle
    if (userId && userRole === 'CLIENT') {
      where.clientId = userId
    } else if (userId && userRole === 'MERCHANT') {
      where.merchantId = userId
    } else if (userRole === 'DELIVERER') {
      // Pour les livreurs, afficher uniquement les annonces actives
      where.status = 'ACTIVE'
    }

    // Filtres de recherche
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ]
    }

    if (type) where.type = type
    if (status) where.status = status
    if (urgent) where.urgent = urgent

    if (minPrice || maxPrice) {
      where.price = {}
      if (minPrice) where.price.gte = minPrice
      if (maxPrice) where.price.lte = maxPrice
    }

    if (city) {
      where.OR = [
        { startLocation: { path: ['city'], string_contains: city } },
        { endLocation: { path: ['city'], string_contains: city } }
      ]
    }

    // Exécution parallèle des requêtes
    const [announcements, totalCount, stats] = await Promise.all([
      // Requête principale
      prisma.announcement.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          client: {
            include: {
              profile: {
                select: { firstName: true, lastName: true, avatar: true }
              }
            }
          },
          merchant: {
            select: { id: true, companyName: true, contactEmail: true }
          },
          packageDetails: true,
          serviceDetails: true,
          delivery: {
            select: { id: true, status: true, delivererId: true }
          },
          _count: {
            select: {
              delivery: true,
              routeMatches: true
            }
          }
        }
      }),

      // Compte total
      prisma.announcement.count({ where }),

      // Statistiques si c'est pour un utilisateur spécifique
      userId ? this.getUserAnnouncementStats(userId, userRole) : null
    ])

    return {
      announcements: announcements as AnnouncementWithDetails[],
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit),
        hasMore: page * limit < totalCount
      },
      stats
    }
  }

  /**
   * Met à jour une annonce
   */
  async updateAnnouncement(
    id: string,
    data: UpdateAnnouncementInput,
    userId: string,
    userRole: 'CLIENT' | 'MERCHANT' | 'ADMIN'
  ): Promise<AnnouncementWithDetails> {
    // Vérifier les permissions
    const announcement = await this.getAnnouncementById(id)
    
    if (userRole !== 'ADMIN') {
      const isOwner = (userRole === 'CLIENT' && announcement.clientId === userId) ||
                     (userRole === 'MERCHANT' && announcement.merchantId === userId)
      
      if (!isOwner) {
        throw new Error('Permission refusée')
      }
    }

    // Vérifier si l'annonce peut être modifiée
    if (announcement.status === 'IN_PROGRESS' || announcement.status === 'COMPLETED') {
      throw new Error('Cette annonce ne peut plus être modifiée')
    }

    const updatedAnnouncement = await prisma.$transaction(async (tx) => {
      // Mettre à jour l'annonce principale
      const updated = await tx.announcement.update({
        where: { id },
        data: {
          ...(data.title && { title: data.title }),
          ...(data.description && { description: data.description }),
          ...(data.startLocation && { startLocation: data.startLocation }),
          ...(data.endLocation && { endLocation: data.endLocation }),
          ...(data.desiredDate && { desiredDate: new Date(data.desiredDate) }),
          ...(data.flexibleDates !== undefined && { flexibleDates: data.flexibleDates }),
          ...(data.dateRangeStart && { dateRangeStart: new Date(data.dateRangeStart) }),
          ...(data.dateRangeEnd && { dateRangeEnd: new Date(data.dateRangeEnd) }),
          ...(data.price && { price: data.price }),
          ...(data.status && { status: data.status }),
          ...(data.specialInstructions && { specialInstructions: data.specialInstructions })
        }
      })

      // Mettre à jour les détails spécifiques si fournis
      if (data.packageDetails && announcement.type === 'PACKAGE_DELIVERY') {
        await tx.packageAnnouncement.upsert({
          where: { announcementId: id },
          update: data.packageDetails,
          create: {
            announcementId: id,
            ...data.packageDetails
          }
        })
      }

      if (data.serviceDetails && ['PERSON_TRANSPORT', 'AIRPORT_TRANSFER', 'SHOPPING', 'INTERNATIONAL_PURCHASE', 'PET_SITTING', 'HOME_SERVICE', 'CART_DROP'].includes(announcement.type)) {
        await tx.serviceAnnouncement.upsert({
          where: { announcementId: id },
          update: data.serviceDetails,
          create: {
            announcementId: id,
            ...data.serviceDetails
          }
        })
      }

      return updated
    })

    // Relancer le matching si nécessaire
    if (data.startLocation || data.endLocation || data.desiredDate) {
      this.triggerRouteMatching(id).catch(console.error)
    }

    return await this.getAnnouncementById(id)
  }

  /**
   * Supprime une annonce
   */
  async deleteAnnouncement(
    id: string,
    userId: string,
    userRole: 'CLIENT' | 'MERCHANT' | 'ADMIN'
  ): Promise<void> {
    const announcement = await this.getAnnouncementById(id)
    
    // Vérifier les permissions
    if (userRole !== 'ADMIN') {
      const isOwner = (userRole === 'CLIENT' && announcement.clientId === userId) ||
                     (userRole === 'MERCHANT' && announcement.merchantId === userId)
      
      if (!isOwner) {
        throw new Error('Permission refusée')
      }
    }

    // Vérifier si l'annonce peut être supprimée
    if (announcement.status === 'IN_PROGRESS') {
      throw new Error('Cette annonce ne peut pas être supprimée car elle est en cours')
    }

    await prisma.$transaction(async (tx) => {
      // Supprimer les détails spécifiques
      await tx.packageAnnouncement.deleteMany({ where: { announcementId: id } })
      await tx.serviceAnnouncement.deleteMany({ where: { announcementId: id } })
      await tx.routeAnnouncementMatch.deleteMany({ where: { announcementId: id } })
      
      // Supprimer l'annonce
      await tx.announcement.delete({ where: { id } })
    })
  }

  /**
   * Matching automatique avec les trajets des livreurs
   */
  private async triggerRouteMatching(announcementId: string): Promise<void> {
    try {
      const announcement = await prisma.announcement.findUnique({
        where: { id: announcementId },
        include: { routeMatches: true }
      })

      if (!announcement || announcement.status !== 'ACTIVE') {
        return
      }

      // Rechercher les trajets compatibles
      const compatibleRoutes = await prisma.route.findMany({
        where: {
          status: 'ACTIVE',
          departureTime: {
            gte: new Date(),
            lte: new Date(announcement.desiredDate.getTime() + 24 * 60 * 60 * 1000) // +24h
          }
        },
        include: {
          deliverer: {
            include: {
              profile: true
            }
          }
        }
      })

      // Calculer le score de matching pour chaque trajet
      const newMatches: Array<{
        routeId: string
        matchScore: number
        deliverer: any
      }> = []

      for (const route of compatibleRoutes) {
        // Vérifier si le match existe déjà
        const existingMatch = announcement.routeMatches.find(m => m.routeId === route.id)
        if (existingMatch) continue

        const score = this.calculateMatchScore(announcement, route)
        
        if (score >= 60) { // Seuil minimum de 60%
          newMatches.push({
            routeId: route.id,
            matchScore: score,
            deliverer: route.deliverer
          })
        }
      }

      // Créer les nouveaux matches et envoyer les notifications
      for (const match of newMatches) {
        await prisma.routeAnnouncementMatch.create({
          data: {
            routeId: match.routeId,
            announcementId: announcementId,
            matchScore: match.matchScore
          }
        })

        // Envoyer notification push au livreur
        await notificationService.sendPushNotification(
          match.deliverer.id,
          'Nouvelle opportunité de livraison',
          `Une annonce correspond à votre trajet (${Math.round(match.matchScore)}% de compatibilité)`,
          {
            type: 'ANNOUNCEMENT_MATCH',
            announcementId: announcementId,
            routeId: match.routeId,
            score: match.matchScore
          }
        )
      }

    } catch (error) {
      console.error('Error in route matching:', error)
    }
  }

  /**
   * Calcule le score de matching entre une annonce et un trajet
   */
  private calculateMatchScore(announcement: any, route: any): number {
    let score = 0
    let maxScore = 0

    // Distance géographique (40 points max)
    const startDistance = this.calculateDistance(
      announcement.startLocation,
      route.startLocation
    )
    const endDistance = this.calculateDistance(
      announcement.endLocation,
      route.endLocation
    )

    maxScore += 40
    if (startDistance <= 5 && endDistance <= 5) score += 40
    else if (startDistance <= 10 && endDistance <= 10) score += 30
    else if (startDistance <= 20 && endDistance <= 20) score += 20
    else if (startDistance <= 50 && endDistance <= 50) score += 10

    // Timing (30 points max)
    const timeDiff = Math.abs(announcement.desiredDate.getTime() - route.departureTime.getTime())
    const hoursDiff = timeDiff / (1000 * 60 * 60)

    maxScore += 30
    if (hoursDiff <= 2) score += 30
    else if (hoursDiff <= 6) score += 20
    else if (hoursDiff <= 12) score += 15
    else if (hoursDiff <= 24) score += 10

    // Type de service compatible (20 points max)
    maxScore += 20
    if (this.isServiceTypeCompatible(announcement.type, route.vehicleType)) {
      score += 20
    }

    // Capacité disponible (10 points max)
    maxScore += 10
    if (route.availableCapacity >= this.getRequiredCapacity(announcement)) {
      score += 10
    }

    return Math.round((score / maxScore) * 100)
  }

  /**
   * Calcule la distance entre deux points (approximation simplifiée)
   */
  private calculateDistance(point1: any, point2: any): number {
    if (!point1.lat || !point1.lng || !point2.lat || !point2.lng) {
      return 999 // Distance inconnue = très élevée
    }

    const R = 6371 // Rayon de la Terre en km
    const dLat = this.toRad(point2.lat - point1.lat)
    const dLon = this.toRad(point2.lng - point1.lng)
    const lat1 = this.toRad(point1.lat)
    const lat2 = this.toRad(point2.lat)

    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    
    return R * c
  }

  private toRad(value: number): number {
    return value * Math.PI / 180
  }

  /**
   * Vérifie la compatibilité du type de service
   */
  private isServiceTypeCompatible(announcementType: AnnouncementType, vehicleType: string): boolean {
    const compatibility: Record<AnnouncementType, string[]> = {
      'PACKAGE_DELIVERY': ['CAR', 'VAN', 'TRUCK', 'BIKE', 'SCOOTER'],
      'PERSON_TRANSPORT': ['CAR', 'VAN'],
      'AIRPORT_TRANSFER': ['CAR', 'VAN'],
      'SHOPPING': ['CAR', 'VAN', 'BIKE'],
      'INTERNATIONAL_PURCHASE': ['CAR', 'VAN', 'TRUCK'],
      'PET_SITTING': ['CAR', 'VAN'],
      'HOME_SERVICE': ['CAR', 'BIKE', 'FOOT'],
      'CART_DROP': ['CAR', 'VAN']
    }

    return compatibility[announcementType]?.includes(vehicleType) || false
  }

  /**
   * Retourne la capacité requise pour une annonce
   */
  private getRequiredCapacity(announcement: any): number {
    if (announcement.type === 'PACKAGE_DELIVERY' && announcement.packageDetails) {
      return announcement.packageDetails.weight || 1
    }
    if (announcement.type === 'PERSON_TRANSPORT' && announcement.serviceDetails) {
      return announcement.serviceDetails.numberOfPeople || 1
    }
    return 1
  }

  /**
   * Vérifie les limites d'abonnement
   */
  private async checkSubscriptionLimits(userId: string): Promise<void> {
    const subscription = await prisma.subscription.findUnique({
      where: { userId }
    })

    const plan = subscription?.plan || 'FREE'
    const limits = this.getSubscriptionLimits(plan)

    // Vérifier les limites mensuelles
    if (limits.maxAnnouncementsPerMonth !== -1) {
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)

      const monthlyCount = await prisma.announcement.count({
        where: {
          clientId: userId,
          createdAt: { gte: startOfMonth }
        }
      })

      if (monthlyCount >= limits.maxAnnouncementsPerMonth) {
        throw new Error(`Limite mensuelle atteinte (${limits.maxAnnouncementsPerMonth} annonces)`)
      }
    }

    // Vérifier les annonces actives
    if (limits.maxActiveAnnouncements !== -1) {
      const activeCount = await prisma.announcement.count({
        where: {
          clientId: userId,
          status: { in: ['ACTIVE', 'IN_PROGRESS'] }
        }
      })

      if (activeCount >= limits.maxActiveAnnouncements) {
        throw new Error(`Limite d'annonces actives atteinte (${limits.maxActiveAnnouncements})`)
      }
    }
  }

  /**
   * Retourne les limites selon le plan d'abonnement
   */
  private getSubscriptionLimits(plan: string): SubscriptionLimits {
    const limits: Record<string, SubscriptionLimits> = {
      FREE: {
        maxAnnouncementsPerMonth: 3,
        maxActiveAnnouncements: 2,
        canUseUrgentDelivery: false,
        canUseInsurance: false,
        discountPercentage: 0
      },
      STARTER: {
        maxAnnouncementsPerMonth: 10,
        maxActiveAnnouncements: 5,
        canUseUrgentDelivery: true,
        canUseInsurance: true,
        discountPercentage: 5
      },
      PREMIUM: {
        maxAnnouncementsPerMonth: -1,
        maxActiveAnnouncements: -1,
        canUseUrgentDelivery: true,
        canUseInsurance: true,
        discountPercentage: 9
      }
    }

    return limits[plan] || limits.FREE
  }

  /**
   * Statistiques des annonces pour un utilisateur
   */
  private async getUserAnnouncementStats(userId: string, userRole?: string): Promise<any> {
    const where = userRole === 'CLIENT' ? { clientId: userId } : { merchantId: userId }

    const [counts, monthlyData] = await Promise.all([
      prisma.announcement.groupBy({
        by: ['status'],
        where,
        _count: { id: true }
      }),
      prisma.announcement.findMany({
        where: {
          ...where,
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        },
        select: { createdAt: true }
      })
    ])

    const subscription = await prisma.subscription.findUnique({
      where: { userId }
    })

    const limits = this.getSubscriptionLimits(subscription?.plan || 'FREE')

    return {
      monthly: {
        total: monthlyData.length,
        remaining: limits.maxAnnouncementsPerMonth === -1 
          ? -1 
          : Math.max(0, limits.maxAnnouncementsPerMonth - monthlyData.length),
        limit: limits.maxAnnouncementsPerMonth
      },
      byStatus: counts.reduce((acc, item) => {
        acc[item.status] = item._count.id
        return acc
      }, {} as any),
      byType: {} // À implémenter si nécessaire
    }
  }
}

export const announcementService = new AnnouncementService() 