import { User } from '@prisma/client';

export type OneSignalNotificationType =
  | 'DOCUMENT_APPROVED'
  | 'DOCUMENT_REJECTED'
  | 'VERIFICATION_APPROVED'
  | 'VERIFICATION_REJECTED'
  | 'VERIFICATION_PENDING'
  | 'NEW_MESSAGE'
  | 'NEW_DELIVERY';

interface OneSignalNotificationData {
  userId: string;
  type: OneSignalNotificationType;
  title: string;
  message: string;
  url?: string;
  data?: Record<string, any>;
}

export class OneSignalService {
  private apiKey: string;
  private appId: string;

  constructor() {
    this.apiKey = process.env.ONESIGNAL_API_KEY || '';
    this.appId = process.env.ONESIGNAL_APP_ID || '';

    if (!this.apiKey || !this.appId) {
      console.warn('OneSignal API Key or App ID not configured');
    }
  }

  private async sendNotification(data: OneSignalNotificationData): Promise<boolean> {
    if (!this.apiKey || !this.appId) {
      console.error('OneSignal API Key or App ID not configured');
      return false;
    }

    try {
      const response = await fetch('https://onesignal.com/api/v1/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${this.apiKey}`,
        },
        body: JSON.stringify({
          app_id: this.appId,
          filters: [{ field: 'tag', key: 'userId', relation: '=', value: data.userId }],
          headings: { en: data.title },
          contents: { en: data.message },
          data: {
            type: data.type,
            ...data.data,
          },
          url: data.url,
          web_url: data.url,
        }),
      });

      const result = await response.json();
      return result.id ? true : false;
    } catch (error) {
      console.error('Error sending OneSignal notification:', error);
      return false;
    }
  }

  // Document approuvé
  async sendDocumentApprovedNotification(
    userId: string,
    documentType: string,
    url: string
  ): Promise<boolean> {
    return this.sendNotification({
      userId,
      type: 'DOCUMENT_APPROVED',
      title: 'Document approuvé',
      message: `Votre document ${documentType} a été approuvé.`,
      url,
      data: { documentType },
    });
  }

  // Document rejeté
  async sendDocumentRejectedNotification(
    userId: string,
    documentType: string,
    reason: string,
    url: string
  ): Promise<boolean> {
    return this.sendNotification({
      userId,
      type: 'DOCUMENT_REJECTED',
      title: 'Document rejeté',
      message: `Votre document ${documentType} a été rejeté: ${reason}`,
      url,
      data: { documentType, reason },
    });
  }

  // Vérification approuvée
  async sendVerificationApprovedNotification(userId: string, url: string): Promise<boolean> {
    return this.sendNotification({
      userId,
      type: 'VERIFICATION_APPROVED',
      title: 'Compte vérifié',
      message:
        'Votre compte a été vérifié avec succès. Vous avez maintenant accès à toutes les fonctionnalités.',
      url,
    });
  }

  // Vérification rejetée
  async sendVerificationRejectedNotification(
    userId: string,
    reason: string,
    url: string
  ): Promise<boolean> {
    return this.sendNotification({
      userId,
      type: 'VERIFICATION_REJECTED',
      title: 'Vérification rejetée',
      message: `Votre vérification a été rejetée: ${reason}`,
      url,
      data: { reason },
    });
  }
}
