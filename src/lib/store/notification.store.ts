import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";

export type NotificationType = "success" | "error" | "info" | "warning";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  autoDismiss?: boolean;
  dismissTimeout?: number;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  
  // Actions
  addNotification: (notification: Omit<Notification, "id" | "timestamp" | "read">) => void;
  removeNotification: (id: string) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  clearRead: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  
  // Add a new notification
  addNotification: (notification) => {
    const id = uuidv4();
    const timestamp = Date.now();
    const newNotification: Notification = {
      id,
      timestamp,
      read: false,
      ...notification,
    };
    
    set((state) => ({
      notifications: [newNotification, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    }));
    
    // Auto-dismiss if configured
    if (notification.autoDismiss) {
      setTimeout(() => {
        get().removeNotification(id);
      }, notification.dismissTimeout || 5000); // Default 5 seconds
    }
  },
  
  // Remove a notification
  removeNotification: (id) => {
    const { notifications, unreadCount } = get();
    const notification = notifications.find((n) => n.id === id);
    
    set(() => ({
      notifications: notifications.filter((n) => n.id !== id),
      unreadCount: notification && !notification.read ? unreadCount - 1 : unreadCount,
    }));
  },
  
  // Mark a notification as read
  markAsRead: (id) => {
    const { notifications, unreadCount } = get();
    const notification = notifications.find((n) => n.id === id);
    
    if (notification && !notification.read) {
      set(() => ({
        notifications: notifications.map((n) =>
          n.id === id ? { ...n, read: true } : n
        ),
        unreadCount: unreadCount - 1,
      }));
    }
  },
  
  // Mark all notifications as read
  markAllAsRead: () => {
    const { notifications } = get();
    
    set(() => ({
      notifications: notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    }));
  },
  
  // Clear all notifications
  clearAll: () => {
    set(() => ({
      notifications: [],
      unreadCount: 0,
    }));
  },
  
  // Clear read notifications
  clearRead: () => {
    const { notifications } = get();
    const unreadNotifications = notifications.filter((n) => !n.read);
    
    set(() => ({
      notifications: unreadNotifications,
    }));
  },
})); 