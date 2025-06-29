import { prisma } from '@/lib/db'
import { OneSignalService } from '@/lib/onesignal'
import { ecoLogger } from '@/lib/logger'

export interface EnhancedNotificationData {
  userId: string
  type: string
  title: string
  message: string
  data?: Record<string, any>
  priority?: 'low' | 'normal' | 'high' | 'urgent'
  channels?: Array<'database' | 'push' | 'email' | 'sms'>
  scheduledFor?: Date
  expiresAt?: Date
  category?: string
  actionUrl?: string
  imageUrl?: string
  buttons?: Array<{
    id: string
    text: string
    url?: string
    action?: string
  }>
}

export class EnhancedNotificationService {
  /**
   * Envoyer une notification multicanal
   */
  static async send(notificationData: EnhancedNotificationData): Promise<string> {
    try {
      const {
        userId,
        type,
        title,
        message,
        data = {},
        priority = 'normal',
        channels = ['database', 'push'],
        scheduledFor,
        expiresAt,
        category,
        actionUrl,
        imageUrl,
        buttons
      } = notificationData

      // Vérifier les préférences utilisateur
      const userSettings = await this.getUserNotificationSettings(userId)
      if (!userSettings.enabled) {
        ecoLogger.notifications.info('Notifications désactivées pour l\'utilisateur', { userId })
        return ''
      }

      // Filtrer selon les préférences
      const filteredChannels = this.filterChannelsByUserPreferences(channels, type, userSettings)
      
      if (filteredChannels.length === 0) {
        ecoLogger.notifications.info('Aucun canal autorisé pour cette notification', { userId, type })
        return ''
      }

      let notificationId = ''

      // 1. Enregistrer en base de données (toujours)
      if (filteredChannels.includes('database')) {
        const dbNotification = await prisma.notification.create({
          data: {
            userId,
            type,
            title,
            message,
            data: {
              ...data,
              priority,
              category,
              actionUrl,
              imageUrl,
              buttons
            },
            priority,
            category,
            scheduledFor,
            expiresAt,
            status: scheduledFor ? 'SCHEDULED' : 'SENT'
          }
        })
        
        notificationId = dbNotification.id
      }

      // 2. Envoyer push notification si autorisé
      if (filteredChannels.includes('push')) {
        try {
          const pushResult = await this.sendPushNotification({
            userId,
            title,
            message,
            data: {
              ...data,
              notificationId,
              type,
              priority
            },
            actionUrl,
            imageUrl,
            buttons,
            scheduledFor
          })

          // Mettre à jour avec l'ID OneSignal
          if (notificationId && pushResult.id) {
            await prisma.notification.update({
              where: { id: notificationId },
              data: {
                data: {
                  ...data,
                  oneSignalId: pushResult.id
                },
                pushSentAt: new Date()
              }
            })
          }
        } catch (error) {
          ecoLogger.notifications.error('Erreur envoi push notification', { userId, error })
        }
      }

      // 3. Envoyer email si autorisé (à implémenter)
      if (filteredChannels.includes('email')) {
        // TODO: Implémenter l'envoi d'email
      }

      // 4. Envoyer SMS si autorisé (à implémenter)
      if (filteredChannels.includes('sms')) {
        // TODO: Implémenter l'envoi de SMS
      }

      ecoLogger.notifications.sent(notificationId, userId, type, filteredChannels)
      return notificationId

    } catch (error) {
      ecoLogger.notifications.error('Erreur envoi notification', {
        userId: notificationData.userId,
        type: notificationData.type,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  /**
   * Notifications spécifiques au domaine métier
   */

  // Nouvelle opportunité de livraison
  static async notifyDeliveryOpportunity(
    delivererId: string,
    announcement: any
  ): Promise<string> {
    const distance = announcement.estimatedDistance || 0
    const timeEstimate = Math.round(distance / 30 * 60) // Estimation 30km/h

    return this.send({
      userId: delivererId,
      type: 'DELIVERY_OPPORTUNITY',
      category: 'opportunities',
      title: '🚚 Nouvelle opportunité',
      message: `${announcement.title} • ${announcement.pickupLocation.city} → ${announcement.deliveryLocation.city} • ${announcement.maxPrice}€`,
      data: {
        announcementId: announcement.id,
        price: announcement.maxPrice,
        distance: distance,
        timeEstimate: timeEstimate,
        pickupLocation: announcement.pickupLocation,
        deliveryLocation: announcement.deliveryLocation,
        packageType: announcement.packageType,
        urgency: announcement.urgency
      },
      priority: announcement.urgency === 'URGENT' ? 'high' : 'normal',
      actionUrl: `/deliverer/opportunities/${announcement.id}`,
      buttons: [
        {
          id: 'view_details',
          text: 'Voir détails',
          url: `/deliverer/opportunities/${announcement.id}`
        },
        {
          id: 'quick_accept',
          text: 'Accepter',
          action: 'accept_opportunity'
        }
      ],
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // Expire dans 24h
    })
  }

  // Mise à jour de statut de livraison
  static async notifyDeliveryStatusUpdate(
    clientId: string,
    delivery: any,
    newStatus: string,
    delivererName?: string
  ): Promise<string> {
    const statusMessages = {
      'ACCEPTED': `${delivererName} a accepté votre livraison`,
      'PICKED_UP': `Votre colis a été récupéré par ${delivererName}`,
      'IN_TRANSIT': `Votre colis est en cours de livraison`,
      'DELIVERED': `Votre colis a été livré avec succès !`,
      'DELIVERY_ATTEMPT': `Tentative de livraison - ${delivererName} n'a pas pu vous joindre`,
      'CANCELLED': 'Votre livraison a été annulée'
    }

    const statusEmojis = {
      'ACCEPTED': '✅',
      'PICKED_UP': '📦',
      'IN_TRANSIT': '🚛',
      'DELIVERED': '🎉',
      'DELIVERY_ATTEMPT': '⚠️',
      'CANCELLED': '❌'
    }

    const priority = newStatus === 'DELIVERED' ? 'high' : 
                    newStatus === 'DELIVERY_ATTEMPT' ? 'urgent' : 'normal'

    return this.send({
      userId: clientId,
      type: 'DELIVERY_STATUS_UPDATE',
      category: 'deliveries',
      title: `${statusEmojis[newStatus]} Livraison mise à jour`,
      message: statusMessages[newStatus] || `Statut mis à jour: ${newStatus}`,
      data: {
        deliveryId: delivery.id,
        status: newStatus,
        delivererName,
        trackingCode: delivery.trackingCode,
        estimatedDelivery: delivery.estimatedDelivery
      },
      priority,
      actionUrl: `/client/deliveries/${delivery.id}/tracking`,
      buttons: [
        {
          id: 'track',
          text: 'Suivre',
          url: `/client/deliveries/${delivery.id}/tracking`
        },
        ...(newStatus === 'DELIVERED' ? [{
          id: 'rate',
          text: 'Noter',
          url: `/client/deliveries/${delivery.id}/rate`
        }] : [])
      ]
    })
  }

  // Nouveau service booking
  static async notifyNewServiceBooking(
    providerId: string,
    booking: any
  ): Promise<string> {
    return this.send({
      userId: providerId,
      type: 'NEW_SERVICE_BOOKING',
      category: 'bookings',
      title: '📅 Nouvelle réservation',
      message: `${booking.service.name} avec ${booking.client.user.profile?.firstName} le ${new Date(booking.scheduledDate).toLocaleDateString('fr-FR')}`,
      data: {
        bookingId: booking.id,
        serviceName: booking.service.name,
        clientName: `${booking.client.user.profile?.firstName} ${booking.client.user.profile?.lastName}`,
        scheduledDate: booking.scheduledDate,
        duration: booking.duration,
        price: booking.totalPrice,
        location: booking.location
      },
      priority: 'high',
      actionUrl: `/provider/bookings/${booking.id}`,
      buttons: [
        {
          id: 'accept_booking',
          text: 'Accepter',
          action: 'accept_booking'
        },
        {
          id: 'view_details',
          text: 'Voir détails',
          url: `/provider/bookings/${booking.id}`
        }
      ],
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000) // Expire dans 48h
    })
  }

  // Notification de paiement
  static async notifyPaymentReceived(
    userId: string,
    payment: any,
    type: 'delivery' | 'service' | 'monthly_billing'
  ): Promise<string> {
    const typeLabels = {
      delivery: 'livraison',
      service: 'service',
      monthly_billing: 'facturation mensuelle'
    }

    const typeEmojis = {
      delivery: '🚚',
      service: '🔧',
      monthly_billing: '📊'
    }

    return this.send({
      userId,
      type: 'PAYMENT_RECEIVED',
      category: 'payments',
      title: `💰 Paiement reçu`,
      message: `Vous avez reçu ${payment.amount}€ pour ${typeLabels[type]}`,
      data: {
        paymentId: payment.id,
        amount: payment.amount,
        paymentType: type,
        reference: payment.reference,
        method: payment.method
      },
      priority: 'normal',
      actionUrl: '/wallet',
      buttons: [
        {
          id: 'view_wallet',
          text: 'Voir portefeuille',
          url: '/wallet'
        },
        {
          id: 'download_receipt',
          text: 'Télécharger reçu',
          action: 'download_receipt'
        }
      ]
    })
  }

  // Validation de document
  static async notifyDocumentValidation(
    userId: string,
    document: any,
    status: 'APPROVED' | 'REJECTED',
    notes?: string
  ): Promise<string> {
    const isApproved = status === 'APPROVED'

    return this.send({
      userId,
      type: 'DOCUMENT_VALIDATION',
      category: 'documents',
      title: `${isApproved ? '✅' : '❌'} Document ${isApproved ? 'approuvé' : 'rejeté'}`,
      message: `Votre document "${document.name}" a été ${isApproved ? 'approuvé' : 'rejeté'}${notes ? '. ' + notes : '.'}`,
      data: {
        documentId: document.id,
        documentName: document.name,
        status,
        notes,
        validatedAt: new Date().toISOString()
      },
      priority: isApproved ? 'normal' : 'high',
      actionUrl: '/documents',
      buttons: [
        {
          id: 'view_documents',
          text: 'Voir mes documents',
          url: '/documents'
        },
        ...(isApproved ? [] : [{
          id: 'resubmit',
          text: 'Soumettre à nouveau',
          url: `/documents/${document.id}/resubmit`
        }])
      ]
    })
  }

  // Alerte système
  static async notifySystemAlert(
    userIds: string[] | 'all',
    title: string,
    message: string,
    severity: 'info' | 'warning' | 'error' = 'info'
  ): Promise<string[]> {
    const priorityMap = {
      info: 'normal' as const,
      warning: 'high' as const,
      error: 'urgent' as const
    }

    const emojiMap = {
      info: 'ℹ️',
      warning: '⚠️',
      error: '🚨'
    }

    if (userIds === 'all') {
      // Envoyer à tous les utilisateurs actifs
      const activeUsers = await prisma.user.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true }
      })
      
      const notifications = await Promise.allSettled(
        activeUsers.map(user => 
          this.send({
            userId: user.id,
            type: 'SYSTEM_ALERT',
            category: 'system',
            title: `${emojiMap[severity]} ${title}`,
            message,
            data: {
              severity,
              systemAlert: true,
              timestamp: new Date().toISOString()
            },
            priority: priorityMap[severity],
            channels: ['database', 'push']
          })
        )
      )

      return notifications
        .filter((result): result is PromiseFulfilledResult<string> => result.status === 'fulfilled')
        .map(result => result.value)
    } else {
      // Envoyer à des utilisateurs spécifiques
      const notifications = await Promise.allSettled(
        userIds.map(userId => 
          this.send({
            userId,
            type: 'SYSTEM_ALERT',
            category: 'system',
            title: `${emojiMap[severity]} ${title}`,
            message,
            data: {
              severity,
              systemAlert: true,
              timestamp: new Date().toISOString()
            },
            priority: priorityMap[severity],
            channels: ['database', 'push']
          })
        )
      )

      return notifications
        .filter((result): result is PromiseFulfilledResult<string> => result.status === 'fulfilled')
        .map(result => result.value)
    }
  }

