import { db } from '@/server/db';
import { SupportedLanguage } from '@/lib/user-locale';
import { DocumentType, VerificationStatus, DocumentStatus } from '../db/enums';
import { UserRole } from '@prisma/client';
import { PrismaClient } from '@prisma/client';
import { TRPCError } from '@trpc/server';
import { EmailService } from './email.service';
import { Document, Notification, NotificationType, Prisma, User } from '@prisma/client';
import { formatDistance } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import { SchedulerRegistry } from '@nestjs/schedule';

export type NotificationType =
  | 'VERIFICATION_REQUIRED'
  | 'DOCUMENT_APPROVED'
  | 'DOCUMENT_REJECTED'
  | 'VERIFICATION_APPROVED'
  | 'VERIFICATION_REJECTED'
  | 'MISSING_DOCUMENT'
  | 'NEW_MESSAGE'
  | 'DELIVERY_ASSIGNED'
  | 'DELIVERY_COMPLETED'
  | 'PAYMENT_RECEIVED'
  | 'INVOICE_GENERATED';

interface NotificationData {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  read?: boolean;
}

export interface NotificationCreateInput {
  userId: string;
  title: string;
  message: string;
  type: string;
  link?: string;
  data?: Record<string, any>;
}

/**
 * Service de gestion des notifications
 * Gère la création et l'envoi des notifications aux utilisateurs
 */
export class NotificationService {
  private prisma: PrismaClient;
  private emailService: EmailService;

  constructor(prisma = db) {
    this.prisma = prisma;
    this.emailService = new EmailService();
  }

