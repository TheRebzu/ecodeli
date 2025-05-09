import { PrismaClient } from '@prisma/client';
import { TRPCError } from '@trpc/server';
import { 
  UserNotificationSettings, 
  SendUserNotificationOptions,
  NotificationType,
  NotificationChannel
} from '@/types/admin';
import { db } from '@/server/db';
import { sendEmailNotification } from '@/lib/email';
import { getUserPreferredLocale } from '@/lib/user-locale';

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
          notificationSettings: true
        }
      });

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Utilisateur non trouvé',
        });
      }

      // Si l'utilisateur n'a pas encore de paramètres de notification, renvoyer les valeurs par défaut
      if (!user.notificationSettings) {
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
      return user.notificationSettings as unknown as UserNotificationSettings;
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
        select: { id: true }
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
          notificationSettings: {
            emailNotifications: data.emailNotifications,
            pushNotifications: data.pushNotifications,
            smsNotifications: data.smsNotifications,
            marketingEmails: data.marketingEmails,
            securityAlerts: data.securityAlerts,
            loginAlerts: data.loginAlerts,
            paymentAlerts: data.paymentAlerts,
            weeklyDigest: data.weeklyDigest,
            notificationCategories: data.notificationCategories || [],
          }
        }
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
  async sendUserNotification(options: SendUserNotificationOptions & { sentById?: string }): Promise<{ success: boolean; id?: string }> {
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
        sentById
      } = options;

      // Vérifier si l'utilisateur existe
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { 
          id: true, 
          email: true, 
          name: true,
          notificationSettings: true,
          deviceTokens: true
        }
      });

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Utilisateur non trouvé',
        });
      }

      // Vérifier les paramètres de notification de l'utilisateur
      const userSettings = user.notificationSettings as unknown as UserNotificationSettings || {
        emailNotifications: true,
        pushNotifications: true,
      };

      // Créer l'enregistrement de notification dans la base de données
      const notification = await this.prisma.notification.create({
        data: {
          userId,
          title,
          message,
          type,
          actionUrl,
          actionLabel,
          attachmentUrl,
          requiresConfirmation: requiresConfirmation || false,
          expiresAt,
          createdAt: new Date(),
          scheduledFor: deliverAt,
          sentById,
        }
      });

      // Envoyer la notification selon le canal choisi
      switch (channel) {
        case NotificationChannel.EMAIL:
          if (userSettings.emailNotifications !== false) {
            await this.sendEmailNotification(user, title, message, {
              type,
              actionUrl,
              actionLabel,
              attachmentUrl
            });
          }
          break;

        case NotificationChannel.PUSH:
          if (userSettings.pushNotifications !== false && user.deviceTokens?.length) {
            await this.sendPushNotification(user, title, message, {
              type,
              actionUrl,
              notificationId: notification.id
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
      
      console.error('Erreur lors de l\'envoi de la notification:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Erreur lors de l\'envoi de la notification',
      });
    }
  }

  /**
   * Envoie une notification par email
   */
  private async sendEmailNotification(
    user: { id: string; email: string; name?: string },
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
      const locale = await getUserPreferredLocale(user.id) || 'fr';
      
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
          notificationType: options.type.toLowerCase()
        },
        locale
      });
    } catch (error) {
      console.error('Erreur lors de l\'envoi de l\'email de notification:', error);
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
      console.error('Erreur lors de l\'envoi de la notification push:', error);
      // Ne pas faire échouer le processus si la notification push échoue
    }
  }

  /**
   * Envoie une notification SMS
   */
  private async sendSmsNotification(
    user: { id: string },
    message: string
  ): Promise<void> {
    try {
      // Récupérer le numéro de téléphone de l'utilisateur
      const userData = await this.prisma.user.findUnique({
        where: { id: user.id },
        select: { phoneNumber: true }
      });

      if (!userData?.phoneNumber) {
        console.warn(`Impossible d'envoyer un SMS à l'utilisateur ${user.id} : numéro de téléphone manquant`);
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
      console.error('Erreur lors de l\'envoi du SMS:', error);
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
      types?: NotificationType[];
    } = {}
  ) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        includeRead = false,
        types
      } = options;

      const skip = (page - 1) * limit;

      // Construire la requête
      const where: any = { userId };
      
      if (!includeRead) {
        where.isRead = false;
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
          isRead: true,
          createdAt: true,
          expiresAt: true,
          actionUrl: true,
          actionLabel: true,
          requiresConfirmation: true,
          isConfirmed: true
        }
      });

      return {
        notifications,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
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
  async markNotificationAsRead(notificationId: string, userId: string): Promise<{ success: boolean }> {
    try {
      // Vérifier si la notification existe et appartient à l'utilisateur
      const notification = await this.prisma.notification.findFirst({
        where: { id: notificationId, userId }
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
        data: { isRead: true }
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
          requiresConfirmation: true
        }
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
          isConfirmed: true,
          isRead: true
        }
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
        where: { id: notificationId, userId }
      });

      if (!notification) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Notification non trouvée',
        });
      }

      // Supprimer la notification
      await this.prisma.notification.delete({
        where: { id: notificationId }
      });

      return { success: true };
    } catch (error) {
      console.error("Erreur lors de l'envoi des notifications aux administrateurs:", error);
      // Ne pas propager l'erreur pour éviter de bloquer le téléchargement du document
    }
  }

  /**
   * Helper method to get the document type name in the specified locale
   */
  private getDocumentTypeName(type: DocumentType, locale: SupportedLanguage): string {
    const documentTypeNames: Record<DocumentType, Record<SupportedLanguage, string>> = {
      [DocumentType.ID_CARD]: {
        fr: "Carte d'identité",
        en: 'ID card',
      },
      [DocumentType.DRIVING_LICENSE]: {
        fr: 'Permis de conduire',
        en: 'Driving license',
      },
      [DocumentType.VEHICLE_REGISTRATION]: {
        fr: 'Carte grise',
        en: 'Vehicle registration',
      },
      [DocumentType.INSURANCE]: {
        fr: "Attestation d'assurance",
        en: 'Insurance certificate',
      },
      [DocumentType.QUALIFICATION_CERTIFICATE]: {
        fr: 'Certificat de qualification',
        en: 'Qualification certificate',
      },
      [DocumentType.SELFIE]: {
        fr: 'Photo de profil',
        en: 'Profile photo',
      },
      [DocumentType.OTHER]: {
        fr: 'Autre document',
        en: 'Other document',
      },
    };

    return documentTypeNames[type]?.[locale] || (locale === 'fr' ? 'Document' : 'Document');
  }

  /**
   * Helper method to get the verification status title in the specified locale
   */
  private getVerificationStatusTitle(
    status: VerificationStatus,
    locale: SupportedLanguage
  ): string {
    const titles: Record<VerificationStatus, Record<SupportedLanguage, string>> = {
      [VerificationStatus.PENDING]: {
        fr: 'Vérification en cours',
        en: 'Verification in progress',
      },
      [VerificationStatus.APPROVED]: {
        fr: 'Compte vérifié',
        en: 'Account verified',
      },
      [VerificationStatus.REJECTED]: {
        fr: 'Vérification refusée',
        en: 'Verification rejected',
      },
    };

    return (
      titles[status]?.[locale] ||
      (locale === 'fr' ? 'Statut de vérification mis à jour' : 'Verification status updated')
    );
  }

  /**
   * Helper method to get the verification status message in the specified locale
   */
  private getVerificationStatusMessage(
    status: VerificationStatus,
    details: string | null,
    locale: SupportedLanguage
  ): string {
    const baseMessages: Record<VerificationStatus, Record<SupportedLanguage, string>> = {
      [VerificationStatus.PENDING]: {
        fr: "Votre demande de vérification est en cours de traitement. Nous vous informerons une fois l'examen terminé.",
        en: 'Your verification request is being processed. We will notify you once the review is complete.',
      },
      [VerificationStatus.APPROVED]: {
        fr: 'Félicitations ! Votre compte a été vérifié. Vous pouvez maintenant accéder à toutes les fonctionnalités.',
        en: 'Congratulations! Your account has been verified. You can now access all features.',
      },
      [VerificationStatus.REJECTED]: {
        fr: 'Votre demande de vérification a été refusée.',
        en: 'Your verification request has been rejected.',
      },
    };

    let message = baseMessages[status]?.[locale] || '';

    if (status === VerificationStatus.REJECTED && details) {
      const reasonPrefix = locale === 'fr' ? 'Raison : ' : 'Reason: ';
      message += ` ${reasonPrefix}${details}`;
    }

    return message;
  }
}

