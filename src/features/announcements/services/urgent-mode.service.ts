import { db } from '@/lib/db'
import { matchingService } from './matching.service'
import { advancedNotificationService } from '@/features/notifications/services/advanced-notification.service'

interface UrgentPricingConfig {
  baseMultiplier: number // Multiplicateur de base pour annonces urgentes
  timeBasedMultipliers: Array<{
    maxHours: number // Dans les X heures
    multiplier: number // Multiplicateur tarifaire
  }>
  demandBasedMultiplier: number // Multiplicateur selon demande
  distanceBasedMultiplier: number // Multiplicateur selon distance
  maxUrgencyFee: number // Frais d'urgence maximum
}

interface DynamicPricing {
  originalPrice: number
  urgencyMultiplier: number
  demandMultiplier: number
  distanceMultiplier: number
  finalPrice: number
  urgencyFee: number
  guaranteedDeliveryTime: number // minutes
  priorityScore: number // 0-100
}

class UrgentModeService {

  // Configuration tarifaire urgence EcoDeli
  private readonly urgentPricingConfig: UrgentPricingConfig = {
    baseMultiplier: 1.5, // +50% de base
    timeBasedMultipliers: [
      { maxHours: 1, multiplier: 3.0 }, // x3 si dans l'heure
      { maxHours: 2, multiplier: 2.5 }, // x2.5 si dans les 2h
      { maxHours: 4, multiplier: 2.0 }, // x2 si dans les 4h
      { maxHours: 8, multiplier: 1.75 }, // x1.75 si dans les 8h
      { maxHours: 24, multiplier: 1.5 } // x1.5 si dans les 24h
    ],
    demandBasedMultiplier: 1.2, // +20% si haute demande
    distanceBasedMultiplier: 1.1, // +10% si longue distance
    maxUrgencyFee: 100 // Maximum 100€ de frais d'urgence
  }

  /**
   * Activer le mode urgence pour une annonce avec tarification dynamique
   */
  async activateUrgentMode(
    announcementId: string,
    urgencyReason: string,
    deliveryDeadline: Date,
    maxPriceAcceptable?: number
  ): Promise<DynamicPricing> {
    try {
      const announcement = await db.announcement.findUnique({
        where: { id: announcementId },
        include: {
          author: { include: { profile: true } }
        }
      })

      if (!announcement) {
        throw new Error('Annonce introuvable')
      }

      if (announcement.isUrgent) {
        throw new Error('Cette annonce est déjà en mode urgence')
      }

      // Calculer la tarification dynamique
      const dynamicPricing = await this.calculateUrgentPricing(
        announcement,
        deliveryDeadline
      )

      // Vérifier si le prix est acceptable pour le client
      if (maxPriceAcceptable && dynamicPricing.finalPrice > maxPriceAcceptable) {
        throw new Error(`Prix urgence (${dynamicPricing.finalPrice}€) dépasse le maximum accepté (${maxPriceAcceptable}€)`)
      }

      // Mettre à jour l'annonce
      const updatedAnnouncement = await db.$transaction(async (tx) => {
        const updated = await tx.announcement.update({
          where: { id: announcementId },
          data: {
            isUrgent: true,
            urgencyReason,
            urgencyFee: dynamicPricing.urgencyFee,
            finalPrice: dynamicPricing.finalPrice,
            deliveryDate: deliveryDeadline,
            urgencyActivatedAt: new Date(),
            priorityScore: dynamicPricing.priorityScore,
            guaranteedDeliveryTime: dynamicPricing.guaranteedDeliveryTime
          }
        })

        // Enregistrer l'historique des prix
        await tx.pricingHistory.create({
          data: {
            announcementId,
            priceType: 'URGENT_MODE_ACTIVATION',
            originalPrice: dynamicPricing.originalPrice,
            newPrice: dynamicPricing.finalPrice,
            reason: urgencyReason,
            urgencyMultiplier: dynamicPricing.urgencyMultiplier,
            demandMultiplier: dynamicPricing.demandMultiplier,
            distanceMultiplier: dynamicPricing.distanceMultiplier,
            createdAt: new Date()
          }
        })

        return updated
      })

      // Relancer le matching avec priorité urgente
      await this.triggerUrgentMatching(announcementId)

      // Notifier les livreurs proches immédiatement
      await this.broadcastUrgentNotification(updatedAnnouncement)

      return dynamicPricing

    } catch (error) {
      console.error('Error activating urgent mode:', error)
      throw error
    }
  }

