import { db } from '@/lib/db'
import { announcementNotificationService } from '@/features/announcements/services/announcement-notification.service'

interface NotificationSchedule {
  id: string
  userId: string
  announcementId: string
  type: 'REMINDER' | 'STATUS_UPDATE' | 'DEADLINE_ALERT' | 'MATCH_EXPIRY' | 'PAYMENT_DUE'
  scheduledFor: Date
  message: string
  data?: Record<string, any>
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  status: 'PENDING' | 'SENT' | 'FAILED' | 'CANCELLED'
  retryCount: number
  maxRetries: number
}

interface ReminderConfig {
  type: 'ANNOUNCEMENT_REMINDER' | 'DELIVERY_REMINDER' | 'PAYMENT_REMINDER' | 'DEADLINE_WARNING'
  triggers: Array<{
    timeBeforeEvent: number // minutes
    message: string
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
    channels: Array<'PUSH' | 'EMAIL' | 'SMS'>
  }>
  repeatPattern?: {
    interval: number // minutes
    maxRepeats: number
    stopOnAction?: boolean
  }
}

class AdvancedNotificationService {

  /**
   * Programmer tous les rappels pour une annonce donnée
   */
  async scheduleAnnouncementReminders(announcementId: string): Promise<void> {
    try {
      const announcement = await db.announcement.findUnique({
        where: { id: announcementId },
        include: {
          author: { include: { profile: true } },
          matches: true
        }
      })

      if (!announcement) return

      // Rappels si pas de match trouvé
      if (announcement.matches.length === 0) {
        await this.scheduleNoMatchReminders(announcement)
      }

      // Rappels avant échéance pickup/delivery
      if (announcement.pickupDate) {
        await this.scheduleDeliveryReminders(announcement)
      }

      // Rappels paiement si applicable
      await this.schedulePaymentReminders(announcement)

      // Rappels expiration des matches
      await this.scheduleMatchExpiryReminders(announcement)

    } catch (error) {
      console.error('Error scheduling announcement reminders:', error)
    }
  }

  /**
   * Programmer les rappels quand aucun match n'est trouvé
   */
  private async scheduleNoMatchReminders(announcement: any): Promise<void> {
    const remindersConfig: ReminderConfig = {
      type: 'ANNOUNCEMENT_REMINDER',
      triggers: [
        {
          timeBeforeEvent: 30, // 30 minutes après création
          message: '🔍 Nous cherchons activement un livreur pour votre annonce',
          priority: 'MEDIUM',
          channels: ['PUSH']
        },
        {
          timeBeforeEvent: 120, // 2 heures
          message: '⏰ Votre annonce n\'a pas encore trouvé de livreur. Voulez-vous ajuster le prix ou les conditions ?',
          priority: 'HIGH',
          channels: ['PUSH', 'EMAIL']
        },
        {
          timeBeforeEvent: 360, // 6 heures
          message: '🚨 Annonce sans livreur depuis 6h. Nous élargissons automatiquement la zone de recherche.',
          priority: 'HIGH',
          channels: ['PUSH', 'EMAIL', 'SMS']
        },
        {
          timeBeforeEvent: 1440, // 24 heures
          message: '📞 Votre annonce n\'a toujours pas de livreur. Notre équipe va vous contacter pour vous aider.',
          priority: 'URGENT',
          channels: ['PUSH', 'EMAIL', 'SMS']
        }
      ]
    }

    for (const trigger of remindersConfig.triggers) {
      const scheduledFor = new Date(announcement.createdAt.getTime() + trigger.timeBeforeEvent * 60 * 1000)
      
      await this.createScheduledNotification({
        userId: announcement.authorId,
        announcementId: announcement.id,
        type: 'REMINDER',
        scheduledFor,
        message: trigger.message,
        priority: trigger.priority,
        data: {
          triggerType: 'NO_MATCH_FOUND',
          timeElapsed: trigger.timeBeforeEvent,
          channels: trigger.channels
        }
      })
    }
  }

