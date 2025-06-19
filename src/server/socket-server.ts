/**
 * 🔧 EcoDeli - Serveur Socket.IO
 * ================================
 * 
 * Serveur Socket.IO intégré avec Next.js selon le workflow EcoDeli Mission 1 :
 * - Authentification avec NextAuth
 * - Notifications temps réel
 * - Suivi des livraisons
 * - Messagerie instantanée
 */

import { createServer } from 'http';
import { Server } from 'socket.io';
import { db } from '@/server/db';
import type { UserRole } from '@prisma/client';

export interface SocketUser {
  id: string;
  role: UserRole;
  email: string;
}

export interface AuthenticatedSocket extends Socket {
  user?: SocketUser;
}

// Types des événements Socket.IO
export interface ServerToClientEvents {
  'realtime-notification': (notification: any) => void;
  'delivery-location-update': (update: any) => void;
  'delivery-status-changed': (update: any) => void;
  'delivery-eta-update': (update: any) => void;
  'user-online': (data: { userId: string; role: string }) => void;
  'user-offline': (data: { userId: string; role: string }) => void;
  'user-typing': (data: any) => void;
  'message-received': (message: any) => void;
  'pong': () => void;
}

export interface ClientToServerEvents {
  'track-delivery': (deliveryId: string) => void;
  'stop-tracking-delivery': (deliveryId: string) => void;
  'location-update': (data: any) => void;
  'delivery-status-update': (data: any) => void;
  'eta-update': (data: any) => void;
  'join-conversation': (conversationId: string) => void;
  'leave-conversation': (conversationId: string) => void;
  'typing': (data: { conversationId: string; isTyping: boolean }) => void;
  'mark-notification-read': (notificationId: string) => void;
  'ping': () => void;
}

let io: Server<ClientToServerEvents, ServerToClientEvents> | null = null;
let httpServer: any = null;

// Stockage des connexions actives
const connectedUsers = new Map<string, Set<string>>(); // userId -> Set of socketIds
const userRooms = new Map<string, Set<string>>(); // socketId -> Set of rooms

/**
 * Initialise le serveur Socket.IO
 */
