'use client';

import React, { createContext, useContext, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useToast } from '@/components/ui/use-toast';
import { 
  WebSocketClient, 
  getWebSocketClient, 
  disconnectWebSocket,
  NotificationData,
  WebSocketEventHandler 
} from '@/lib/websocket/websocket-client';

interface WebSocketContextValue {
  isConnected: boolean;
  subscribe: <T = any>(event: string, handler: WebSocketEventHandler<T>) => () => void;
  unsubscribe: <T = any>(event: string, handler: WebSocketEventHandler<T>) => void;
  send: <T = any>(event: string, data: T, callback?: (response: any) => void) => void;
  joinRoom: (room: string) => void;
  leaveRoom: (room: string) => void;
  markNotificationAsRead: (notificationId: string) => void;
}

const WebSocketContext = createContext<WebSocketContextValue | null>(null);

interface WebSocketProviderProps {
  children: React.ReactNode;
  autoConnect?: boolean;
}

export function WebSocketProvider({ children, autoConnect = true }: WebSocketProviderProps) {
  const { data: session } = useSession();
  const { toast } = useToast();
  const clientRef = useRef<WebSocketClient | null>(null);
  const [isConnected, setIsConnected] = React.useState(false);

  // Initialisation du client WebSocket
  useEffect(() => {
    if (!autoConnect || !session?.user) return;

    const client = getWebSocketClient();
    clientRef.current = client;

    // Connexion avec les informations de l'utilisateur
    client.connect(session.user.id, session.user.role);

    // Gestion des événements de connexion
    const unsubscribeConnected = client.on('connected', () => {
      setIsConnected(true);
      console.log('WebSocket connecté');
    });

    const unsubscribeDisconnected = client.on('disconnected', () => {
      setIsConnected(false);
    });

    const unsubscribeReconnected = client.on('reconnected', () => {
      setIsConnected(true);
      toast({
        title: "Reconnecté",
        description: "La connexion temps réel a été rétablie",
      });
    });

    // Gestion des notifications
    const unsubscribeNotification = client.on<NotificationData>('notification', (data) => {
      // Afficher la notification via toast
      toast({
        title: data.title,
        description: data.message,
        variant: data.type === 'error' ? 'destructive' : 'default',
      });

      // Jouer un son de notification (optionnel)
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(data.title, {
          body: data.message,
          icon: '/icon-192x192.png',
          tag: data.id,
        });
      }
    });

    // Abonnements automatiques selon le rôle
    if (session.user.role === 'DELIVERER' && session.user.delivererId) {
      client.subscribeToAnnouncementNotifications(session.user.delivererId);
    }

    // Nettoyage
    return () => {
      unsubscribeConnected();
      unsubscribeDisconnected();
      unsubscribeReconnected();
      unsubscribeNotification();
      disconnectWebSocket();
      setIsConnected(false);
    };
  }, [session, autoConnect, toast]);

  // Méthodes exposées
  const subscribe = useCallback(<T = any>(event: string, handler: WebSocketEventHandler<T>) => {
    if (!clientRef.current) {
      console.warn('WebSocket client non initialisé');
      return () => {};
    }
    return clientRef.current.on(event, handler);
  }, []);

  const unsubscribe = useCallback(<T = any>(event: string, handler: WebSocketEventHandler<T>) => {
    if (!clientRef.current) return;
    clientRef.current.off(event, handler);
  }, []);

  const send = useCallback(<T = any>(event: string, data: T, callback?: (response: any) => void) => {
    if (!clientRef.current) {
      console.warn('WebSocket client non initialisé');
      return;
    }
    clientRef.current.send(event, data, callback);
  }, []);

  const joinRoom = useCallback((room: string) => {
    if (!clientRef.current) return;
    clientRef.current.joinRoom(room);
  }, []);

  const leaveRoom = useCallback((room: string) => {
    if (!clientRef.current) return;
    clientRef.current.leaveRoom(room);
  }, []);

  const markNotificationAsRead = useCallback((notificationId: string) => {
    if (!clientRef.current) return;
    clientRef.current.markNotificationAsRead(notificationId);
  }, []);

  const value: WebSocketContextValue = {
    isConnected,
    subscribe,
    unsubscribe,
    send,
    joinRoom,
    leaveRoom,
    markNotificationAsRead,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket doit être utilisé dans un WebSocketProvider');
  }
  return context;
}

// Hook personnalisé pour les notifications
export function useNotifications() {
  const { subscribe, markNotificationAsRead } = useWebSocket();
  const [notifications, setNotifications] = React.useState<NotificationData[]>([]);

  useEffect(() => {
    const unsubscribe = subscribe<NotificationData>('notification', (notification) => {
      setNotifications(prev => [notification, ...prev]);
    });

    return unsubscribe;
  }, [subscribe]);

  const markAsRead = useCallback((notificationId: string) => {
    markNotificationAsRead(notificationId);
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
  }, [markNotificationAsRead]);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return {
    notifications,
    unreadCount,
    markAsRead,
    clearAll,
  };
}

// Hook pour les annonces de livreur
export function useDelivererAnnouncements(delivererId?: string) {
  const { subscribe, joinRoom, leaveRoom } = useWebSocket();
  const [announcements, setAnnouncements] = React.useState<any[]>([]);

  useEffect(() => {
    if (!delivererId) return;

    // Rejoindre la room des annonces du livreur
    joinRoom(`deliverer:${delivererId}:announcements`);

    // S'abonner aux nouvelles annonces
    const unsubscribeNew = subscribe('announcement:new', (announcement) => {
      setAnnouncements(prev => [announcement, ...prev]);
    });

    // S'abonner aux mises à jour d'annonces
    const unsubscribeUpdate = subscribe('announcement:update', (update) => {
      setAnnouncements(prev => 
        prev.map(a => a.id === update.id ? { ...a, ...update } : a)
      );
    });

    return () => {
      leaveRoom(`deliverer:${delivererId}:announcements`);
      unsubscribeNew();
      unsubscribeUpdate();
    };
  }, [delivererId, subscribe, joinRoom, leaveRoom]);

  return announcements;
}

// Hook pour le suivi de livraison
export function useDeliveryTracking(deliveryId?: string) {
  const { subscribe, joinRoom, leaveRoom } = useWebSocket();
  const [status, setStatus] = React.useState<any>(null);
  const [location, setLocation] = React.useState<any>(null);

  useEffect(() => {
    if (!deliveryId) return;

    joinRoom(`delivery:${deliveryId}`);

    const unsubscribeStatus = subscribe('delivery:status', (data) => {
      if (data.deliveryId === deliveryId) {
        setStatus(data.status);
      }
    });

    const unsubscribeLocation = subscribe('delivery:location', (data) => {
      if (data.deliveryId === deliveryId) {
        setLocation(data.location);
      }
    });

    return () => {
      leaveRoom(`delivery:${deliveryId}`);
      unsubscribeStatus();
      unsubscribeLocation();
    };
  }, [deliveryId, subscribe, joinRoom, leaveRoom]);

  return { status, location };
}