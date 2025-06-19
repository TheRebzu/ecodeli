/**
 * 🔧 EcoDeli - API Socket.IO pour Next.js App Router
 * ==================================================
 * 
 * Configuration Socket.IO complète selon le workflow EcoDeli Mission 1 :
 * - Serveur Socket.IO intégré à Next.js App Router
 * - Authentification NextAuth
 * - Gestion des événements temps réel
 * - Support des livraisons et notifications
 */

import { NextRequest, NextResponse } from 'next/server';
import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/server/auth/next-auth';

// Configuration globale Socket.IO
let io: SocketIOServer | undefined;
let httpServer: HTTPServer | undefined;

// Configuration CORS pour Socket.IO
const corsOptions = {
  origin: [
    process.env.NEXTAUTH_URL ?? "http://localhost:3000",
    "http://localhost:3000",
    "https://ecodeli.me"
  ],
  methods: ["GET", "POST"],
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"]
};

/**
 * Initialise le serveur Socket.IO
 */
function initializeSocketServer(): SocketIOServer {
  if (io) {
    return io;
  }

  console.log('🔌 Initialisation serveur Socket.IO...');

  // Créer un serveur HTTP simple pour Socket.IO
  const { createServer } = require('http');
  httpServer = createServer();

  // Configurer Socket.IO
  io = new SocketIOServer(httpServer, {
    cors: corsOptions,
    path: '/socket.io',
    transports: ['polling', 'websocket'],
    pingTimeout: 60000,
    pingInterval: 25000,
    maxHttpBufferSize: 1e6,
    allowEIO3: true
  });

  // Middleware d'authentification Socket.IO
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token ?? socket.handshake.headers.authorization;
      
      if (!token) {
        console.log('❌ Socket.IO: Token manquant');
        return next(new Error('Authentication required'));
      }

      // Ici, on pourrait valider le token JWT
      // Pour l'instant, on accepte tous les tokens non vides
      socket.data.authenticated = true;
      socket.data.userId = socket.handshake.auth.userId;
      socket.data.role = socket.handshake.auth.role;
      
      console.log(`✅ Socket.IO: Utilisateur authentifié - ${socket.data.userId} (${socket.data.role})`);
      next();
      
    } catch (error) {
      console.error('❌ Erreur authentification Socket.IO:', error);
      next(new Error('Authentication failed'));
    }
  });

  // Gestion des connexions
  io.on('connection', (socket) => {
    const { userId, role } = socket.data;
    console.log(`🔗 Connexion Socket.IO: ${userId} (${role})`);

    // Rejoindre des salles basées sur le rôle
    socket.join(`user-${userId}`);
    socket.join(`role-${role}`);

    // === ÉVÉNEMENTS LIVREUR ===
    if (role === 'DELIVERER') {
      // Mise à jour de position GPS
      socket.on('location-update', (data) => {
        console.log(`📍 Position livreur ${userId}:`, data);
        
        // Diffuser la position aux clients concernés
        socket.to(`delivery-${data.deliveryId}`).emit('delivery-location-update', {
          deliveryId: data.deliveryId,
          delivererId: userId,
          location: data.location,
          timestamp: new Date().toISOString()
        });
      });

      // Mise à jour du statut de livraison
      socket.on('delivery-status-update', (data) => {
        console.log(`📦 Statut livraison ${data.deliveryId}:`, data.status);
        
        // Notifier le client
        socket.to(`delivery-${data.deliveryId}`).emit('delivery-status-changed', {
          deliveryId: data.deliveryId,
          status: data.status,
          timestamp: new Date().toISOString(),
          data: data.data
        });
      });

      // ETA update
      socket.on('eta-update', (data) => {
        console.log(`⏰ ETA update ${data.deliveryId}:`, data.eta);
        
        socket.to(`delivery-${data.deliveryId}`).emit('delivery-eta-update', {
          deliveryId: data.deliveryId,
          eta: data.eta,
          timestamp: new Date().toISOString()
        });
      });
    }

    // === ÉVÉNEMENTS CLIENT ===
    if (role === 'CLIENT') {
      // Rejoindre la salle d'une livraison
      socket.on('track-delivery', (deliveryId) => {
        console.log(`👀 Client ${userId} suit la livraison ${deliveryId}`);
        socket.join(`delivery-${deliveryId}`);
      });

      // Quitter le suivi d'une livraison
      socket.on('stop-tracking-delivery', (deliveryId) => {
        console.log(`🚫 Client ${userId} arrête de suivre ${deliveryId}`);
        socket.leave(`delivery-${deliveryId}`);
      });
    }

    // === ÉVÉNEMENTS COMMUNS ===
    
    // Notifications en temps réel
    socket.on('mark-notification-read', (notificationId) => {
      console.log(`✅ Notification ${notificationId} lue par ${userId}`);
      // Ici, on pourrait marquer la notification comme lue en base
    });

    // Messagerie temps réel
    socket.on('join-conversation', (conversationId) => {
      console.log(`💬 ${userId} rejoint la conversation ${conversationId}`);
      socket.join(`conversation-${conversationId}`);
    });

    socket.on('leave-conversation', (conversationId) => {
      console.log(`👋 ${userId} quitte la conversation ${conversationId}`);
      socket.leave(`conversation-${conversationId}`);
    });

    socket.on('typing', (data) => {
      socket.to(`conversation-${data.conversationId}`).emit('user-typing', {
        userId,
        conversationId: data.conversationId,
        isTyping: data.isTyping
      });
    });

    // Ping/Pong pour maintenir la connexion
    socket.on('ping', () => {
      socket.emit('pong');
    });

    // Gestion de la déconnexion
    socket.on('disconnect', (reason) => {
      console.log(`🔌 Déconnexion Socket.IO: ${userId} - Raison: ${reason}`);
      
      // Notifier les autres utilisateurs de la déconnexion
      socket.broadcast.emit('user-offline', { userId, role });
    });

    // Notifier les autres utilisateurs de la connexion
    socket.broadcast.emit('user-online', { userId, role });
  });

  // Démarrer le serveur HTTP pour Socket.IO sur un port différent
  const SOCKET_PORT = process.env.SOCKET_PORT ?? 3001;
  httpServer.listen(SOCKET_PORT, () => {
    console.log(`🚀 Serveur Socket.IO démarré sur le port ${SOCKET_PORT}`);
  });

  return io;
}