export function initializeSocketServer(server?: any): Server<ClientToServerEvents, ServerToClientEvents> {
  if (io) {
    console.log('🔌 Serveur Socket.IO déjà initialisé');
    return io;
  }

  // Créer le serveur HTTP si non fourni
  if (!server) {
    httpServer = createServer();
    server = httpServer;
  }

  console.log('🚀 Initialisation du serveur Socket.IO...');

  io = new Server(server, {
    cors: {
      origin: [
        "http://localhost:3000",
        "http://localhost:3001",
        "https://ecodeli.vercel.app",
        process.env.NEXTAUTH_URL || "http://localhost:3000"
      ],
      methods: ["GET", "POST"],
      credentials: true
    },
    transports: ['polling', 'websocket'],
    allowEIO3: true,
    path: '/socket.io'
  });

  // === MIDDLEWARE D'AUTHENTIFICATION ===
  io.use(async (socket: any, next) => {
    try {
      const { token, userId, role } = socket.handshake.auth;
      
      console.log('🔐 Tentative d\'authentification Socket.IO:', { userId, role });

      if (!userId || !role) {
        console.error('❌ Authentification Socket.IO échouée: données manquantes');
        return next(new Error('Données d\'authentification manquantes'));
      }

      // Vérifier l'utilisateur en base
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { 
          id: true, 
          email: true, 
          role: true, 
          status: true 
        }
      });

      if (!user || user.status !== 'ACTIVE') {
        console.error('❌ Utilisateur non autorisé ou inactif:', userId);
        return next(new Error('Utilisateur non autorisé'));
      }

      // Attacher les infos utilisateur au socket
      socket.user = {
        id: user.id,
        role: user.role,
        email: user.email
      };

      console.log('✅ Utilisateur authentifié:', user.email, `(${user.role})`);
      next();

    } catch (error) {
      console.error('❌ Erreur authentification Socket.IO:', error);
      next(new Error('Erreur serveur'));
    }
  });

  // === GESTION DES CONNEXIONS ===
  io.on('connection', (socket: AuthenticatedSocket) => {
    if (!socket.user) return;

    const userId = socket.user.id;
    const userRole = socket.user.role;

    console.log(`🔌 Nouvelle connexion Socket.IO: ${socket.user.email} (${userRole})`);

    // Enregistrer la connexion
    if (!connectedUsers.has(userId)) {
      connectedUsers.set(userId, new Set());
    }
    connectedUsers.get(userId)!.add(socket.id);

    // Rejoindre les salles basées sur le rôle
    socket.join(`role:${userRole}`);
    socket.join(`user:${userId}`);

    // Notifier les autres utilisateurs
    socket.broadcast.emit('user-online', { 
      userId, 
      role: userRole 
    });

    // === ÉVÉNEMENTS MÉTIER ===

    // Suivi des livraisons
    socket.on('track-delivery', (deliveryId: string) => {
      console.log(`👀 ${socket.user?.email} suit la livraison ${deliveryId}`);
      socket.join(`delivery:${deliveryId}`);
      
      if (!userRooms.has(socket.id)) {
        userRooms.set(socket.id, new Set());
      }
      userRooms.get(socket.id)!.add(`delivery:${deliveryId}`);
    });

    socket.on('stop-tracking-delivery', (deliveryId: string) => {
      console.log(`🚫 ${socket.user?.email} arrête le suivi de la livraison ${deliveryId}`);
      socket.leave(`delivery:${deliveryId}`);
      userRooms.get(socket.id)?.delete(`delivery:${deliveryId}`);
    });

    // Mises à jour de position (livreurs uniquement)
    socket.on('location-update', (data) => {
      if (socket.user?.role === 'DELIVERER') {
        console.log(`📍 Mise à jour position livreur ${socket.user.email}`);
        socket.to(`delivery:${data.deliveryId}`).emit('delivery-location-update', {
          deliveryId: data.deliveryId,
          location: data.location,
          delivererId: userId,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Mises à jour de statut de livraison
    socket.on('delivery-status-update', (data) => {
      console.log(`📦 Mise à jour statut livraison ${data.deliveryId}: ${data.status}`);
      socket.to(`delivery:${data.deliveryId}`).emit('delivery-status-changed', {
        deliveryId: data.deliveryId,
        status: data.status,
        data: data.data,
        userId,
        timestamp: new Date().toISOString()
      });
    });

    // Mises à jour ETA
    socket.on('eta-update', (data) => {
      console.log(`⏰ Mise à jour ETA livraison ${data.deliveryId}`);
      socket.to(`delivery:${data.deliveryId}`).emit('delivery-eta-update', {
        deliveryId: data.deliveryId,
        eta: data.eta,
        delivererId: userId,
        timestamp: new Date().toISOString()
      });
    });

    // Messagerie
    socket.on('join-conversation', (conversationId: string) => {
      console.log(`💬 ${socket.user?.email} rejoint la conversation ${conversationId}`);
      socket.join(`conversation:${conversationId}`);
      userRooms.get(socket.id)?.add(`conversation:${conversationId}`);
    });

    socket.on('leave-conversation', (conversationId: string) => {
      console.log(`👋 ${socket.user?.email} quitte la conversation ${conversationId}`);
      socket.leave(`conversation:${conversationId}`);
      userRooms.get(socket.id)?.delete(`conversation:${conversationId}`);
    });

    socket.on('typing', (data) => {
      socket.to(`conversation:${data.conversationId}`).emit('user-typing', {
        userId,
        conversationId: data.conversationId,
        isTyping: data.isTyping,
        userName: socket.user?.email,
        timestamp: new Date().toISOString()
      });
    });

    // Notifications
    socket.on('mark-notification-read', async (notificationId: string) => {
      try {
        // Marquer la notification comme lue en base
        await db.notificationHistory.updateMany({
          where: {
            id: notificationId,
            userId: userId
          },
          data: {
            isRead: true,
            readAt: new Date()
          }
        });
        
        console.log(`📱 Notification ${notificationId} marquée comme lue par ${socket.user?.email}`);
      } catch (error) {
        console.error('❌ Erreur mise à jour notification:', error);
      }
    });

    // Ping/Pong pour vérifier la connexion
    socket.on('ping', () => {
      socket.emit('pong');
    });

    // === DÉCONNEXION ===
    socket.on('disconnect', (reason) => {
      console.log(`🔌 Déconnexion Socket.IO: ${socket.user?.email} (${reason})`);

      // Nettoyer les connexions
      const userConnections = connectedUsers.get(userId);
      if (userConnections) {
        userConnections.delete(socket.id);
        if (userConnections.size === 0) {
          connectedUsers.delete(userId);
          
          // Notifier que l'utilisateur est hors ligne
          socket.broadcast.emit('user-offline', { 
            userId, 
            role: userRole 
          });
        }
      }

      // Nettoyer les salles
      userRooms.delete(socket.id);
    });
  });

  console.log('✅ Serveur Socket.IO initialisé avec succès');
  return io;
}

/**
 * Récupère l'instance Socket.IO
 */
export function getSocketServer(): Server<ClientToServerEvents, ServerToClientEvents> | null {
  return io;
}

/**
 * Démarre le serveur Socket.IO sur un port dédié
 */
export function startSocketServer(port: number = 3001) {
  if (!httpServer) {
    httpServer = createServer();
  }

  if (!io) {
    initializeSocketServer(httpServer);
  }

  httpServer.listen(port, () => {
    console.log(`🚀 Serveur Socket.IO démarré sur le port ${port}`);
  });

  return { httpServer, io };
}

// === FONCTIONS UTILITAIRES ===

/**
 * Envoie une notification à un utilisateur spécifique
 */
export async function sendNotificationToUser(userId: string, notification: any) {
  if (!io) return;
  
  io.to(`user:${userId}`).emit('realtime-notification', notification);
  console.log(`📱 Notification envoyée à l'utilisateur ${userId}`);
}

/**
 * Envoie une notification à tous les utilisateurs d'un rôle
 */
export async function sendNotificationToRole(role: UserRole, notification: any) {
  if (!io) return;
  
  io.to(`role:${role}`).emit('realtime-notification', notification);
  console.log(`📱 Notification envoyée au rôle ${role}`);
}

/**
 * Diffuse une mise à jour de livraison
 */
export async function broadcastDeliveryUpdate(deliveryId: string, update: any) {
  if (!io) return;
  
  io.to(`delivery:${deliveryId}`).emit('delivery-status-changed', update);
  console.log(`📦 Mise à jour livraison ${deliveryId} diffusée`);
}

/**
 * Statistiques des connexions
 */
export function getConnectionStats() {
  return {
    totalConnections: io?.engine.clientsCount || 0,
    connectedUsers: connectedUsers.size,
    usersByRole: Array.from(connectedUsers.entries()).reduce((acc, [userId]) => {
      // Compter par rôle si nécessaire
      return acc;
    }, {} as Record<string, number>)
  };
}