  /**
   * Programmer les rappels avant livraison
   */
  private async scheduleDeliveryReminders(announcement: any): Promise<void> {
    if (!announcement.pickupDate) return

    const deliveryReminders = [
      {
        timeBeforeEvent: 60, // 1h avant
        message: `🚚 Rappel : votre livraison "${announcement.title}" est prévue dans 1 heure`,
        priority: 'HIGH' as const
      },
      {
        timeBeforeEvent: 240, // 4h avant
        message: `📦 N'oubliez pas : livraison prévue aujourd'hui à ${announcement.pickupDate.toLocaleTimeString()}`,
        priority: 'MEDIUM' as const
      },
      {
        timeBeforeEvent: 1440, // 24h avant
        message: `📅 Rappel : votre livraison est prévue demain`,
        priority: 'MEDIUM' as const
      }
    ]

    for (const reminder of deliveryReminders) {
      const scheduledFor = new Date(announcement.pickupDate.getTime() - reminder.timeBeforeEvent * 60 * 1000)
      
      // Ne programmer que si c'est dans le futur
      if (scheduledFor > new Date()) {
        await this.createScheduledNotification({
          userId: announcement.authorId,
          announcementId: announcement.id,
          type: 'REMINDER',
          scheduledFor,
          message: reminder.message,
          priority: reminder.priority,
          data: {
            triggerType: 'DELIVERY_REMINDER',
            timeBeforeDelivery: reminder.timeBeforeEvent
          }
        })
      }
    }
  }

  /**
   * Programmer les rappels paiement
   */
  private async schedulePaymentReminders(announcement: any): Promise<void> {
    // Vérifier si le paiement est en attente
    const payment = await db.payment.findFirst({
      where: { 
        announcementId: announcement.id,
        status: 'PENDING'
      }
    })

    if (!payment) return

    const paymentReminders = [
      {
        timeAfterCreation: 60, // 1h après création
        message: '💳 N\'oubliez pas de finaliser le paiement pour votre annonce',
        priority: 'MEDIUM' as const
      },
      {
        timeAfterCreation: 360, // 6h après
        message: '⚠️ Paiement en attente : votre annonce sera suspendue dans 18h sans paiement',
        priority: 'HIGH' as const
      },
      {
        timeAfterCreation: 1200, // 20h après
        message: '🚨 Dernières heures pour finaliser le paiement avant suspension de l\'annonce',
        priority: 'URGENT' as const
      }
    ]

    for (const reminder of paymentReminders) {
      const scheduledFor = new Date(announcement.createdAt.getTime() + reminder.timeAfterCreation * 60 * 1000)
      
      await this.createScheduledNotification({
        userId: announcement.authorId,
        announcementId: announcement.id,
        type: 'PAYMENT_DUE',
        scheduledFor,
        message: reminder.message,
        priority: reminder.priority,
        data: {
          paymentId: payment.id,
          amount: payment.amount
        }
      })
    }
  }

  /**
   * Programmer les rappels d'expiration des matches
   */
  private async scheduleMatchExpiryReminders(announcement: any): Promise<void> {
    const activeMatches = await db.routeMatch.findMany({
      where: {
        announcementId: announcement.id,
        status: 'PENDING',
        expiresAt: { gt: new Date() }
      },
      include: {
        deliverer: { include: { profile: true } }
      }
    })

    for (const match of activeMatches) {
      // Rappel au livreur 2h avant expiration
      const reminderTime = new Date(match.expiresAt.getTime() - 2 * 60 * 60 * 1000)
      
      if (reminderTime > new Date()) {
        await this.createScheduledNotification({
          userId: match.delivererId,
          announcementId: announcement.id,
          type: 'MATCH_EXPIRY',
          scheduledFor: reminderTime,
          message: `⏰ Plus que 2h pour accepter l'opportunité "${announcement.title}"`,
          priority: 'HIGH',
          data: {
            matchId: match.id,
            expiresAt: match.expiresAt
          }
        })
      }

      // Notification client si match expire sans réponse
      await this.createScheduledNotification({
        userId: announcement.authorId,
        announcementId: announcement.id,
        type: 'STATUS_UPDATE',
        scheduledFor: new Date(match.expiresAt.getTime() + 5 * 60 * 1000), // 5min après expiration
        message: `Un livreur n'a pas répondu à temps. Nous recherchons d'autres options.`,
        priority: 'MEDIUM',
        data: {
          matchId: match.id,
          delivererName: `${match.deliverer.profile?.firstName} ${match.deliverer.profile?.lastName}`
        }
      })
    }
  }

  /**
   * Créer une notification programmée
   */
  private async createScheduledNotification(data: Omit<NotificationSchedule, 'id' | 'status' | 'retryCount' | 'maxRetries'>): Promise<void> {
    await db.scheduledNotification.create({
      data: {
        ...data,
        status: 'PENDING',
        retryCount: 0,
        maxRetries: 3
      }
    })
  }