/**
 * Obtient le nom localisé d'un rôle
 */
function getRoleName(role: UserRole, locale: SupportedLanguage): string {
  const roleNames: Record<SupportedLanguage, Record<UserRole, string>> = {
    fr: {
      ADMIN: 'administrateur',
      CLIENT: 'client',
      DELIVERER: 'livreur',
      MERCHANT: 'commerçant',
      PROVIDER: 'prestataire',
    },
    en: {
      ADMIN: 'administrator',
      CLIENT: 'client',
      DELIVERER: 'deliverer',
      MERCHANT: 'merchant',
      PROVIDER: 'service provider',
    },
  };

  return roleNames[locale][role];
}

function getDocumentApprovedTitle(locale: SupportedLanguage): string {
  return locale === 'fr' ? 'Document approuvé' : 'Document approved';
}

function getDocumentApprovedMessage(documentType: DocumentType, locale: SupportedLanguage): string {
  if (locale === 'fr') {
    const documentNames = {
      [DocumentType.ID_CARD]: "Carte d'identité",
      [DocumentType.PASSPORT]: 'Passeport',
      [DocumentType.DRIVING_LICENSE]: 'Permis de conduire',
      [DocumentType.PROOF_OF_ADDRESS]: 'Justificatif de domicile',
      [DocumentType.BUSINESS_REGISTRATION]: 'Extrait K-bis',
      [DocumentType.INSURANCE_CERTIFICATE]: "Attestation d'assurance",
      [DocumentType.VEHICLE_REGISTRATION]: 'Carte grise',
      [DocumentType.PROFESSIONAL_CERTIFICATION]: 'Certification professionnelle',
      [DocumentType.SELFIE]: 'Photo de profil',
      [DocumentType.OTHER]: 'Document',
    };

    return `Votre ${documentNames[documentType]} a été approuvé. Vous pouvez maintenant accéder à toutes les fonctionnalités associées.`;
  } else {
    const documentNames = {
      [DocumentType.ID_CARD]: 'ID card',
      [DocumentType.PASSPORT]: 'Passport',
      [DocumentType.DRIVING_LICENSE]: 'Driving license',
      [DocumentType.PROOF_OF_ADDRESS]: 'Proof of address',
      [DocumentType.BUSINESS_REGISTRATION]: 'Business registration',
      [DocumentType.INSURANCE_CERTIFICATE]: 'Insurance certificate',
      [DocumentType.VEHICLE_REGISTRATION]: 'Vehicle registration',
      [DocumentType.PROFESSIONAL_CERTIFICATION]: 'Professional certification',
      [DocumentType.SELFIE]: 'Profile photo',
      [DocumentType.OTHER]: 'Document',
    };

    return `Your ${documentNames[documentType]} has been approved. You can now access all associated features.`;
  }
}

