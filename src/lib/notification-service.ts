import { prisma } from '@/server/db';
import { NotificationType } from '@/types/notification';

export interface NotificationData {
  title: string;
  message: string;
  type: NotificationType;
  link?: string;
  data?: Record<string, any>;
}

/**
 * Service pour gérer les notifications du système
 */
export class NotificationService {
  /**
   * Envoie une notification à un utilisateur spécifique
   */
  static async sendToUser(userId: string, notification: NotificationData) {
    try {
      await prisma.notification.create({
        data: {
          userId,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          link: notification.link,
          data: notification.data ? JSON.stringify(notification.data) : null,
        },
      });
      return true;
    } catch (error) {
      console.error("Erreur lors de l'envoi de la notification:", error);
      return false;
    }
  }

  /**
   * Envoie une notification à tous les utilisateurs ayant un rôle spécifique
   */
  static async sendToRole(role: string, notification: NotificationData) {
    try {
      const users = await prisma.user.findMany({
        where: {
          role,
        },
        select: {
          id: true,
        },
      });

      await prisma.notification.createMany({
        data: users.map(user => ({
          userId: user.id,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          link: notification.link,
          data: notification.data ? JSON.stringify(notification.data) : null,
        })),
      });

      return true;
    } catch (error) {
      console.error("Erreur lors de l'envoi des notifications:", error);
      return false;
    }
  }

  /**
   * Envoie une notification à tous les administrateurs
   */
  static async sendToAdmins(notification: NotificationData) {
    return this.sendToRole('ADMIN', notification);
  }

  /**
   * Envoie une notification de document soumis aux administrateurs
   */
  static async sendDocumentSubmissionNotification(
    documentId: string,
    userId: string,
    documentType: string
  ) {
    try {
      // Récupérer les informations sur l'utilisateur
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, email: true },
      });

      if (!user) {
        throw new Error('Utilisateur non trouvé');
      }

      // Créer un lien vers la page de vérification du document
      const link = `/admin/documents/verification/${documentId}`;

      // Envoyer la notification aux administrateurs
      return this.sendToAdmins({
        title: 'Nouveau document à vérifier',
        message: `${user.name} a soumis un document de type ${documentType} pour vérification.`,
        type: 'DOCUMENT_SUBMISSION',
        link,
        data: { documentId, userId, documentType },
      });
    } catch (error) {
      console.error("Erreur lors de l'envoi de la notification de soumission de document:", error);
      return false;
    }
  }

  /**
   * Marquer une notification comme lue
   */
  static async markAsRead(notificationId: string) {
    try {
      await prisma.notification.update({
        where: { id: notificationId },
        data: {
          read: true,
          readAt: new Date(),
        },
      });
      return true;
    } catch (error) {
      console.error('Erreur lors du marquage de la notification comme lue:', error);
      return false;
    }
  }

  /**
   * Récupérer les notifications non lues d'un utilisateur
   */
  static async getUnreadNotifications(userId: string) {
    return prisma.notification.findMany({
      where: {
        userId,
        read: false,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}
