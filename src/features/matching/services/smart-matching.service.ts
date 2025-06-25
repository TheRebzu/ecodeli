import { prisma } from '@/lib/db'
import { ecoLogger } from '@/lib/logger'

export interface MatchingCriteria {
  maxDistance: number // en km
  maxDeviationDistance: number // km max de déviation
  timeWindow: number // heures de flexibilité
  weightCapacity?: number // kg max
  volumeCapacity?: number // litres max
  minRating?: number // note minimum du livreur
}

export interface MatchScore {
  routeId: string
  announcementId: string
  score: number // 0-100
  factors: {
    distanceScore: number
    timeScore: number
    capacityScore: number
    ratingScore: number
    priceScore: number
  }
  estimatedDelay: number // minutes de délai estimé
  estimatedDistance: number // km de déviation
}

export interface RouteMatchResult {
  route: any
  announcement: any
  matchScore: MatchScore
  feasible: boolean
  recommendations: string[]
}

export class SmartMatchingService {
  private static readonly DEFAULT_CRITERIA: MatchingCriteria = {
    maxDistance: 10, // 10km max de déviation
    maxDeviationDistance: 5, // 5km max depuis la route principale
    timeWindow: 2, // 2h de flexibilité
    minRating: 3.0 // minimum 3/5 étoiles
  }