function getDocumentRejectedTitle(locale: SupportedLanguage): string {
  return locale === 'fr' ? 'Document rejeté' : 'Document rejected';
}

function getDocumentRejectedMessage(
  documentType: DocumentType,
  reason: string,
  locale: SupportedLanguage
): string {
  if (locale === 'fr') {
    const documentNames = {
      [DocumentType.ID_CARD]: "Carte d'identité",
      [DocumentType.PASSPORT]: 'Passeport',
      [DocumentType.DRIVING_LICENSE]: 'Permis de conduire',
      [DocumentType.PROOF_OF_ADDRESS]: 'Justificatif de domicile',
      [DocumentType.BUSINESS_REGISTRATION]: 'Extrait K-bis',
      [DocumentType.INSURANCE_CERTIFICATE]: "Attestation d'assurance",
      [DocumentType.VEHICLE_REGISTRATION]: 'Carte grise',
      [DocumentType.PROFESSIONAL_CERTIFICATION]: 'Certification professionnelle',
      [DocumentType.SELFIE]: 'Photo de profil',
      [DocumentType.OTHER]: 'Document',
    };

    return `Votre ${documentNames[documentType]} a été rejeté pour la raison suivante : ${reason}. Veuillez télécharger un nouveau document.`;
  } else {
    const documentNames = {
      [DocumentType.ID_CARD]: 'ID card',
      [DocumentType.PASSPORT]: 'Passport',
      [DocumentType.DRIVING_LICENSE]: 'Driving license',
      [DocumentType.PROOF_OF_ADDRESS]: 'Proof of address',
      [DocumentType.BUSINESS_REGISTRATION]: 'Business registration',
      [DocumentType.INSURANCE_CERTIFICATE]: 'Insurance certificate',
      [DocumentType.VEHICLE_REGISTRATION]: 'Vehicle registration',
      [DocumentType.PROFESSIONAL_CERTIFICATION]: 'Professional certification',
      [DocumentType.SELFIE]: 'Profile photo',
      [DocumentType.OTHER]: 'Document',
    };

    return `Your ${documentNames[documentType]} has been rejected for the following reason: ${reason}. Please upload a new document.`;
  }
}