  /**
   * Crée une notification en base de données
   */
  async createNotification(data: NotificationCreateInput): Promise<Notification> {
    try {
      // Convertir les données en JSON si elles existent
      const dataJson = data.data ? JSON.stringify(data.data) : null;

      return await this.prisma.notification.create({
        data: {
          userId: data.userId,
          title: data.title,
          message: data.message,
          type: data.type,
          link: data.link,
          data: dataJson,
          read: false,
        },
      });
    } catch (error) {
      console.error('Error creating notification:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create notification',
      });
    }
  }

  /**
   * Marque une notification comme lue
   */
  async markAsRead(id: string, userId: string): Promise<Notification> {
    try {
      return await this.prisma.notification.update({
        where: { id, userId },
        data: { read: true, readAt: new Date() },
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to mark notification as read',
      });
    }
  }

  /**
   * Marque toutes les notifications d'un utilisateur comme lues
   */
  async markAllAsRead(userId: string): Promise<void> {
    try {
      await this.prisma.notification.updateMany({
        where: { userId, read: false },
        data: { read: true, readAt: new Date() },
      });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to mark all notifications as read',
      });
    }
  }

  /**
   * Récupère les notifications non lues d'un utilisateur
   */
  async getUnreadNotifications(userId: string): Promise<Notification[]> {
    try {
      return await this.prisma.notification.findMany({
        where: {
          userId,
          read: false,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    } catch (error) {
      console.error('Error getting unread notifications:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to get unread notifications',
      });
    }
  }

  /**
   * Récupère toutes les notifications d'un utilisateur
   */
  async getNotifications(
    userId: string,
    page = 1,
    limit = 10
  ): Promise<{ notifications: Notification[]; total: number }> {
    const skip = (page - 1) * limit;

    try {
      const [notifications, total] = await Promise.all([
        this.prisma.notification.findMany({
          where: {
            userId,
          },
          orderBy: {
            createdAt: 'desc',
          },
          skip,
          take: limit,
        }),
        this.prisma.notification.count({ where: { userId } }),
      ]);

      return { notifications, total };
    } catch (error) {
      console.error('Error getting notifications:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to get notifications',
      });
    }
  }

  /**
   * Supprime une notification
   */
  async deleteNotification(id: string, userId: string): Promise<Notification> {
    try {
      return await this.prisma.notification.delete({
        where: { id, userId },
      });
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to delete notification',
      });
    }
  }

  /**
   * Supprime toutes les notifications d'un utilisateur
   */
  async deleteAllNotifications(userId: string): Promise<void> {
    try {
      await this.prisma.notification.deleteMany({
        where: { userId },
      });
    } catch (error) {
      console.error('Error deleting all notifications:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to delete all notifications',
      });
    }
  }

  /**
   * Envoie une notification lorsqu'un document est approuvé
   */
  async sendDocumentApprovedNotification(
    document: Document & { user: User },
    locale: SupportedLanguage
  ): Promise<Notification> {
    const documentTypeName = this.getDocumentTypeName(document.type, locale);

    const title = locale === 'fr' ? `Document approuvé` : `Document approved`;

    const message =
      locale === 'fr'
        ? `Votre document ${documentTypeName} a été approuvé.`
        : `Your ${documentTypeName} document has been approved.`;

    return this.createNotification({
      userId: document.userId,
      title,
      message,
      type: 'DOCUMENT_APPROVED',
      link: `/${locale}/${document.user.role.toLowerCase()}/documents`,
      data: {
        documentId: document.id,
        documentType: document.type,
      },
    });
  }

  /**
   * Envoie une notification lorsqu'un document est rejeté
   */
  async sendDocumentRejectedNotification(
    document: Document & { user: User },
    reason: string,
    locale: SupportedLanguage
  ): Promise<Notification> {
    const documentTypeName = this.getDocumentTypeName(document.type, locale);

    const title = locale === 'fr' ? `Document rejeté` : `Document rejected`;

    const message =
      locale === 'fr'
        ? `Votre document ${documentTypeName} a été rejeté : ${reason}`
        : `Your ${documentTypeName} document has been rejected: ${reason}`;

    return this.createNotification({
      userId: document.userId,
      title,
      message,
      type: 'DOCUMENT_REJECTED',
      link: `/${locale}/${document.user.role.toLowerCase()}/documents`,
      data: {
        documentId: document.id,
        documentType: document.type,
        reason,
      },
    });
  }

  /**
   * Envoie une notification lorsque le statut de vérification change
   */
  async sendVerificationStatusChangedNotification(
    user: User,
    status: VerificationStatus,
    details: string | null,
    locale: SupportedLanguage
  ): Promise<Notification> {
    const title = this.getVerificationStatusTitle(status, locale);
    const message = this.getVerificationStatusMessage(status, details, locale);

    return this.createNotification({
      userId: user.id,
      title,
      message,
      type: `VERIFICATION_${status}`,
      link: `/${locale}/${user.role.toLowerCase()}/profile`,
      data: {
        status,
        details,
      },
    });
  }

  /**
   * Envoie un rappel pour les documents manquants
   */
  async sendMissingDocumentsReminder(
    user: User,
    requiredDocuments: DocumentType[],
    locale: SupportedLanguage
  ): Promise<Notification> {
    const documentNames = requiredDocuments
      .map(type => this.getDocumentTypeName(type, locale))
      .join(', ');

    const title =
      locale === 'fr'
        ? `Documents manquants pour la vérification`
        : `Missing documents for verification`;

    const message =
      locale === 'fr'
        ? `Veuillez fournir les documents suivants pour compléter votre vérification : ${documentNames}`
        : `Please provide the following documents to complete your verification: ${documentNames}`;

    return this.createNotification({
      userId: user.id,
      title,
      message,
      type: 'MISSING_DOCUMENTS',
      link: `/${locale}/${user.role.toLowerCase()}/documents`,
      data: {
        requiredDocuments,
      },
    });
  }

  /**
   * Planifie des rappels automatiques pour les documents manquants
   */
  async scheduleMissingDocumentsReminder(
    user: User,
    requiredDocuments: DocumentType[],
    days: number,
    schedulerRegistry: SchedulerRegistry,
    locale: SupportedLanguage = 'fr'
  ): Promise<void> {
    const timeout = setTimeout(
      () => {
        this.sendMissingDocumentsReminder(user, requiredDocuments, locale).catch(error => {
          console.error('Error sending reminder notification:', error);
        });
      },
      days * 24 * 60 * 60 * 1000
    );

    schedulerRegistry.addTimeout(`missing-docs-reminder-${user.id}`, timeout);
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
