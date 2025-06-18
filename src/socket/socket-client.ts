import { io, Socket } from "socket.io-client";
import { toast } from "@/components/ui/use-toast";

let socket: Socket | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

export interface RealTimeNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  userId: string;
  data?: Record<string, any>;
  actionUrl?: string;
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  timestamp: string;
}

export interface DeliveryUpdate {
  deliveryId: string;
  status: string;
  location?: {
    latitude: number;
    longitude: number;
    address: string;
  };
  eta?: string;
  distance?: number;
  message: string;
  timestamp: string;
}

/**
 * Initialize the socket connection with enhanced real-time features
 * @param token - User authentication token
 * @param userId - User ID for targeted notifications
 * @param userRole - User role for filtering events
 * @returns The socket instance
 */
export const initializeSocket = (
  token: string, 
  userId: string, 
  userRole: string
): Socket => {
  if (socket?.connected) return socket;

  // Configuration unifiée de l'URL
  const socketUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  socket = io(socketUrl, {
    path: '/socket.io/',
    auth: { 
      token,
      userId,
      role: userRole
    },
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
    transports: ['websocket', 'polling']
  });

  // Événements de connexion
  socket.on("connect", () => {
    console.log(`🔌 Socket connecté - ID: ${socket?.id}`);
    reconnectAttempts = 0;
    
    // Rejoindre les rooms appropriées
    socket?.emit("join-user-room", userId);
    socket?.emit("join-role-room", userRole.toLowerCase());
    
    // Notification de reconnexion si ce n'est pas la première connexion
    if (reconnectAttempts > 0) {
      toast({
        title: "✅ Connexion rétablie",
        description: "Les notifications temps réel sont actives",
        duration: 3000,
      });
    }
  });

  socket.on("disconnect", (reason) => {
    console.log(`🔌 Socket déconnecté - Raison: ${reason}`);
    
    if (reason === "io server disconnect") {
      // Reconnexion forcée par le serveur
      socket?.connect();
    }
  });

  socket.on("connect_error", (error) => {
    console.error("❌ Erreur de connexion Socket:", error);
    reconnectAttempts++;
    
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      toast({
        title: "⚠️ Problème de connexion",
        description: "Les notifications temps réel peuvent être retardées",
        variant: "destructive",
        duration: 5000,
      });
    }
  });

  socket.on("reconnect", (attemptNumber) => {
    console.log(`🔄 Socket reconnecté après ${attemptNumber} tentatives`);
    toast({
      title: "✅ Connexion rétablie",
      description: "Les notifications temps réel sont de nouveau actives",
      duration: 3000,
    });
  });

  // Événements de notifications temps réel
  socket.on("notification", (notification: RealTimeNotification) => {
    console.log("🔔 Notification temps réel reçue:", notification);
    handleRealTimeNotification(notification);
  });

  socket.on("delivery-update", (update: DeliveryUpdate) => {
    console.log("🚚 Mise à jour livraison:", update);
    handleDeliveryUpdate(update);
  });

  socket.on("delivery-location", (data: {
    deliveryId: string;
    location: { latitude: number; longitude: number };
    eta: string;
    speed: number;
  }) => {
    console.log("📍 Position livreur mise à jour:", data);
    handleLocationUpdate(data);
  });

  socket.on("announcement-match", (data: {
    announcementId: string;
    delivererId: string;
    message: string;
  }) => {
    console.log("🎯 Correspondance annonce:", data);
    handleAnnouncementMatch(data);
  });

  socket.on("system-alert", (alert: {
    type: string;
    title: string;
    message: string;
    priority: string;
  }) => {
    console.log("🚨 Alerte système:", alert);
    handleSystemAlert(alert);
  });

  // Événements d'état en temps réel
  socket.on("user-online", (data: { userId: string; role: string }) => {
    console.log("👤 Utilisateur en ligne:", data);
    handleUserOnline(data);
  });

  socket.on("user-offline", (data: { userId: string; role: string }) => {
    console.log("👤 Utilisateur hors ligne:", data);
    handleUserOffline(data);
  });

  return socket;
};

/**
 * Gérer les notifications temps réel reçues
 */
function handleRealTimeNotification(notification: RealTimeNotification) {
  // Afficher un toast pour les notifications importantes
  if (notification.priority === "HIGH" || notification.priority === "URGENT") {
    toast({
      title: notification.title,
      description: notification.message,
      duration: notification.priority === "URGENT" ? 0 : 5000,
      action: notification.actionUrl ? {
        altText: "Voir",
        onClick: () => window.location.href = notification.actionUrl!
      } : undefined,
    });
  }

  // Déclencher un événement personnalisé pour que les composants puissent l'écouter
  const event = new CustomEvent("realtime-notification", {
    detail: notification
  });
  window.dispatchEvent(event);

  // Mettre à jour le badge de notifications
  updateNotificationBadge();
}

