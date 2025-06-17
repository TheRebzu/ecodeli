import { User } from "@prisma/client";

export type OneSignalNotificationType =
  | "DOCUMENT_APPROVED"
  | "DOCUMENT_REJECTED"
  | "VERIFICATION_APPROVED"
  | "VERIFICATION_REJECTED"
  | "VERIFICATION_PENDING"
  | "NEW_MESSAGE"
  | "NEW_DELIVERY"
  | "DELIVERY_ASSIGNED"
  | "DELIVERY_STARTED"
  | "DELIVERY_PICKED_UP"
  | "DELIVERY_IN_TRANSIT"
  | "DELIVERY_NEARBY"
  | "DELIVERY_ARRIVING"
  | "DELIVERY_ARRIVED"
  | "DELIVERY_COMPLETED"
  | "DELIVERY_CONFIRMED"
  | "DELIVERY_CANCELLED"
  | "DELIVERY_DELAYED"
  | "DELIVERY_PROBLEM"
  | "CHECKPOINT_REACHED"
  | "ANNOUNCEMENT_MATCH"
  | "ANNOUNCEMENT_NEW"
  | "ANNOUNCEMENT_APPLIED"
  | "ANNOUNCEMENT_ACCEPTED"
  | "ANNOUNCEMENT_REJECTED"
  | "PAYMENT_RECEIVED"
  | "PAYMENT_SENT"
  | "PAYMENT_PENDING"
  | "PAYMENT_FAILED"
  | "INVOICE_GENERATED"
  | "SERVICE_BOOKED"
  | "SERVICE_REMINDER"
  | "SERVICE_COMPLETED"
  | "SERVICE_CANCELLED"
  | "STORAGE_RESERVED"
  | "STORAGE_EXPIRED"
  | "STORAGE_REMINDER"
  | "NEW_REVIEW"
  | "REVIEW_RESPONSE"
  | "CONTRACT_UPDATE"
  | "SYSTEM_MAINTENANCE"
  | "SECURITY_ALERT"
  | "ACHIEVEMENT_UNLOCKED"
  | "MILESTONE_REACHED";

interface OneSignalNotificationData {
  userId: string;
  type: OneSignalNotificationType;
  title: string;
  message: string;
  url?: string;
  data?: Record<string, any>;
  priority?: "LOW" | "NORMAL" | "HIGH" | "MAX";
  sound?: string;
  vibration?: boolean;
  buttons?: Array<{
    id: string;
    text: string;
    url?: string;
  }>;
  largeIcon?: string;
  bigPicture?: string;
  ttl?: number;
  sendAfter?: Date;
}

interface BulkNotificationOptions {
  userIds?: string[];
  segments?: string[];
  filters?: Array<{
    field: string;
    key?: string;
    relation: string;
    value: string;
    operator?: "AND" | "OR";
  }>;
  excludedUserIds?: string[];
}

export class OneSignalService {
  private apiKey: string;
  private appId: string;

  constructor() {
    this.apiKey = process.env.ONESIGNAL_API_KEY || "";
    this.appId = process.env.ONESIGNAL_APP_ID || "";

    // Seulement avertir en production si non configuré
    if (
      (!this.apiKey || !this.appId) &&
      process.env.NODE_ENV === "production"
    ) {
      console.warn("OneSignal API Key or App ID not configured");
    }
  }

