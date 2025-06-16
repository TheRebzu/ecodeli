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
  | "DELIVERY_COMPLETED"
  | "DELIVERY_CANCELLED"
  | "ANNOUNCEMENT_MATCH"
  | "PAYMENT_RECEIVED"
  | "PAYMENT_SENT"
  | "SERVICE_BOOKED"
  | "SERVICE_REMINDER"
  | "NEW_REVIEW"
  | "CONTRACT_UPDATE";

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

  private async sendNotification(
    data: OneSignalNotificationData,
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
            filters: [
              {
                field: "tag",
                key: "userId",
                relation: "=",
                value: data.userId}],
            headings: { en: data.title },
            contents: { en: data.message },
            data: {
              type: data.type,
              ...data.data},
            url: data.url, web_url: data.url})},
      );

      const result = await response.json();
      return result.id ? true : false;
    } catch (error) {
      console.error("Error sending OneSignal notification:", error);
      return false;
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
    return this.sendNotification({
      userId,
      type: "DELIVERY_ASSIGNED",
      title: "Nouvelle livraison assignée",
      message: `Nouvelle livraison de ${pickupAddress} à ${deliveryAddress}`,
      url: `/deliverer/deliveries/${deliveryId}`,
      data: { deliveryId, pickupAddress, deliveryAddress }});
  }

  // Livraison démarrée
  async sendDeliveryStartedNotification(
    userId: string,
    deliveryId: string,
    estimatedTime: string,
  ): Promise<boolean> {
    return this.sendNotification({
      userId,
      type: "DELIVERY_STARTED",
      title: "Livraison en cours",
      message: `Votre livraison est en cours. Arrivée estimée: ${estimatedTime}`,
      url: `/client/deliveries/${deliveryId}/tracking`,
      data: { deliveryId, estimatedTime }});
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
