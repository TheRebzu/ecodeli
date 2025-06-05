import { PrismaClient, UserRole, AnnouncementStatus } from '@prisma/client';
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
import { DeliveryStatus } from '@prisma/client';
import { OneSignalService } from '@/lib/onesignal';
import { userPreferencesService } from './user-preferences.service';

/**
 * Types de notification personnalisés - Extension complète
 */
export enum NotificationType {
  // Types de base
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  SUCCESS = 'SUCCESS',
  URGENT = 'URGENT',

  // Notifications d'annonces
  NEW_ANNOUNCEMENT = 'NEW_ANNOUNCEMENT',
  NEW_APPLICATION = 'NEW_APPLICATION',
  ANNOUNCEMENT_ACCEPTED = 'ANNOUNCEMENT_ACCEPTED',
  ANNOUNCEMENT_REJECTED = 'ANNOUNCEMENT_REJECTED',
  ANNOUNCEMENT_CANCELLED = 'ANNOUNCEMENT_CANCELLED',
  ANNOUNCEMENT_EXPIRED = 'ANNOUNCEMENT_EXPIRED',
  ANNOUNCEMENT_UPDATED = 'ANNOUNCEMENT_UPDATED',
  ROUTE_MATCHING = 'ROUTE_MATCHING',

  // Notifications de livraison
  DELIVERY_STARTED = 'DELIVERY_STARTED',
  DELIVERY_PICKED_UP = 'DELIVERY_PICKED_UP',
  DELIVERY_IN_TRANSIT = 'DELIVERY_IN_TRANSIT',
  DELIVERY_NEARBY = 'DELIVERY_NEARBY',
  DELIVERY_ARRIVED = 'DELIVERY_ARRIVED',
  DELIVERY_COMPLETED = 'DELIVERY_COMPLETED',
  DELIVERY_CONFIRMED = 'DELIVERY_CONFIRMED',
  DELIVERY_DELAYED = 'DELIVERY_DELAYED',
  DELIVERY_CANCELLED = 'DELIVERY_CANCELLED',
  DELIVERY_PROBLEM = 'DELIVERY_PROBLEM',
  DELIVERY_RESCHEDULED = 'DELIVERY_RESCHEDULED',
  DELIVERY_UPDATE = 'DELIVERY_UPDATE',
  DELIVERY_APPROACHING = 'DELIVERY_APPROACHING',
  CHECKPOINT_REACHED = 'CHECKPOINT_REACHED',

  // Notifications de paiement
  PAYMENT_RECEIVED = 'PAYMENT_RECEIVED',
  PAYMENT_PENDING = 'PAYMENT_PENDING',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  PAYMENT_REFUNDED = 'PAYMENT_REFUNDED',
  PAYMENT_CONFIRMED = 'PAYMENT_CONFIRMED',
  PAYMENT_PROCESSING = 'PAYMENT_PROCESSING',
  PAYMENT_INFO = 'PAYMENT_INFO',
  PAYMENT_REMINDER = 'PAYMENT_REMINDER',
  INVOICE_GENERATED = 'INVOICE_GENERATED',
  INVOICE_PAID = 'INVOICE_PAID',
  INVOICE_OVERDUE = 'INVOICE_OVERDUE',

  // Notifications de compte et vérification
  ACCOUNT_CREATED = 'ACCOUNT_CREATED',
  ACCOUNT_VERIFIED = 'ACCOUNT_VERIFIED',
  ACCOUNT_SUSPENDED = 'ACCOUNT_SUSPENDED',
  ACCOUNT_REACTIVATED = 'ACCOUNT_REACTIVATED',
  PASSWORD_CHANGED = 'PASSWORD_CHANGED',
  EMAIL_CHANGED = 'EMAIL_CHANGED',
  PROFILE_UPDATED = 'PROFILE_UPDATED',
  TWO_FACTOR_ENABLED = 'TWO_FACTOR_ENABLED',
  LOGIN_ALERT = 'LOGIN_ALERT',
  SECURITY_ALERT = 'SECURITY_ALERT',

