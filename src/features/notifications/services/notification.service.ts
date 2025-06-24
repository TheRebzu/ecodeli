export class NotificationService {
  async notifyDelivererOfMatchingAnnouncement(delivererId: string, announcementId: string) {
    // Notification pour matching trajet/annonce
  }
  
  async sendDeliveryStatusUpdate(userId: string, deliveryId: string, status: string) {
    // Notification mise à jour livraison
  }
  
  async sendBookingReminder(userId: string, bookingId: string) {
    // Rappel de réservation
  }
}

export const notificationService = new NotificationService()
