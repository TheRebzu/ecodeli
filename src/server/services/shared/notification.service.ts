/**
 * Service de notification push utilisant OneSignal
 * Implémentations réelles pour les notifications push
 */

import { TRPCError } from "@trpc/server";

export interface NotificationData {
  userId: string;
  title: string;
  message: string;
  type: string;
  link?: string;
  data?: Record<string, any>;
}

export interface PushNotificationPayload {
  headings: { [key: string]: string };
  contents: { [key: string]: string };
  include_external_user_ids?: string[];
  filters?: Array<{
    field: string;
    key: string;
    relation: string;
    value: string;
  }>;
  url?: string;
  data?: Record<string, any>;
  web_buttons?: Array<{
    id: string;
    text: string;
    icon: string;
    url: string;
  }>;
}

class NotificationService {
  private readonly oneSignalAppId: string;
  private readonly oneSignalApiKey: string;
  private readonly baseUrl = "https://onesignal.com/api/v1";

  constructor() {
    this.oneSignalAppId = process.env.ONESIGNAL_APP_ID || "";
    this.oneSignalApiKey = process.env.ONESIGNAL_REST_API_KEY || "";

    if (!this.oneSignalAppId || !this.oneSignalApiKey) {
      console.warn("OneSignal non configuré - les notifications push seront désactivées");
    }
  }

  /**
   * Envoie une notification push via OneSignal
   */
  async sendPushNotification(payload: PushNotificationPayload): Promise<{ success: boolean; id?: string }> {
    if (!this.oneSignalAppId || !this.oneSignalApiKey) {
      console.log("OneSignal non configuré - notification simulée :", payload.contents);
      return { success: true };
    }

    try {
      const response = await fetch(`${this.baseUrl}/notifications`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Basic ${this.oneSignalApiKey}`,
        },
        body: JSON.stringify({
          app_id: this.oneSignalAppId,
          ...payload,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(`OneSignal API error: ${result.errors?.[0] || response.statusText}`);
      }

      return {
        success: true,
        id: result.id,
      };
    } catch (error) {
      console.error("Erreur envoi notification OneSignal:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors de l'envoi de la notification push",
      });
    }
  }

  /**
   * Envoie une notification à un utilisateur spécifique
   */
  async sendNotificationToUser(data: NotificationData): Promise<{ success: boolean; id?: string }> {
    const payload: PushNotificationPayload = {
      headings: { en: data.title, fr: data.title },
      contents: { en: data.message, fr: data.message },
      include_external_user_ids: [data.userId],
      url: data.link,
      data: {
        type: data.type,
        userId: data.userId,
        ...data.data,
      },
    };

    return this.sendPushNotification(payload);
  }

  /**
   * Envoie une notification à un groupe d'utilisateurs (par rôle)
   */
  async sendNotificationToRole(
    role: string,
    title: string,
    message: string,
    data?: Record<string, any>
  ): Promise<{ success: boolean; id?: string }> {
    const payload: PushNotificationPayload = {
      headings: { en: title, fr: title },
      contents: { en: message, fr: message },
      filters: [
        {
          field: "tag",
          key: "role",
          relation: "=",
          value: role,
        },
      ],
      data,
    };

    return this.sendPushNotification(payload);
  }

  /**
   * Envoie une notification de livraison au client
   */
  async sendDeliveryNotification(
    clientId: string,
    deliveryId: string,
    status: string,
    title: string,
    message: string
  ): Promise<{ success: boolean; id?: string }> {
    return this.sendNotificationToUser({
      userId: clientId,
      title,
      message,
      type: "DELIVERY_UPDATE",
      link: `/client/deliveries/${deliveryId}/tracking`,
      data: {
        deliveryId,
        status,
      },
    });
  }

  /**
   * Envoie une notification de commande au commerçant
   */
  async sendMerchantOrderNotification(
    merchantId: string,
    orderId: string,
    title: string,
    message: string
  ): Promise<{ success: boolean; id?: string }> {
    return this.sendNotificationToUser({
      userId: merchantId,
      title,
      message,
      type: "ORDER_UPDATE",
      link: `/merchant/orders/${orderId}`,
      data: {
        orderId,
      },
    });
  }

  /**
   * Envoie une notification de nouvelle mission au livreur
   */
  async sendDelivererMissionNotification(
    delivererId: string,
    missionId: string,
    title: string,
    message: string
  ): Promise<{ success: boolean; id?: string }> {
    return this.sendNotificationToUser({
      userId: delivererId,
      title,
      message,
      type: "MISSION_AVAILABLE",
      link: `/deliverer/missions/${missionId}`,
      data: {
        missionId,
      },
    });
  }

  /**
   * Met à jour les tags d'un utilisateur pour le ciblage
   */
  async updateUserTags(userId: string, tags: Record<string, string>): Promise<{ success: boolean }> {
    if (!this.oneSignalAppId || !this.oneSignalApiKey) {
      console.log("OneSignal non configuré - tags simulés pour utilisateur :", userId, tags);
      return { success: true };
    }

    try {
      const response = await fetch(`${this.baseUrl}/apps/${this.oneSignalAppId}/users/${userId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Basic ${this.oneSignalApiKey}`,
        },
        body: JSON.stringify({
          tags,
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(`OneSignal API error: ${result.errors?.[0] || response.statusText}`);
      }

      return { success: true };
    } catch (error) {
      console.error("Erreur mise à jour tags OneSignal:", error);
      return { success: false };
    }
  }

  /**
   * Supprime un utilisateur de OneSignal
   */
  async deleteUser(userId: string): Promise<{ success: boolean }> {
    if (!this.oneSignalAppId || !this.oneSignalApiKey) {
      console.log("OneSignal non configuré - suppression utilisateur simulée :", userId);
      return { success: true };
    }

    try {
      const response = await fetch(`${this.baseUrl}/apps/${this.oneSignalAppId}/users/${userId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Basic ${this.oneSignalApiKey}`,
        },
      });

      return { success: response.ok };
    } catch (error) {
      console.error("Erreur suppression utilisateur OneSignal:", error);
      return { success: false };
    }
  }
}

export const notificationService = new NotificationService(); 