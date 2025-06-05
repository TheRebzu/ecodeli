import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '@/hooks/use-trpc';
import { useNotificationStore } from '@/store/use-notification-store';
import { useSocket } from '@/hooks/use-socket';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const socket = useSocket();
  const { notifications, unreadCount, addNotification, markAsRead } = useNotificationStore();

  // Charger les notifications initiales
  const { data } = api.notification.getAll.useQuery();

  useEffect(() => {
    if (data) {
      // Mettre à jour le store avec les notifications initiales
    }
  }, [data]);

  // Écouter les nouvelles notifications via socket
  useEffect(() => {
    if (!socket) return;

    socket.on('notification', notification => {
      addNotification(notification);
    });

    return () => {
      socket.off('notification');
    };
  }, [socket, addNotification]);

  const handleMarkAsRead = async id => {
    try {
      await api.notification.markAsRead.mutate({ id });
      markAsRead(id);
    } catch (error) {
      console.error('Erreur lors du marquage de la notification comme lue:', error);
    }
  };

  const value = {
    notifications,
    unreadCount,
    markAsRead: handleMarkAsRead,
  };

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const context = useContext(NotificationContext);

  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }

  return context;
}