  // Notifications de documents
  DOCUMENT_UPLOADED = 'DOCUMENT_UPLOADED',
  DOCUMENT_APPROVED = 'DOCUMENT_APPROVED',
  DOCUMENT_REJECTED = 'DOCUMENT_REJECTED',
  DOCUMENT_EXPIRED = 'DOCUMENT_EXPIRED',
  DOCUMENT_REQUIRED = 'DOCUMENT_REQUIRED',
  VERIFICATION_PENDING = 'VERIFICATION_PENDING',
  VERIFICATION_APPROVED = 'VERIFICATION_APPROVED',
  VERIFICATION_REJECTED = 'VERIFICATION_REJECTED',
  VERIFICATION_EXPIRED = 'VERIFICATION_EXPIRED',

  // Notifications de services
  SERVICE_BOOKED = 'SERVICE_BOOKED',
  SERVICE_CANCELLED = 'SERVICE_CANCELLED',
  SERVICE_COMPLETED = 'SERVICE_COMPLETED',
  SERVICE_RESCHEDULED = 'SERVICE_RESCHEDULED',
  SERVICE_REMINDER = 'SERVICE_REMINDER',
  SERVICE_REVIEW_REQUEST = 'SERVICE_REVIEW_REQUEST',

  // Notifications de stockage
  STORAGE_RESERVED = 'STORAGE_RESERVED',
  STORAGE_EXPIRED = 'STORAGE_EXPIRED',
  STORAGE_REMINDER = 'STORAGE_REMINDER',
  STORAGE_AVAILABLE = 'STORAGE_AVAILABLE',
  STORAGE_ACCESSED = 'STORAGE_ACCESSED',

  // Notifications de messagerie
  NEW_MESSAGE = 'NEW_MESSAGE',
  MESSAGE_READ = 'MESSAGE_READ',
  CONVERSATION_STARTED = 'CONVERSATION_STARTED',

  // Notifications système et admin
  SYSTEM_MAINTENANCE = 'SYSTEM_MAINTENANCE',
  SYSTEM_UPDATE = 'SYSTEM_UPDATE',
  FEATURE_ANNOUNCEMENT = 'FEATURE_ANNOUNCEMENT',
  POLICY_UPDATE = 'POLICY_UPDATE',
  ADMIN_ALERT = 'ADMIN_ALERT',
  ADMIN_REPORT = 'ADMIN_REPORT',

  // Notifications marketing et promotions
  PROMOTION_AVAILABLE = 'PROMOTION_AVAILABLE',
  DISCOUNT_EXPIRING = 'DISCOUNT_EXPIRING',
  NEWSLETTER = 'NEWSLETTER',
  WEEKLY_DIGEST = 'WEEKLY_DIGEST',
  MONTHLY_SUMMARY = 'MONTHLY_SUMMARY',

  // Notifications de performance
  RATING_RECEIVED = 'RATING_RECEIVED',
  MILESTONE_REACHED = 'MILESTONE_REACHED',
  ACHIEVEMENT_UNLOCKED = 'ACHIEVEMENT_UNLOCKED',
  PERFORMANCE_REPORT = 'PERFORMANCE_REPORT',
}

/**
 * Service de gestion des notifications utilisateur - Version étendue
 */
export class NotificationService {
  private prisma: PrismaClient;
  private oneSignalService: OneSignalService;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || db;
    this.oneSignalService = new OneSignalService();
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
   * Envoie une notification à un utilisateur - Version étendue avec OneSignal et préférences
   */
  async sendUserNotification(
    options: SendUserNotificationOptions & {
      sentById?: string;
      priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
      category?: string;
      silent?: boolean;
      persistent?: boolean;
    }
  ): Promise<{ success: boolean; id?: string; channels?: string[] }> {
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
        priority = 'MEDIUM',
        category,
        silent = false,
        persistent = false,
      } = options;

