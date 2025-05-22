import { Notification as PrismaNotification, UserRole, AnnouncementStatus } from '@prisma/client';


// Type pour les types de notifications
export enum NotificationType {
  SYSTEM = 'SYSTEM',
  DELIVERY = 'DELIVERY',
  PAYMENT = 'PAYMENT',
  MESSAGE = 'MESSAGE',
  ANNOUNCEMENT = 'ANNOUNCEMENT',
  ACCOUNT = 'ACCOUNT',
  CONTRACT = 'CONTRACT',
  INVOICE = 'INVOICE',
  VERIFICATION = 'VERIFICATION',
}

// Types de canaux de notification
export enum NotificationChannel {
  EMAIL = 'EMAIL',
  PUSH = 'PUSH',
  SMS = 'SMS',
  IN_APP = 'IN_APP',
}

// Langues supportées
export enum SupportedLanguage {
  FR = 'fr',
  EN = 'en',
}

// Paramètres de notifications pour un utilisateur
export interface UserNotificationSettings {
  userId: string;
  emailEnabled: boolean;
  pushEnabled: boolean;
  smsEnabled: boolean;
  inAppEnabled: boolean;
  emailFrequency: 'INSTANT' | 'DAILY' | 'WEEKLY';
  deliveryUpdates: boolean;
  paymentUpdates: boolean;
  marketingUpdates: boolean;
  systemUpdates: boolean;
  language: SupportedLanguage;
}

// Options pour l'envoi de notifications
export interface SendUserNotificationOptions {
  userId: string;
  type: NotificationType;
  title: string;
  content: string;
  channels?: NotificationChannel[];
  metadata?: Record<string, any>;
  requiresAction?: boolean;
  actionUrl?: string;
  priority?: 'LOW' | 'NORMAL' | 'HIGH';
  expiresAt?: Date;
  templateId?: string;
  templateData?: Record<string, any>;
}

// Interface pour une notification
export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  content: string;
  isRead: boolean;
  createdAt: Date;
  metadata?: Record<string, any>;
  requiresAction?: boolean;
  actionUrl?: string;
}

// Regroupement de notifications
export interface NotificationGroup {
  date: Date;
  notifications: Notification[];
}

// Statistiques de notifications
export interface NotificationStats {
  total: number;
  unread: number;
  requireAction: number;
}

// Interface pour le retour de la fonction de traduction de notification
export interface TranslatedNotification {
  title: string;
  content: string;
}
