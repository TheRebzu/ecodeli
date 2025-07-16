import { prisma } from "@/lib/db";
import { EmailService } from "@/lib/email";

export interface NotificationData {
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, any>;
  sendPush?: boolean;
  priority?: "low" | "medium" | "high";
}

export interface BulkNotificationData {
  userIds: string[];
  type: string;
  title: string;
  message: string;
  data?: Record<string, any>;
  sendPush?: boolean;
}

// Fonction pour créer le service OneSignal de manière sécurisée
function createOneSignalService() {
  try {
    // Vérifier si OneSignal est configuré
    if (!process.env.ONESIGNAL_APP_ID || !process.env.ONESIGNAL_API_KEY) {
      console.warn("OneSignal not configured, push notifications will be disabled");
      return null;
    }
    
    if (process.env.ONESIGNAL_APP_ID === "your_onesignal_app_id" || 
        process.env.ONESIGNAL_API_KEY === "your_onesignal_api_key") {
      console.warn("OneSignal using placeholder values, push notifications will be disabled");
      return null;
    }
    
    // Importer dynamiquement OneSignal seulement si configuré
    const { OneSignalService } = require("@/lib/onesignal");
    return new OneSignalService();
  } catch (error) {
    console.warn("OneSignal service not available:", error.message);
    return null;
  }
}

export class NotificationService {
  private oneSignalService = createOneSignalService();

  /**
   * Créer une notification
   */
  async createNotification(notificationData: NotificationData) {
    const {
      userId,
      type,
      title,
      message,
      data = {},
      sendPush = false,
      priority = "medium",
    } = notificationData;

    try {
      // Créer la notification en base
      const notification = await prisma.notification.create({
        data: {
          userId,
          type,
          title,
          message,
          data,
          priority,
          read: false,
        },
      });

      // Envoyer la notification push si demandé et OneSignal configuré
      if (sendPush && this.oneSignalService) {
        try {
          await this.oneSignalService.sendToUser(userId, {
            title,
            message,
            data,
          });
        } catch (error) {
          console.error("Failed to send push notification:", error);
        }
      }

      return notification;
    } catch (error) {
      console.error("Error creating notification:", error);
      throw error;
    }
  }

  /**
   * Envoyer une notification
   */
  async sendNotification(notificationData: NotificationData) {
    return this.createNotification(notificationData);
  }

  /**
   * Envoyer des notifications en masse
   */
  async sendBulkNotification(bulkData: BulkNotificationData) {
    const { userIds, type, title, message, data = {}, sendPush = false } = bulkData;

    try {
      // Créer les notifications en base
      const notifications = await prisma.notification.createMany({
        data: userIds.map((userId) => ({
          userId,
          type,
          title,
          message,
          data,
          priority: "medium",
          read: false,
        })),
      });

      // Envoyer les notifications push si demandé et OneSignal configuré
      if (sendPush && this.oneSignalService) {
        try {
          await this.oneSignalService.sendToUsers(userIds, {
            title,
            message,
            data,
          });
        } catch (error) {
          console.error("Failed to send bulk push notifications:", error);
        }
      }

      return notifications;
    } catch (error) {
      console.error("Error sending bulk notifications:", error);
      throw error;
    }
  }

  /**
   * Marquer une notification comme lue
   */
  async markAsRead(notificationId: string) {
    try {
      await prisma.notification.update({
        where: { id: notificationId },
        data: { read: true, readAt: new Date() },
      });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      throw error;
    }
  }

  /**
   * Récupérer les notifications d'un utilisateur
   */
  async getUserNotifications(userId: string, limit = 20, offset = 0) {
    try {
      const notifications = await prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      });

      return notifications;
    } catch (error) {
      console.error("Error getting user notifications:", error);
      throw error;
    }
  }

  /**
   * Compter les notifications non lues
   */
  async getUnreadCount(userId: string) {
    try {
      const count = await prisma.notification.count({
        where: { userId, read: false },
      });

      return count;
    } catch (error) {
      console.error("Error getting unread count:", error);
      throw error;
    }
  }

  /**
   * Supprimer une notification
   */
  async deleteNotification(notificationId: string) {
    try {
      await prisma.notification.delete({
        where: { id: notificationId },
      });
    } catch (error) {
      console.error("Error deleting notification:", error);
      throw error;
    }
  }

  /**
   * Notifications spécifiques pour les paiements
   */
  async notifyPaymentReceived(userId: string, amount: number, message: string, type: string) {
    return this.createNotification({
      userId,
      type: "PAYMENT_RECEIVED",
      title: "Paiement reçu",
      message: `${message} - ${amount}€`,
      data: { amount, type },
      sendPush: true,
      priority: "high",
    });
  }

  /**
   * Notifications pour les livraisons
   */
  async notifyDeliveryUpdate(userId: string, deliveryId: string, status: string, message: string) {
    return this.createNotification({
      userId,
      type: "DELIVERY_UPDATE",
      title: "Mise à jour de livraison",
      message,
      data: { deliveryId, status },
      sendPush: true,
      priority: "medium",
    });
  }

  /**
   * Notifications pour les annonces
   */
  async notifyAnnouncementUpdate(userId: string, announcementId: string, title: string, message: string) {
    return this.createNotification({
      userId,
      type: "ANNOUNCEMENT_UPDATE",
      title,
      message,
      data: { announcementId },
      sendPush: true,
      priority: "medium",
    });
  }

  /**
   * Notifications pour la validation de documents
   */
  async notifyDocumentValidation(userId: string, documentType: string, status: string) {
    const title = status === "approved" ? "Document validé" : "Document rejeté";
    const message = `Votre ${documentType} a été ${status === "approved" ? "validé" : "rejeté"}`;

    return this.createNotification({
      userId,
      type: "DOCUMENT_VALIDATION",
      title,
      message,
      data: { documentType, status },
      sendPush: true,
      priority: "high",
    });
  }
}
