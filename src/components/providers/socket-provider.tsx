"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useSession } from "next-auth/react";
import { Socket } from "socket.io-client";
import { 
  initializeSocket, 
  closeSocket, 
  getSocket,
  isSocketConnected,
  onRealTimeEvent,
  offRealTimeEvent,
  type RealTimeNotification,
  type DeliveryUpdate
} from "@/socket/socket-client";

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  notifications: RealTimeNotification[];
  deliveryUpdates: DeliveryUpdate[];
  onlineUsers: Set<string>;
  sendLocationUpdate: (deliveryId: string, location: any) => void;
  updateDeliveryStatus: (deliveryId: string, status: string, data?: any) => void;
  sendETAUpdate: (deliveryId: string, eta: any) => void;
  joinConversation: (conversationId: string) => void;
  leaveConversation: (conversationId: string) => void;
  sendTypingIndicator: (conversationId: string, isTyping: boolean) => void;
}

const SocketContext = createContext<SocketContextType | null>(null);

interface SocketProviderProps {
  children: ReactNode;
}

export function SocketProvider({ children }: SocketProviderProps) {
  const { data: session, status } = useSession();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState<RealTimeNotification[]>([]);
  const [deliveryUpdates, setDeliveryUpdates] = useState<DeliveryUpdate[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  // Initialiser la connexion WebSocket quand l'utilisateur est authentifié
  useEffect(() => {
    if (status === "authenticated" && session?.user?.id && session?.user?.role) {
      console.log("🔌 Initialisation de la connexion WebSocket...");
      
      const socketInstance = initializeSocket(
        session.user.id, // Token utilisé comme ID utilisateur
        session.user.id,
        session.user.role
      );

      setSocket(socketInstance);
      setIsConnected(socketInstance.connected);

      // Écouter les changements d'état de connexion
      const checkConnection = () => {
        setIsConnected(isSocketConnected());
      };

      const interval = setInterval(checkConnection, 1000);

      // Nettoyer à la fermeture
      return () => {
        clearInterval(interval);
      };
    } else if (status === "unauthenticated") {
      // Fermer la connexion si l'utilisateur se déconnecte
      closeSocket();
      setSocket(null);
      setIsConnected(false);
      setNotifications([]);
      setDeliveryUpdates([]);
      setOnlineUsers(new Set());
    }
  }, [session, status]);

  // Écouter les événements temps réel
  useEffect(() => {
    const handleNotification = (notification: RealTimeNotification) => {
      setNotifications(prev => [notification, ...prev.slice(0, 49)]); // Garder 50 max
    };

    const handleDeliveryUpdate = (update: DeliveryUpdate) => {
      setDeliveryUpdates(prev => {
        const filtered = prev.filter(u => u.deliveryId !== update.deliveryId);
        return [update, ...filtered.slice(0, 19)]; // Garder 20 max
      });
    };

    const handleUserOnline = (data: { userId: string; role: string }) => {
      setOnlineUsers(prev => new Set([...prev, data.userId]));
    };

    const handleUserOffline = (data: { userId: string; role: string }) => {
      setOnlineUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(data.userId);
        return newSet;
      });
    };

    const handleNotificationBadgeUpdate = () => {
      // Déclencher une revalidation des données de notifications
      window.dispatchEvent(new CustomEvent("notifications-updated"));
    };

    // Enregistrer les écouteurs d'événements
    onRealTimeEvent("realtime-notification", handleNotification);
    onRealTimeEvent("delivery-update", handleDeliveryUpdate);
    onRealTimeEvent("user-online", handleUserOnline);
    onRealTimeEvent("user-offline", handleUserOffline);
    onRealTimeEvent("update-notification-badge", handleNotificationBadgeUpdate);

    // Nettoyer les écouteurs
    return () => {
      offRealTimeEvent("realtime-notification", handleNotification);
      offRealTimeEvent("delivery-update", handleDeliveryUpdate);
      offRealTimeEvent("user-online", handleUserOnline);
      offRealTimeEvent("user-offline", handleUserOffline);
      offRealTimeEvent("update-notification-badge", handleNotificationBadgeUpdate);
    };
  }, []);

  // Méthodes utilitaires
  const sendLocationUpdate = (deliveryId: string, location: any) => {
    const socketInstance = getSocket();
    if (socketInstance?.connected) {
      socketInstance.emit("location-update", {
        deliveryId,
        location: {
          ...location,
          timestamp: new Date().toISOString()
        }
      });
    }
  };

  const updateDeliveryStatus = (deliveryId: string, status: string, data?: any) => {
    const socketInstance = getSocket();
    if (socketInstance?.connected) {
      socketInstance.emit("delivery-status-update", {
        deliveryId,
        status,
        data,
        timestamp: new Date().toISOString()
      });
    }
  };

  const sendETAUpdate = (deliveryId: string, eta: any) => {
    const socketInstance = getSocket();
    if (socketInstance?.connected) {
      socketInstance.emit("eta-update", {
        deliveryId,
        eta,
        timestamp: new Date().toISOString()
      });
    }
  };

  const joinConversation = (conversationId: string) => {
    const socketInstance = getSocket();
    if (socketInstance?.connected) {
      socketInstance.emit("join-conversation", conversationId);
    }
  };

  const leaveConversation = (conversationId: string) => {
    const socketInstance = getSocket();
    if (socketInstance?.connected) {
      socketInstance.emit("leave-conversation", conversationId);
    }
  };

  const sendTypingIndicator = (conversationId: string, isTyping: boolean) => {
    const socketInstance = getSocket();
    if (socketInstance?.connected) {
      socketInstance.emit("typing", { conversationId, isTyping });
    }
  };

  const value: SocketContextType = {
    socket,
    isConnected,
    notifications,
    deliveryUpdates,
    onlineUsers,
    sendLocationUpdate,
    updateDeliveryStatus,
    sendETAUpdate,
    joinConversation,
    leaveConversation,
    sendTypingIndicator,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}