  /**
   * Méthodes utilitaires privées
   */

  private static async getUserNotificationSettings(userId: string) {
    const settings = await prisma.userNotificationSettings.findUnique({
      where: { userId }
    })

    return settings || {
      enabled: true,
      deliveryUpdates: true,
      newOpportunities: true,
      paymentNotifications: true,
      systemAlerts: true,
      marketing: false,
      soundEnabled: true,
      vibrationEnabled: true
    }
  }

  private static filterChannelsByUserPreferences(
    channels: string[],
    notificationType: string,
    settings: any
  ): string[] {
    if (!settings.enabled) return []

    // Mapper les types de notifications aux préférences
    const typeToSettingMap: Record<string, string> = {
      'DELIVERY_OPPORTUNITY': 'newOpportunities',
      'DELIVERY_STATUS_UPDATE': 'deliveryUpdates',
      'NEW_SERVICE_BOOKING': 'newOpportunities',
      'PAYMENT_RECEIVED': 'paymentNotifications',
      'DOCUMENT_VALIDATION': 'systemAlerts',
      'SYSTEM_ALERT': 'systemAlerts',
      'MARKETING': 'marketing'
    }

    const settingKey = typeToSettingMap[notificationType]
    if (settingKey && !settings[settingKey]) {
      // Si ce type de notification est désactivé, ne garder que la base de données
      return channels.filter(channel => channel === 'database')
    }

    return channels
  }

