import { prisma } from '@/lib/db'
import { OneSignalService } from '@/lib/onesignal'

export interface NotificationData {
  userId: string
  type: string
  title: string
  message: string
  data?: Record<string, any>
  sendPush?: boolean
  priority?: 'low' | 'medium' | 'high'
}

export interface BulkNotificationData {
  userIds: string[]
  type: string
  title: string
  message: string
  data?: Record<string, any>
  sendPush?: boolean
}

export class NotificationService {
  /**
   * Créer une notification
   */
  static async createNotification(notificationData: NotificationData) {
    const { userId, type, title, message, data, sendPush = true, priority = 'medium' } = notificationData

    try {
      // Créer la notification en base
      const notification = await prisma.notification.create({
        data: {
          userId,
          type,
          title,
          message,
          data: data || {},
          isPush: sendPush
        }
      })

      // Envoyer la notification push si demandée
      if (sendPush) {
        try {
          await OneSignalService.sendToUser(userId, title, message, {
            notificationId: notification.id,
            type,
            priority,
            ...data
          })

          // Marquer comme envoyée
          await prisma.notification.update({
            where: { id: notification.id },
            data: { 
              pushSentAt: new Date(),
              isPush: true
            }
          })
        } catch (pushError) {
          console.error('Erreur envoi push notification:', pushError)
          // La notification reste en base même si le push échoue
        }
      }

      return notification
    } catch (error) {
      console.error('Erreur création notification:', error)
      throw error
    }
  }

  /**
   * Créer des notifications en masse
   */
  static async createBulkNotifications(bulkData: BulkNotificationData) {
    const { userIds, type, title, message, data, sendPush = true } = bulkData

    try {
      // Créer toutes les notifications en base
      const notifications = await prisma.notification.createMany({
        data: userIds.map(userId => ({
          userId,
          type,
          title,
          message,
          data: data || {},
          isPush: sendPush
        }))
      })

      // Envoyer les notifications push si demandées
      if (sendPush && userIds.length > 0) {
        try {
          // Utiliser les filtres OneSignal pour l'envoi en masse
          await OneSignalService.sendWithFilters([
            {
              field: 'external_user_id',
              relation: 'IN',
              value: userIds
            }
          ], title, message, {
            type,
            ...data
          })
        } catch (pushError) {
          console.error('Erreur envoi push notifications en masse:', pushError)
        }
      }

      return notifications
    } catch (error) {
      console.error('Erreur création notifications en masse:', error)
      throw error
    }
  }

  /**
   * Notifications spécialisées pour EcoDeli
   */

  // Nouvelle opportunité de livraison
  static async notifyDeliveryOpportunity(
    delivererId: string,
    announcementId: string,
    announcementData: {
      title: string
      pickupLocation: string
      deliveryLocation: string
      price: number
      desiredDate: Date
    }
  ) {
    await this.createNotification({
      userId: delivererId,
      type: 'DELIVERY_OPPORTUNITY',
      title: '🚚 Nouvelle opportunité de livraison',
      message: `${announcementData.title} • ${announcementData.pickupLocation} → ${announcementData.deliveryLocation} • ${announcementData.price}€`,
      data: {
        announcementId,
        ...announcementData
      },
      sendPush: true,
      priority: 'high'
    })

    // Envoi spécialisé OneSignal avec boutons d'action
    try {
      await OneSignalService.notifyDeliveryOpportunity(
        delivererId,
        announcementId,
        announcementData.title,
        announcementData.pickupLocation,
        announcementData.deliveryLocation,
        announcementData.price
      )
    } catch (error) {
      console.error('Erreur notification OneSignal livraison:', error)
    }
  }

  // Mise à jour de statut de livraison
  static async notifyDeliveryStatusUpdate(
    clientId: string,
    deliveryId: string,
    status: string,
    customMessage?: string
  ) {
    const statusMessages: Record<string, string> = {
      'ACCEPTED': 'Votre livraison a été acceptée par un livreur',
      'PICKED_UP': 'Votre colis a été récupéré',
      'IN_TRANSIT': 'Votre colis est en cours de livraison',
      'DELIVERED': 'Votre colis a été livré avec succès',
      'CANCELLED': 'Votre livraison a été annulée'
    }

    const message = customMessage || statusMessages[status] || 'Statut de livraison mis à jour'

    await this.createNotification({
      userId: clientId,
      type: 'DELIVERY_STATUS_UPDATE',
      title: 'Mise à jour de livraison',
      message,
      data: {
        deliveryId,
        status
      },
      sendPush: true,
      priority: status === 'DELIVERED' ? 'high' : 'medium'
    })

    // Notification OneSignal spécialisée
    try {
      await OneSignalService.notifyDeliveryUpdate(clientId, deliveryId, status, message)
    } catch (error) {
      console.error('Erreur notification OneSignal mise à jour:', error)
    }
  }

  // Nouvelle réservation pour prestataire
  static async notifyNewBooking(
    providerId: string,
    bookingId: string,
    bookingData: {
      serviceName: string
      clientName: string
      scheduledDate: string
      price: number
    }
  ) {
    await this.createNotification({
      userId: providerId,
      type: 'NEW_BOOKING',
      title: '📅 Nouvelle réservation',
      message: `${bookingData.serviceName} avec ${bookingData.clientName} le ${bookingData.scheduledDate}`,
      data: {
        bookingId,
        ...bookingData
      },
      sendPush: true,
      priority: 'high'
    })

    // Notification OneSignal spécialisée
    try {
      await OneSignalService.notifyNewBooking(
        providerId,
        bookingId,
        bookingData.serviceName,
        bookingData.clientName,
        bookingData.scheduledDate,
        bookingData.price
      )
    } catch (error) {
      console.error('Erreur notification OneSignal booking:', error)
    }
  }

