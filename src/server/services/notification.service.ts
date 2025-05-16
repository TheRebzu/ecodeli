import {
  PrismaClient,
  NotificationType as PrismaNotificationType,
  UserRole,
  AnnouncementStatus,
} from '@prisma/client';
import { TRPCError } from '@trpc/server';
import {
  UserNotificationSettings,
  SendUserNotificationOptions,
  NotificationChannel,
  SupportedLanguage,
} from '@/types/notifications';
import { db } from '@/server/db';
import { sendEmailNotification } from '@/lib/email';
import { getUserPreferredLocale } from '@/lib/user-locale';
import { DocumentType } from '@/types/documents';
import { DeliveryStatus } from '@prisma/client';

/**
 * Types de notification personnalisés
 */
export enum NotificationType {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  SUCCESS = 'SUCCESS',
  NEW_ANNOUNCEMENT = 'NEW_ANNOUNCEMENT',
  NEW_APPLICATION = 'NEW_APPLICATION',
  ANNOUNCEMENT_ACCEPTED = 'ANNOUNCEMENT_ACCEPTED',
  DELIVERY_STARTED = 'DELIVERY_STARTED',
  DELIVERY_COMPLETED = 'DELIVERY_COMPLETED',
  DELIVERY_CONFIRMED = 'DELIVERY_CONFIRMED',
  PAYMENT_RECEIVED = 'PAYMENT_RECEIVED',
  DELIVERY_PROBLEM = 'DELIVERY_PROBLEM',
  ANNOUNCEMENT_CANCELLED = 'ANNOUNCEMENT_CANCELLED',
  ROUTE_MATCHING = 'ROUTE_MATCHING',
  PAYMENT_INFO = 'PAYMENT_INFO',
  PAYMENT_CONFIRMED = 'PAYMENT_CONFIRMED',
  PAYMENT_REFUNDED = 'PAYMENT_REFUNDED',
  DELIVERY_UPDATE = 'DELIVERY_UPDATE',
  ADMIN_ALERT = 'ADMIN_ALERT',
}

/**
 * Service de gestion des notifications utilisateur
 */