  /**
   * Calculer la tarification dynamique pour une annonce urgente
   */
  private async calculateUrgentPricing(
    announcement: any,
    deliveryDeadline: Date
  ): Promise<DynamicPricing> {
    const now = new Date()
    const hoursUntilDeadline = (deliveryDeadline.getTime() - now.getTime()) / (1000 * 60 * 60)
    
    // Multiplicateur basé sur le temps
    let timeMultiplier = this.urgentPricingConfig.baseMultiplier
    for (const timeRule of this.urgentPricingConfig.timeBasedMultipliers) {
      if (hoursUntilDeadline <= timeRule.maxHours) {
        timeMultiplier = timeRule.multiplier
        break
      }
    }

    // Multiplicateur basé sur la demande actuelle
    const demandMultiplier = await this.calculateDemandMultiplier(announcement)
    
    // Multiplicateur basé sur la distance
    const distanceMultiplier = this.calculateDistanceMultiplier(announcement)
    
    // Calcul final
    const originalPrice = announcement.basePrice
    const urgencyMultiplier = timeMultiplier * demandMultiplier * distanceMultiplier
    
    let urgencyFee = originalPrice * (urgencyMultiplier - 1)
    
    // Limiter les frais d'urgence
    urgencyFee = Math.min(urgencyFee, this.urgentPricingConfig.maxUrgencyFee)
    
    const finalPrice = originalPrice + urgencyFee
    
    // Score de priorité (0-100)
    const priorityScore = Math.min(100, 50 + (timeMultiplier - 1) * 25)
    
    // Temps de livraison garanti (en minutes)
    const guaranteedDeliveryTime = Math.max(30, hoursUntilDeadline * 60 * 0.8)

    return {
      originalPrice,
      urgencyMultiplier,
      demandMultiplier,
      distanceMultiplier,
      finalPrice: Math.round(finalPrice * 100) / 100,
      urgencyFee: Math.round(urgencyFee * 100) / 100,
      guaranteedDeliveryTime,
      priorityScore
    }
  }

  /**
   * Calculer le multiplicateur basé sur la demande actuelle
   */
  private async calculateDemandMultiplier(announcement: any): Promise<number> {
    const now = new Date()
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
    
    // Compter les annonces urgentes récentes dans la même zone
    const recentUrgentCount = await db.announcement.count({
      where: {
        isUrgent: true,
        createdAt: { gte: oneHourAgo },
        // Même zone géographique (approximation)
        pickupLatitude: {
          gte: (announcement.pickupLatitude || 0) - 0.1,
          lte: (announcement.pickupLatitude || 0) + 0.1
        },
        pickupLongitude: {
          gte: (announcement.pickupLongitude || 0) - 0.1,
          lte: (announcement.pickupLongitude || 0) + 0.1
        }
      }
    })

    // Compter les livreurs actifs dans la zone
    const activeDeliverersCount = await db.delivererRoute.count({
      where: {
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now }
      }
    })

    // Ratio demande/offre
    const demandRatio = activeDeliverersCount > 0 ? recentUrgentCount / activeDeliverersCount : 1
    
