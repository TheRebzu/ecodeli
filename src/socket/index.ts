/**
 * Configuration Socket.IO simplifiée pour éviter les erreurs de compilation
 * Version temporaire en attendant l'implémentation complète
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
  type: 'position_update' | 'status_change' | 'eta_update';
  deliveryId: string;
  data: any;
  timestamp: Date;
}

export interface GeoPoint {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}

// Configuration d'environnement
export const isServer = typeof window === 'undefined';
export const isClient = typeof window !== 'undefined';

// Socket client simplifié (stub pour éviter les erreurs)
export const socket = isClient ? {
  emit: (event: string, data?: any) => {
    console.log(`[Socket Stub] Emit: ${event}`, data);
  },
  on: (event: string, callback: (data: any) => void) => {
    console.log(`[Socket Stub] Listen: ${event}`);
  },
  off: (event: string, callback?: (data: any) => void) => {
    console.log(`[Socket Stub] Off: ${event}`);
  },
  connect: () => {
    console.log('[Socket Stub] Connect');
  },
  disconnect: () => {
    console.log('[Socket Stub] Disconnect');
  },
  connected: false
} : null;

// Fonctions de connexion simplifiées
export const connectSocket = (userId?: string) => {
  if (isClient && socket) {
    console.log('[Socket Stub] Connecting socket for user:', userId);
    socket.connect();
  }
};

export const disconnectSocket = () => {
  if (isClient && socket) {
    console.log('[Socket Stub] Disconnecting socket');
    socket.disconnect();
  }
};

// Fonction d'émission d'événements de tracking
export const emitDeliveryTrackingEvent = (event: DeliveryTrackingEvent) => {
  if (isClient && socket) {
    console.log('[Socket Stub] Emit tracking event:', event);
    socket.emit('delivery_tracking', event);
  }
};

// Export par défaut
export default {
  socket,
  connectSocket,
  disconnectSocket,
  emitDeliveryTrackingEvent,
  isServer,
  isClient
};