  /**
   * Traiter les notifications programmées (à appeler via CRON)
   */
  async processScheduledNotifications(): Promise<void> {
    try {
      const notifications = await db.scheduledNotification.findMany({
        where: {
          status: 'PENDING',
          scheduledFor: { lte: new Date() }
        },
        include: {
          user: { include: { profile: true } },
          announcement: true
        },
        orderBy: { priority: 'desc' }
      })

      for (const notification of notifications) {
        try {
          await this.sendScheduledNotification(notification)
          
          await db.scheduledNotification.update({
            where: { id: notification.id },
            data: { status: 'SENT', sentAt: new Date() }
          })

        } catch (error) {
          console.error(`Error sending notification ${notification.id}:`, error)
          
          const newRetryCount = notification.retryCount + 1
          if (newRetryCount >= notification.maxRetries) {
            await db.scheduledNotification.update({
              where: { id: notification.id },
              data: { status: 'FAILED', retryCount: newRetryCount }
            })
          } else {
            // Programmer un nouveau retry dans 5 minutes
            await db.scheduledNotification.update({
              where: { id: notification.id },
              data: { 
                retryCount: newRetryCount,
                scheduledFor: new Date(Date.now() + 5 * 60 * 1000)
              }
            })
          }
        }
      }

    } catch (error) {
      console.error('Error processing scheduled notifications:', error)
    }
  }

  /**
   * Envoyer une notification programmée
   */
  private async sendScheduledNotification(notification: any): Promise<void> {
    const channels = notification.data?.channels || ['PUSH']
    
    for (const channel of channels) {
      switch (channel) {
        case 'PUSH':
          await announcementNotificationService.sendNotificationToUser(
            notification.userId,
            {
              title: this.getNotificationTitle(notification.type),
              message: notification.message,
              data: notification.data
            }
          )
          break
          
        case 'EMAIL':
          // TODO: Implémenter envoi email
          console.log(`Sending email to user ${notification.userId}`)
          break
          
        case 'SMS':
          // TODO: Implémenter envoi SMS
          console.log(`Sending SMS to user ${notification.userId}`)
          break
      }
    }
  }

  /**
   * Générer le titre de notification selon le type
   */
  private getNotificationTitle(type: string): string {
    switch (type) {
      case 'REMINDER':
        return '📋 Rappel EcoDeli'
      case 'STATUS_UPDATE':
        return '📊 Mise à jour'
      case 'DEADLINE_ALERT':
        return '⏰ Échéance proche'
      case 'MATCH_EXPIRY':
        return '⏰ Opportunité expire bientôt'
      case 'PAYMENT_DUE':
        return '💳 Paiement en attente'
      default:
        return '🔔 EcoDeli'
    }
  }

  /**
   * Annuler toutes les notifications programmées pour une annonce
   */
  async cancelNotificationsForAnnouncement(announcementId: string): Promise<void> {
    await db.scheduledNotification.updateMany({
      where: {
        announcementId,
        status: 'PENDING'
      },
      data: { status: 'CANCELLED' }
    })
  }

  /**
   * Programmer une notification personnalisée
   */
  async scheduleCustomNotification(
    userId: string,
    message: string,
    scheduledFor: Date,
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' = 'MEDIUM',
    data?: Record<string, any>
  ): Promise<void> {
    await this.createScheduledNotification({
      userId,
      announcementId: '', // Notification générale
      type: 'REMINDER',
      scheduledFor,
      message,
      priority,
      data
    })
  }

  /**
   * Obtenir les statistiques des notifications
   */
  async getNotificationStats(period: 'DAY' | 'WEEK' | 'MONTH' = 'DAY'): Promise<any> {
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

    const stats = await db.scheduledNotification.groupBy({
      by: ['status'],
      where: {
        createdAt: { gte: periodStart }
      },
      _count: true
    })

    return {
      period,
      totalScheduled: stats.reduce((sum, stat) => sum + stat._count, 0),
      sent: stats.find(s => s.status === 'SENT')?._count || 0,
      pending: stats.find(s => s.status === 'PENDING')?._count || 0,
      failed: stats.find(s => s.status === 'FAILED')?._count || 0,
      cancelled: stats.find(s => s.status === 'CANCELLED')?._count || 0
    }
  }
}

export const advancedNotificationService = new AdvancedNotificationService()