  private static async sendPushNotification(data: {
    userId: string
    title: string
    message: string
    data?: Record<string, any>
    actionUrl?: string
    imageUrl?: string
    buttons?: Array<{ id: string; text: string; url?: string; action?: string }>
    scheduledFor?: Date
  }) {
    const options: any = {}

    if (data.actionUrl) {
      options.url = data.actionUrl
    }

    if (data.imageUrl) {
      options.big_picture = data.imageUrl
    }

    if (data.buttons) {
      options.buttons = data.buttons.map(btn => ({
        id: btn.id,
        text: btn.text,
        url: btn.url
      }))
    }

    if (data.scheduledFor) {
      options.send_after = data.scheduledFor.toISOString()
    }

    return await OneSignalService.sendToUser(
      data.userId,
      data.title,
      data.message,
      data.data,
      options
    )
  }

  /**
   * Méthodes de gestion des notifications
   */

  // Marquer comme lue
  static async markAsRead(notificationId: string, userId: string): Promise<void> {
    await prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId
      },
      data: {
        isRead: true,
        readAt: new Date()
      }
    })
  }

  // Marquer toutes comme lues
  static async markAllAsRead(userId: string): Promise<void> {
    await prisma.notification.updateMany({
      where: {
        userId,
        isRead: false
      },
      data: {
        isRead: true,
        readAt: new Date()
      }
    })
  }

  // Supprimer une notification
  static async deleteNotification(notificationId: string, userId: string): Promise<void> {
    await prisma.notification.deleteMany({
      where: {
        id: notificationId,
        userId
      }
    })
  }

  // Obtenir les notifications d'un utilisateur
  static async getUserNotifications(
    userId: string,
    options: {
      limit?: number
      offset?: number
      unreadOnly?: boolean
      category?: string
    } = {}
  ) {
    const { limit = 20, offset = 0, unreadOnly = false, category } = options

    const where: any = { userId }
    
    if (unreadOnly) {
      where.isRead = false
    }
    
    if (category) {
      where.category = category
    }

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    })

    const unreadCount = await prisma.notification.count({
      where: {
        userId,
        isRead: false
      }
    })

    return {
      notifications,
      unreadCount,
      hasMore: notifications.length === limit
    }
  }
}