  // Paiement reçu
  static async notifyPaymentReceived(
    userId: string,
    amount: number,
    description: string,
    type: 'delivery' | 'booking' | 'subscription' = 'delivery'
  ) {
    await this.createNotification({
      userId,
      type: 'PAYMENT_RECEIVED',
      title: '💰 Paiement reçu',
      message: `Vous avez reçu ${amount}€ pour ${description}`,
      data: {
        amount,
        description,
        paymentType: type
      },
      sendPush: true,
      priority: 'medium'
    })

    // Notification OneSignal spécialisée
    try {
      await OneSignalService.notifyPaymentReceived(userId, amount, description, type)
    } catch (error) {
      console.error('Erreur notification OneSignal paiement:', error)
    }
  }

  // Validation de document
  static async notifyDocumentValidation(
    userId: string,
    documentName: string,
    status: 'APPROVED' | 'REJECTED',
    notes?: string
  ) {
    const isApproved = status === 'APPROVED'
    
    await this.createNotification({
      userId,
      type: isApproved ? 'DOCUMENT_APPROVED' : 'DOCUMENT_REJECTED',
      title: `Document ${isApproved ? 'approuvé' : 'rejeté'}`,
      message: `Votre document "${documentName}" a été ${isApproved ? 'approuvé' : 'rejeté'}${notes ? '. ' + notes : '.'}`,
      data: {
        documentName,
        status,
        notes
      },
      sendPush: true,
      priority: 'medium'
    })

    // Notification OneSignal spécialisée
    try {
      await OneSignalService.notifyDocumentValidation(userId, documentName, status, notes)
    } catch (error) {
      console.error('Erreur notification OneSignal validation:', error)
    }
  }

  // Activation de compte
  static async notifyAccountActivated(
    userId: string,
    accountType: 'deliverer' | 'provider'
  ) {
    const typeLabels = {
      deliverer: 'livreur',
      provider: 'prestataire'
    }

    await this.createNotification({
      userId,
      type: accountType === 'deliverer' ? 'DELIVERER_ACTIVATED' : 'PROVIDER_ACTIVATED',
      title: '🎉 Compte activé !',
      message: `Félicitations ! Votre compte ${typeLabels[accountType]} a été activé. Vous pouvez maintenant commencer à travailler.`,
      data: {
        accountType
      },
      sendPush: true,
      priority: 'high'
    })

    // Notification OneSignal spécialisée
    try {
      await OneSignalService.notifyAccountActivated(userId, accountType)
    } catch (error) {
      console.error('Erreur notification OneSignal activation:', error)
    }
  }

  /**
   * Gestion des notifications
   */

  // Marquer comme lue
  static async markAsRead(notificationId: string, userId: string) {
    return await prisma.notification.updateMany({
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
  static async markAllAsRead(userId: string) {
    return await prisma.notification.updateMany({
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

  // Récupérer les notifications d'un utilisateur
  static async getUserNotifications(
    userId: string,
    options: {
      limit?: number
      offset?: number
      unreadOnly?: boolean
      type?: string
    } = {}
  ) {
    const { limit = 20, offset = 0, unreadOnly = false, type } = options

    const where: any = { userId }
    if (unreadOnly) where.isRead = false
    if (type) where.type = type

    return await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    })
  }

  // Compter les notifications non lues
  static async getUnreadCount(userId: string) {
    return await prisma.notification.count({
      where: {
        userId,
        isRead: false
      }
    })
  }

  // Supprimer les anciennes notifications
  static async cleanupOldNotifications(daysOld: number = 30) {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysOld)

    return await prisma.notification.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate
        },
        isRead: true
      }
    })
  }

  /**
   * Notifications système et administratives
   */

  // Notification à tous les livreurs
  static async notifyAllDeliverers(title: string, message: string, data?: Record<string, any>) {
    const deliverers = await prisma.deliverer.findMany({
      where: { isActive: true },
      include: { user: true }
    })

    const userIds = deliverers.map(d => d.user.id)

    if (userIds.length > 0) {
      await this.createBulkNotifications({
        userIds,
        type: 'SYSTEM_ANNOUNCEMENT',
        title,
        message,
        data,
        sendPush: true
      })
    }
  }

  // Notification à tous les prestataires
  static async notifyAllProviders(title: string, message: string, data?: Record<string, any>) {
    const providers = await prisma.provider.findMany({
      where: { isActive: true },
      include: { user: true }
    })

    const userIds = providers.map(p => p.user.id)

    if (userIds.length > 0) {
      await this.createBulkNotifications({
        userIds,
        type: 'SYSTEM_ANNOUNCEMENT',
        title,
        message,
        data,
        sendPush: true
      })
    }
  }

  // Notification de maintenance système
  static async notifySystemMaintenance(
    startTime: Date,
    endTime: Date,
    description?: string
  ) {
    const title = '🔧 Maintenance programmée'
    const message = `Maintenance du système prévue de ${startTime.toLocaleString()} à ${endTime.toLocaleString()}${description ? '. ' + description : '.'}`

    // Notifier tous les utilisateurs actifs
    const activeUsers = await prisma.user.findMany({
      where: { isActive: true },
      select: { id: true }
    })

    const userIds = activeUsers.map(u => u.id)

    if (userIds.length > 0) {
      await this.createBulkNotifications({
        userIds,
        type: 'SYSTEM_MAINTENANCE',
        title,
        message,
        data: {
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          description
        },
        sendPush: true
      })
    }
  }
}

// Export par défaut pour l'import simple
export const notificationService = NotificationService
export default NotificationService