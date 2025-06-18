import { io, Socket } from 'socket.io-client';

export interface WebSocketConfig {
  url?: string;
  path?: string;
  autoConnect?: boolean;
  reconnection?: boolean;
  reconnectionDelay?: number;
  reconnectionAttempts?: number;
  auth?: Record<string, any>;
}

export interface NotificationData {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  timestamp: Date;
  read?: boolean;
}

export type WebSocketEventHandler<T = any> = (data: T) => void;

export class WebSocketClient {
  private socket: Socket | null = null;
  private eventHandlers: Map<string, Set<WebSocketEventHandler>> = new Map();
  private isConnected = false;
  private reconnectAttempts = 0;
  private config: WebSocketConfig;

  constructor(config: WebSocketConfig = {}) {
    this.config = {
      url: process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'http://localhost:3001',
      path: '/socket.io/',
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      ...config
    };
  }

  /**
   * Connecte au serveur WebSocket
   */
  connect(userId?: string, userType?: string): void {
    if (this.socket?.connected) {
      console.log('WebSocket déjà connecté');
      return;
    }

    this.socket = io(this.config.url!, {
      path: this.config.path,
      autoConnect: this.config.autoConnect,
      reconnection: this.config.reconnection,
      reconnectionDelay: this.config.reconnectionDelay,
      reconnectionAttempts: this.config.reconnectionAttempts,
      auth: {
        ...this.config.auth,
        userId,
        userType
      }
    });

    this.setupEventListeners();
  }

  /**
   * Configure les écouteurs d'événements WebSocket
   */
  private setupEventListeners(): void {
    if (!this.socket) return;

    // Connexion établie
    this.socket.on('connect', () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      console.log('✅ WebSocket connecté:', this.socket?.id);
      this.emit('connected', { socketId: this.socket?.id });
    });

    // Déconnexion
    this.socket.on('disconnect', (reason: string) => {
      this.isConnected = false;
      console.log('❌ WebSocket déconnecté:', reason);
      this.emit('disconnected', { reason });
    });

    // Erreur de connexion
    this.socket.on('connect_error', (error: Error) => {
      console.error('Erreur de connexion WebSocket:', error);
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.config.reconnectionAttempts!) {
        console.error('Nombre maximum de tentatives de reconnexion atteint');
        this.disconnect();
      }
    });

    // Reconnexion
    this.socket.on('reconnect', (attemptNumber: number) => {
      console.log('🔄 WebSocket reconnecté après', attemptNumber, 'tentatives');
      this.emit('reconnected', { attempts: attemptNumber });
    });

    // Événements métier
    this.socket.on('notification', (data: NotificationData) => {
      this.emit('notification', data);
    });

    this.socket.on('announcement:new', (data: any) => {
      this.emit('announcement:new', data);
    });

    this.socket.on('announcement:update', (data: any) => {
      this.emit('announcement:update', data);
    });

    this.socket.on('delivery:status', (data: any) => {
      this.emit('delivery:status', data);
    });

    this.socket.on('message:new', (data: any) => {
      this.emit('message:new', data);
    });

    this.socket.on('payment:update', (data: any) => {
      this.emit('payment:update', data);
    });
  }

  /**
   * S'abonne à un événement
   */
  on<T = any>(event: string, handler: WebSocketEventHandler<T>): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    
    this.eventHandlers.get(event)!.add(handler);

    // Retourne une fonction de désabonnement
    return () => {
      this.off(event, handler);
    };
  }

  /**
   * Se désabonne d'un événement
   */
  off<T = any>(event: string, handler: WebSocketEventHandler<T>): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.eventHandlers.delete(event);
      }
    }
  }

  /**
   * Émet un événement local
   */
  private emit<T = any>(event: string, data: T): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Erreur dans le handler pour l'événement ${event}:`, error);
        }
      });
    }
  }

  /**
   * Envoie un événement au serveur
   */
  send<T = any>(event: string, data: T, callback?: (response: any) => void): void {
    if (!this.socket?.connected) {
      console.warn('WebSocket non connecté. Impossible d\'envoyer:', event);
      return;
    }

    if (callback) {
      this.socket.emit(event, data, callback);
    } else {
      this.socket.emit(event, data);
    }
  }

  /**
   * Rejoint une room
   */
  joinRoom(room: string): void {
    this.send('join:room', { room });
  }

  /**
   * Quitte une room
   */
  leaveRoom(room: string): void {
    this.send('leave:room', { room });
  }

  /**
   * S'abonne aux notifications d'annonces pour un livreur
   */
  subscribeToAnnouncementNotifications(delivererId: string): void {
    this.joinRoom(`deliverer:${delivererId}:announcements`);
  }

  /**
   * S'abonne aux mises à jour de livraison
   */
  subscribeToDeliveryUpdates(deliveryId: string): void {
    this.joinRoom(`delivery:${deliveryId}`);
  }

  /**
   * S'abonne aux messages d'une conversation
   */
  subscribeToConversation(conversationId: string): void {
    this.joinRoom(`conversation:${conversationId}`);
  }

  /**
   * Marque une notification comme lue
   */
  markNotificationAsRead(notificationId: string): void {
    this.send('notification:read', { notificationId });
  }

  /**
   * Déconnecte le WebSocket
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.eventHandlers.clear();
    }
  }

  /**
   * Vérifie si le WebSocket est connecté
   */
  getIsConnected(): boolean {
    return this.isConnected && this.socket?.connected || false;
  }

  /**
   * Obtient l'ID du socket
   */
  getSocketId(): string | undefined {
    return this.socket?.id;
  }
}

// Instance singleton
let webSocketClient: WebSocketClient | null = null;

export function getWebSocketClient(config?: WebSocketConfig): WebSocketClient {
  if (!webSocketClient) {
    webSocketClient = new WebSocketClient(config);
  }
  return webSocketClient;
}

export function disconnectWebSocket(): void {
  if (webSocketClient) {
    webSocketClient.disconnect();
    webSocketClient = null;
  }
}