/**
 * Getter pour l'instance Socket.IO
 */
export function getSocketIO(): SocketIOServer | undefined {
  return io;
}

/**
 * GET - Status du serveur Socket.IO
 */
export async function GET(req: NextRequest) {
  try {
    // Initialiser le serveur si nécessaire
    if (!io) {
      initializeSocketServer();
    }

    const connectedClients = io ? io.engine.clientsCount : 0;
    
    return NextResponse.json({
      status: 'Socket.IO Server Running',
      version: '4.0',
      clients: connectedClients,
      transport: ['polling', 'websocket'],
      cors: corsOptions.origin,
      timestamp: new Date().toISOString(),
      endpoints: {
        connection: '/socket.io/',
        status: '/api/socket'
      }
    }, { 
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': corsOptions.origin[0],
        'Access-Control-Allow-Credentials': 'true'
      }
    });

  } catch (error) {
    console.error('❌ Erreur serveur Socket.IO:', error);
    
    return NextResponse.json({
      status: 'Socket.IO Server Error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

/**
 * POST - Envoyer des événements via Socket.IO
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' }, 
        { status: 401 }
      );
    }

    const body = await req.json();
    const { event, data, room } = body;

    if (!io) {
      initializeSocketServer();
    }

    // Émettre l'événement
    if (room) {
      io!.to(room).emit(event, {
        ...data,
        senderId: session.user.id,
        timestamp: new Date().toISOString()
      });
    } else {
      io!.emit(event, {
        ...data,
        senderId: session.user.id,
        timestamp: new Date().toISOString()
      });
    }

    console.log(`📡 Événement ${event} envoyé${room ? ` à la salle ${room}` : ' globalement'}`);

    return NextResponse.json({
      status: 'Event sent',
      event,
      room: room || 'broadcast',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Erreur envoi événement Socket.IO:', error);
    
    return NextResponse.json({
      error: 'Failed to send event',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * DELETE - Arrêter le serveur Socket.IO
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' }, 
        { status: 403 }
      );
    }

    if (io) {
      console.log('🔌 Arrêt du serveur Socket.IO...');
      io.close();
      io = undefined;
    }

    if (httpServer) {
      httpServer.close();
      httpServer = undefined;
    }

    return NextResponse.json({
      status: 'Socket.IO Server stopped',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Erreur arrêt serveur Socket.IO:', error);
    
    return NextResponse.json({
      error: 'Failed to stop server',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 