export class NotificationService {
  private prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || db;
  }

  /**
   * Récupère les paramètres de notification d'un utilisateur
   */
  async getUserNotificationSettings(userId: string): Promise<UserNotificationSettings> {
    try {
      // Vérifier si l'utilisateur existe
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          notificationPreferences: true,
        },
      });

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Utilisateur non trouvé',
        });
      }

      // Si l'utilisateur n'a pas encore de paramètres de notification, renvoyer les valeurs par défaut
      if (!user.notificationPreferences) {
        return {
          emailNotifications: true,
          pushNotifications: true,
          smsNotifications: false,
          marketingEmails: false,
          securityAlerts: true,
          loginAlerts: true,
          paymentAlerts: true,
          weeklyDigest: true,
        };
      }

      // Sinon, renvoyer les paramètres existants
      return user.notificationPreferences as unknown as UserNotificationSettings;
    } catch (error) {
      if (error instanceof TRPCError) throw error;

      console.error('Erreur lors de la récupération des paramètres de notification:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Erreur lors de la récupération des paramètres de notification',
      });
    }
  }

  /**
   * Met à jour les paramètres de notification d'un utilisateur
   */
  async updateUserNotificationSettings(
    data: UserNotificationSettings & { userId: string }
  ): Promise<UserNotificationSettings> {
    try {
      // Vérifier si l'utilisateur existe
      const user = await this.prisma.user.findUnique({
        where: { id: data.userId },
        select: { id: true },
      });

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Utilisateur non trouvé',
        });
      }

      // Mettre à jour les paramètres de notification
      await this.prisma.user.update({
        where: { id: data.userId },
        data: {
          notificationPreferences: {
            emailNotifications: data.emailNotifications,
            pushNotifications: data.pushNotifications,
            smsNotifications: data.smsNotifications,
            marketingEmails: data.marketingEmails,
            securityAlerts: data.securityAlerts,
            loginAlerts: data.loginAlerts,
            paymentAlerts: data.paymentAlerts,
            weeklyDigest: data.weeklyDigest,
            notificationCategories: data.notificationCategories || [],
          },
        },
      });

      return {
        emailNotifications: data.emailNotifications,
        pushNotifications: data.pushNotifications,
        smsNotifications: data.smsNotifications,
        marketingEmails: data.marketingEmails,
        securityAlerts: data.securityAlerts,
        loginAlerts: data.loginAlerts,
        paymentAlerts: data.paymentAlerts,
        weeklyDigest: data.weeklyDigest,
        notificationCategories: data.notificationCategories,
      };
    } catch (error) {
      if (error instanceof TRPCError) throw error;

      console.error('Erreur lors de la mise à jour des paramètres de notification:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Erreur lors de la mise à jour des paramètres de notification',
      });
    }
  }

  /**
   * Envoie une notification à un utilisateur
   */
  async sendUserNotification(
    options: SendUserNotificationOptions & { sentById?: string }
  ): Promise<{ success: boolean; id?: string }> {
    try {
      const {
        userId,
        title,
        message,
        type = NotificationType.INFO,
        channel = NotificationChannel.EMAIL,
        actionUrl,
        actionLabel,
        attachmentUrl,
        deliverAt,
        expiresAt,
        requiresConfirmation,
        sentById,
      } = options;

      // Vérifier si l'utilisateur existe
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          notificationPreferences: true,
          deviceTokens: true,
        },
      });

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Utilisateur non trouvé',
        });
      }

      // Vérifier les paramètres de notification de l'utilisateur
      const userSettings =
        (user.notificationPreferences as unknown as UserNotificationSettings) || {
          emailNotifications: true,
          pushNotifications: true,
        };

      // Créer l'enregistrement de notification dans la base de données
      const notification = await this.prisma.notification.create({
        data: {
          userId,
          title,
          message,
          type: type as unknown as PrismaNotificationType,
          actionUrl,
          actionLabel,
          attachmentUrl,
          requiresConfirmation: requiresConfirmation || false,
          expiresAt,
          createdAt: new Date(),
          scheduledFor: deliverAt,
          sentById,
          read: false,
          confirmed: false,
        },
      });

      // Envoyer la notification selon le canal choisi
      switch (channel) {
        case NotificationChannel.EMAIL:
          if (userSettings.emailNotifications !== false) {
            await this.sendEmailNotification(user, title, message, {
              type,
              actionUrl,
              actionLabel,
              attachmentUrl,
            });
          }
          break;

        case NotificationChannel.PUSH:
          if (userSettings.pushNotifications !== false && user.deviceTokens?.length) {
            await this.sendPushNotification(user, title, message, {
              type,
              actionUrl,
              notificationId: notification.id,
            });
          }
          break;

        case NotificationChannel.SMS:
          if (userSettings.smsNotifications) {
            await this.sendSmsNotification(user, message);
          }
          break;

        case NotificationChannel.IN_APP:
          // L'enregistrement en base de données est déjà fait, il sera affiché dans l'application
          break;

        default:
          // Par défaut, créer seulement l'enregistrement en base de données
          break;
      }

      return { success: true, id: notification.id };
    } catch (error) {
      if (error instanceof TRPCError) throw error;

      console.error("Erreur lors de l'envoi de la notification:", error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: "Erreur lors de l'envoi de la notification",
      });
    }
  }

  /**
   * Envoie une notification par email
   */
  private async sendEmailNotification(
    user: { id: string; email: string; name?: string | null },
    subject: string,
    content: string,
    options: {
      type: NotificationType;
      actionUrl?: string;
      actionLabel?: string;
      attachmentUrl?: string;
    }
  ): Promise<void> {
    try {
      const locale = (await getUserPreferredLocale(user.id)) || 'fr';

      // Sélectionner le template en fonction du type de notification
      let templateName = 'notification-default';
      if (options.actionUrl) {
        templateName = 'notification-with-action';
      }

      await sendEmailNotification({
        to: user.email,
        subject: subject,
        templateName,
        data: {
          name: user.name || '',
          title: subject,
          message: content,
          actionUrl: options.actionUrl,
          actionLabel: options.actionLabel || (locale === 'fr' ? 'Voir plus' : 'See more'),
          attachmentUrl: options.attachmentUrl,
          notificationType: options.type.toLowerCase(),
        },
        locale: locale as SupportedLanguage,
      });
    } catch (error) {
      console.error("Erreur lors de l'envoi de l'email de notification:", error);
      // Ne pas faire échouer le processus si l'email échoue
    }
  }

  /**
   * Envoie une notification push
   */
  private async sendPushNotification(
    user: { id: string; deviceTokens?: string[] },
    title: string,
    message: string,
    options: {
      type: NotificationType;
      actionUrl?: string;
      notificationId: string;
    }
  ): Promise<void> {
    try {
      if (!user.deviceTokens?.length) {
        return;
      }

      // Logique d'envoi de notification push (OneSignal, Firebase, etc.)
      // Cette implémentation dépend du service utilisé

      // Exemple avec OneSignal
      // const response = await fetch('https://onesignal.com/api/v1/notifications', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     'Authorization': `Basic ${process.env.ONESIGNAL_API_KEY}`
      //   },
      //   body: JSON.stringify({
      //     app_id: process.env.ONESIGNAL_APP_ID,
      //     include_player_ids: user.deviceTokens,
      //     headings: { en: title, fr: title },
      //     contents: { en: message, fr: message },
      //     url: options.actionUrl,
      //     data: {
      //       notificationId: options.notificationId,
      //       type: options.type
      //     }
      //   })
      // });

      console.log(`Notification push envoyée à l'utilisateur ${user.id}`);
    } catch (error) {
      console.error("Erreur lors de l'envoi de la notification push:", error);
      // Ne pas faire échouer le processus si la notification push échoue
    }
  }

  /**
   * Envoie une notification SMS
   */
  private async sendSmsNotification(user: { id: string }, message: string): Promise<void> {
    try {
      // Récupérer le numéro de téléphone de l'utilisateur
      const userData = await this.prisma.user.findUnique({
        where: { id: user.id },
        select: { phoneNumber: true },
      });

      if (!userData?.phoneNumber) {
        console.warn(
          `Impossible d'envoyer un SMS à l'utilisateur ${user.id} : numéro de téléphone manquant`
        );
        return;
      }

      // Logique d'envoi de SMS (Twilio, etc.)
      // Cette implémentation dépend du service utilisé

      // Exemple avec Twilio
      // const client = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      // await client.messages.create({
      //   body: message,
      //   from: process.env.TWILIO_PHONE_NUMBER,
      //   to: userData.phoneNumber
      // });

      console.log(`SMS envoyé à l'utilisateur ${user.id}`);
    } catch (error) {
      console.error("Erreur lors de l'envoi du SMS:", error);
      // Ne pas faire échouer le processus si le SMS échoue
    }
  }

  /**
   * Récupère les notifications d'un utilisateur
   */
  async getUserNotifications(
    userId: string,
    options: {
      page?: number;
      limit?: number;
      includeRead?: boolean;
      types?: string[];
    } = {}
  ) {
    try {
      const { page = 1, limit = 10, includeRead = false, types } = options;

      const skip = (page - 1) * limit;

      // Construire la requête
      const where: any = { userId };

      if (!includeRead) {
        where.read = false;
      }

      if (types && types.length > 0) {
        where.type = { in: types };
      }

      // Compter le nombre total de notifications
      const total = await this.prisma.notification.count({ where });

      // Récupérer les notifications
      const notifications = await this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          title: true,
          message: true,
          type: true,
          read: true,
          createdAt: true,
          expiresAt: true,
          actionUrl: true,
          actionLabel: true,
          requiresConfirmation: true,
          confirmed: true,
        },
      });

      return {
        notifications,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      console.error('Erreur lors de la récupération des notifications:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Erreur lors de la récupération des notifications',
      });
    }
  }

  /**
   * Marque une notification comme lue
   */
  async markNotificationAsRead(
    notificationId: string,
    userId: string
  ): Promise<{ success: boolean }> {
    try {
      // Vérifier si la notification existe et appartient à l'utilisateur
      const notification = await this.prisma.notification.findFirst({
        where: { id: notificationId, userId },
      });

      if (!notification) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Notification non trouvée',
        });
      }

      // Marquer comme lue
      await this.prisma.notification.update({
        where: { id: notificationId },
        data: { read: true },
      });

      return { success: true };
    } catch (error) {
      if (error instanceof TRPCError) throw error;

      console.error('Erreur lors du marquage de la notification comme lue:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Erreur lors du marquage de la notification comme lue',
      });
    }
  }

  /**
   * Confirme une notification
   */
  async confirmNotification(notificationId: string, userId: string): Promise<{ success: boolean }> {
    try {
      // Vérifier si la notification existe, appartient à l'utilisateur et nécessite une confirmation
      const notification = await this.prisma.notification.findFirst({
        where: {
          id: notificationId,
          userId,
          requiresConfirmation: true,
        },
      });

      if (!notification) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Notification non trouvée ou ne nécessite pas de confirmation',
        });
      }

      // Marquer comme confirmée et lue
      await this.prisma.notification.update({
        where: { id: notificationId },
        data: {
          confirmed: true,
          read: true,
        },
      });

      return { success: true };
    } catch (error) {
      if (error instanceof TRPCError) throw error;

      console.error('Erreur lors de la confirmation de la notification:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Erreur lors de la confirmation de la notification',
      });
    }
  }

  /**
   * Supprime une notification
   */
  async deleteNotification(notificationId: string, userId: string): Promise<{ success: boolean }> {
    try {
      // Vérifier si la notification existe et appartient à l'utilisateur
      const notification = await this.prisma.notification.findFirst({
        where: { id: notificationId, userId },
      });

      if (!notification) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Notification non trouvée',
        });
      }

      // Supprimer la notification
      await this.prisma.notification.delete({
        where: { id: notificationId },
      });

      return { success: true };
    } catch (error) {
      console.error('Erreur lors de la suppression de la notification:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Erreur lors de la suppression de la notification',
      });
    }
  }

  /**
   * Envoie une notification à un utilisateur spécifique
   */
  async send(
    userId: string,
    title: string,
    message: string,
    type: NotificationType,
    link?: string,
    data?: any
  ) {
    try {
      return await this.prisma.notification.create({
        data: {
          userId,
          title,
          message,
          type: type as unknown as PrismaNotificationType,
          actionUrl: link,
          metadata: data ? JSON.stringify(data) : undefined,
          read: false,
          confirmed: false,
        },
      });
    } catch (error) {
      console.error("Erreur lors de l'envoi de la notification:", error);
      return null;
    }
  }

  /**
   * Notifie les livreurs des nouvelles annonces disponibles
   */
  async notifyDeliverersOfNewAnnouncement(announcementId: string) {
    try {
      // Récupérer les informations sur l'annonce
      const announcement = await this.prisma.announcement.findUnique({
        where: { id: announcementId },
        include: {
          client: {
            select: { name: true },
          },
        },
      });

      if (!announcement) return;

      // Si l'annonce vient d'être publiée, notifier les livreurs potentiels
      if (announcement.status === AnnouncementStatus.PUBLISHED) {
        // Trouver les livreurs actifs et vérifiés
        const eligibleDeliverers = await this.prisma.user.findMany({
          where: {
            role: UserRole.DELIVERER,
            isVerified: true,
            status: 'ACTIVE',
            deliverer: {
              isActive: true,
            },
          },
        });

        // Créer des notifications pour chaque livreur
        const notificationPromises = eligibleDeliverers.map(deliverer =>
          this.send(
            deliverer.id,
            'Nouvelle annonce disponible',
            `${announcement.client.name || 'Un client'} a publié une nouvelle annonce: "${announcement.title}"`,
            NotificationType.NEW_ANNOUNCEMENT,
            `/deliverer/announcements/${announcementId}`,
            { announcementId, type: announcement.type }
          )
        );

        await Promise.all(notificationPromises);
      }
    } catch (error) {
      console.error('Erreur lors de la notification des livreurs:', error);
    }
  }

  /**
   * Alerte le client des nouvelles propositions reçues pour son annonce
   */
  async notifyClientOfNewApplication(
    announcementId: string,
    applicationId: string,
    delivererId: string
  ) {
    try {
      // Récupérer les informations nécessaires
      const [announcement, deliverer] = await Promise.all([
        this.prisma.announcement.findUnique({
          where: { id: announcementId },
        }),
        this.prisma.user.findUnique({
          where: { id: delivererId },
          select: { name: true },
        }),
      ]);

      if (!announcement || !deliverer) return;

      // Notifier le client
      await this.send(
        announcement.clientId,
        'Nouvelle proposition pour votre annonce',
        `${deliverer.name || 'Un livreur'} a postulé pour votre annonce "${announcement.title}"`,
        NotificationType.NEW_APPLICATION,
        `/client/announcements/${announcementId}`,
        { announcementId, applicationId }
      );

      // Mettre à jour le statut de l'annonce si c'est la première candidature
      if (announcement.status === AnnouncementStatus.PUBLISHED) {
        await this.prisma.announcement.update({
          where: { id: announcementId },
          data: { status: AnnouncementStatus.IN_APPLICATION },
        });
      }
    } catch (error) {
      console.error('Erreur lors de la notification du client:', error);
    }
  }

  /**
   * Informe les utilisateurs concernés des changements de statut d'une annonce
   */
  async notifyAnnouncementStatusChange(
    announcementId: string,
    newStatus: AnnouncementStatus,
    oldStatus: AnnouncementStatus
  ) {
    try {
      const announcement = await this.prisma.announcement.findUnique({
        where: { id: announcementId },
        include: {
          client: { select: { name: true, id: true } },
          deliverer: { select: { name: true, userId: true } },
        },
      });

      if (!announcement) return;

      // Notifications selon le changement de statut
      switch (newStatus) {
        // Quand un livreur est assigné
        case AnnouncementStatus.ASSIGNED:
          if (announcement.deliverer?.userId) {
            // Notifier le livreur qu'il a été sélectionné
            await this.send(
              announcement.deliverer.userId,
              'Vous avez été sélectionné pour une annonce',
              `Votre proposition pour "${announcement.title}" a été acceptée`,
              NotificationType.ANNOUNCEMENT_ACCEPTED,
              `/deliverer/announcements/${announcementId}`,
              { announcementId }
            );
          }
          break;

        // Quand la livraison commence
        case AnnouncementStatus.IN_PROGRESS:
          if (announcement.client?.id) {
            await this.send(
              announcement.client.id,
              'Livraison en cours',
              `Le livreur ${announcement.deliverer?.name || 'sélectionné'} a commencé la livraison pour "${announcement.title}"`,
              NotificationType.DELIVERY_STARTED,
              `/client/announcements/${announcementId}`,
              { announcementId }
            );
          }
          break;

        // Quand la livraison est effectuée mais pas encore confirmée
        case 'DELIVERED' as AnnouncementStatus:
          if (announcement.client?.id) {
            await this.send(
              announcement.client.id,
              'Livraison terminée - À confirmer',
              `Le livreur indique avoir livré votre commande "${announcement.title}". Veuillez confirmer la réception.`,
              NotificationType.DELIVERY_COMPLETED,
              `/client/announcements/${announcementId}/confirm`,
              { announcementId }
            );
          }
          break;

        // Quand le client confirme la réception
        case AnnouncementStatus.COMPLETED:
          if (announcement.deliverer?.userId) {
            await this.send(
              announcement.deliverer.userId,
              'Livraison confirmée',
              `${announcement.client.name} a confirmé la réception de la livraison "${announcement.title}"`,
              NotificationType.DELIVERY_CONFIRMED,
              `/deliverer/announcements/${announcementId}`,
              { announcementId }
            );
          }
          break;

        // Quand le paiement est libéré au livreur
        case 'PAID' as AnnouncementStatus:
          if (announcement.deliverer?.userId) {
            await this.send(
              announcement.deliverer.userId,
              'Paiement reçu',
              `Le paiement pour la livraison "${announcement.title}" a été effectué`,
              NotificationType.PAYMENT_RECEIVED,
              `/deliverer/payments`,
              { announcementId }
            );
          }
          break;

        // En cas de problème
        case 'PROBLEM' as AnnouncementStatus:
          // Notifier les deux parties
          if (announcement.client?.id) {
            await this.send(
              announcement.client.id,
              'Problème signalé',
              `Un problème a été signalé pour la livraison "${announcement.title}"`,
              NotificationType.DELIVERY_PROBLEM,
              `/client/announcements/${announcementId}`,
              { announcementId }
            );
          }

          if (announcement.deliverer?.userId) {
            await this.send(
              announcement.deliverer.userId,
              'Problème signalé',
              `Un problème a été signalé pour la livraison "${announcement.title}"`,
              NotificationType.DELIVERY_PROBLEM,
              `/deliverer/announcements/${announcementId}`,
              { announcementId }
            );
          }
          break;

        // En cas d'annulation
        case AnnouncementStatus.CANCELLED:
          if (oldStatus === AnnouncementStatus.ASSIGNED && announcement.deliverer?.userId) {
            await this.send(
              announcement.deliverer.userId,
              'Annonce annulée',
              `L'annonce "${announcement.title}" a été annulée`,
              NotificationType.ANNOUNCEMENT_CANCELLED,
              `/deliverer/announcements`,
              { announcementId }
            );
          }
          break;
      }
    } catch (error) {
      console.error('Erreur lors de la notification du changement de statut:', error);
    }
  }

  /**
   * Notifie les livreurs dont les itinéraires correspondent à une annonce
   */
  async notifyMatchingDeliverers(announcementId: string) {
    try {
      const announcement = await this.prisma.announcement.findUnique({
        where: { id: announcementId },
        select: {
          id: true,
          title: true,
          pickupAddress: true,
          pickupLatitude: true,
          pickupLongitude: true,
          deliveryAddress: true,
          deliveryLatitude: true,
          deliveryLongitude: true,
          clientId: true,
        },
      });

      if (
        !announcement ||
        !announcement.pickupLatitude ||
        !announcement.pickupLongitude ||
        !announcement.deliveryLatitude ||
        !announcement.deliveryLongitude
      ) {
        return;
      }

      // Trouver les itinéraires de livreurs qui correspondent approximativement
      // à l'annonce (calcul de proximité géographique)
      const matchingRoutes = await this.prisma.$queryRaw`
        SELECT r.id, r."delivererId", u.name as "delivererName"
        FROM "DelivererRoute" r
        JOIN "Deliverer" d ON r."delivererId" = d.id
        JOIN "User" u ON d."userId" = u.id
        WHERE 
          r."isActive" = true AND
          d."isActive" = true AND
          u."isVerified" = true AND
          ST_DWithin(
            ST_MakePoint(r."startLongitude", r."startLatitude"),
            ST_MakePoint(${announcement.pickupLongitude}, ${announcement.pickupLatitude}),
            5000  -- 5km de rayon
          ) AND
          ST_DWithin(
            ST_MakePoint(r."endLongitude", r."endLatitude"),
            ST_MakePoint(${announcement.deliveryLongitude}, ${announcement.deliveryLatitude}),
            5000  -- 5km de rayon
          )
      `;

      // Notifier chaque livreur dont l'itinéraire correspond
      for (const route of matchingRoutes as any[]) {
        await this.send(
          route.delivererId,
          'Annonce sur votre itinéraire',
          `Une nouvelle annonce "${announcement.title}" correspond à votre itinéraire planifié`,
          NotificationType.ROUTE_MATCHING,
          `/deliverer/announcements/${announcementId}`,
          { announcementId, routeId: route.id }
        );
      }
    } catch (error) {
      console.error('Erreur lors de la notification des livreurs correspondants:', error);
    }
  }
}

