import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from "@/components/ui/use-toast";

export interface WebSocketMessage {
  type: 'ANNOUNCEMENT_UPDATE' | 'DELIVERY_UPDATE' | 'NOTIFICATION' | 'SYSTEM_ALERT' | 'AUTH_SUCCESS' | 'AUTH_ERROR' | 'PONG' | 'SUBSCRIBED';
  data?: any;
  targetRole?: string;
  targetUserId?: string;
  timestamp: Date;
  userId?: string;
  role?: string;
  channel?: string;
  message?: string;
}

export interface UseWebSocketOptions {
  autoReconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  onMessage?: (message: WebSocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const { data: session } = useSession();
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const {
    autoReconnect = true,
    reconnectInterval = 5000,
    maxReconnectAttempts = 5,
    onMessage,
    onConnect,
    onDisconnect,
    onError
  } = options;

  const connect = useCallback(() => {
    if (!session?.user?.id) {
      console.log('Pas de session utilisateur, connexion WebSocket impossible');
      return;
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('WebSocket déjà connecté');
      return;
    }

    try {
      setConnectionStatus('connecting');
      
      // Utiliser wss en production, ws en développement
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/ws`;
      
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('Connexion WebSocket établie');
        setIsConnected(true);
        setConnectionStatus('connected');
        reconnectAttemptsRef.current = 0;

        // Authentifier la connexion
        if (wsRef.current && session?.user?.id && session?.accessToken) {
          wsRef.current.send(JSON.stringify({
            type: 'AUTH',
            userId: session.user.id,
            token: session.accessToken
          }));
        }

        // Démarrer le ping pour maintenir la connexion
        startPing();

        onConnect?.();
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          setLastMessage(message);

          // Gérer les messages système
          switch (message.type) {
            case 'AUTH_SUCCESS':
              console.log('Authentification WebSocket réussie');
              break;
            case 'AUTH_ERROR':
              console.error('Erreur authentification WebSocket:', message.message);
              toast({
                title: 'Erreur de connexion',
                description: 'Impossible de s\'authentifier au service de notifications',
                variant: 'destructive',
              });
              break;
            case 'ANNOUNCEMENT_UPDATE':
              handleAnnouncementUpdate(message);
              break;
            case 'DELIVERY_UPDATE':
              handleDeliveryUpdate(message);
              break;
            case 'SYSTEM_ALERT':
              handleSystemAlert(message);
              break;
          }

          onMessage?.(message);
        } catch (error) {
          console.error('Erreur parsing message WebSocket:', error);
        }
      };

      wsRef.current.onclose = (event) => {
        console.log('Connexion WebSocket fermée:', event.code, event.reason);
        setIsConnected(false);
        setConnectionStatus('disconnected');
        stopPing();

        onDisconnect?.();

        // Tentative de reconnexion automatique
        if (autoReconnect && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          console.log(`Tentative de reconnexion ${reconnectAttemptsRef.current}/${maxReconnectAttempts}`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('Erreur WebSocket:', error);
        setConnectionStatus('error');
        onError?.(error);
      };

    } catch (error) {
      console.error('Erreur création WebSocket:', error);
      setConnectionStatus('error');
    }
  }, [session, autoReconnect, maxReconnectAttempts, reconnectInterval, onConnect, onDisconnect, onError, onMessage]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    stopPing();

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsConnected(false);
    setConnectionStatus('disconnected');
  }, []);

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      return true;
    } else {
      console.warn('WebSocket non connecté, impossible d\'envoyer le message');
      return false;
    }
  }, []);

  const subscribe = useCallback((channel: string) => {
    return sendMessage({
      type: 'SUBSCRIBE',
      channel
    });
  }, [sendMessage]);

  const startPing = useCallback(() => {
    pingIntervalRef.current = setInterval(() => {
      sendMessage({ type: 'PING' });
    }, 30000); // Ping toutes les 30 secondes
  }, [sendMessage]);

  const stopPing = useCallback(() => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
  }, []);

  // Handlers pour les différents types de messages
  const handleAnnouncementUpdate = useCallback((message: WebSocketMessage) => {
    const { action, announcement, announcementId, updates } = message.data;

    switch (action) {
      case 'NEW_ANNOUNCEMENT':
        toast({
          title: 'Nouvelle annonce disponible',
          description: `Nouvelle livraison: ${announcement.title}`,
        });
        break;
      case 'ANNOUNCEMENT_UPDATED':
        toast({
          title: 'Annonce mise à jour',
          description: 'Une annonce qui vous intéresse a été modifiée',
        });
        break;
    }
  }, []);

  const handleDeliveryUpdate = useCallback((message: WebSocketMessage) => {
    const { deliveryId, status } = message.data;

    const statusMessages: Record<string, string> = {
      'ACCEPTED': 'Votre livraison a été acceptée',
      'PICKED_UP': 'Votre colis a été récupéré',
      'IN_TRANSIT': 'Votre colis est en cours de livraison',
      'DELIVERED': 'Votre colis a été livré',
      'CANCELLED': 'Votre livraison a été annulée',
    };

    if (statusMessages[status]) {
      toast({
        title: 'Mise à jour de livraison',
        description: statusMessages[status],
      });
    }
  }, []);

  const handleSystemAlert = useCallback((message: WebSocketMessage) => {
    const alert = message.data;

    toast({
      title: alert.title || 'Alerte système',
      description: alert.message,
      variant: alert.type === 'error' ? 'destructive' : 'default',
    });
  }, []);

  // Connexion automatique lors du montage et de la disponibilité de la session
  useEffect(() => {
    if (session?.user?.id) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [session?.user?.id, connect, disconnect]);

  // Nettoyage lors du démontage
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    connectionStatus,
    lastMessage,
    connect,
    disconnect,
    sendMessage,
    subscribe,
  };
}

// Hook spécialisé pour les notifications d'annonces
export function useAnnouncementNotifications() {
  const { data: session } = useSession();
  const [announcements, setAnnouncements] = useState<any[]>([]);

  const handleMessage = useCallback((message: WebSocketMessage) => {
    if (message.type === 'ANNOUNCEMENT_UPDATE') {
      const { action, announcement, announcementId, updates } = message.data;

      switch (action) {
        case 'NEW_ANNOUNCEMENT':
          setAnnouncements(prev => [announcement, ...prev]);
          break;
        case 'ANNOUNCEMENT_UPDATED':
          setAnnouncements(prev => 
            prev.map(ann => 
              ann.id === announcementId ? { ...ann, ...updates } : ann
            )
          );
          break;
      }
    }
  }, []);

  const { isConnected, subscribe } = useWebSocket({
    onMessage: handleMessage,
    onConnect: () => {
      // S'abonner aux annonces pour livreurs
      if (session?.user?.role === 'DELIVERER') {
        subscribe('announcements');
      }
    }
  });

  return {
    isConnected,
    announcements,
    subscribe,
  };
}