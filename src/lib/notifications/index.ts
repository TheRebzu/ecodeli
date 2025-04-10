// src/lib/notifications/index.ts
import prisma from "@/lib/prisma";

interface NotificationParams {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  link?: string;
  relatedId?: string;
}

export type NotificationType = 
  | "NEW_BID"
  | "BID_ACCEPTED"
  | "BID_REJECTED"
  | "DELIVERY_CREATED"
  | "DELIVERY_STATUS_UPDATED"
  | "DELIVERY_COMPLETED"
  | "ANNOUNCEMENT_CANCELLED"
  | "NEW_MESSAGE"
  | "PAYMENT_RECEIVED"
  | "PAYMENT_PROCESSED"
  | "ACCOUNT_UPDATE"
  | "SYSTEM";

/**
 * Envoie une notification à un utilisateur
 * 
 * @param params Paramètres de la notification
 * @returns La notification créée
 */
export async function sendNotification(params: NotificationParams) {
  const { userId, title, message, type, link, relatedId } = params;
  
  try {
    // Créer la notification dans la base de données
    const notification = await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type,
        link,
        relatedId,
        isRead: false,
      },
    });
    
    // Ici, on pourrait ajouter du code pour envoyer des notifications push,
    // des e-mails ou des SMS selon les préférences de l'utilisateur
    await sendPushNotificationIfEnabled(userId, title, message);
    
    return notification;
  } catch (error) {
    console.error("Erreur lors de l'envoi de la notification:", error);
    throw error;
  }
}

/**
 * Envoie une notification push si l'utilisateur a activé cette option
 * 
 * @param userId ID de l'utilisateur
 * @param title Titre de la notification
 * @param message Message de la notification
 */
async function sendPushNotificationIfEnabled(
  userId: string,
  title: string,
  message: string
) {
  try {
    // Récupérer les préférences de notification de l'utilisateur
    const userSettings = await prisma.userSettings.findUnique({
      where: { userId },
      select: {
        pushNotificationsEnabled: true,
        pushSubscription: true,
      },
    });
    
    // Si les notifications push sont activées et qu'une souscription existe
    if (
      userSettings?.pushNotificationsEnabled &&
      userSettings?.pushSubscription
    ) {
      // Dans un environnement réel, on utiliserait une bibliothèque comme
      // web-push pour envoyer des notifications push
      console.log(`Envoi d'une notification push à l'utilisateur ${userId}`);
      console.log(`Titre: ${title}`);
      console.log(`Message: ${message}`);
      
      // Exemple: web-push.sendNotification(
      //   JSON.parse(userSettings.pushSubscription),
      //   JSON.stringify({
      //     title,
      //     body: message,
      //   })
      // );
    }
  } catch (error) {
    console.error("Erreur lors de l'envoi de la notification push:", error);
  }
}

/**
 * Marque une notification comme lue
 * 
 * @param notificationId ID de la notification
 * @returns La notification mise à jour
 */
export async function markNotificationAsRead(notificationId: string) {
  try {
    return await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true, readAt: new Date() },
    });
  } catch (error) {
    console.error("Erreur lors du marquage de la notification comme lue:", error);
    throw error;
  }
}

/**
 * Marque toutes les notifications d'un utilisateur comme lues
 * 
 * @param userId ID de l'utilisateur
 * @returns Nombre de notifications mises à jour
 */
export async function markAllNotificationsAsRead(userId: string) {
  try {
    const result = await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    
    return result.count;
  } catch (error) {
    console.error("Erreur lors du marquage de toutes les notifications comme lues:", error);
    throw error;
  }
}

/**
 * Supprime une notification
 * 
 * @param notificationId ID de la notification
 * @returns true si la notification a été supprimée
 */
export async function deleteNotification(notificationId: string) {
  try {
    await prisma.notification.delete({
      where: { id: notificationId },
    });
    
    return true;
  } catch (error) {
    console.error("Erreur lors de la suppression de la notification:", error);
    throw error;
  }
}

/**
 * Récupère les notifications d'un utilisateur
 * 
 * @param userId ID de l'utilisateur
 * @param limit Nombre maximum de notifications à récupérer
 * @param offset Offset pour la pagination
 * @param unreadOnly Ne récupérer que les notifications non lues
 * @returns Liste des notifications
 */
export async function getUserNotifications(
  userId: string,
  limit: number = 10,
  offset: number = 0,
  unreadOnly: boolean = false
) {
  try {
    const where = {
      userId,
      ...(unreadOnly ? { isRead: false } : {}),
    };
    
    // Récupérer les notifications
    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });
    
    // Compter le nombre total de notifications non lues
    const unreadCount = await prisma.notification.count({
      where: { userId, isRead: false },
    });
    
    return {
      notifications,
      unreadCount,
    };
  } catch (error) {
    console.error("Erreur lors de la récupération des notifications:", error);
    throw error;
  }
}