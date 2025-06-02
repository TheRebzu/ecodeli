import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Types pour les notifications
interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  confirmed?: boolean;
  requiresConfirmation?: boolean;
  actionUrl?: string;
  actionLabel?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  category?: string;
  expiresAt?: Date;
  createdAt: Date;
  metadata?: Record<string, any>;
}

interface NotificationPreferences {
  emailNotifications: boolean;
  pushNotifications: boolean;
  smsNotifications: boolean;
  marketingEmails: boolean;
  securityAlerts: boolean;
  loginAlerts: boolean;
  paymentAlerts: boolean;
  weeklyDigest: boolean;
  deliveryUpdates: boolean;
  announcementNotifications: boolean;
  serviceReminders: boolean;
  storageAlerts: boolean;
  notificationCategories: string[];
  quietHours: {
    enabled: boolean;
    startTime: string;
    endTime: string;
    timezone: string;
  };
  frequency: {
    immediate: boolean;
    hourly: boolean;
    daily: boolean;
    weekly: boolean;
  };
  snoozed?: {
    enabled: boolean;
    until?: string;
    reason?: string;
  };
}

interface NotificationStats {
  total: number;
  unread: number;
  byType: Record<string, number>;
  byPriority: Record<string, number>;
  engagement: {
    readRate: number;
    clickRate: number;
    confirmationRate: number;
  };
}

interface NotificationState {
  // État des notifications
  notifications: Notification[];
  unreadCount: number;
  totalCount: number;
  
  // Préférences
  preferences: NotificationPreferences;
  
  // Statistiques
  stats: NotificationStats | null;
  
  // État de l'interface
  isLoading: boolean;
  showOnlyUnread: boolean;
  selectedCategory: string | null;
  
  // Actions pour les notifications
  addNotification: (notification: Notification) => void;
  addNotifications: (notifications: Notification[]) => void;
  markAsRead: (id: string) => void;
  markAsUnread: (id: string) => void;
  markAllAsRead: () => void;
  confirmNotification: (id: string) => void;
  deleteNotification: (id: string) => void;
  clearAll: () => void;
  clearExpired: () => void;
  
  // Actions pour les préférences
  updatePreferences: (prefs: Partial<NotificationPreferences>) => void;
  snoozeNotifications: (duration: number, reason?: string) => void;
  unsnoozeNotifications: () => void;
  
  // Actions pour l'interface
  setLoading: (loading: boolean) => void;
  setShowOnlyUnread: (showOnly: boolean) => void;
  setSelectedCategory: (category: string | null) => void;
  
  // Actions pour les statistiques
  setStats: (stats: NotificationStats) => void;
  
  // Getters calculés
  getNotificationsByCategory: (category?: string) => Notification[];
  getNotificationsByPriority: (priority: string) => Notification[];
  getUnreadNotifications: () => Notification[];
  getRecentNotifications: (limit?: number) => Notification[];
  isInQuietHours: () => boolean;
  canReceiveNotification: (type: string, priority?: string) => boolean;
}

