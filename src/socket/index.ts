/**
 * Configuration Socket.IO pour le suivi en temps réel
 * Gestion des événements de livraison et notifications
 */

// Types pour le delivery tracking
export interface DeliveryPosition {
  deliveryId: string;
  latitude: number;
  longitude: number;
  timestamp: Date;
  accuracy?: number;
  heading?: number;
  speed?: number;
}

export interface DeliveryTrackingEvent {
  type: "position_update" | "status_change" | "eta_update";
  deliveryId: string;
  data: any;
  timestamp: Date;
}

export interface GeoPoint {
  type: "Point";
  coordinates: [number, number]; // [longitude, latitude]
}

// Configuration d'environnement
export const isServer = typeof window === "undefined";
export const isClient = typeof window !== "undefined";

// Client socket réel utilisant socket.io-client
import { io, Socket } from "socket.io-client";

let socketInstance: Socket | null = null;

const getSocket = (): Socket | null => {
  if (!isClient) return null;

  if (!socketInstance) {
    socketInstance = io(
      process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001",
      {
        autoConnect: false,
      },
    );
  }
  return socketInstance;
};

export const socket = isClient
  ? {
      emit: (event: string, data?: any) => {
        const socketClient = getSocket();
        if (socketClient) {
          socketClient.emit(event, data);
        }
      },
      on: (event: string, callback: (data: any) => void) => {
        const socketClient = getSocket();
        if (socketClient) {
          socketClient.on(event, callback);
        }
      },
      off: (event: string, callback?: (data: any) => void) => {
        const socketClient = getSocket();
        if (socketClient) {
          socketClient.off(event, callback);
        }
      },
      connect: () => {
        const socketClient = getSocket();
        if (socketClient) {
          socketClient.connect();
        }
      },
      disconnect: () => {
        const socketClient = getSocket();
        if (socketClient) {
          socketClient.disconnect();
        }
      },
      connected: socketInstance?.connected || false,
    }
  : null;

// Fonctions de connexion réelles
export const connectSocket = (userId?: string) => {
  if (isClient && socket) {
    console.log("Connexion socket pour l'utilisateur:", userId);
    socket.connect();
  }
};

export const disconnectSocket = () => {
  if (isClient && socket) {
    console.log("Déconnexion du socket");
    socket.disconnect();
  }
};

// Fonction d'émission d'événements de tracking
export const emitDeliveryTrackingEvent = (event: DeliveryTrackingEvent) => {
  if (isClient && socket) {
    console.log("Émission d'événement de tracking:", event);
    socket.emit("delivery_tracking", event);
  }
};

// Export par défaut
export default {
  socket,
  connectSocket,
  disconnectSocket,
  emitDeliveryTrackingEvent,
  isServer,
  isClient,
};