// Hook pour utiliser le contexte WebSocket
export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
}

// Hook pour écouter les notifications temps réel
export function useRealTimeNotifications() {
  const { notifications } = useSocket();
  return notifications;
}

// Hook pour écouter les mises à jour de livraison
export function useDeliveryUpdates(deliveryId?: string) {
  const { deliveryUpdates } = useSocket();
  
  if (deliveryId) {
    return deliveryUpdates.filter(update => update.deliveryId === deliveryId);
  }
  
  return deliveryUpdates;
}

// Hook pour vérifier l'état en ligne des utilisateurs
export function useOnlineUsers() {
  const { onlineUsers } = useSocket();
  return onlineUsers;
}

// Hook pour les livreurs - gestion de position GPS
export function useDelivererLocation() {
  const { sendLocationUpdate, sendETAUpdate, updateDeliveryStatus } = useSocket();
  
  const updateLocation = (deliveryId: string, position: GeolocationPosition) => {
    const location = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      speed: position.coords.speed,
      heading: position.coords.heading,
    };
    
    sendLocationUpdate(deliveryId, location);
  };

  const updateETA = (deliveryId: string, eta: {
    estimatedMinutes: number;
    estimatedArrival: string;
    confidence: number;
  }) => {
    sendETAUpdate(deliveryId, eta);
  };

  const updateStatus = (deliveryId: string, status: string, data?: any) => {
    updateDeliveryStatus(deliveryId, status, data);
  };

  return {
    updateLocation,
    updateETA,
    updateStatus,
  };
}

// Hook pour la messagerie temps réel
export function useRealTimeMessaging() {
  const { joinConversation, leaveConversation, sendTypingIndicator } = useSocket();
  
  return {
    joinConversation,
    leaveConversation,
    sendTypingIndicator,
  };
}