const defaultPreferences: NotificationPreferences = {
  emailNotifications: true,
  pushNotifications: true,
  smsNotifications: false,
  marketingEmails: false,
  securityAlerts: true,
  loginAlerts: true,
  paymentAlerts: true,
  weeklyDigest: true,
  deliveryUpdates: true,
  announcementNotifications: true,
  serviceReminders: true,
  storageAlerts: true,
  notificationCategories: ['security', 'payments', 'deliveries'],
  quietHours: {
    enabled: false,
    startTime: '22:00',
    endTime: '08:00',
    timezone: 'Europe/Paris'
  },
  frequency: {
    immediate: true,
    hourly: false,
    daily: false,
    weekly: false
  }
};

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      // État initial
      notifications: [],
      unreadCount: 0,
      totalCount: 0,
      preferences: defaultPreferences,
      stats: null,
      isLoading: false,
      showOnlyUnread: false,
      selectedCategory: null,

      // Actions pour les notifications
      addNotification: (notification) =>
        set((state) => {
          const exists = state.notifications.find(n => n.id === notification.id);
          if (exists) return state;

          const newNotifications = [notification, ...state.notifications]
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 100); // Limiter à 100 notifications

          return {
            notifications: newNotifications,
            unreadCount: state.unreadCount + (notification.read ? 0 : 1),
            totalCount: newNotifications.length
          };
        }),

      addNotifications: (notifications) =>
        set((state) => {
          const existingIds = new Set(state.notifications.map(n => n.id));
          const newNotifications = notifications.filter(n => !existingIds.has(n.id));
          
          const allNotifications = [...newNotifications, ...state.notifications]
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 100);

          const unreadCount = allNotifications.filter(n => !n.read).length;

          return {
            notifications: allNotifications,
            unreadCount,
            totalCount: allNotifications.length
          };
        }),

      markAsRead: (id) =>
        set((state) => ({
          notifications: state.notifications.map(n => 
            n.id === id ? { ...n, read: true } : n
          ),
          unreadCount: Math.max(0, state.unreadCount - 1)
        })),

      markAsUnread: (id) =>
        set((state) => ({
          notifications: state.notifications.map(n => 
            n.id === id ? { ...n, read: false } : n
          ),
          unreadCount: state.unreadCount + 1
        })),

      markAllAsRead: () =>
        set((state) => ({
          notifications: state.notifications.map(n => ({ ...n, read: true })),
          unreadCount: 0
        })),

      confirmNotification: (id) =>
        set((state) => ({
          notifications: state.notifications.map(n => 
            n.id === id ? { ...n, confirmed: true, read: true } : n
          ),
          unreadCount: Math.max(0, state.unreadCount - 1)
        })),

      deleteNotification: (id) =>
        set((state) => {
          const notification = state.notifications.find(n => n.id === id);
          const wasUnread = notification && !notification.read;
          
          return {
            notifications: state.notifications.filter(n => n.id !== id),
            unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
            totalCount: state.totalCount - 1
          };
        }),

      clearAll: () =>
        set({
          notifications: [],
          unreadCount: 0,
          totalCount: 0
        }),

      clearExpired: () =>
        set((state) => {
          const now = new Date();
          const validNotifications = state.notifications.filter(n => 
            !n.expiresAt || new Date(n.expiresAt) > now
          );

          const unreadCount = validNotifications.filter(n => !n.read).length;

          return {
            notifications: validNotifications,
            unreadCount,
            totalCount: validNotifications.length
          };
        }),

      // Actions pour les préférences
      updatePreferences: (prefs) =>
        set((state) => ({
          preferences: { ...state.preferences, ...prefs }
        })),

      snoozeNotifications: (duration, reason) =>
        set((state) => {
          const until = new Date(Date.now() + duration * 60 * 1000);
          return {
            preferences: {
              ...state.preferences,
              snoozed: {
                enabled: true,
                until: until.toISOString(),
                reason: reason || 'Notifications en pause'
              }
            }
          };
        }),

      unsnoozeNotifications: () =>
        set((state) => ({
          preferences: {
            ...state.preferences,
            snoozed: {
              enabled: false
            }
          }
        })),

      // Actions pour l'interface
      setLoading: (loading) => set({ isLoading: loading }),
      
      setShowOnlyUnread: (showOnly) => set({ showOnlyUnread: showOnly }),
      
      setSelectedCategory: (category) => set({ selectedCategory: category }),

      // Actions pour les statistiques
      setStats: (stats) => set({ stats }),

      // Getters calculés
      getNotificationsByCategory: (category) => {
        const state = get();
        if (!category) return state.notifications;
        return state.notifications.filter(n => n.category === category);
      },

      getNotificationsByPriority: (priority) => {
        const state = get();
        return state.notifications.filter(n => n.priority === priority);
      },

      getUnreadNotifications: () => {
        const state = get();
        return state.notifications.filter(n => !n.read);
      },

      getRecentNotifications: (limit = 10) => {
        const state = get();
        return state.notifications.slice(0, limit);
      },

      isInQuietHours: () => {
        const state = get();
        const { quietHours } = state.preferences;
        
        if (!quietHours.enabled) return false;

        const now = new Date();
        const currentHour = now.getHours();
        const startHour = parseInt(quietHours.startTime.split(':')[0]);
        const endHour = parseInt(quietHours.endTime.split(':')[0]);

        if (startHour > endHour) {
          // Les heures de silence traversent minuit
          return currentHour >= startHour || currentHour < endHour;
        } else {
          // Les heures de silence dans la même journée
          return currentHour >= startHour && currentHour < endHour;
        }
      },

      canReceiveNotification: (type, priority = 'MEDIUM') => {
        const state = get();
        const { preferences } = state;

        // Notifications en pause
        if (preferences.snoozed?.enabled) {
          const snoozeUntil = preferences.snoozed.until;
          if (snoozeUntil && new Date() < new Date(snoozeUntil)) {
            return priority === 'URGENT';
          }
        }

        // Heures de silence
        if (state.isInQuietHours() && priority !== 'URGENT') {
          return false;
        }

        // Préférences spécifiques par type
        switch (type.toLowerCase()) {
          case 'security':
            return preferences.securityAlerts;
          case 'payment':
            return preferences.paymentAlerts;
          case 'delivery':
            return preferences.deliveryUpdates;
          case 'announcement':
            return preferences.announcementNotifications;
          case 'service':
            return preferences.serviceReminders;
          case 'storage':
            return preferences.storageAlerts;
          case 'marketing':
            return preferences.marketingEmails;
          default:
            return true;
        }
      }
    }),
    {
      name: 'notification-store',
      partialize: (state) => ({
        preferences: state.preferences,
        showOnlyUnread: state.showOnlyUnread,
        selectedCategory: state.selectedCategory
      })
    }
  )
);