/**
 * Gérer les mises à jour de livraison
 */
function handleDeliveryUpdate(update: DeliveryUpdate) {
  // Déclencher un événement pour le tracking de livraison
  const event = new CustomEvent("delivery-update", {
    detail: update
  });
  window.dispatchEvent(event);

  // Toast pour les étapes importantes
  const importantStatuses = ["PICKED_UP", "IN_TRANSIT", "NEARBY", "ARRIVED", "DELIVERED"];
  if (importantStatuses.includes(update.status)) {
    toast({
      title: "📦 Livraison mise à jour",
      description: update.message,
      duration: 4000,
    });
  }
}

/**
 * Gérer les mises à jour de position GPS
 */
function handleLocationUpdate(data: any) {
  const event = new CustomEvent("delivery-location", {
    detail: data
  });
  window.dispatchEvent(event);
}

/**
 * Gérer les correspondances d'annonces
 */
function handleAnnouncementMatch(data: any) {
  toast({
    title: "🎯 Nouvelle opportunité",
    description: data.message,
    duration: 6000,
    action: {
      altText: "Voir l'annonce",
      onClick: () => window.location.href = `/deliverer/announcements/${data.announcementId}`
    },
  });

  const event = new CustomEvent("announcement-match", {
    detail: data
  });
  window.dispatchEvent(event);
}

/**
 * Gérer les alertes système
 */
function handleSystemAlert(alert: any) {
  toast({
    title: alert.title,
    description: alert.message,
    variant: alert.priority === "URGENT" ? "destructive" : "default",
    duration: alert.priority === "URGENT" ? 0 : 7000,
  });
}

/**
 * Gérer les utilisateurs en ligne
 */
function handleUserOnline(data: any) {
  const event = new CustomEvent("user-online", {
    detail: data
  });
  window.dispatchEvent(event);
}

/**
 * Gérer les utilisateurs hors ligne
 */
function handleUserOffline(data: any) {
  const event = new CustomEvent("user-offline", {
    detail: data
  });
  window.dispatchEvent(event);
}

/**
 * Mettre à jour le badge de notifications
 */
function updateNotificationBadge() {
  const event = new CustomEvent("update-notification-badge");
  window.dispatchEvent(event);
}

/**
 * Send a typing indicator
 */
export const sendTypingIndicator = (conversationId: string, isTyping: boolean) => {
  if (socket?.connected) {
    socket.emit("typing", { conversationId, isTyping });
  }
};

/**
 * Join a specific conversation room
 */
export const joinConversation = (conversationId: string) => {
  if (socket?.connected) {
    socket.emit("join-conversation", conversationId);
  }
};

/**
 * Leave a conversation room
 */
export const leaveConversation = (conversationId: string) => {
  if (socket?.connected) {
    socket.emit("leave-conversation", conversationId);
  }
};

/**
 * Send a real-time location update (for deliverers)
 */
export const sendLocationUpdate = (deliveryId: string, location: {
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
}) => {
  if (socket?.connected) {
    socket.emit("location-update", {
      deliveryId,
      location: {
        ...location,
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Update delivery status in real-time
 */
export const updateDeliveryStatus = (deliveryId: string, status: string, data?: any) => {
  if (socket?.connected) {
    socket.emit("delivery-status-update", {
      deliveryId,
      status,
      data,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Send live ETA updates
 */
export const sendETAUpdate = (deliveryId: string, eta: {
  estimatedMinutes: number;
  estimatedArrival: string;
  confidence: number;
}) => {
  if (socket?.connected) {
    socket.emit("eta-update", {
      deliveryId,
      eta,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Get the current socket instance
 * @returns The current socket instance or null if not initialized
 */
export const getSocket = (): Socket | null => socket;

/**
 * Check if socket is connected
 */
export const isSocketConnected = (): boolean => {
  return socket?.connected ?? false;
};

/**
 * Force reconnection
 */
export const reconnectSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket.connect();
  }
};

/**
 * Close the socket connection
 */
export const closeSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

/**
 * Listen to custom events for components
 */
export const onRealTimeEvent = (eventType: string, callback: (data: any) => void) => {
  window.addEventListener(eventType, (event: any) => {
    callback(event.detail);
  });
};

/**
 * Remove event listener
 */
export const offRealTimeEvent = (eventType: string, callback: (data: any) => void) => {
  window.removeEventListener(eventType, callback);
};
