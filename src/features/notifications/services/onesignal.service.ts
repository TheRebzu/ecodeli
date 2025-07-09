import { prisma } from '@/lib/db'

export interface NotificationData {
  userId: string;
  title: string;
  message: string;
  type: 'DELIVERY_UPDATE' | 'PAYMENT' | 'BOOKING' | 'SUBSCRIPTION' | 'MATCHING' | 'DOCUMENT_VALIDATION';
  data?: Record<string, any>;
  priority?: 'high' | 'normal' | 'low';
}

export interface NotificationTemplate {
  title: string;
  message: string;
  data?: Record<string, any>;
}

export class OneSignalService {
  private appId: string;
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.appId = process.env.ONESIGNAL_APP_ID || '';
    this.apiKey = process.env.ONESIGNAL_API_KEY || '';
    this.baseUrl = 'https://onesignal.com/api/v1';
  }

  private async sendNotification(notification: NotificationData): Promise<boolean> {
    try {
      if (!this.appId || !this.apiKey) {
        console.warn('OneSignal credentials not configured');
        return false;
      }

      const payload = {
        app_id: this.appId,
        include_external_user_ids: [notification.userId],
        headings: { en: notification.title },
        contents: { en: notification.message },
        data: {
          type: notification.type,
          ...notification.data,
        },
        priority: notification.priority || 'normal',
      };

      const response = await fetch(`${this.baseUrl}/notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${this.apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('OneSignal API error:', error);
        return false;
      }

      const result = await response.json();
      console.log('OneSignal notification sent:', result.id);
      return true;
    } catch (error) {
      console.error('Error sending OneSignal notification:', error);
      return false;
    }
  }

  // Notifications de livraison
  async sendDeliveryUpdate(userId: string, deliveryId: string, status: string, estimatedTime?: string): Promise<boolean> {
    const templates: Record<string, NotificationTemplate> = {
      'PENDING': {
        title: 'Livraison en attente',
        message: 'Votre livraison est en attente d\'acceptation par un livreur',
      },
      'ACCEPTED': {
        title: 'Livraison acceptée',
        message: 'Un livreur a accepté votre livraison',
      },
      'IN_TRANSIT': {
        title: 'Livraison en cours',
        message: `Votre colis est en route${estimatedTime ? ` - Arrivée estimée: ${estimatedTime}` : ''}`,
      },
      'DELIVERED': {
        title: 'Livraison terminée',
        message: 'Votre livraison a été effectuée avec succès',
      },
      'CANCELLED': {
        title: 'Livraison annulée',
        message: 'Votre livraison a été annulée',
      },
    };

    const template = templates[status] || {
      title: 'Mise à jour livraison',
      message: `Statut de votre livraison: ${status}`,
    };

    return this.sendNotification({
      userId,
      title: template.title,
      message: template.message,
      type: 'DELIVERY_UPDATE',
      data: {
        deliveryId,
        status,
        estimatedTime,
      },
      priority: status === 'IN_TRANSIT' ? 'high' : 'normal',
    });
  }

  // Notifications de paiement
  async sendPaymentNotification(userId: string, paymentId: string, status: string, amount: number): Promise<boolean> {
    const templates: Record<string, NotificationTemplate> = {
      'COMPLETED': {
        title: 'Paiement confirmé',
        message: `Votre paiement de ${amount}€ a été confirmé`,
      },
      'FAILED': {
        title: 'Paiement échoué',
        message: `Le paiement de ${amount}€ a échoué. Veuillez réessayer.`,
      },
      'REFUNDED': {
        title: 'Remboursement effectué',
        message: `Un remboursement de ${amount}€ a été effectué`,
      },
    };

    const template = templates[status] || {
      title: 'Mise à jour paiement',
      message: `Statut de votre paiement: ${status}`,
    };

    return this.sendNotification({
      userId,
      title: template.title,
      message: template.message,
      type: 'PAYMENT',
      data: {
        paymentId,
        status,
        amount,
      },
      priority: status === 'FAILED' ? 'high' : 'normal',
    });
  }

  // Notifications de réservation
  async sendBookingNotification(userId: string, bookingId: string, status: string, serviceName: string): Promise<boolean> {
    const templates: Record<string, NotificationTemplate> = {
      'CONFIRMED': {
        title: 'Réservation confirmée',
        message: `Votre réservation pour "${serviceName}" a été confirmée`,
      },
      'IN_PROGRESS': {
        title: 'Service en cours',
        message: `Le service "${serviceName}" est en cours`,
      },
      'COMPLETED': {
        title: 'Service terminé',
        message: `Le service "${serviceName}" a été terminé`,
      },
      'CANCELLED': {
        title: 'Réservation annulée',
        message: `Votre réservation pour "${serviceName}" a été annulée`,
      },
    };

    const template = templates[status] || {
      title: 'Mise à jour réservation',
      message: `Statut de votre réservation: ${status}`,
    };

    return this.sendNotification({
      userId,
      title: template.title,
      message: template.message,
      type: 'BOOKING',
      data: {
        bookingId,
        status,
        serviceName,
      },
    });
  }

  // Notifications d'abonnement
  async sendSubscriptionNotification(userId: string, plan: string, action: 'upgraded' | 'cancelled' | 'renewed'): Promise<boolean> {
    const templates: Record<string, NotificationTemplate> = {
      'upgraded': {
        title: 'Abonnement mis à niveau',
        message: `Votre abonnement a été mis à niveau vers ${plan}`,
      },
      'cancelled': {
        title: 'Abonnement annulé',
        message: 'Votre abonnement a été annulé',
      },
      'renewed': {
        title: 'Abonnement renouvelé',
        message: `Votre abonnement ${plan} a été renouvelé`,
      },
    };

    const template = templates[action] || {
      title: 'Mise à jour abonnement',
      message: `Action sur votre abonnement: ${action}`,
    };

    return this.sendNotification({
      userId,
      title: template.title,
      message: template.message,
      type: 'SUBSCRIPTION',
      data: {
        plan,
        action,
      },
    });
  }

  // Notifications de matching
  async sendMatchingNotification(userId: string, announcementId: string, delivererName: string, price: number): Promise<boolean> {
    return this.sendNotification({
      userId,
      title: 'Nouveau livreur disponible',
      message: `${delivererName} propose de livrer votre colis pour ${price}€`,
      type: 'MATCHING',
      data: {
        announcementId,
        delivererName,
        price,
      },
      priority: 'high',
    });
  }

  // Notifications de validation de documents
  async sendDocumentValidationNotification(userId: string, documentType: string, status: 'approved' | 'rejected'): Promise<boolean> {
    const templates: Record<string, NotificationTemplate> = {
      'approved': {
        title: 'Document approuvé',
        message: `Votre document ${documentType} a été approuvé`,
      },
      'rejected': {
        title: 'Document rejeté',
        message: `Votre document ${documentType} a été rejeté. Veuillez le corriger.`,
      },
    };

    const template = templates[status] || {
      title: 'Mise à jour document',
      message: `Statut de votre document: ${status}`,
    };

    return this.sendNotification({
      userId,
      title: template.title,
      message: template.message,
      type: 'DOCUMENT_VALIDATION',
      data: {
        documentType,
        status,
      },
      priority: status === 'rejected' ? 'high' : 'normal',
    });
  }

  // Notification personnalisée
  async sendCustomNotification(userId: string, title: string, message: string, data?: Record<string, any>): Promise<boolean> {
    return this.sendNotification({
      userId,
      title,
      message,
      type: 'DELIVERY_UPDATE', // Type par défaut
      data,
    });
  }

  // Notification à plusieurs utilisateurs
  async sendBulkNotification(userIds: string[], title: string, message: string, data?: Record<string, any>): Promise<boolean[]> {
    const promises = userIds.map(userId =>
      this.sendCustomNotification(userId, title, message, data)
    );
    return Promise.all(promises);
  }
}

// Instance singleton
export const oneSignalService = new OneSignalService(); 