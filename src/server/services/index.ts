// Export centralisé des services
export { NotificationService } from './notification.service';
export { notificationService } from './notification.service';

// Export des fonctions utilitaires de notification
export {
  sendNotification,
  notifyDeliveryStatusChange,
  notifyDeliveryApproaching,
  notifyDeliveryDelayed,
  notifyCheckpointReached,
  notifyDeliveryCompleted,
} from './notification.service';

// Export du type NotificationType du service de notification
export { NotificationType } from './notification.service';