  // Méthode publique pour envoyer des notifications
  async sendNotification(
    data: OneSignalNotificationData,
  ): Promise<{ success: boolean; notificationId?: string; errors?: any }> {
    if (!this.apiKey || !this.appId) {
      if (process.env.NODE_ENV === "production") {
        console.error("OneSignal API Key or App ID not configured");
      }
      return { success: false, errors: "OneSignal not configured" };
    }

    try {
      // Construire le payload avec toutes les options
      const payload: any = {
        app_id: this.appId,
        filters: [
          {
            field: "tag",
            key: "userId",
            relation: "=",
            value: data.userId
          }
        ],
        headings: { 
          en: data.title,
          fr: data.title 
        },
        contents: { 
          en: data.message,
          fr: data.message 
        },
        data: {
          type: data.type,
          timestamp: new Date().toISOString(),
          ...data.data
        },
        url: data.url,
        web_url: data.url
      };

      // Options avancées
      if (data.priority) {
        payload.priority = this.mapPriority(data.priority);
        payload.android_priority = this.mapAndroidPriority(data.priority);
        payload.ios_priority = this.mapIOSPriority(data.priority);
      }

      if (data.sound) {
        payload.android_sound = data.sound;
        payload.ios_sound = data.sound;
      }

      if (data.buttons && data.buttons.length > 0) {
        payload.buttons = data.buttons.map(button => ({
          id: button.id,
          text: button.text,
          url: button.url
        }));
      }

      if (data.largeIcon) {
        payload.large_icon = data.largeIcon;
        payload.ios_attachments = { id: data.largeIcon };
      }

      if (data.bigPicture) {
        payload.big_picture = data.bigPicture;
      }

      if (data.ttl) {
        payload.ttl = data.ttl;
      }

      if (data.sendAfter) {
        payload.send_after = data.sendAfter.toISOString();
      }

      // Paramètres pour l'engagement
      payload.android_group = data.type;
      payload.android_group_message = { en: `${data.title} et autres` };
      payload.chrome_web_badge = "/icons/notification-badge.png";
      payload.firefox_icon = "/icons/notification-icon.png";

      const response = await fetch(
        "https://onesignal.com/api/v1/notifications",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Basic ${this.apiKey}`,
          },
          body: JSON.stringify(payload),
        }
      );

      const result = await response.json();
      
      if (response.ok && result.id) {
        return { 
          success: true, 
          notificationId: result.id 
        };
      } else {
        console.error("OneSignal API error:", result);
        return { 
          success: false, 
          errors: result.errors || result 
        };
      }
    } catch (error) {
      console.error("Error sending OneSignal notification:", error);
      return { 
        success: false, 
        errors: error instanceof Error ? error.message : "Unknown error" 
      };
    }
  }

  // Méthodes utilitaires pour mapper les priorités
  private mapPriority(priority: string): number {
    switch (priority) {
      case "LOW": return 2;
      case "NORMAL": return 5;
      case "HIGH": return 8;
      case "MAX": return 10;
      default: return 5;
    }
  }

  private mapAndroidPriority(priority: string): number {
    switch (priority) {
      case "LOW": return 0;
      case "NORMAL": return 0;
      case "HIGH": return 1;
      case "MAX": return 2;
      default: return 0;
    }
  }

  private mapIOSPriority(priority: string): number {
    switch (priority) {
      case "LOW": return 5;
      case "NORMAL": return 5;
      case "HIGH": return 10;
      case "MAX": return 10;
      default: return 5;
    }
  }

  // Document approuvé
  async sendDocumentApprovedNotification(
    userId: string,
    documentType: string,
    url: string,
  ): Promise<boolean> {
    return this.sendNotification({
      userId,
      type: "DOCUMENT_APPROVED",
      title: "Document approuvé",
      message: `Votre document ${documentType} a été approuvé.`,
      url,
      data: { documentType }});
  }

  // Document rejeté
  async sendDocumentRejectedNotification(
    userId: string,
    documentType: string,
    reason: string,
    url: string,
  ): Promise<boolean> {
    return this.sendNotification({
      userId,
      type: "DOCUMENT_REJECTED",
      title: "Document rejeté",
      message: `Votre document ${documentType} a été rejeté: ${reason}`,
      url,
      data: { documentType, reason }});
  }

  // Vérification approuvée
  async sendVerificationApprovedNotification(
    userId: string,
    url: string,
  ): Promise<boolean> {
    return this.sendNotification({ userId,
      type: "VERIFICATION_APPROVED",
      title: "Compte vérifié",
      message:
        "Votre compte a été vérifié avec succès. Vous avez maintenant accès à toutes les fonctionnalités.",
      url });
  }

  // Vérification rejetée
  async sendVerificationRejectedNotification(
    userId: string,
    reason: string,
    url: string,
  ): Promise<boolean> {
    return this.sendNotification({
      userId,
      type: "VERIFICATION_REJECTED",
      title: "Vérification rejetée",
      message: `Votre vérification a été rejetée: ${reason}`,
      url,
      data: { reason }});
  }

  // Nouvelle livraison assignée
  async sendDeliveryAssignedNotification(
    userId: string,
    deliveryId: string,
    pickupAddress: string,
    deliveryAddress: string,
  ): Promise<boolean> {
    const result = await this.sendNotification({
      userId,
      type: "DELIVERY_ASSIGNED",
      title: "📦 Nouvelle livraison assignée",
      message: `Nouvelle livraison de ${pickupAddress} à ${deliveryAddress}`,
      url: `/deliverer/deliveries/${deliveryId}`,
      priority: "HIGH",
      sound: "new_assignment.wav",
      buttons: [
        {
          id: "accept",
          text: "Accepter",
          url: `/deliverer/deliveries/${deliveryId}/accept`
        },
        {
          id: "view",
          text: "Voir détails",
          url: `/deliverer/deliveries/${deliveryId}`
        }
      ],
      data: { 
        deliveryId, 
        pickupAddress, 
        deliveryAddress,
        action: "view_delivery",
        category: "delivery_assignment"
      }
    });
    return result.success;
  }

  // Livraison récupérée
  async sendDeliveryPickedUpNotification(
    userId: string,
    deliveryId: string,
    pickupTime: string,
  ): Promise<boolean> {
    const result = await this.sendNotification({
      userId,
      type: "DELIVERY_PICKED_UP",
      title: "📦 Colis récupéré",
      message: `Votre colis a été récupéré à ${pickupTime} et est en préparation pour livraison`,
      url: `/client/deliveries/${deliveryId}/tracking`,
      priority: "NORMAL",
      data: { 
        deliveryId, 
        pickupTime,
        action: "track_delivery",
        category: "delivery_update"
      }
    });
    return result.success;
  }

  // Livraison en transit
  async sendDeliveryInTransitNotification(
    userId: string,
    deliveryId: string,
    currentLocation: string,
    eta: string,
  ): Promise<boolean> {
    const result = await this.sendNotification({
      userId,
      type: "DELIVERY_IN_TRANSIT",
      title: "🚛 Livraison en transit",
      message: `Votre colis est en route depuis ${currentLocation}. Arrivée prévue: ${eta}`,
      url: `/client/deliveries/${deliveryId}/tracking`,
      priority: "NORMAL",
      buttons: [
        {
          id: "track",
          text: "Suivre en temps réel",
          url: `/client/deliveries/${deliveryId}/tracking`
        }
      ],
      data: { 
        deliveryId, 
        currentLocation,
        eta,
        action: "track_delivery",
        category: "delivery_update"
      }
    });
    return result.success;
  }

  // Livraison à proximité
  async sendDeliveryNearbyNotification(
    userId: string,
    deliveryId: string,
    distance: string,
    eta: string,
  ): Promise<boolean> {
    const result = await this.sendNotification({
      userId,
      type: "DELIVERY_NEARBY",
      title: "🎯 Livraison à proximité",
      message: `Votre livreur est à ${distance} de chez vous. Arrivée dans ${eta}`,
      url: `/client/deliveries/${deliveryId}/tracking`,
      priority: "HIGH",
      sound: "delivery_nearby.wav",
      vibration: true,
      buttons: [
        {
          id: "prepare",
          text: "Je me prépare",
          url: `/client/deliveries/${deliveryId}/prepare`
        },
        {
          id: "track",
          text: "Suivre",
          url: `/client/deliveries/${deliveryId}/tracking`
        }
      ],
      data: { 
        deliveryId, 
        distance,
        eta,
        action: "prepare_reception",
        category: "delivery_proximity"
      }
    });
    return result.success;
  }

  // Livraison arrivée
  async sendDeliveryArrivedNotification(
    userId: string,
    deliveryId: string,
    delivererName: string,
    delivererPhone?: string,
  ): Promise<boolean> {
    const result = await this.sendNotification({
      userId,
      type: "DELIVERY_ARRIVED",
      title: "🚪 Livreur arrivé",
      message: `${delivererName} est arrivé à votre adresse avec votre colis`,
      url: `/client/deliveries/${deliveryId}/confirm`,
      priority: "MAX",
      sound: "delivery_arrived.wav",
      vibration: true,
      buttons: [
        {
          id: "confirm",
          text: "Confirmer réception",
          url: `/client/deliveries/${deliveryId}/confirm`
        },
        ...(delivererPhone ? [{
          id: "call",
          text: "Appeler",
          url: `tel:${delivererPhone}`
        }] : [])
      ],
      data: { 
        deliveryId, 
        delivererName,
        delivererPhone,
        action: "confirm_delivery",
        category: "delivery_arrival"
      }
    });
    return result.success;
  }

  // Livraison retardée
  async sendDeliveryDelayedNotification(
    userId: string,
    deliveryId: string,
    delay: string,
    newEta: string,
    reason?: string,
  ): Promise<boolean> {
    const result = await this.sendNotification({
      userId,
      type: "DELIVERY_DELAYED",
      title: "⏰ Retard de livraison",
      message: reason 
        ? `Votre livraison est retardée de ${delay} (${reason}). Nouvelle heure: ${newEta}`
        : `Votre livraison est retardée de ${delay}. Nouvelle heure: ${newEta}`,
      url: `/client/deliveries/${deliveryId}/tracking`,
      priority: "HIGH",
      sound: "delivery_delayed.wav",
      buttons: [
        {
          id: "reschedule",
          text: "Reprogrammer",
          url: `/client/deliveries/${deliveryId}/reschedule`
        },
        {
          id: "track",
          text: "Suivre",
          url: `/client/deliveries/${deliveryId}/tracking`
        }
      ],
      data: { 
        deliveryId, 
        delay,
        newEta,
        reason,
        action: "manage_delay",
        category: "delivery_delay"
      }
    });
    return result.success;
  }

  // Point de contrôle atteint
  async sendCheckpointReachedNotification(
    userId: string,
    deliveryId: string,
    checkpointName: string,
    checkpointType: string,
    nextStepEta?: string,
  ): Promise<boolean> {
    const result = await this.sendNotification({
      userId,
      type: "CHECKPOINT_REACHED",
      title: "📍 Point de passage franchi",
      message: nextStepEta 
        ? `Votre colis a franchi ${checkpointName}. Prochaine étape dans ${nextStepEta}`
        : `Votre colis a franchi ${checkpointName}`,
      url: `/client/deliveries/${deliveryId}/tracking`,
      priority: "NORMAL",
      data: { 
        deliveryId, 
        checkpointName,
        checkpointType,
        nextStepEta,
        action: "track_delivery",
        category: "delivery_checkpoint"
      }
    });
    return result.success;
  }

  // Livraison démarrée
  async sendDeliveryStartedNotification(
    userId: string,
    deliveryId: string,
    estimatedTime: string,
  ): Promise<boolean> {
    const result = await this.sendNotification({
      userId,
      type: "DELIVERY_STARTED",
      title: "🚚 Livraison en cours",
      message: `Votre livraison est en cours. Arrivée estimée: ${estimatedTime}`,
      url: `/client/deliveries/${deliveryId}/tracking`,
      priority: "HIGH",
      sound: "delivery_start.wav",
      buttons: [
        {
          id: "track",
          text: "Suivre",
          url: `/client/deliveries/${deliveryId}/tracking`
        },
        {
          id: "contact",
          text: "Contacter",
          url: `/client/deliveries/${deliveryId}/contact`
        }
      ],
      data: { 
        deliveryId, 
        estimatedTime,
        action: "track_delivery",
        category: "delivery_update"
      }
    });
    return result.success;
  }

  // Livraison terminée
  async sendDeliveryCompletedNotification(
    userId: string,
    deliveryId: string,
  ): Promise<boolean> {
    return this.sendNotification({
      userId,
      type: "DELIVERY_COMPLETED",
      title: "Livraison terminée",
      message: "Votre livraison a été effectuée avec succès!",
      url: `/client/deliveries/${deliveryId}/rate`,
      data: { deliveryId }});
  }

  // Correspondance d'annonce
  async sendAnnouncementMatchNotification(
    userId: string,
    announcementId: string,
    route: string,
  ): Promise<boolean> {
    return this.sendNotification({
      userId,
      type: "ANNOUNCEMENT_MATCH",
      title: "Nouvelle opportunité de livraison",
      message: `Une annonce correspond à votre trajet ${route}`,
      url: `/deliverer/announcements/${announcementId}`,
      data: { announcementId, route }});
  }

  // Paiement reçu
  async sendPaymentReceivedNotification(
    userId: string,
    amount: number,
    deliveryId?: string,
  ): Promise<boolean> {
    return this.sendNotification({
      userId,
      type: "PAYMENT_RECEIVED",
      title: "Paiement reçu",
      message: `Vous avez reçu ${amount}€`,
      url: deliveryId ? `/deliverer/payments` : `/provider/payments`,
      data: { amount, deliveryId }});
  }

  // Service réservé
  async sendServiceBookedNotification(
    userId: string,
    serviceId: string,
    clientName: string,
    date: string,
  ): Promise<boolean> {
    return this.sendNotification({
      userId,
      type: "SERVICE_BOOKED",
      title: "Nouvelle réservation",
      message: `${clientName} a réservé votre service pour le ${date}`,
      url: `/provider/appointments`,
      data: { serviceId, clientName, date }});
  }

  // Rappel de service
  async sendServiceReminderNotification(
    userId: string,
    serviceId: string,
    providerName: string,
    date: string,
    time: string,
  ): Promise<boolean> {
    return this.sendNotification({
      userId,
      type: "SERVICE_REMINDER",
      title: "Rappel de rendez-vous",
      message: `Rendez-vous avec ${providerName} demain à ${time}`,
      url: `/client/appointments/${serviceId}`,
      data: { serviceId, providerName, date, time }});
  }

  // Nouvel avis
  async sendNewReviewNotification(
    userId: string,
    reviewerName: string,
    rating: number,
    type: "delivery" | "service",
  ): Promise<boolean> {
    const url = type === "delivery" ? "/deliverer/reviews" : "/provider/ratings";
    return this.sendNotification({
      userId,
      type: "NEW_REVIEW",
      title: "Nouvel avis reçu",
      message: `${reviewerName} vous a donné ${rating} étoiles`,
      url,
      data: { reviewerName, rating, type }});
  }

  // Notification groupée pour plusieurs utilisateurs
  async sendBulkNotification(
    userIds: string[],
    title: string,
    message: string,
    url?: string,
    data?: Record<string, any>,
  ): Promise<boolean> {
    if (!this.apiKey || !this.appId) {
      if (process.env.NODEENV === "production") {
        console.error("OneSignal API Key or App ID not configured");
      }
      return false;
    }

    try {
      const response = await fetch(
        "https://onesignal.com/api/v1/notifications",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Basic ${this.apiKey}`},
          body: JSON.stringify({
            appid: this.appId,
            filters: userIds.map((userId, index) => {
              const filter: any = {
                field: "tag",
                key: "userId",
                relation: "=",
                value: userId};
              if (index > 0) filter.operator = "OR";
              return filter;
            }),
            headings: { en: title, fr: title },
            contents: { en: message, fr: message },
            data: data || {},
            url, web_url: url})},
      );

      const result = await response.json();
      return result.id ? true : false;
    } catch (error) {
      console.error("Error sending bulk OneSignal notification:", error);
      return false;
    }
  }
}
