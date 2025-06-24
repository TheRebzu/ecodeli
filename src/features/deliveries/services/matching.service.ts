import { prisma } from '@/lib/db'
import { NotificationService } from '@/features/notifications/services/notification.service'

interface MatchingScore {
  routeId: string
  announcementId: string
  score: number
  factors: {
    locationCompatibility: number
    timeCompatibility: number
    capacityCompatibility: number
    priceCompatibility: number
  }
}

export class MatchingService {
  private notificationService = new NotificationService()

  /**
   * Trouve les annonces compatibles avec une route donnée
   */
  async findMatchingAnnouncements(routeId: string): Promise<void> {
    try {
      const route = await prisma.route.findUnique({
        where: { id: routeId },
        include: {
          deliverer: {
            include: {
              user: true
            }
          }
        }
      })

      if (!route) {
        throw new Error('Route not found')
      }

      // Récupérer les annonces actives compatibles
      const announcements = await prisma.announcement.findMany({
        where: {
          status: 'ACTIVE',
          type: {
            in: ['PACKAGE_DELIVERY', 'SHOPPING', 'INTERNATIONAL_PURCHASE']
          },
          scheduledAt: {
            gte: route.departureDate,
            lte: route.arrivalDate
          }
        },
        include: {
          author: {
            include: {
              profile: true
            }
          }
        }
      })

      // Calculer les scores de matching
      const matchingScores: MatchingScore[] = []

      for (const announcement of announcements) {
        const score = await this.calculateMatchingScore(route, announcement)
        
        if (score.score >= 50) { // Score minimum de 50% pour être considéré
          matchingScores.push(score)
          
          // Créer le match en base
          await prisma.routeAnnouncementMatch.upsert({
            where: {
              routeId_announcementId: {
                routeId: route.id,
                announcementId: announcement.id
              }
            },
            create: {
              routeId: route.id,
              announcementId: announcement.id,
              matchScore: score.score
            },
            update: {
              matchScore: score.score
            }
          })
        }
      }

      // Envoyer notifications pour les meilleurs matchs (score > 75%)
      const highScoreMatches = matchingScores.filter(m => m.score > 75)
      
      for (const match of highScoreMatches) {
        await this.sendMatchNotification(route.deliverer.user.id, match)
      }

    } catch (error) {
      console.error('Error in matching service:', error)
      throw error
    }
  }

  /**
   * Trouve les routes compatibles avec une nouvelle annonce
   */
  async findMatchingRoutes(announcementId: string): Promise<void> {
    try {
      const announcement = await prisma.announcement.findUnique({
        where: { id: announcementId },
        include: {
          author: {
            include: {
              profile: true
            }
          }
        }
      })

      if (!announcement) {
        throw new Error('Announcement not found')
      }

      // Récupérer les routes actives dans la période
      const routes = await prisma.route.findMany({
        where: {
          isActive: true,
          departureDate: {
            lte: announcement.scheduledAt
          },
          arrivalDate: {
            gte: announcement.scheduledAt
          }
        },
        include: {
          deliverer: {
            include: {
              user: true
            }
          }
        }
      })

      // Calculer les scores et créer les matches
      for (const route of routes) {
        const score = await this.calculateMatchingScore(route, announcement)
        
        if (score.score >= 50) {
          await prisma.routeAnnouncementMatch.upsert({
            where: {
              routeId_announcementId: {
                routeId: route.id,
                announcementId: announcement.id
              }
            },
            create: {
              routeId: route.id,
              announcementId: announcement.id,
              matchScore: score.score
            },
            update: {
              matchScore: score.score
            }
          })

          // Notification au livreur si score élevé
          if (score.score > 75) {
            await this.sendMatchNotification(route.deliverer.user.id, score)
          }
        }
      }

    } catch (error) {
      console.error('Error finding matching routes:', error)
      throw error
    }
  }

  /**
   * Calcule le score de compatibilité entre une route et une annonce
   */
  private async calculateMatchingScore(route: any, announcement: any): Promise<MatchingScore> {
    // 1. Compatibilité géographique (40% du score)
    const locationScore = this.calculateLocationCompatibility(route, announcement)
    
    // 2. Compatibilité temporelle (30% du score)
    const timeScore = this.calculateTimeCompatibility(route, announcement)
    
    // 3. Compatibilité de capacité (20% du score)
    const capacityScore = this.calculateCapacityCompatibility(route, announcement)
    
    // 4. Compatibilité de prix (10% du score)
    const priceScore = this.calculatePriceCompatibility(route, announcement)

    const totalScore = Math.round(
      locationScore * 0.4 +
      timeScore * 0.3 +
      capacityScore * 0.2 +
      priceScore * 0.1
    )

    return {
      routeId: route.id,
      announcementId: announcement.id,
      score: totalScore,
      factors: {
        locationCompatibility: locationScore,
        timeCompatibility: timeScore,
        capacityCompatibility: capacityScore,
        priceCompatibility: priceScore
      }
    }
  }