/**
 * Service de notification pour les mises à jour de livraison et autres alertes
 */
export const sendNotification = async ({
  userId,
  title,
  message,
  type,
  link,
  data = {},
}: {
  userId: string;
  title: string;
  message: string;
  type: string;
  link?: string;
  data?: Record<string, any>;
}) => {
  try {
    // Créer la notification dans la base de données
    const notification = await db.notification.create({
      data: {
        userId,
        title,
        message,
        type,
        link,
        data,
        status: 'UNREAD',
      },
    });

    // Envoyer la notification via les différents canaux configurés
    await Promise.all([
      sendBrowserNotification(userId, title, message, link),
      sendAppNotification(userId, notification.id, title, message),
      // Possiblement ajouter d'autres canaux: SMS, email, etc.
    ]);

    return true;
  } catch (error) {
    console.error("Erreur lors de l'envoi de la notification:", error);
    return false;
  }
};

/**
 * Notifie du changement de statut d'une livraison
 */
export const notifyDeliveryStatusChange = async (
  deliveryId: string,
  newStatus: DeliveryStatus,
  oldStatus: DeliveryStatus,
  notes?: string
) => {
  try {
    // Récupérer les informations de la livraison
    const delivery = await db.delivery.findUnique({
      where: { id: deliveryId },
      include: {
        client: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        deliverer: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    if (!delivery) return false;

    // Déterminer le message en fonction du statut
    let title = 'Mise à jour de votre livraison';
    let message = notes || `Statut changé de ${oldStatus} à ${newStatus}`;

    // Messages personnalisés par statut
    switch (newStatus) {
      case 'ASSIGNED':
        title = 'Livreur assigné';
        message = 'Un livreur a été assigné à votre commande';
        break;
      case 'PICKED_UP':
        title = 'Colis récupéré';
        message = 'Votre colis a été récupéré et est en préparation pour livraison';
        break;
      case 'IN_TRANSIT':
        title = 'Livraison en cours';
        message = 'Votre colis est en route vers votre adresse';
        break;
      case 'NEARBY':
        title = 'Livreur à proximité';
        message = 'Votre livreur est à proximité de votre adresse';
        break;
      case 'ARRIVED':
        title = 'Livreur arrivé';
        message = "Votre livreur est arrivé à l'adresse de livraison";
        break;
      case 'DELIVERED':
        title = 'Livraison effectuée';
        message = 'Votre colis a été livré avec succès';
        break;
      case 'NOT_DELIVERED':
        title = 'Livraison impossible';
        message = notes || "La livraison n'a pas pu être effectuée";
        break;
      case 'CANCELLED':
        title = 'Livraison annulée';
        message = notes || 'La livraison a été annulée';
        break;
    }

    // Notifier le client
    if (delivery.client?.user) {
      // Envoyer une notification dans l'application
      await sendNotification({
        userId: delivery.client.user.id,
        title,
        message,
        type: 'DELIVERY_UPDATE',
        link: `/client/deliveries/${deliveryId}`,
        data: {
          deliveryId,
          newStatus,
          oldStatus,
        },
      });

      // Envoyer un email pour certains statuts importants
      const importantStatuses: DeliveryStatus[] = [
        'PICKED_UP',
        'IN_TRANSIT',
        'DELIVERED',
        'NOT_DELIVERED',
        'CANCELLED',
      ];
      if (importantStatuses.includes(newStatus)) {
        await sendDeliveryStatusEmail(
          delivery.client.user.email,
          delivery.client.user.name || '',
          title,
          message,
          newStatus,
          deliveryId
        );
      }
    }

    // Notifier le livreur (avec un message différent si nécessaire)
    if (delivery.deliverer?.user) {
      // Adapter le message pour le livreur
      let delivererTitle = title;
      let delivererMessage = message;

      // Si le client a annulé, adapter le message
      if (newStatus === 'CANCELLED') {
        delivererTitle = 'Livraison annulée par le client';
        delivererMessage = notes || 'Une livraison a été annulée';
      }

      await sendNotification({
        userId: delivery.deliverer.user.id,
        title: delivererTitle,
        message: delivererMessage,
        type: 'DELIVERY_UPDATE',
        link: `/deliverer/deliveries/${deliveryId}`,
        data: {
          deliveryId,
          newStatus,
          oldStatus,
        },
      });
    }

    return true;
  } catch (error) {
    console.error('Erreur lors de la notification de changement de statut:', error);
    return false;
  }
};

/**
 * Notifie le client que le livreur s'approche de la destination
 */
export const notifyDeliveryApproaching = async (
  deliveryId: string,
  distanceInMeters: number,
  etaInMinutes: number
) => {
  try {
    // Récupérer les informations de la livraison
    const delivery = await db.delivery.findUnique({
      where: { id: deliveryId },
      include: {
        client: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        deliverer: {
          include: {
            user: {
              select: { id: true, name: true, phone: true, image: true },
            },
          },
        },
      },
    });

    if (!delivery || !delivery.client?.user) return false;

    // Formater la distance et le temps de façon lisible
    const distanceText =
      distanceInMeters < 1000
        ? `${Math.round(distanceInMeters)} mètres`
        : `${(distanceInMeters / 1000).toFixed(1)} km`;

    const etaText = etaInMinutes === 1 ? '1 minute' : `${Math.round(etaInMinutes)} minutes`;

    // Préparer le titre et le message
    const title = 'Votre livraison arrive bientôt';
    const message = `Votre livreur ${delivery.deliverer?.user?.name || ''} arrivera dans environ ${etaText} (${distanceText} de votre adresse)`;

    // Envoyer la notification push (prioritaire)
    await sendNotification({
      userId: delivery.client.user.id,
      title,
      message,
      type: 'DELIVERY_APPROACHING',
      link: `/client/deliveries/${deliveryId}`,
      data: {
        deliveryId,
        distance: distanceInMeters,
        eta: etaInMinutes,
        delivererName: delivery.deliverer?.user?.name,
        delivererImage: delivery.deliverer?.user?.image,
        delivererPhone: delivery.deliverer?.user?.phone,
      },
    });

    // Envoyer également un email si le client est à moins de 10 minutes
    if (etaInMinutes <= 10) {
      await sendDeliveryApproachingEmail(
        delivery.client.user.email,
        delivery.client.user.name || '',
        etaText,
        deliveryId,
        delivery.deliverer?.user?.name || 'Votre livreur',
        delivery.deliverer?.user?.phone
      );
    }

    return true;
  } catch (error) {
    console.error("Erreur lors de la notification d'approche:", error);
    return false;
  }
};

/**
 * Notifie le client d'un retard dans la livraison
 */
export const notifyDeliveryDelayed = async (
  deliveryId: string,
  delayInMinutes: number,
  newEta: Date,
  reason?: string
) => {
  try {
    // Récupérer les informations de la livraison
    const delivery = await db.delivery.findUnique({
      where: { id: deliveryId },
      include: {
        client: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    if (!delivery || !delivery.client?.user) return false;

    // Formater le délai de façon lisible
    let delayText = '';
    if (delayInMinutes < 60) {
      delayText = `${delayInMinutes} minutes`;
    } else {
      const hours = Math.floor(delayInMinutes / 60);
      const minutes = delayInMinutes % 60;
      delayText = `${hours} heure${hours > 1 ? 's' : ''}${minutes > 0 ? ` et ${minutes} minute${minutes > 1 ? 's' : ''}` : ''}`;
    }

    // Formater la nouvelle heure d'arrivée
    const formatter = new Intl.DateTimeFormat('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
    const etaFormatted = formatter.format(newEta);

    // Préparer le titre et le message
    const title = 'Retard de livraison';
    const message = reason
      ? `Votre livraison est retardée de ${delayText}. Nouvelle heure d'arrivée prévue : ${etaFormatted}. Raison : ${reason}`
      : `Votre livraison est retardée de ${delayText}. Nouvelle heure d'arrivée prévue : ${etaFormatted}`;

    // Envoyer la notification
    await sendNotification({
      userId: delivery.client.user.id,
      title,
      message,
      type: 'DELIVERY_DELAYED',
      link: `/client/deliveries/${deliveryId}`,
      data: {
        deliveryId,
        delayInMinutes,
        newEta,
        reason,
      },
    });

    // Envoyer également un email
    await sendDeliveryDelayedEmail(
      delivery.client.user.email,
      delivery.client.user.name || '',
      delayText,
      etaFormatted,
      reason || '',
      deliveryId
    );

    return true;
  } catch (error) {
    console.error('Erreur lors de la notification de retard:', error);
    return false;
  }
};

/**
 * Notifie le client qu'un point de passage a été atteint
 */
export const notifyCheckpointReached = async (
  deliveryId: string,
  checkpointId: string,
  checkpointType: string,
  checkpointName?: string
) => {
  try {
    // Récupérer les informations de la livraison et du checkpoint
    const [delivery, checkpoint] = await Promise.all([
      db.delivery.findUnique({
        where: { id: deliveryId },
        include: {
          client: {
            include: {
              user: {
                select: { id: true, name: true, email: true },
              },
            },
          },
        },
      }),
      db.deliveryCheckpoint.findUnique({
        where: { id: checkpointId },
      }),
    ]);

    if (!delivery || !delivery.client?.user || !checkpoint) return false;

    // Déterminer le message en fonction du type de point de passage
    let title = 'Point de passage atteint';
    let message = '';
    const checkpointDisplayName = checkpointName || checkpoint.name || 'Un point de passage';

    switch (checkpointType) {
      case 'DEPARTURE':
        title = 'Départ du livreur';
        message = `Votre livreur vient de démarrer sa tournée depuis ${checkpointDisplayName}`;
        break;
      case 'PICKUP':
        title = 'Colis récupéré';
        message = `Votre colis a été récupéré à ${checkpointDisplayName}`;
        break;
      case 'WAYPOINT':
        title = 'Point de passage franchi';
        message = `Votre livraison a franchi le point ${checkpointDisplayName}`;
        break;
      case 'DELIVERY_ATTEMPT':
        title = 'Tentative de livraison';
        message = `Une tentative de livraison a été effectuée à ${checkpointDisplayName}`;
        break;
      case 'DELIVERY':
        title = 'Livraison effectuée';
        message = `Votre colis a été livré à ${checkpointDisplayName}`;
        break;
      case 'CUSTOMS':
        title = 'Passage en douane';
        message = `Votre colis a franchi le point de douane ${checkpointDisplayName}`;
        break;
      default:
        message = `Votre colis a franchi le point ${checkpointDisplayName}`;
        break;
    }

    // Envoyer la notification
    await sendNotification({
      userId: delivery.client.user.id,
      title,
      message,
      type: 'CHECKPOINT_REACHED',
      link: `/client/deliveries/${deliveryId}`,
      data: {
        deliveryId,
        checkpointId,
        checkpointType,
        checkpointName: checkpointDisplayName,
      },
    });

    // Envoyer un email pour les points de passage importants
    const importantCheckpoints = ['PICKUP', 'DELIVERY', 'DELIVERY_ATTEMPT', 'CUSTOMS'];
    if (importantCheckpoints.includes(checkpointType)) {
      await sendCheckpointReachedEmail(
        delivery.client.user.email,
        delivery.client.user.name || '',
        title,
        message,
        deliveryId,
        checkpointType
      );
    }

    return true;
  } catch (error) {
    console.error('Erreur lors de la notification de point de passage:', error);
    return false;
  }
};

/**
 * Notifie le client que la livraison est terminée et demande une confirmation/évaluation
 */
export const notifyDeliveryCompleted = async (
  deliveryId: string,
  requireConfirmation: boolean = true,
  photoProofUrl?: string,
  signatureProofUrl?: string
) => {
  try {
    // Récupérer les informations de la livraison
    const delivery = await db.delivery.findUnique({
      where: { id: deliveryId },
      include: {
        client: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        deliverer: {
          include: {
            user: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    if (!delivery || !delivery.client?.user) return false;

    // Préparer le titre et le message
    const title = 'Livraison terminée';
    const message = requireConfirmation
      ? 'Votre colis a été livré. Veuillez confirmer la bonne réception.'
      : 'Votre colis a été livré avec succès';

    // Envoyer la notification avec demande de confirmation si nécessaire
    await sendNotification({
      userId: delivery.client.user.id,
      title,
      message,
      type: 'DELIVERY_COMPLETED',
      link: requireConfirmation
        ? `/client/deliveries/${deliveryId}/confirm`
        : `/client/deliveries/${deliveryId}`,
      data: {
        deliveryId,
        requireConfirmation,
        photoProofUrl,
        signatureProofUrl,
        delivererName: delivery.deliverer?.user?.name,
      },
    });

    // Envoyer également un email
    await sendDeliveryCompletedEmail(
      delivery.client.user.email,
      delivery.client.user.name || '',
      requireConfirmation,
      delivery.deliverer?.user?.name || 'Le livreur',
      photoProofUrl,
      signatureProofUrl,
      deliveryId
    );

    return true;
  } catch (error) {
    console.error('Erreur lors de la notification de livraison terminée:', error);
    return false;
  }
};

/**
 * Envoie un email de notification de changement de statut
 */
const sendDeliveryStatusEmail = async (
  email: string,
  name: string,
  title: string,
  message: string,
  status: DeliveryStatus,
  deliveryId: string
) => {
  try {
    const statusColorMap: Record<string, string> = {
      ASSIGNED: '#3498db', // Bleu
      PICKED_UP: '#2ecc71', // Vert
      IN_TRANSIT: '#f39c12', // Orange
      NEARBY: '#9b59b6', // Violet
      ARRIVED: '#1abc9c', // Turquoise
      DELIVERED: '#27ae60', // Vert foncé
      NOT_DELIVERED: '#e74c3c', // Rouge
      CANCELLED: '#7f8c8d', // Gris
    };

    const statusColor = statusColorMap[status] || '#3498db';

    await sendEmailNotification({
      to: email,
      subject: title,
      templateName: 'delivery-status-update',
      data: {
        name,
        title,
        message,
        status,
        statusColor,
        deliveryId,
        trackingUrl: `${process.env.NEXT_PUBLIC_APP_URL}/client/deliveries/${deliveryId}`,
        date: new Date().toLocaleDateString('fr-FR'),
      },
      locale: 'fr',
    });
  } catch (error) {
    console.error("Erreur lors de l'envoi de l'email de statut de livraison:", error);
  }
};

/**
 * Envoie un email de notification d'approche de livraison
 */
const sendDeliveryApproachingEmail = async (
  email: string,
  name: string,
  etaText: string,
  deliveryId: string,
  delivererName: string,
  delivererPhone?: string | null
) => {
  try {
    await sendEmailNotification({
      to: email,
      subject: 'Votre livraison arrive bientôt',
      templateName: 'delivery-approaching',
      data: {
        name,
        etaText,
        delivererName,
        delivererPhone: delivererPhone || 'Non disponible',
        trackingUrl: `${process.env.NEXT_PUBLIC_APP_URL}/client/deliveries/${deliveryId}`,
      },
      locale: 'fr',
    });
  } catch (error) {
    console.error("Erreur lors de l'envoi de l'email d'approche de livraison:", error);
  }
};

/**
 * Envoie un email de notification de retard de livraison
 */
const sendDeliveryDelayedEmail = async (
  email: string,
  name: string,
  delayText: string,
  etaFormatted: string,
  reason: string,
  deliveryId: string
) => {
  try {
    await sendEmailNotification({
      to: email,
      subject: 'Retard de votre livraison',
      templateName: 'delivery-delayed',
      data: {
        name,
        delayText,
        newEta: etaFormatted,
        reason: reason || 'Conditions de trafic',
        trackingUrl: `${process.env.NEXT_PUBLIC_APP_URL}/client/deliveries/${deliveryId}`,
        supportEmail: process.env.SUPPORT_EMAIL || 'support@ecodeli.com',
      },
      locale: 'fr',
    });
  } catch (error) {
    console.error("Erreur lors de l'envoi de l'email de retard de livraison:", error);
  }
};

/**
 * Envoie un email de notification de point de passage atteint
 */
const sendCheckpointReachedEmail = async (
  email: string,
  name: string,
  title: string,
  message: string,
  deliveryId: string,
  checkpointType: string
) => {
  try {
    await sendEmailNotification({
      to: email,
      subject: title,
      templateName: 'checkpoint-reached',
      data: {
        name,
        title,
        message,
        checkpointType,
        trackingUrl: `${process.env.NEXT_PUBLIC_APP_URL}/client/deliveries/${deliveryId}`,
        date: new Date().toLocaleDateString('fr-FR'),
      },
      locale: 'fr',
    });
  } catch (error) {
    console.error("Erreur lors de l'envoi de l'email de point de passage:", error);
  }
};

/**
 * Envoie un email de notification de livraison terminée
 */
const sendDeliveryCompletedEmail = async (
  email: string,
  name: string,
  requireConfirmation: boolean,
  delivererName: string,
  photoProofUrl?: string,
  signatureProofUrl?: string,
  deliveryId?: string
) => {
  try {
    await sendEmailNotification({
      to: email,
      subject: 'Votre colis a été livré',
      templateName: 'delivery-completed',
      data: {
        name,
        delivererName,
        requireConfirmation,
        photoProofUrl,
        signatureProofUrl,
        confirmationUrl: deliveryId
          ? `${process.env.NEXT_PUBLIC_APP_URL}/client/deliveries/${deliveryId}/confirm`
          : '',
        detailsUrl: deliveryId
          ? `${process.env.NEXT_PUBLIC_APP_URL}/client/deliveries/${deliveryId}`
          : '',
        feedbackUrl: `${process.env.NEXT_PUBLIC_APP_URL}/feedback`,
      },
      locale: 'fr',
    });
  } catch (error) {
    console.error("Erreur lors de l'envoi de l'email de livraison terminée:", error);
  }
};

// Instancier et exporter le service
export const notificationService = new NotificationService();
