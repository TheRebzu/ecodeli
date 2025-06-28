import { db } from '@/lib/db'

interface NotificationPayload {
  title: string
  message: string
  data?: Record<string, any>
  imageUrl?: string
}

interface OneSignalResponse {
  id: string
  recipients: number
  external_id?: string
}

class AnnouncementNotificationService {
  private readonly oneSignalAppId: string
  private readonly oneSignalApiKey: string
  private readonly apiUrl = 'https://onesignal.com/api/v1/notifications'

  constructor() {
    this.oneSignalAppId = process.env.ONESIGNAL_APP_ID || ''
    this.oneSignalApiKey = process.env.ONESIGNAL_API_KEY || ''
  }

  /**
   * Send notification when a new announcement matches deliverer routes
   */
  async notifyMatchingDeliverers(announcementId: string): Promise<void> {
    try {
      const announcement = await db.announcement.findUnique({
        where: { id: announcementId },
        include: {
          author: {
            select: { firstName: true, lastName: true }
          },
          routeMatches: {
            include: {
              delivererRoute: {
                include: {
                  deliverer: {
                    select: { id: true, oneSignalPlayerId: true }
                  }
                }
              }
            }
          }
        }
      })

      if (!announcement || !announcement.routeMatches.length) {
        return
      }

      const delivererIds = announcement.routeMatches
        .map(match => match.delivererRoute.deliverer.oneSignalPlayerId)
        .filter(Boolean)

      if (delivererIds.length === 0) {
        return
      }

      const urgencyEmoji = announcement.urgency === 'URGENT' ? '🚨 ' : ''
      const typeEmoji = this.getTypeEmoji(announcement.type)

      await this.sendNotification({
        playerIds: delivererIds,
        payload: {
          title: `${urgencyEmoji}Nouvelle opportunité de livraison`,
          message: `${typeEmoji} ${announcement.title} - ${announcement.price}€`,
          data: {
            type: 'NEW_OPPORTUNITY',
            announcementId: announcement.id,
            announcementType: announcement.type,
            price: announcement.price,
            urgency: announcement.urgency
          }
        }
      })

      // Log notification activity
      await this.logNotificationActivity(
        announcementId,
        'OPPORTUNITY_MATCH',
        delivererIds.length
      )
    } catch (error) {
      console.error('Error sending matching notification:', error)
      throw error
    }
  }

  /**
   * Send notification when a deliverer accepts an announcement
   */
  async notifyAnnouncementAccepted(announcementId: string, delivererId: string): Promise<void> {
    try {
      const announcement = await db.announcement.findUnique({
        where: { id: announcementId },
        include: {
          author: {
            select: { id: true, oneSignalPlayerId: true, firstName: true }
          },
          deliverer: {
            select: { firstName: true, lastName: true }
          }
        }
      })

      if (!announcement?.author?.oneSignalPlayerId) {
        return
      }

      const delivererName = announcement.deliverer 
        ? `${announcement.deliverer.firstName} ${announcement.deliverer.lastName}`
        : 'Un livreur'

      await this.sendNotification({
        playerIds: [announcement.author.oneSignalPlayerId],
        payload: {
          title: '✅ Votre annonce a été acceptée !',
          message: `${delivererName} va livrer votre colis "${announcement.title}"`,
          data: {
            type: 'ANNOUNCEMENT_ACCEPTED',
            announcementId: announcement.id,
            delivererId
          }
        }
      })

      await this.logNotificationActivity(
        announcementId,
        'ANNOUNCEMENT_ACCEPTED',
        1
      )
    } catch (error) {
      console.error('Error sending acceptance notification:', error)
      throw error
    }
  }

  /**
   * Send delivery status update notifications
   */
  async notifyDeliveryStatusUpdate(
    announcementId: string, 
    status: string, 
    message?: string
  ): Promise<void> {
    try {
      const announcement = await db.announcement.findUnique({
        where: { id: announcementId },
        include: {
          author: {
            select: { id: true, oneSignalPlayerId: true }
          }
        }
      })

      if (!announcement?.author?.oneSignalPlayerId) {
        return
      }

      const statusMessages = {
        'PICKUP_PENDING': 'Le livreur se dirige vers le point de collecte',
        'PICKED_UP': 'Votre colis a été récupéré',
        'IN_TRANSIT': 'Votre colis est en route',
        'DELIVERED': 'Votre colis a été livré !',
        'ISSUE': 'Un problème est survenu avec votre livraison',
        'DELAYED': 'Votre livraison est retardée'
      }

      const defaultMessage = statusMessages[status as keyof typeof statusMessages] || 'Mise à jour de votre livraison'
      const notificationMessage = message || defaultMessage

      const statusEmojis = {
        'PICKUP_PENDING': '🚚',
        'PICKED_UP': '📦',
        'IN_TRANSIT': '🛣️',
        'DELIVERED': '✅',
        'ISSUE': '⚠️',
        'DELAYED': '⏰'
      }

      const emoji = statusEmojis[status as keyof typeof statusEmojis] || '📍'

      await this.sendNotification({
        playerIds: [announcement.author.oneSignalPlayerId],
        payload: {
          title: `${emoji} ${announcement.title}`,
          message: notificationMessage,
          data: {
            type: 'DELIVERY_UPDATE',
            announcementId: announcement.id,
            status,
            message: notificationMessage
          }
        }
      })

      await this.logNotificationActivity(
        announcementId,
        `STATUS_UPDATE_${status}`,
        1
      )
    } catch (error) {
      console.error('Error sending status update notification:', error)
      throw error
    }
  }

