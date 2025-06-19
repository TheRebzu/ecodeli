/**
 * 🔧 EcoDeli - Client Socket.IO corrigé
 * ====================================
 * 
 * Client Socket.IO compatible avec Next.js App Router selon le workflow EcoDeli Mission 1 :
 * - Connexion au port 3001 (serveur Socket.IO dédié)
 * - Authentification avec NextAuth
 * - Gestion des erreurs de connexion
 * - Reconnexion automatique
 */

import { io, Socket } from 'socket.io-client';
import { toast } from "@/components/ui/use-toast";

let socket: Socket | null = null;
let connectionAttempts = 0;
const MAX_RETRY_ATTEMPTS = 5;
const RETRY_DELAY = 2000; // 2 secondes

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
 * Configuration Socket.IO
 */
const SOCKET_CONFIG = {
  // Connexion au serveur Socket.IO dédié (port 3001)
  url: process.env.NEXT_PUBLIC_SOCKET_URL ?? 'http://localhost:3001',
  options: {
    transports: ['polling', 'websocket'],
    timeout: 20000,
    forceNew: false,
    reconnection: true,
    reconnectionAttempts: MAX_RETRY_ATTEMPTS,
    reconnectionDelay: RETRY_DELAY,
    maxReconnectionAttempts: MAX_RETRY_ATTEMPTS,
    path: '/socket.io',
    autoConnect: false,
  }
};

/**
 * Initialise la connexion Socket.IO avec authentification
 */
export function initializeSocket(token: string, userId: string, role: string): Socket {
  if (socket?.connected) {
    console.log('🔌 Socket.IO déjà connecté');
    return socket;
  }

  try {
    console.log('🔌 Initialisation Socket.IO...', {
      url: SOCKET_CONFIG.url,
      userId,
      role
    });

    // Créer la connexion avec l'authentification
    socket = io(SOCKET_CONFIG.url, {
      ...SOCKET_CONFIG.options,
    auth: { 
      token,
      userId,
        role
      }
    });

    // === ÉVÉNEMENTS DE CONNEXION ===
    
    socket.on('connect', () => {
      console.log('✅ Socket.IO connecté:', socket?.id);
      connectionAttempts = 0;
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Erreur connexion Socket.IO:', error.message);
      connectionAttempts++;
      
      if (connectionAttempts >= MAX_RETRY_ATTEMPTS) {
        console.error(`❌ Échec connexion Socket.IO après ${MAX_RETRY_ATTEMPTS} tentatives`);
        socket?.disconnect();
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 Socket.IO déconnecté:', reason);
      
      // Reconnexion automatique sauf si déconnexion manuelle
      if (reason !== 'io client disconnect') {
        console.log('🔄 Tentative de reconnexion...');
      }
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log(`✅ Socket.IO reconnecté après ${attemptNumber} tentative(s)`);
      connectionAttempts = 0;
    });

    socket.on('reconnect_failed', () => {
      console.error('❌ Échec de toutes les tentatives de reconnexion Socket.IO');
    });

    // === ÉVÉNEMENTS MÉTIER ===
    
    // Notifications temps réel
    socket.on('realtime-notification', (notification) => {
      console.log('📱 Notification reçue:', notification);
      // L'événement sera capturé par le SocketProvider
    });

    // Mises à jour de livraison
    socket.on('delivery-location-update', (update) => {
      console.log('📍 Position livreur mise à jour:', update);
    });

    socket.on('delivery-status-changed', (update) => {
      console.log('📦 Statut livraison changé:', update);
    });

    socket.on('delivery-eta-update', (update) => {
      console.log('⏰ ETA mise à jour:', update);
    });

    // Utilisateurs en ligne
    socket.on('user-online', (data) => {
      console.log('👤 Utilisateur en ligne:', data.userId);
    });

    socket.on('user-offline', (data) => {
      console.log('👤 Utilisateur hors ligne:', data.userId);
    });

    // Messagerie
    socket.on('user-typing', (data) => {
      console.log('⌨️ Utilisateur tape:', data);
    });

    // === ÉVÉNEMENTS DE DEBUG ===
    
    socket.on('pong', () => {
      console.log('🏓 Pong reçu du serveur');
    });

    // Démarrer la connexion
    socket.connect();

    return socket;

  } catch (error) {
    console.error('❌ Erreur initialisation Socket.IO:', error);
    throw error;
  }
}

/**
 * Vérifie si Socket.IO est connecté
 */
export function isSocketConnected(): boolean {
  return socket?.connected ?? false;
}

/**
 * Récupère l'instance Socket.IO
 */
export function getSocket(): Socket | null {
  return socket;
}

/**
 * Ferme la connexion Socket.IO
 */
export function closeSocket(): void {
  if (socket) {
    console.log('🔌 Fermeture connexion Socket.IO');
    socket.disconnect();
    socket = null;
  }
}

/**
 * Émet un ping vers le serveur
 */
export function pingServer(): void {
  if (socket?.connected) {
    socket.emit('ping');
  }
}

/**
 * === FONCTIONS UTILITAIRES POUR LES ÉVÉNEMENTS ===
 */

// Gestion des événements temps réel génériques
const eventHandlers = new Map<string, Set<Function>>();

/**
 * Ajoute un écouteur d'événement
 */
export function onRealTimeEvent(event: string, handler: Function): void {
  if (!eventHandlers.has(event)) {
    eventHandlers.set(event, new Set());
  }
  eventHandlers.get(event)!.add(handler);

  // Écouter l'événement sur le socket si connecté
  if (socket?.connected) {
    socket.on(event, handler as any);
  }
}

/**
 * Retire un écouteur d'événement
 */
export function offRealTimeEvent(event: string, handler: Function): void {
  const handlers = eventHandlers.get(event);
  if (handlers) {
    handlers.delete(handler);
    
    // Retirer l'écouteur du socket
    if (socket) {
      socket.off(event, handler as any);
    }
  }
}

/**
 * === FONCTIONS MÉTIER SPÉCIFIQUES ===
 */

/**
 * Rejoindre le suivi d'une livraison
 */
export function trackDelivery(deliveryId: string): void {
  if (socket?.connected) {
    console.log(`👀 Début du suivi de la livraison ${deliveryId}`);
    socket.emit('track-delivery', deliveryId);
  }
}

/**
 * Arrêter le suivi d'une livraison
 */
export function stopTrackingDelivery(deliveryId: string): void {
  if (socket?.connected) {
    console.log(`🚫 Arrêt du suivi de la livraison ${deliveryId}`);
    socket.emit('stop-tracking-delivery', deliveryId);
  }
}

/**
 * Marquer une notification comme lue
 */
export function markNotificationAsRead(notificationId: string): void {
  if (socket?.connected) {
    socket.emit('mark-notification-read', notificationId);
  }
}

/**
 * Rejoindre une conversation
 */
export function joinConversation(conversationId: string): void {
  if (socket?.connected) {
    console.log(`💬 Rejoindre la conversation ${conversationId}`);
    socket.emit('join-conversation', conversationId);
  }
}

/**
 * Quitter une conversation
 */
export function leaveConversation(conversationId: string): void {
  if (socket?.connected) {
    console.log(`👋 Quitter la conversation ${conversationId}`);
    socket.emit('leave-conversation', conversationId);
  }
}

/**
 * Envoyer un indicateur de frappe
 */
export function sendTypingIndicator(conversationId: string, isTyping: boolean): void {
  if (socket?.connected) {
    socket.emit('typing', { conversationId, isTyping });
  }
}