  /**
   * Calcule la compatibilité géographique
   */
  private calculateLocationCompatibility(route: any, announcement: any): number {
    // Simulation basique - dans un vrai système, utiliser une API de géolocalisation
    const startLocation = route.startLocation
    const endLocation = route.endLocation
    
    // Récupérer les adresses de l'annonce
    const pickupCity = announcement.pickupAddress?.toLowerCase() || ''
    const deliveryCity = announcement.deliveryAddress?.toLowerCase() || ''
    
    const routeStartCity = startLocation.city?.toLowerCase() || ''
    const routeEndCity = endLocation.city?.toLowerCase() || ''

    let score = 0

    // Vérifier si les villes correspondent
    if (pickupCity.includes(routeStartCity) || routeStartCity.includes(pickupCity)) {
      score += 50
    }
    
    if (deliveryCity.includes(routeEndCity) || routeEndCity.includes(deliveryCity)) {
      score += 50
    }

    // Bonus si les deux correspondent parfaitement
    if (score === 100) {
      return 100
    }

    // Score partiel si une seule correspondance
    return Math.min(score, 80)
  }

  /**
   * Calcule la compatibilité temporelle
   */
  private calculateTimeCompatibility(route: any, announcement: any): number {
    const routeStart = new Date(route.departureDate)
    const routeEnd = new Date(route.arrivalDate)
    const announcementDate = new Date(announcement.scheduledAt)

    // L'annonce doit être dans la fenêtre de la route
    if (announcementDate >= routeStart && announcementDate <= routeEnd) {
      // Calculer la position dans la fenêtre temporelle
      const totalDuration = routeEnd.getTime() - routeStart.getTime()
      const timeFromStart = announcementDate.getTime() - routeStart.getTime()
      const position = timeFromStart / totalDuration

      // Score élevé si c'est au début ou au milieu du trajet
      if (position <= 0.3) return 100
      if (position <= 0.7) return 90
      return 75
    }

    return 0
  }

  /**
   * Calcule la compatibilité de capacité
   */
  private calculateCapacityCompatibility(route: any, announcement: any): number {
    if (!route.availableWeight && !route.availableVolume) {
      return 50 // Score neutre si pas d'info sur la capacité
    }

    // Estimation du poids basée sur le type d'annonce
    const estimatedWeight = this.estimateAnnouncementWeight(announcement)
    
    if (route.availableWeight && estimatedWeight) {
      if (estimatedWeight <= route.availableWeight * 0.8) return 100
      if (estimatedWeight <= route.availableWeight) return 80
      return 20
    }

    return 70
  }

  /**
   * Calcule la compatibilité de prix
   */
  private calculatePriceCompatibility(route: any, announcement: any): number {
    if (!route.pricePerKg || !announcement.price) {
      return 50 // Score neutre
    }

    const estimatedWeight = this.estimateAnnouncementWeight(announcement)
    const routePrice = route.pricePerKg * estimatedWeight
    const announcementPrice = parseFloat(announcement.price)

    const ratio = announcementPrice / routePrice

    if (ratio >= 1.2) return 100 // Client paie 20% de plus
    if (ratio >= 1.0) return 90  // Prix équitable
    if (ratio >= 0.8) return 70  // Acceptable
    return 30 // Peu rentable
  }

  /**
   * Estime le poids d'une annonce basé sur son type
   */
  private estimateAnnouncementWeight(announcement: any): number {
    switch (announcement.type) {
      case 'PACKAGE_DELIVERY':
        return 5 // 5kg par défaut
      case 'SHOPPING':
        return 10 // 10kg pour des courses
      case 'INTERNATIONAL_PURCHASE':
        return 3 // 3kg pour achats internationaux
      default:
        return 2
    }
  }

  /**
   * Envoie une notification de match au livreur
   */
  private async sendMatchNotification(delivererUserId: string, match: MatchingScore): Promise<void> {
    try {
      const announcement = await prisma.announcement.findUnique({
        where: { id: match.announcementId },
        include: {
          author: {
            include: {
              profile: true
            }
          }
        }
      })

      if (!announcement) return

      await this.notificationService.sendNotification({
        userId: delivererUserId,
        title: 'Nouvelle opportunité de livraison !',
        message: `Une annonce "${announcement.title}" correspond à votre trajet (${match.score}% de compatibilité)`,
        type: 'DELIVERY_OPPORTUNITY',
        data: {
          announcementId: announcement.id,
          matchScore: match.score,
          price: announcement.price
        }
      })

      // Marquer comme notifié
      await prisma.routeAnnouncementMatch.updateMany({
        where: {
          routeId: match.routeId,
          announcementId: match.announcementId
        },
        data: {
          isNotified: true,
          notifiedAt: new Date()
        }
      })

    } catch (error) {
      console.error('Error sending match notification:', error)
    }
  }
}