    // Multiplicateur entre 1.0 et maxDemandMultiplier
    return Math.min(this.urgentPricingConfig.demandBasedMultiplier, 1 + demandRatio * 0.5)
  }

  /**
   * Calculer le multiplicateur basé sur la distance
   */
  private calculateDistanceMultiplier(announcement: any): number {
    if (!announcement.distance) return 1.0
    
    // Multiplicateur pour distances > 25km
    if (announcement.distance > 25) {
      return this.urgentPricingConfig.distanceBasedMultiplier
    }
    
    return 1.0
  }

  /**
   * Lancer le matching prioritaire pour annonces urgentes
   */
  private async triggerUrgentMatching(announcementId: string): Promise<void> {
    try {
      // Étendre la zone de recherche pour les annonces urgentes
      const announcement = await db.announcement.findUnique({
        where: { id: announcementId }
      })

      if (!announcement) return

      // Élargir les critères de matching pour urgence
      await db.announcement.update({
        where: { id: announcementId },
        data: {
          // Étendre la zone de 50% pour urgence
          searchRadius: (announcement.searchRadius || 25) * 1.5,
          // Accepter des scores de matching plus bas
          minMatchScore: Math.max(0.3, (announcement.minMatchScore || 0.6) - 0.2)
        }
      })

      // Relancer le matching avec les nouveaux critères
      await matchingService.triggerRouteMatching(announcementId)

    } catch (error) {
      console.error('Error triggering urgent matching:', error)
    }
  }

  /**
   * Diffuser une notification urgente à tous les livreurs proches
   */
  private async broadcastUrgentNotification(announcement: any): Promise<void> {
    try {
      // Rechercher tous les livreurs dans un rayon élargi
      const nearbyDeliverers = await db.user.findMany({
        where: {
          role: 'DELIVERER',
          deliverer: {
            isActive: true,
            isAvailableForUrgent: true
          }
        },
        include: {
          deliverer: true,
          profile: true
        }
      })

      // Envoyer notification push prioritaire
      for (const deliverer of nearbyDeliverers) {
        await advancedNotificationService.scheduleCustomNotification(
          deliverer.id,
          `🚨 URGENT - ${announcement.title} - ${announcement.finalPrice}€`,
          new Date(), // Immédiatement
          'URGENT',
          {
            type: 'URGENT_OPPORTUNITY',
            announcementId: announcement.id,
            price: announcement.finalPrice,
            urgencyFee: announcement.urgencyFee,
            guaranteedTime: announcement.guaranteedDeliveryTime,
            soundAlert: true,
            vibration: true
          }
        )
      }

      // Programmer des rappels si pas de réponse
      setTimeout(async () => {
        await this.sendUrgentReminders(announcement.id)
      }, 5 * 60 * 1000) // Rappel après 5 minutes

    } catch (error) {
      console.error('Error broadcasting urgent notification:', error)
    }
  }

  /**
   * Envoyer des rappels pour annonces urgentes sans réponse
   */
  private async sendUrgentReminders(announcementId: string): Promise<void> {
    const announcement = await db.announcement.findUnique({
      where: { id: announcementId },
      include: { matches: { where: { status: 'PENDING' } } }
    })

    if (!announcement || !announcement.isUrgent) return

    // Si toujours pas de match accepté
    const acceptedMatches = announcement.matches.filter(m => m.status === 'ACCEPTED')
    if (acceptedMatches.length === 0) {
      // Augmenter encore le prix si autorisé
      await this.escalateUrgentPricing(announcementId)
      
      // Notifier l'équipe support
      await this.notifyUrgentEscalation(announcement)
    }
  }

  /**
   * Escalader la tarification pour annonces urgentes critiques
   */
  private async escalateUrgentPricing(announcementId: string): Promise<void> {
    try {
      const announcement = await db.announcement.findUnique({
        where: { id: announcementId }
      })

      if (!announcement) return

      // Augmenter le prix de 25% supplémentaires
      const escalationMultiplier = 1.25
      const newPrice = announcement.finalPrice! * escalationMultiplier
      const additionalFee = newPrice - announcement.finalPrice!

      await db.$transaction(async (tx) => {
        await tx.announcement.update({
          where: { id: announcementId },
          data: {
            finalPrice: newPrice,
            urgencyFee: (announcement.urgencyFee || 0) + additionalFee,
            priorityScore: Math.min(100, (announcement.priorityScore || 0) + 10)
          }
        })

        // Enregistrer l'escalation
        await tx.pricingHistory.create({
          data: {
            announcementId,
            priceType: 'URGENT_ESCALATION',
            originalPrice: announcement.finalPrice!,
            newPrice,
            reason: 'Escalation automatique - pas de réponse après 5 minutes',
            urgencyMultiplier: escalationMultiplier,
            createdAt: new Date()
          }
        })
      })

      // Relancer le matching avec le nouveau prix
      await this.triggerUrgentMatching(announcementId)

    } catch (error) {
      console.error('Error escalating urgent pricing:', error)
    }
  }

  /**
   * Notifier l'équipe support pour intervention manuelle
   */
  private async notifyUrgentEscalation(announcement: any): Promise<void> {
    // Créer un ticket support automatique
    await db.supportTicket.create({
      data: {
        userId: announcement.authorId,
        subject: `ESCALATION URGENTE - Annonce ${announcement.id}`,
        description: `Annonce urgente sans livreur après escalation tarifaire. Intervention manuelle requise.`,
        priority: 'URGENT',
        category: 'URGENT_DELIVERY',
        status: 'OPEN',
        metadata: {
          announcementId: announcement.id,
          originalPrice: announcement.basePrice,
          currentPrice: announcement.finalPrice,
          urgencyReason: announcement.urgencyReason,
          escalationTime: new Date().toISOString()
        }
      }
    })

    // Notifier les administrateurs
    const admins = await db.user.findMany({
      where: { role: 'ADMIN' }
    })

    for (const admin of admins) {
      await advancedNotificationService.scheduleCustomNotification(
        admin.id,
        `🚨 ESCALATION: Annonce urgente ${announcement.id} nécessite intervention manuelle`,
        new Date(),
        'URGENT',
        {
          type: 'ADMIN_ESCALATION',
          announcementId: announcement.id,
          clientId: announcement.authorId
        }
      )
    }
  }

  /**
   * Obtenir les statistiques du mode urgence
   */
  async getUrgentModeStats(period: 'DAY' | 'WEEK' | 'MONTH' = 'DAY'): Promise<any> {
    const periodStart = new Date()
    switch (period) {
      case 'DAY':
        periodStart.setDate(periodStart.getDate() - 1)
        break
      case 'WEEK':
        periodStart.setDate(periodStart.getDate() - 7)
        break
      case 'MONTH':
        periodStart.setDate(periodStart.getDate() - 30)
        break
    }

    const urgentAnnouncements = await db.announcement.findMany({
      where: {
        isUrgent: true,
        urgencyActivatedAt: { gte: periodStart }
      },
      include: {
        _count: { select: { matches: true } }
      }
    })

    const totalUrgent = urgentAnnouncements.length
    const avgPrice = urgentAnnouncements.reduce((sum, a) => sum + (a.finalPrice || 0), 0) / totalUrgent
    const avgUrgencyFee = urgentAnnouncements.reduce((sum, a) => sum + (a.urgencyFee || 0), 0) / totalUrgent
    const successRate = urgentAnnouncements.filter(a => a.status === 'COMPLETED').length / totalUrgent * 100

    return {
      period,
      totalUrgentAnnouncements: totalUrgent,
      averagePrice: Math.round(avgPrice * 100) / 100,
      averageUrgencyFee: Math.round(avgUrgencyFee * 100) / 100,
      successRate: Math.round(successRate * 100) / 100,
      revenueFromUrgency: urgentAnnouncements.reduce((sum, a) => sum + (a.urgencyFee || 0), 0)
    }
  }
}

export const urgentModeService = new UrgentModeService()