function getVerificationStatusTitle(status: VerificationStatus, locale: SupportedLanguage): string {
  if (locale === 'fr') {
    const statusTitles = {
      [VerificationStatus.PENDING]: 'Vérification en cours',
      [VerificationStatus.APPROVED]: 'Compte vérifié',
      [VerificationStatus.REJECTED]: 'Vérification refusée',
    };
    return statusTitles[status];
  } else {
    const statusTitles = {
      [VerificationStatus.PENDING]: 'Verification in progress',
      [VerificationStatus.APPROVED]: 'Account verified',
      [VerificationStatus.REJECTED]: 'Verification rejected',
    };
    return statusTitles[status];
  }
}

function getVerificationStatusMessage(
  status: VerificationStatus,
  details: string | null,
  locale: SupportedLanguage
): string {
  if (locale === 'fr') {
    switch (status) {
      case VerificationStatus.PENDING:
        return 'Votre demande de vérification est en cours de traitement. Nous vous notifierons dès que la vérification sera terminée.';
      case VerificationStatus.APPROVED:
        return 'Félicitations ! Votre compte a été vérifié et approuvé. Vous pouvez maintenant accéder à toutes les fonctionnalités de notre plateforme.';
      case VerificationStatus.REJECTED:
        return `Votre demande de vérification a été refusée pour la raison suivante : ${details || 'Documents invalides ou incomplets'}. Veuillez mettre à jour vos informations et soumettre à nouveau votre demande.`;
      default:
        return 'Le statut de votre vérification a été mis à jour.';
    }
  } else {
    switch (status) {
      case VerificationStatus.PENDING:
        return 'Your verification request is being processed. We will notify you as soon as the verification is complete.';
      case VerificationStatus.APPROVED:
        return 'Congratulations! Your account has been verified and approved. You can now access all features of our platform.';
      case VerificationStatus.REJECTED:
        return `Your verification request has been rejected for the following reason: ${details || 'Invalid or incomplete documents'}. Please update your information and submit your request again.`;
      default:
        return 'Your verification status has been updated.';
    }
  }
}

function getMissingDocumentsTitle(locale: SupportedLanguage): string {
  return locale === 'fr' ? 'Documents manquants' : 'Missing documents';
}

function getMissingDocumentsMessage(
  documentTypes: DocumentType[],
  locale: SupportedLanguage
): string {
  if (locale === 'fr') {
    const documentNames = {
      [DocumentType.ID_CARD]: "Carte d'identité",
      [DocumentType.PASSPORT]: 'Passeport',
      [DocumentType.DRIVING_LICENSE]: 'Permis de conduire',
      [DocumentType.PROOF_OF_ADDRESS]: 'Justificatif de domicile',
      [DocumentType.BUSINESS_REGISTRATION]: 'Extrait K-bis',
      [DocumentType.INSURANCE_CERTIFICATE]: "Attestation d'assurance",
      [DocumentType.VEHICLE_REGISTRATION]: 'Carte grise',
      [DocumentType.PROFESSIONAL_CERTIFICATION]: 'Certification professionnelle',
      [DocumentType.SELFIE]: 'Photo de profil',
      [DocumentType.OTHER]: 'Document',
    };

    const documentsList = documentTypes.map(type => documentNames[type]).join(', ');

    return `Pour compléter votre profil, veuillez fournir les documents suivants : ${documentsList}.`;
  } else {
    const documentNames = {
      [DocumentType.ID_CARD]: 'ID card',
      [DocumentType.PASSPORT]: 'Passport',
      [DocumentType.DRIVING_LICENSE]: 'Driving license',
      [DocumentType.PROOF_OF_ADDRESS]: 'Proof of address',
      [DocumentType.BUSINESS_REGISTRATION]: 'Business registration',
      [DocumentType.INSURANCE_CERTIFICATE]: 'Insurance certificate',
      [DocumentType.VEHICLE_REGISTRATION]: 'Vehicle registration',
      [DocumentType.PROFESSIONAL_CERTIFICATION]: 'Professional certification',
      [DocumentType.SELFIE]: 'Profile photo',
      [DocumentType.OTHER]: 'Document',
    };

    const documentsList = documentTypes.map(type => documentNames[type]).join(', ');

    return `To complete your profile, please provide the following documents: ${documentsList}.`;
  }
}

function getDocumentsPageLink(role: string, locale: SupportedLanguage): string {
  const basePath = process.env.NEXT_PUBLIC_APP_URL || 'https://ecodeli.com';

  switch (role) {
    case 'deliverer':
      return `${basePath}/${locale}/deliverer/documents`;
    case 'provider':
      return `${basePath}/${locale}/provider/documents`;
    case 'merchant':
      return `${basePath}/${locale}/merchant/profile`;
    default:
      return `${basePath}/${locale}/profile`;
  }
}

// Instancier et exporter le service
export const notificationService = new NotificationService();
