import { prisma } from "@/lib/db";

export interface NotificationData {
  userId: string;
  title: string;
  message: string;
  type:
    | "DELIVERY_UPDATE"
    | "PAYMENT"
    | "BOOKING"
    | "SUBSCRIPTION"
    | "MATCHING"
    | "DOCUMENT_VALIDATION";
  data?: Record<string, any>;
  priority?: "high" | "normal" | "low";
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
    this.appId = process.env.ONESIGNAL_APP_ID || "";
    this.apiKey = process.env.ONESIGNAL_API_KEY || "";
    this.baseUrl = "https://onesignal.com/api/v1";
  }

  private async sendNotification(
    notification: NotificationData,
  ): Promise<boolean> {
    try {
      if (!this.appId || !this.apiKey) {
        console.warn("OneSignal not configured, skipping notification");
        return false;
      }

      // Vérifier si les clés sont des placeholders
      if (
        this.appId === "your_onesignal_app_id" ||
        this.apiKey === "your_onesignal_api_key"
      ) {
        console.warn("OneSignal using placeholder values, skipping notification");
        return false;
      }

      const response = await fetch(`${this.baseUrl}/notifications`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${this.apiKey}`,
        },
        body: JSON.stringify({
          app_id: this.appId,
          include_external_user_ids: [notification.userId],
          headings: { en: notification.title },
          contents: { en: notification.message },
          data: notification.data || {},
          priority: notification.priority === "high" ? 10 : 5,
        }),
      });

      if (!response.ok) {
        console.error("OneSignal notification failed:", response.statusText);
        return false;
      }

      return true;
    } catch (error) {
      console.error("OneSignal notification error:", error);
      return false;
    }
  }

  async sendToUser(userId: string, data: NotificationTemplate): Promise<boolean> {
    return this.sendNotification({
      userId,
      title: data.title,
      message: data.message,
      type: "DELIVERY_UPDATE",
      data: data.data,
      priority: "normal",
    });
  }

  async sendToUsers(userIds: string[], data: NotificationTemplate): Promise<boolean[]> {
    const promises = userIds.map(userId => this.sendToUser(userId, data));
    return Promise.all(promises);
  }

  async sendDeliveryUpdate(userId: string, deliveryId: string, status: string): Promise<boolean> {
    return this.sendNotification({
      userId,
      title: "Mise à jour de livraison",
      message: `Votre livraison a été mise à jour : ${status}`,
      type: "DELIVERY_UPDATE",
      data: { deliveryId, status },
      priority: "normal",
    });
  }

  async sendPaymentNotification(userId: string, amount: number, description: string): Promise<boolean> {
    return this.sendNotification({
      userId,
      title: "Paiement reçu",
      message: `Vous avez reçu ${amount}€ pour ${description}`,
      type: "PAYMENT",
      data: { amount, description },
      priority: "high",
    });
  }

  async sendBookingNotification(userId: string, serviceName: string, date: string): Promise<boolean> {
    return this.sendNotification({
      userId,
      title: "Nouvelle réservation",
      message: `Réservation confirmée pour ${serviceName} le ${date}`,
      type: "BOOKING",
      data: { serviceName, date },
      priority: "high",
    });
  }

  async sendMatchingNotification(userId: string, announcementTitle: string): Promise<boolean> {
    return this.sendNotification({
      userId,
      title: "Nouvelle opportunité",
      message: `Une nouvelle opportunité correspond à vos critères : ${announcementTitle}`,
      type: "MATCHING",
      data: { announcementTitle },
      priority: "high",
    });
  }

  async sendDocumentValidationNotification(userId: string, documentType: string, status: string): Promise<boolean> {
    const title = status === "approved" ? "Document validé" : "Document rejeté";
    const message = `Votre ${documentType} a été ${status === "approved" ? "validé" : "rejeté"}`;

    return this.sendNotification({
      userId,
      title,
      message,
      type: "DOCUMENT_VALIDATION",
      data: { documentType, status },
      priority: "high",
    });
  }

  async sendBulkNotification(userIds: string[], template: NotificationTemplate): Promise<boolean[]> {
    const promises = userIds.map(userId => 
      this.sendNotification({
        userId,
        title: template.title,
        message: template.message,
        type: "DELIVERY_UPDATE",
        data: template.data,
        priority: "normal",
      })
    );
    return Promise.all(promises);
  }
}

// Instance singleton lazy-loaded
let oneSignalServiceInstance: OneSignalService | null = null;

export function getOneSignalService(): OneSignalService {
  if (!oneSignalServiceInstance) {
    oneSignalServiceInstance = new OneSignalService();
  }
  return oneSignalServiceInstance;
}

// Export pour compatibilité
export const oneSignalService = {
  get instance() {
    return getOneSignalService();
  }
};