  /**
   * Send reminder notifications
   */
  async sendReminders(): Promise<void> {
    try {
      // Remind deliverers about unresponded opportunities (30 minutes old)
      await this.remindUnrespondedOpportunities()
      
      // Remind clients about delivery time approaching
      await this.remindUpcomingDeliveries()
    } catch (error) {
      console.error('Error sending reminders:', error)
    }
  }

  private async remindUnrespondedOpportunities(): Promise<void> {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000)

    const unrespondedMatches = await db.routeAnnouncementMatch.findMany({
      where: {
        status: 'PENDING',
        createdAt: {
          lte: thirtyMinutesAgo
        },
        notificationSent: false
      },
      include: {
        announcement: {
          select: { id: true, title: true, price: true, type: true }
        },
        delivererRoute: {
          include: {
            deliverer: {
              select: { id: true, oneSignalPlayerId: true }
            }
          }
        }
      },
      take: 50
    })

    for (const match of unrespondedMatches) {
      if (!match.delivererRoute.deliverer.oneSignalPlayerId) continue

      const typeEmoji = this.getTypeEmoji(match.announcement.type)

      await this.sendNotification({
        playerIds: [match.delivererRoute.deliverer.oneSignalPlayerId],
        payload: {
          title: '⏰ Rappel - Opportunité en attente',
          message: `${typeEmoji} ${match.announcement.title} - ${match.announcement.price}€`,
          data: {
            type: 'OPPORTUNITY_REMINDER',
            announcementId: match.announcement.id,
            matchId: match.id
          }
        }
      })

      // Mark as reminded
      await db.routeAnnouncementMatch.update({
        where: { id: match.id },
        data: { notificationSent: true }
      })
    }
  }

  private async remindUpcomingDeliveries(): Promise<void> {
    const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000)

    const upcomingDeliveries = await db.announcement.findMany({
      where: {
        status: 'IN_PROGRESS',
        pickupDate: {
          lte: oneHourFromNow,
          gte: new Date()
        }
      },
      include: {
        author: {
          select: { id: true, oneSignalPlayerId: true }
        }
      },
      take: 50
    })

    for (const delivery of upcomingDeliveries) {
      if (!delivery.author.oneSignalPlayerId) continue

      await this.sendNotification({
        playerIds: [delivery.author.oneSignalPlayerId],
        payload: {
          title: '⏰ Livraison prévue dans 1 heure',
          message: `Votre livraison "${delivery.title}" arrive bientôt`,
          data: {
            type: 'DELIVERY_REMINDER',
            announcementId: delivery.id
          }
        }
      })
    }
  }

  private async sendNotification({
    playerIds,
    payload
  }: {
    playerIds: string[]
    payload: NotificationPayload
  }): Promise<OneSignalResponse | null> {
    if (!this.oneSignalAppId || !this.oneSignalApiKey) {
      console.warn('OneSignal credentials not configured')
      return null
    }

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${this.oneSignalApiKey}`
        },
        body: JSON.stringify({
          app_id: this.oneSignalAppId,
          include_player_ids: playerIds,
          headings: { en: payload.title },
          contents: { en: payload.message },
          data: payload.data,
          ...(payload.imageUrl && { large_icon: payload.imageUrl })
        })
      })

      if (!response.ok) {
        throw new Error(`OneSignal API error: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Failed to send OneSignal notification:', error)
      throw error
    }
  }

  private async logNotificationActivity(
    announcementId: string,
    type: string,
    recipientCount: number
  ): Promise<void> {
    try {
      await db.notificationLog.create({
        data: {
          announcementId,
          type,
          recipientCount,
          sentAt: new Date(),
          provider: 'ONESIGNAL'
        }
      })
    } catch (error) {
      console.error('Failed to log notification activity:', error)
    }
  }

  private getTypeEmoji(type: string): string {
    const emojis = {
      'PACKAGE': '📦',
      'SERVICE': '🛠️',
      'CART_DROP': '🛒'
    }
    return emojis[type as keyof typeof emojis] || '📦'
  }
}

export const announcementNotificationService = new AnnouncementNotificationService()