  /**
   * Trouve les meilleures correspondances pour une annonce
   */
  static async findMatchesForAnnouncement(
    announcementId: string,
    criteria: Partial<MatchingCriteria> = {}
  ): Promise<RouteMatchResult[]> {
    try {
      const finalCriteria = { ...this.DEFAULT_CRITERIA, ...criteria }
      
      // Récupérer l'annonce avec ses détails
      const announcement = await prisma.announcement.findUnique({
        where: { id: announcementId },
        include: {
          packageDetails: true,
          serviceDetails: true,
          client: {
            include: {
              user: {
                include: { profile: true }
              }
            }
          }
        }
      })

      if (!announcement) {
        throw new Error('Annonce non trouvée')
      }

      // Récupérer les routes actives dans la période et zone géographique
      const routes = await this.getEligibleRoutes(announcement, finalCriteria)
      
      // Calculer les scores de correspondance
      const matches: RouteMatchResult[] = []
      
      for (const route of routes) {
        const matchScore = await this.calculateMatchScore(route, announcement, finalCriteria)
        
        if (matchScore.score >= 30) { // Seuil minimum de 30%
          matches.push({
            route,
            announcement,
            matchScore,
            feasible: matchScore.score >= 60,
            recommendations: this.generateRecommendations(matchScore, route, announcement)
          })
        }
      }

      // Trier par score décroissant
      matches.sort((a, b) => b.matchScore.score - a.matchScore.score)

      // Limiter à 20 résultats max
      return matches.slice(0, 20)

    } catch (error) {
      ecoLogger.matching.error('Error finding matches for announcement', {
        announcementId,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  /**
   * Trouve les annonces correspondant à une route
   */
  static async findAnnouncementsForRoute(
    routeId: string,
    criteria: Partial<MatchingCriteria> = {}
  ): Promise<RouteMatchResult[]> {
    try {
      const finalCriteria = { ...this.DEFAULT_CRITERIA, ...criteria }
      
      // Récupérer la route avec ses détails
      const route = await prisma.route.findUnique({
        where: { id: routeId },
        include: {
          deliverer: {
            include: {
              user: {
                include: { profile: true }
              }
            }
          }
        }
      })

      if (!route) {
        throw new Error('Route non trouvée')
      }

      // Récupérer les annonces éligibles
      const announcements = await this.getEligibleAnnouncements(route, finalCriteria)
      
      // Calculer les scores de correspondance
      const matches: RouteMatchResult[] = []
      
      for (const announcement of announcements) {
        const matchScore = await this.calculateMatchScore(route, announcement, finalCriteria)
        
        if (matchScore.score >= 30) {
          matches.push({
            route,
            announcement,
            matchScore,
            feasible: matchScore.score >= 60,
            recommendations: this.generateRecommendations(matchScore, route, announcement)
          })
        }
      }

      // Trier par score décroissant
      matches.sort((a, b) => b.matchScore.score - a.matchScore.score)

      return matches.slice(0, 20)

    } catch (error) {
      ecoLogger.matching.error('Error finding announcements for route', {
        routeId,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  /**
   * Calcule le score de correspondance entre une route et une annonce
   */
  private static async calculateMatchScore(
    route: any,
    announcement: any,
    criteria: MatchingCriteria
  ): Promise<MatchScore> {
    // 1. Score de distance (40% du total)
    const distanceScore = this.calculateDistanceScore(route, announcement, criteria)
    
    // 2. Score de temps (25% du total)
    const timeScore = this.calculateTimeScore(route, announcement, criteria)
    
    // 3. Score de capacité (20% du total)
    const capacityScore = this.calculateCapacityScore(route, announcement)
    
    // 4. Score de notation (10% du total)
    const ratingScore = this.calculateRatingScore(route, criteria)
    
    // 5. Score de prix (5% du total)
    const priceScore = this.calculatePriceScore(route, announcement)

    // Score final pondéré
    const finalScore = Math.round(
      (distanceScore * 0.4) +
      (timeScore * 0.25) +
      (capacityScore * 0.2) +
      (ratingScore * 0.1) +
      (priceScore * 0.05)
    )

    // Estimations
    const estimatedDelay = this.estimateDelay(route, announcement)
    const estimatedDistance = this.calculateDeviationDistance(route, announcement)

    return {
      routeId: route.id,
      announcementId: announcement.id,
      score: Math.max(0, Math.min(100, finalScore)),
      factors: {
        distanceScore,
        timeScore,
        capacityScore,
        ratingScore,
        priceScore
      },
      estimatedDelay,
      estimatedDistance
    }
  }

  /**
   * Score basé sur la distance de déviation
   */
  private static calculateDistanceScore(route: any, announcement: any, criteria: MatchingCriteria): number {
    const startCoords = announcement.startLocation
    const endCoords = announcement.endLocation
    const routeStart = route.startLocation
    const routeEnd = route.endLocation

    // Distance du point de départ de l'annonce à la route
    const startDeviation = this.calculateDistance(
      startCoords.lat, startCoords.lng,
      routeStart.lat, routeStart.lng
    )

    // Distance du point d'arrivée de l'annonce à la route
    const endDeviation = this.calculateDistance(
      endCoords.lat, endCoords.lng,
      routeEnd.lat, routeEnd.lng
    )

    const maxDeviation = Math.max(startDeviation, endDeviation)

    if (maxDeviation > criteria.maxDeviationDistance) {
      return 0
    }

    // Score inversement proportionnel à la déviation
    return Math.max(0, 100 - (maxDeviation / criteria.maxDeviationDistance) * 100)
  }

  /**
   * Score basé sur la compatibilité temporelle
   */
  private static calculateTimeScore(route: any, announcement: any, criteria: MatchingCriteria): number {
    const routeDate = new Date(route.departureDate)
    const announcementDate = new Date(announcement.desiredDate)
    
    const timeDiffHours = Math.abs(routeDate.getTime() - announcementDate.getTime()) / (1000 * 60 * 60)

    if (timeDiffHours > criteria.timeWindow) {
      return 0
    }

    // Score basé sur la proximité temporelle
    return Math.max(0, 100 - (timeDiffHours / criteria.timeWindow) * 100)
  }

  /**
   * Score basé sur la capacité de transport
   */
  private static calculateCapacityScore(route: any, announcement: any): number {
    if (announcement.type !== 'PACKAGE' || !announcement.packageDetails) {
      return 100 // Pas de contrainte de capacité pour les services
    }

    const package = announcement.packageDetails
    const availableWeight = route.availableWeight || 0
    const availableVolume = route.availableVolume || 0

    // Calculer le volume du colis (L x l x h en cm → litres)
    const packageVolume = (package.length * package.width * package.height) / 1000

    // Vérifier si le colis peut être transporté
    if (package.weight > availableWeight || packageVolume > availableVolume) {
      return 0
    }

    // Score basé sur l'utilisation de la capacité
    const weightRatio = package.weight / availableWeight
    const volumeRatio = packageVolume / availableVolume
    const utilizationScore = Math.max(weightRatio, volumeRatio) * 100

    return Math.min(100, utilizationScore + 50) // Bonus pour optimiser la capacité
  }

  /**
   * Score basé sur la notation du livreur
   */
  private static calculateRatingScore(route: any, criteria: MatchingCriteria): number {
    const delivererRating = route.deliverer?.averageRating || 0

    if (criteria.minRating && delivererRating < criteria.minRating) {
      return 0
    }

    // Score linéaire basé sur la note (0-5 → 0-100)
    return (delivererRating / 5) * 100
  }

  /**
   * Score basé sur l'attractivité du prix
   */
  private static calculatePriceScore(route: any, announcement: any): number {
    const announcementPrice = announcement.price
    const routePricePerKg = route.pricePerKg || 0

    if (!announcement.packageDetails) {
      return 100 // Pas de comparaison de prix possible
    }

    const estimatedRouteCost = routePricePerKg * announcement.packageDetails.weight

    if (estimatedRouteCost === 0) {
      return 100
    }

    // Plus le prix de l'annonce est élevé par rapport au coût, meilleur le score
    const profitRatio = announcementPrice / estimatedRouteCost
    
    if (profitRatio < 1) return 0 // Pas rentable
    if (profitRatio > 3) return 100 // Très rentable

    return Math.min(100, (profitRatio - 1) * 50)
  }

  /**
   * Récupère les routes éligibles pour une annonce
   */
  private static async getEligibleRoutes(announcement: any, criteria: MatchingCriteria) {
    const startDate = new Date(announcement.desiredDate)
    startDate.setHours(startDate.getHours() - criteria.timeWindow)
    
    const endDate = new Date(announcement.desiredDate)
    endDate.setHours(endDate.getHours() + criteria.timeWindow)

    return await prisma.route.findMany({
      where: {
        isActive: true,
        departureDate: {
          gte: startDate,
          lte: endDate
        },
        deliverer: {
          isActive: true,
          validationStatus: 'APPROVED',
          averageRating: {
            gte: criteria.minRating || 0
          }
        }
      },
      include: {
        deliverer: {
          include: {
            user: {
              include: { profile: true }
            }
          }
        },
        matchedAnnouncements: true
      }
    })
  }

  /**
   * Récupère les annonces éligibles pour une route
   */
  private static async getEligibleAnnouncements(route: any, criteria: MatchingCriteria) {
    const routeDate = new Date(route.departureDate)
    const startDate = new Date(routeDate)
    startDate.setHours(startDate.getHours() - criteria.timeWindow)
    
    const endDate = new Date(routeDate)
    endDate.setHours(endDate.getHours() + criteria.timeWindow)

    return await prisma.announcement.findMany({
      where: {
        status: 'PUBLISHED',
        desiredDate: {
          gte: startDate,
          lte: endDate
        },
        delivery: null // Pas encore assignée
      },
      include: {
        packageDetails: true,
        serviceDetails: true,
        client: {
          include: {
            user: {
              include: { profile: true }
            }
          }
        }
      }
    })
  }

  /**
   * Calcule la distance entre deux points en km
   */
  private static calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371 // Rayon de la Terre en km
    const dLat = this.deg2rad(lat2 - lat1)
    const dLon = this.deg2rad(lon2 - lon1)
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
  }

  private static deg2rad(deg: number): number {
    return deg * (Math.PI/180)
  }

  /**
   * Calcule la distance de déviation par rapport à la route principale
   */
  private static calculateDeviationDistance(route: any, announcement: any): number {
    // Distance directe de la route
    const directDistance = this.calculateDistance(
      route.startLocation.lat, route.startLocation.lng,
      route.endLocation.lat, route.endLocation.lng
    )

    // Distance avec détour par l'annonce
    const deviationDistance = 
      this.calculateDistance(
        route.startLocation.lat, route.startLocation.lng,
        announcement.startLocation.lat, announcement.startLocation.lng
      ) +
      this.calculateDistance(
        announcement.startLocation.lat, announcement.startLocation.lng,
        announcement.endLocation.lat, announcement.endLocation.lng
      ) +
      this.calculateDistance(
        announcement.endLocation.lat, announcement.endLocation.lng,
        route.endLocation.lat, route.endLocation.lng
      )

    return Math.max(0, deviationDistance - directDistance)
  }

  /**
   * Estime le délai supplémentaire en minutes
   */
  private static estimateDelay(route: any, announcement: any): number {
    const deviationKm = this.calculateDeviationDistance(route, announcement)
    const avgSpeedKmh = 40 // Vitesse moyenne en ville
    return Math.round((deviationKm / avgSpeedKmh) * 60)
  }

  /**
   * Génère des recommandations pour améliorer le match
   */
  private static generateRecommendations(
    matchScore: MatchScore, 
    route: any, 
    announcement: any
  ): string[] {
    const recommendations: string[] = []

    if (matchScore.factors.distanceScore < 50) {
      recommendations.push(
        `La déviation de ${matchScore.estimatedDistance.toFixed(1)}km est importante. ` +
        `Considérez ajuster l'itinéraire.`
      )
    }

    if (matchScore.factors.timeScore < 50) {
      recommendations.push(
        `L'écart temporel est significatif. Vérifiez la flexibilité des horaires.`
      )
    }

    if (matchScore.factors.capacityScore < 70 && announcement.packageDetails) {
      recommendations.push(
        `Le colis utilise une grande partie de la capacité disponible. ` +
        `Vérifiez les dimensions exactes.`
      )
    }

    if (matchScore.factors.ratingScore < 70) {
      recommendations.push(
        `La note du livreur est modérée. Vérifiez son historique de livraisons.`
      )
    }

    if (matchScore.estimatedDelay > 30) {
      recommendations.push(
        `Le délai supplémentaire estimé de ${matchScore.estimatedDelay} minutes ` +
        `pourrait affecter d'autres livraisons.`
      )
    }

    if (recommendations.length === 0) {
      recommendations.push('Excellente correspondance ! Aucune recommandation particulière.')
    }

    return recommendations
  }

  /**
   * Sauvegarde un match dans la base de données
   */
  static async saveMatch(routeId: string, announcementId: string, matchScore: MatchScore) {
    try {
      await prisma.routeAnnouncementMatch.create({
        data: {
          routeId,
          announcementId,
          matchScore: matchScore.score,
          isNotified: false
        }
      })

      ecoLogger.matching.matchCreated(routeId, announcementId, matchScore.score)
    } catch (error) {
      ecoLogger.matching.error('Error saving match', { routeId, announcementId, error })
      throw error
    }
  }

  /**
   * Lance le matching automatique pour toutes les annonces actives
   */
  static async runAutomaticMatching(): Promise<{
    processed: number
    matches: number
    notifications: number
  }> {
    try {
      ecoLogger.matching.automaticMatchingStarted()

      let processed = 0
      let totalMatches = 0
      let notifications = 0

      // Récupérer toutes les annonces publiées sans livraison assignée
      const announcements = await prisma.announcement.findMany({
        where: {
          status: 'PUBLISHED',
          delivery: null,
          desiredDate: {
            gte: new Date() // À partir de maintenant
          }
        }
      })

      for (const announcement of announcements) {
        try {
          const matches = await this.findMatchesForAnnouncement(announcement.id)
          processed++

          // Sauvegarder les meilleurs matches (score > 70%)
          const goodMatches = matches.filter(m => m.matchScore.score >= 70)
          
          for (const match of goodMatches.slice(0, 5)) { // Max 5 matches par annonce
            await this.saveMatch(
              match.route.id,
              announcement.id,
              match.matchScore
            )
            totalMatches++

            // Notifier le livreur si très bon match (score > 85%)
            if (match.matchScore.score >= 85) {
              await this.notifyDelivererOfMatch(match.route.deliverer.userId, announcement)
              notifications++
            }
          }

        } catch (error) {
          ecoLogger.matching.error('Error processing announcement in automatic matching', {
            announcementId: announcement.id,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }

      ecoLogger.matching.automaticMatchingCompleted({
        processed,
        matches: totalMatches,
        notifications
      })

      return { processed, matches: totalMatches, notifications }

    } catch (error) {
      ecoLogger.matching.error('Error in automatic matching', {
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  /**
   * Notifie un livreur d'un nouveau match
   */
  private static async notifyDelivererOfMatch(delivererUserId: string, announcement: any) {
    try {
      await prisma.notification.create({
        data: {
          userId: delivererUserId,
          type: 'NEW_MATCH',
          title: 'Nouvelle opportunité de livraison',
          message: `Une nouvelle annonce correspond à votre trajet : ${announcement.title}`,
          data: {
            announcementId: announcement.id,
            type: announcement.type,
            price: announcement.price
          }
        }
      })
    } catch (error) {
      ecoLogger.matching.error('Error notifying deliverer of match', {
        delivererUserId,
        announcementId: announcement.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }
}