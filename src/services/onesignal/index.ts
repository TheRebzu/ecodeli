// Service pour gérer les notifications push avec OneSignal

interface NotificationContent {
  headings: { [language: string]: string };
  contents: { [language: string]: string };
  url?: string;
  data?: Record<string, any>;
}

interface NotificationRecipient {
  // Soit un ID utilisateur
  userId?: string;
  // Soit un segment d'utilisateurs
  segment?: 'Active Users' | 'Inactive Users' | 'Engaged Users' | 'All' | string;
  // Soit des attributs utilisateur
  filters?: {
    field: string;
    value: string;
    operator: 'OR' | 'AND';
  }[];
}

interface SendNotificationOptions {
  content: NotificationContent;
  recipient: NotificationRecipient;
  scheduledAt?: Date;
  isIos?: boolean;
  isAndroid?: boolean;
  isWeb?: boolean;
}

export class OneSignalService {
  private readonly apiKey: string;
  private readonly appId: string;
  private readonly baseUrl = 'https://onesignal.com/api/v1';

  constructor() {
    this.apiKey = process.env.ONESIGNAL_API_KEY || '';
    this.appId = process.env.ONESIGNAL_APP_ID || '';

    if (!this.apiKey || !this.appId) {
      console.warn('OneSignal API key or App ID is missing. Notifications will not work.');
    }
  }

  /**
   * Envoie une notification aux utilisateurs spécifiés
   */
  async sendNotification({
    content,
    recipient,
    scheduledAt,
    isIos = true,
    isAndroid = true,
    isWeb = true
  }: SendNotificationOptions): Promise<{ id: string } | null> {
    if (!this.apiKey || !this.appId) {
      console.error('OneSignal API key or App ID is missing');
      return null;
    }

    try {
      const payload: Record<string, any> = {
        app_id: this.appId,
        headings: content.headings,
        contents: content.contents,
        url: content.url,
        data: content.data || {},
        ios_badgeType: 'Increase',
        ios_badgeCount: 1,
      };

      // Configuration du ciblage
      if (recipient.userId) {
        payload.include_external_user_ids = [recipient.userId];
      } else if (recipient.segment) {
        payload.included_segments = [recipient.segment];
      } else if (recipient.filters) {
        payload.filters = recipient.filters;
      }

      // Configuration des plateformes
      payload.isIos = isIos;
      payload.isAndroid = isAndroid;
      payload.isAnyWeb = isWeb;

      // Planification
      if (scheduledAt) {
        payload.send_after = scheduledAt.toISOString();
      }

      const response = await fetch(`${this.baseUrl}/notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${this.apiKey}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`OneSignal API Error: ${errorData.errors?.[0] || 'Unknown error'}`);
      }

      const data = await response.json();
      return { id: data.id };
    } catch (error) {
      console.error('Error sending notification:', error);
      return null;
    }
  }

  /**
   * Envoie une notification pour la livraison d'un colis
   */
  async sendDeliveryNotification(userId: string, deliveryData: {
    deliveryId: string;
    status: 'preparing' | 'in_transit' | 'delivered' | 'delayed';
    estimatedDelivery?: Date;
    courierName?: string;
  }) {
    let title: { [key: string]: string } = {};
    let message: { [key: string]: string } = {};

    switch (deliveryData.status) {
      case 'preparing':
        title = { fr: 'Livraison en préparation', en: 'Delivery in preparation' };
        message = {
          fr: `Votre colis #${deliveryData.deliveryId} est en cours de préparation.`,
          en: `Your package #${deliveryData.deliveryId} is being prepared.`
        };
        break;
      case 'in_transit':
        title = { fr: 'Livraison en cours', en: 'Delivery in progress' };
        message = {
          fr: `Votre colis #${deliveryData.deliveryId} est en cours de livraison${deliveryData.courierName ? ` par ${deliveryData.courierName}` : ''}.`,
          en: `Your package #${deliveryData.deliveryId} is being delivered${deliveryData.courierName ? ` by ${deliveryData.courierName}` : ''}.`
        };
        break;
      case 'delivered':
        title = { fr: 'Colis livré', en: 'Package delivered' };
        message = {
          fr: `Votre colis #${deliveryData.deliveryId} a été livré avec succès.`,
          en: `Your package #${deliveryData.deliveryId} has been successfully delivered.`
        };
        break;
      case 'delayed':
        title = { fr: 'Retard de livraison', en: 'Delivery delay' };
        message = {
          fr: `Votre colis #${deliveryData.deliveryId} connaît un léger retard.`,
          en: `Your package #${deliveryData.deliveryId} is experiencing a slight delay.`
        };
        break;
    }

    return this.sendNotification({
      content: {
        headings: title,
        contents: message,
        url: `/tracking/${deliveryData.deliveryId}`,
        data: {
          deliveryId: deliveryData.deliveryId,
          status: deliveryData.status,
          estimatedDelivery: deliveryData.estimatedDelivery?.toISOString()
        }
      },
      recipient: { userId }
    });
  }
}

// Singleton pour l'utilisation dans toute l'application
export const oneSignalService = new OneSignalService();