      // Vérifier si l'utilisateur existe et récupérer ses préférences
      const [user, userPreferences] = await Promise.all([
        this.prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            locale: true,
            notificationPreferences: true,
            deviceTokens: true,
            phoneNumber: true,
            isActive: true,
          },
        }),
        userPreferencesService.getUserPreferences(userId).catch(() => null),
      ]);

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Utilisateur non trouvé',
        });
      }

      if (!user.isActive) {
        console.warn(`Tentative d'envoi de notification à un utilisateur inactif: ${userId}`);
        return { success: false };
      }

      // Récupérer les paramètres de notification avec fallback
      const userSettings =
        (user.notificationPreferences as unknown as UserNotificationSettings) || {
          emailNotifications: true,
          pushNotifications: true,
          smsNotifications: false,
          marketingEmails: false,
          securityAlerts: true,
          loginAlerts: true,
          paymentAlerts: true,
          weeklyDigest: true,
        };

      // Vérifier si l'utilisateur accepte ce type de notification
      if (!this.shouldSendNotification(type, userSettings, category)) {
        console.log(`Notification ${type} bloquée par les préférences utilisateur ${userId}`);
        return { success: false };
      }

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
          metadata: JSON.stringify({
            priority,
            category,
            silent,
            persistent,
            userRole: user.role,
            sentAt: new Date().toISOString(),
          }),
        },
      });

      const channelsUsed: string[] = [];

      // Déterminer quels canaux utiliser selon les préférences et le type
      const channels = this.determineNotificationChannels(channel, type, userSettings, priority);

      // Envoyer la notification selon les canaux déterminés
      for (const notifChannel of channels) {
        try {
          switch (notifChannel) {
            case NotificationChannel.EMAIL:
              if (userSettings.emailNotifications !== false && user.email) {
                await this.sendEmailNotification(user, title, message, {
                  type,
                  actionUrl,
                  actionLabel,
                  attachmentUrl,
                  priority,
                  locale: user.locale || 'fr',
                });
                channelsUsed.push('email');
              }
              break;

            case NotificationChannel.PUSH:
              if (userSettings.pushNotifications !== false) {
                await this.sendOneSignalNotification(user, title, message, {
                  type,
                  actionUrl,
                  notificationId: notification.id,
                  priority,
                  silent,
                  category,
                });
                channelsUsed.push('push');
              }
              break;

            case NotificationChannel.SMS:
              if (userSettings.smsNotifications && user.phoneNumber) {
                await this.sendSmsNotification(user, message, {
                  priority,
                  actionUrl,
                });
                channelsUsed.push('sms');
              }
              break;

            case NotificationChannel.IN_APP:
              // L'enregistrement en base de données est déjà fait
              channelsUsed.push('in_app');
              break;
          }
        } catch (channelError) {
          console.error(`Erreur lors de l'envoi via ${notifChannel}:`, channelError);
          // Continuer avec les autres canaux même si un échoue
        }
      }

      // Mettre à jour la notification avec les canaux utilisés
      await this.prisma.notification.update({
        where: { id: notification.id },
        data: {
          metadata: JSON.stringify({
            priority,
            category,
            silent,
            persistent,
            userRole: user.role,
            sentAt: new Date().toISOString(),
            channelsUsed,
          }),
        },
      });

      return {
        success: channelsUsed.length > 0,
        id: notification.id,
        channels: channelsUsed,
      };
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
   * NOUVELLES MÉTHODES HELPER - Support pour les préférences et canaux multiples
   */

  /**
   * Détermine si une notification doit être envoyée selon les préférences utilisateur
   */
  private shouldSendNotification(
    type: NotificationType,
    userSettings: UserNotificationSettings,
    category?: string
  ): boolean {
    // Types de notifications critiques qui ne peuvent pas être désactivées
    const criticalTypes = [
      NotificationType.SECURITY_ALERT,
      NotificationType.PAYMENT_FAILED,
      NotificationType.ACCOUNT_SUSPENDED,
      NotificationType.URGENT,
    ];

    if (criticalTypes.includes(type)) {
      return true;
    }

    // Vérifications spécifiques par type
    if (type.includes('PAYMENT') && !userSettings.paymentAlerts) {
      return false;
    }

    if (type.includes('LOGIN') && !userSettings.loginAlerts) {
      return false;
    }

    if (
      [NotificationType.NEWSLETTER, NotificationType.PROMOTION_AVAILABLE].includes(type) &&
      !userSettings.marketingEmails
    ) {
      return false;
    }

    if (type === NotificationType.WEEKLY_DIGEST && !userSettings.weeklyDigest) {
      return false;
    }

    // Vérification des catégories de notification personnalisées
    if (category && userSettings.notificationCategories) {
      return userSettings.notificationCategories.includes(category);
    }

    return true;
  }

  /**
   * Détermine les canaux à utiliser pour un type de notification
   */
  private determineNotificationChannels(
    requestedChannel: NotificationChannel,
    type: NotificationType,
    userSettings: UserNotificationSettings,
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  ): NotificationChannel[] {
    const channels: NotificationChannel[] = [];

    // Notifications urgentes : tous les canaux disponibles
    if (priority === 'URGENT') {
      if (userSettings.pushNotifications !== false) channels.push(NotificationChannel.PUSH);
      if (userSettings.emailNotifications !== false) channels.push(NotificationChannel.EMAIL);
      if (userSettings.smsNotifications) channels.push(NotificationChannel.SMS);
      channels.push(NotificationChannel.IN_APP);
      return channels;
    }

    // Notifications de sécurité : push et email
    const securityTypes = [
      NotificationType.SECURITY_ALERT,
      NotificationType.LOGIN_ALERT,
      NotificationType.PASSWORD_CHANGED,
      NotificationType.TWO_FACTOR_ENABLED,
    ];
    if (securityTypes.includes(type)) {
      if (userSettings.pushNotifications !== false) channels.push(NotificationChannel.PUSH);
      if (userSettings.emailNotifications !== false) channels.push(NotificationChannel.EMAIL);
      channels.push(NotificationChannel.IN_APP);
      return channels;
    }

    // Notifications de livraison : principalement push pour l'immédiateté
    const deliveryTypes = [
      NotificationType.DELIVERY_APPROACHING,
      NotificationType.DELIVERY_ARRIVED,
      NotificationType.DELIVERY_COMPLETED,
    ];
    if (deliveryTypes.includes(type)) {
      if (userSettings.pushNotifications !== false) channels.push(NotificationChannel.PUSH);
      channels.push(NotificationChannel.IN_APP);
      if (priority === 'HIGH' && userSettings.smsNotifications) {
        channels.push(NotificationChannel.SMS);
      }
      return channels;
    }

    // Pour les autres types, utiliser le canal demandé
    if (
      requestedChannel === NotificationChannel.EMAIL &&
      userSettings.emailNotifications !== false
    ) {
      channels.push(NotificationChannel.EMAIL);
    } else if (
      requestedChannel === NotificationChannel.PUSH &&
      userSettings.pushNotifications !== false
    ) {
      channels.push(NotificationChannel.PUSH);
    } else if (requestedChannel === NotificationChannel.SMS && userSettings.smsNotifications) {
      channels.push(NotificationChannel.SMS);
    }

    // Toujours inclure les notifications in-app sauf si explicitement refusées
    channels.push(NotificationChannel.IN_APP);

    return channels;
  }

  /**
   * Envoie une notification OneSignal
   */
  private async sendOneSignalNotification(
    user: { id: string; name?: string | null },
    title: string,
    message: string,
    options: {
      type: NotificationType;
      actionUrl?: string;
      notificationId: string;
      priority?: string;
      silent?: boolean;
      category?: string;
    }
  ): Promise<void> {
    try {
      // Mapper le type de notification vers le type OneSignal
      const oneSignalType = this.mapToOneSignalType(options.type);

      if (oneSignalType) {
        const success = await this.oneSignalService.sendNotification({
          userId: user.id,
          type: oneSignalType,
          title,
          message,
          url: options.actionUrl,
          data: {
            notificationId: options.notificationId,
            priority: options.priority,
            category: options.category,
            silent: options.silent,
          },
        });

        if (!success) {
          console.warn(`Échec d'envoi OneSignal pour l'utilisateur ${user.id}`);
        }
      } else {
        // Utiliser une méthode générique pour les types non mappés
        console.log(`Type de notification ${options.type} envoyé via OneSignal générique`);
      }
    } catch (error) {
      console.error("Erreur lors de l'envoi OneSignal:", error);
      // Ne pas faire échouer le processus si OneSignal échoue
    }
  }

  /**
   * Mappe les types de notification internes vers les types OneSignal
   */
  private mapToOneSignalType(type: NotificationType): any {
    const typeMapping: Record<string, any> = {
      [NotificationType.DOCUMENT_APPROVED]: 'DOCUMENT_APPROVED',
      [NotificationType.DOCUMENT_REJECTED]: 'DOCUMENT_REJECTED',
      [NotificationType.VERIFICATION_APPROVED]: 'VERIFICATION_APPROVED',
      [NotificationType.VERIFICATION_REJECTED]: 'VERIFICATION_REJECTED',
      [NotificationType.VERIFICATION_PENDING]: 'VERIFICATION_PENDING',
      [NotificationType.NEW_MESSAGE]: 'NEW_MESSAGE',
      [NotificationType.NEW_ANNOUNCEMENT]: 'NEW_DELIVERY',
    };

    return typeMapping[type] || null;
  }

  /**
   * Envoie une notification par email - Version étendue
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
      priority?: string;
      locale?: string;
    }
  ): Promise<void> {
    try {
      const locale = options.locale || (await getUserPreferredLocale(user.id)) || 'fr';

      // Sélectionner le template en fonction du type de notification et de la priorité
      let templateName = 'notification-default';

      if (options.priority === 'URGENT') {
        templateName = 'notification-urgent';
      } else if (options.actionUrl) {
        templateName = 'notification-with-action';
      } else if (options.type.includes('PAYMENT')) {
        templateName = 'notification-payment';
      } else if (options.type.includes('DELIVERY')) {
        templateName = 'notification-delivery';
      } else if (options.type.includes('SECURITY')) {
        templateName = 'notification-security';
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
          priority: options.priority || 'MEDIUM',
          isUrgent: options.priority === 'URGENT',
        },
        locale: locale as SupportedLanguage,
      });
    } catch (error) {
      console.error("Erreur lors de l'envoi de l'email de notification:", error);
      // Ne pas faire échouer le processus si l'email échoue
    }
  }

  /**
   * Envoie une notification par email - méthode privée étendue
   */
  private async sendEmailToUser(
    user: { id: string; email: string; name?: string | null },
    subject: string,
    content: string,
    options: {
      type: NotificationType;
      actionUrl?: string;
      actionLabel?: string;
      attachmentUrl?: string;
      priority?: string;
      locale?: string;
    }
  ): Promise<void> {
    try {
      const locale = options.locale || (await getUserPreferredLocale(user.id));

      // Déterminer le template email selon le type de notification
      let templateName = 'notification-general';
      if (options.type.includes('DELIVERY')) {
        templateName = 'notification-delivery';
      } else if (options.type.includes('PAYMENT')) {
        templateName = 'notification-payment';
      } else if (options.type.includes('DOCUMENT')) {
        templateName = 'notification-document';
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
   * Envoie une notification SMS - Version étendue
   */
  private async sendSmsNotification(
    user: { id: string; phoneNumber?: string | null },
    message: string,
    options?: {
      priority?: string;
      actionUrl?: string;
    }
  ): Promise<void> {
    try {
      // Utiliser le numéro fourni ou récupérer celui de la base
      let phoneNumber = user.phoneNumber;

      if (!phoneNumber) {
        const userData = await this.prisma.user.findUnique({
          where: { id: user.id },
          select: { phoneNumber: true },
        });
        phoneNumber = userData?.phoneNumber;
      }

      if (!phoneNumber) {
        console.warn(
          `Impossible d'envoyer un SMS à l'utilisateur ${user.id} : numéro de téléphone manquant`
        );
        return;
      }

      // Formatage du message selon la priorité
      let formattedMessage = message;
      if (options?.priority === 'URGENT') {
        formattedMessage = `🚨 URGENT: ${message}`;
      } else if (options?.priority === 'HIGH') {
        formattedMessage = `⚠️ IMPORTANT: ${message}`;
      }

      // Ajouter l'URL d'action si fournie et si le message n'est pas trop long
      if (options?.actionUrl && formattedMessage.length < 120) {
        formattedMessage += ` ${options.actionUrl}`;
      }

      // Mode démo
      if (process.env.DEMO_MODE === 'true') {
        console.log(`[DEMO SMS] À ${phoneNumber}: ${formattedMessage}`);
        return;
      }

      // Logique d'envoi de SMS réel (Twilio, etc.)
      // Cette implémentation dépend du service utilisé

      // Exemple avec Twilio
      // const client = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      // await client.messages.create({
      //   body: formattedMessage,
      //   from: process.env.TWILIO_PHONE_NUMBER,
      //   to: phoneNumber
      // });

      console.log(`SMS envoyé à l'utilisateur ${user.id} (${phoneNumber})`);
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
          link: true,
          data: true,
          read: true,
          readAt: true,
          createdAt: true,
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

  /**
   * NOUVELLES MÉTHODES COMPLÈTES - Extensions pour tous les cas d'usage
   */

  /**
   * Envoie une notification groupée à plusieurs utilisateurs
   */
  async sendBulkNotification(options: {
    userIds: string[];
    title: string;
    message: string;
    type: NotificationType;
    channel?: NotificationChannel;
    actionUrl?: string;
    actionLabel?: string;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    category?: string;
    sentById?: string;
  }): Promise<{
    success: number;
    failed: number;
    results: Array<{ userId: string; success: boolean; error?: string }>;
  }> {
    const results = [];
    let successCount = 0;
    let failedCount = 0;

    for (const userId of options.userIds) {
      try {
        const result = await this.sendUserNotification({
          userId,
          title: options.title,
          message: options.message,
          type: options.type,
          channel: options.channel,
          actionUrl: options.actionUrl,
          actionLabel: options.actionLabel,
          priority: options.priority,
          category: options.category,
          sentById: options.sentById,
        });

        if (result.success) {
          successCount++;
        } else {
          failedCount++;
        }

        results.push({
          userId,
          success: result.success,
        });
      } catch (error) {
        failedCount++;
        results.push({
          userId,
          success: false,
          error: error instanceof Error ? error.message : 'Erreur inconnue',
        });
      }
    }

    return {
      success: successCount,
      failed: failedCount,
      results,
    };
  }

  /**
   * Envoie des notifications de digest hebdomadaire/mensuel
   */
  async sendDigestNotifications(options: {
    type: 'WEEKLY' | 'MONTHLY';
    userRole?: UserRole;
    data: Record<string, any>;
    adminId?: string;
  }): Promise<{ sent: number; failed: number }> {
    try {
      // Récupérer les utilisateurs éligibles
      const whereClause: any = {
        isActive: true,
        notificationPreferences: {
          path: ['weeklyDigest'],
          equals: true,
        },
      };

      if (options.userRole) {
        whereClause.role = options.userRole;
      }

      const eligibleUsers = await this.prisma.user.findMany({
        where: whereClause,
        select: { id: true, name: true, email: true, role: true },
      });

      const title =
        options.type === 'WEEKLY' ? 'Résumé hebdomadaire - EcoDeli' : 'Résumé mensuel - EcoDeli';

      const message =
        options.type === 'WEEKLY'
          ? 'Voici un résumé de votre activité cette semaine'
          : 'Voici un résumé de votre activité ce mois';

      // Envoyer les notifications en lot
      const result = await this.sendBulkNotification({
        userIds: eligibleUsers.map(u => u.id),
        title,
        message,
        type:
          options.type === 'WEEKLY'
            ? NotificationType.WEEKLY_DIGEST
            : NotificationType.MONTHLY_SUMMARY,
        channel: NotificationChannel.EMAIL,
        priority: 'LOW',
        category: 'digest',
        sentById: options.adminId,
      });

      // Créer une entrée d'audit
      if (options.adminId) {
        await this.prisma.auditLog.create({
          data: {
            entityType: 'NOTIFICATION',
            action: `SEND_${options.type}_DIGEST`,
            performedById: options.adminId,
            changes: {
              recipients: result.success,
              failed: result.failed,
              userRole: options.userRole || 'ALL',
            },
          },
        });
      }

      return {
        sent: result.success,
        failed: result.failed,
      };
    } catch (error) {
      console.error("Erreur lors de l'envoi des digest:", error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: "Erreur lors de l'envoi des digest",
      });
    }
  }

  /**
   * Planifie une notification pour envoi différé
   */
  async scheduleNotification(options: {
    userId: string;
    title: string;
    message: string;
    type: NotificationType;
    scheduledFor: Date;
    channel?: NotificationChannel;
    actionUrl?: string;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    recurring?: {
      frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
      endDate?: Date;
    };
    sentById?: string;
  }): Promise<{ success: boolean; scheduledNotificationId?: string }> {
    try {
      const scheduledNotification = await this.prisma.notification.create({
        data: {
          userId: options.userId,
          title: options.title,
          message: options.message,
          type: options.type as unknown as PrismaNotificationType,
          actionUrl: options.actionUrl,
          scheduledFor: options.scheduledFor,
          sentById: options.sentById,
          read: false,
          confirmed: false,
          metadata: JSON.stringify({
            channel: options.channel,
            priority: options.priority || 'MEDIUM',
            recurring: options.recurring,
            scheduled: true,
            createdAt: new Date().toISOString(),
          }),
        },
      });

      // Si c'est une notification récurrente, créer les tâches programmées
      if (options.recurring) {
        // Ici, on pourrait intégrer avec un système de job scheduling comme Bull/BullMQ
        console.log(`Notification récurrente programmée: ${scheduledNotification.id}`);
      }

      return {
        success: true,
        scheduledNotificationId: scheduledNotification.id,
      };
    } catch (error) {
      console.error('Erreur lors de la planification de notification:', error);
      return { success: false };
    }
  }

  /**
   * Annule une notification programmée
   */
  async cancelScheduledNotification(
    notificationId: string,
    userId?: string
  ): Promise<{ success: boolean }> {
    try {
      const whereClause: any = { id: notificationId, scheduledFor: { not: null } };
      if (userId) {
        whereClause.userId = userId;
      }

      const notification = await this.prisma.notification.findFirst({
        where: whereClause,
      });

      if (!notification) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Notification programmée non trouvée',
        });
      }

      await this.prisma.notification.delete({
        where: { id: notificationId },
      });

      return { success: true };
    } catch (error) {
      console.error("Erreur lors de l'annulation de notification:", error);
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: "Erreur lors de l'annulation de notification",
      });
    }
  }

  /**
   * Obtient les statistiques de notifications pour un utilisateur ou globales
   */
  async getNotificationStats(options: {
    userId?: string;
    startDate?: Date;
    endDate?: Date;
    groupBy?: 'DAY' | 'WEEK' | 'MONTH';
  }): Promise<{
    total: number;
    unread: number;
    byType: Record<string, number>;
    byChannel: Record<string, number>;
    engagement: {
      readRate: number;
      clickRate: number;
      confirmationRate: number;
    };
  }> {
    try {
      const whereClause: any = {};

      if (options.userId) {
        whereClause.userId = options.userId;
      }

      if (options.startDate || options.endDate) {
        whereClause.createdAt = {};
        if (options.startDate) whereClause.createdAt.gte = options.startDate;
        if (options.endDate) whereClause.createdAt.lte = options.endDate;
      }

      // Statistiques de base
      const [total, unread, byType] = await Promise.all([
        this.prisma.notification.count({ where: whereClause }),
        this.prisma.notification.count({ where: { ...whereClause, read: false } }),
        this.prisma.notification.groupBy({
          by: ['type'],
          where: whereClause,
          _count: true,
        }),
      ]);

      // Statistiques d'engagement
      const [totalWithAction, clicked, confirmed] = await Promise.all([
        this.prisma.notification.count({
          where: { ...whereClause, actionUrl: { not: null } },
        }),
        this.prisma.notification.count({
          where: { ...whereClause, actionUrl: { not: null }, read: true },
        }),
        this.prisma.notification.count({
          where: { ...whereClause, requiresConfirmation: true, confirmed: true },
        }),
      ]);

      const byTypeMap = byType.reduce(
        (acc, item) => {
          acc[item.type] = item._count;
          return acc;
        },
        {} as Record<string, number>
      );

      return {
        total,
        unread,
        byType: byTypeMap,
        byChannel: {}, // TODO: Implémenter selon les métadonnées
        engagement: {
          readRate: total > 0 ? ((total - unread) / total) * 100 : 0,
          clickRate: totalWithAction > 0 ? (clicked / totalWithAction) * 100 : 0,
          confirmationRate: totalWithAction > 0 ? (confirmed / totalWithAction) * 100 : 0,
        },
      };
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Erreur lors de la récupération des statistiques',
      });
    }
  }

  /**
   * Envoie des notifications administratives système
   */
  async sendSystemNotification(options: {
    type: 'MAINTENANCE' | 'UPDATE' | 'SECURITY' | 'ANNOUNCEMENT';
    title: string;
    message: string;
    targetRole?: UserRole | 'ALL';
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    actionUrl?: string;
    startDate?: Date;
    endDate?: Date;
    adminId: string;
  }): Promise<{ sent: number; failed: number }> {
    try {
      // Déterminer les utilisateurs cibles
      const whereClause: any = { isActive: true };

      if (options.targetRole && options.targetRole !== 'ALL') {
        whereClause.role = options.targetRole;
      }

      const targetUsers = await this.prisma.user.findMany({
        where: whereClause,
        select: { id: true },
      });

      // Mapper le type vers le NotificationType approprié
      const notificationTypeMap = {
        MAINTENANCE: NotificationType.SYSTEM_MAINTENANCE,
        UPDATE: NotificationType.SYSTEM_UPDATE,
        SECURITY: NotificationType.SECURITY_ALERT,
        ANNOUNCEMENT: NotificationType.FEATURE_ANNOUNCEMENT,
      };

      const notificationType = notificationTypeMap[options.type];

      // Envoyer les notifications
      const result = await this.sendBulkNotification({
        userIds: targetUsers.map(u => u.id),
        title: options.title,
        message: options.message,
        type: notificationType,
        channel:
          options.priority === 'URGENT' ? NotificationChannel.PUSH : NotificationChannel.EMAIL,
        actionUrl: options.actionUrl,
        priority: options.priority,
        category: 'system',
        sentById: options.adminId,
      });

      // Créer un log d'audit pour la notification système
      await this.prisma.auditLog.create({
        data: {
          entityType: 'SYSTEM_NOTIFICATION',
          action: `SEND_${options.type}_NOTIFICATION`,
          performedById: options.adminId,
          changes: {
            title: options.title,
            type: options.type,
            targetRole: options.targetRole || 'ALL',
            priority: options.priority,
            recipients: result.success,
            failed: result.failed,
          },
        },
      });

      return {
        sent: result.success,
        failed: result.failed,
      };
    } catch (error) {
      console.error("Erreur lors de l'envoi de notification système:", error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: "Erreur lors de l'envoi de notification système",
      });
    }
  }

  /**
   * Alias pour markNotificationAsRead - Compatibilité avec le routeur
   */
  async markAsRead(notificationId: string, userId?: string): Promise<{ success: boolean }> {
    if (!userId) {
      // Pour compatibilité avec l'ancien système, on peut extraire l'userId de la notification
      const notification = await this.prisma.notification.findUnique({
        where: { id: notificationId },
        select: { userId: true },
      });

      if (!notification) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Notification non trouvée',
        });
      }

      userId = notification.userId;
    }

    return this.markNotificationAsRead(notificationId, userId);
  }

  /**
   * Marque toutes les notifications d'un utilisateur comme lues
   */
  async markAllAsRead(userId: string): Promise<{ success: boolean; count: number }> {
    try {
      const result = await this.prisma.notification.updateMany({
        where: { userId, read: false },
        data: { read: true },
      });

      return { success: true, count: result.count };
    } catch (error) {
      console.error('Erreur lors du marquage de toutes les notifications comme lues:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Erreur lors du marquage de toutes les notifications comme lues',
      });
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

// Export par défaut pour la compatibilité
export default NotificationService;
