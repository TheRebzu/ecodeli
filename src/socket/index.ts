// Configuration du serveur Socket.io et client Socket.io
import { io as socketIOClient } from 'socket.io-client';
import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { parse } from 'cookie';
import { getToken } from 'next-auth/jwt';
import { createTRPCContext } from '@/server/api/trpc';
import { db } from '@/server/db';
import { DeliveryStatus, UserRole } from '@prisma/client';
import { z } from 'zod';
import throttle from 'lodash/throttle';
import { EventEmitter } from 'events';

// Créer une instance de socket client
const socket = socketIOClient(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000', {
  autoConnect: false,
});

// Fonction pour se connecter et s'authentifier
export const connectSocket = (token: string) => {
  // Configurer l'authentification
  socket.auth = { token };

  // Se connecter si pas déjà connecté
  if (!socket.connected) {
    socket.connect();
  }

  return socket;
};

// Fonction pour déconnecter la socket
export const disconnectSocket = () => {
  if (socket.connected) {
    socket.disconnect();
  }
};

// Exporter l'instance socket par défaut
export { socket };

// Type d'événements pour le suivi de livraison
export type DeliveryTrackingEvent = 
  | { type: 'POSITION_UPDATE'; deliveryId: string; position: DeliveryPosition }
  | { type: 'STATUS_UPDATE'; deliveryId: string; status: DeliveryStatus; previousStatus: DeliveryStatus; notes?: string }
  | { type: 'ETA_UPDATE'; deliveryId: string; eta: Date; distance: number }
  | { type: 'CHECKPOINT_REACHED'; deliveryId: string; checkpointId: string; checkpointType: string; location: GeoPoint }
  | { type: 'ISSUE_REPORTED'; deliveryId: string; issueId: string; issueType: string; severity: string; description: string };

// Type pour une position de livraison
export type DeliveryPosition = {
  latitude: number;
  longitude: number;
  accuracy?: number;
  heading?: number;
  speed?: number;
  timestamp: Date;
};

// Type pour un point géographique
export type GeoPoint = {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
};

// EventEmitter pour les mises à jour de livraison
export const deliveryTrackingEvents = new EventEmitter();
// Augmenter le nombre maximum d'écouteurs pour éviter les avertissements
deliveryTrackingEvents.setMaxListeners(100);

// Utilisateurs connectés par ID de livraison
const connectedUsers = new Map<string, Set<string>>();
// Sockets par ID d'utilisateur
const userSockets = new Map<string, Set<Socket>>();
// Livraisons suivies par socket
const socketDeliveries = new Map<string, Set<string>>();

// Schéma de validation pour les positions
const positionSchema = z.object({
  deliveryId: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  accuracy: z.number().optional(),
  heading: z.number().optional(),
  speed: z.number().optional(),
});

/**
 * Initialise le serveur Socket.IO et configure les événements
 */
export function initSocketServer(httpServer: HttpServer) {
  const io = new SocketIOServer(httpServer, {
    path: '/api/socket',
    // Configuration CORS
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Middleware d'authentification
  io.use(async (socket, next) => {
    try {
      const cookieHeader = socket.handshake.headers.cookie;
      if (!cookieHeader) {
        return next(new Error('Non autorisé - Aucun cookie fourni'));
      }

      const cookies = parse(cookieHeader);
      const sessionToken =
        cookies['next-auth.session-token'] || cookies['__Secure-next-auth.session-token'];

      if (!sessionToken) {
        return next(new Error('Non autorisé - Aucun token de session'));
      }

      // Vérifier le token JWT
      const token = await getToken({
        req: { headers: { cookie: cookieHeader } } as any,
        secret: process.env.NEXTAUTH_SECRET,
      });

      if (!token || !token.sub) {
        return next(new Error('Non autorisé - Token invalide'));
      }

      // Attacher les données d'utilisateur à la socket
      socket.data.userId = token.sub;
      socket.data.role = token.role as UserRole;

      // Récupérer plus d'informations sur l'utilisateur si nécessaire
      const user = await db.user.findUnique({
        where: { id: token.sub },
        select: { id: true, role: true, name: true, isVerified: true },
      });

      if (!user) {
        return next(new Error('Utilisateur non trouvé'));
      }

      // Stocker les informations d'utilisateur dans la socket
      socket.data.user = user;

      next();
    } catch (error) {
      console.error("Erreur d'authentification Socket.IO:", error);
      next(new Error("Erreur d'authentification"));
    }
  });

  // Gestion de la connexion
  io.on('connection', async socket => {
    console.log(`Utilisateur connecté: ${socket.data.userId}`);

    const userId = socket.data.userId;

    // Ajouter la socket à la liste des sockets de l'utilisateur
    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
    }
    userSockets.get(userId)?.add(socket);

    // Configurer les événements de la socket
    setupDeliveryTrackingEvents(socket);

    // Nettoyage à la déconnexion
    socket.on('disconnect', () => {
      console.log(`Utilisateur déconnecté: ${userId}`);
      handleSocketDisconnect(socket);
    });
  });

  // Configurer les écouteurs d'événements globaux
  setupGlobalEventListeners();

  return io;
}

/**
 * Configure les écouteurs d'événements pour une socket
 */
function setupDeliveryTrackingEvents(socket: Socket) {
  const userId = socket.data.userId;
  const userRole = socket.data.role;

  // Suivre une livraison
  socket.on('track_delivery', async (deliveryId: string, callback) => {
    try {
      // Vérifier l'autorisation de suivi
      const canTrack = await canTrackDelivery(userId, userRole, deliveryId);

      if (!canTrack) {
        if (callback) callback({ success: false, error: 'Non autorisé à suivre cette livraison' });
        return;
      }

      // Ajouter l'utilisateur à la liste des utilisateurs suivant cette livraison
      if (!connectedUsers.has(deliveryId)) {
        connectedUsers.set(deliveryId, new Set());
      }
      connectedUsers.get(deliveryId)?.add(userId);

      // Ajouter la livraison à la liste des livraisons suivies par cette socket
      if (!socketDeliveries.has(socket.id)) {
        socketDeliveries.set(socket.id, new Set());
      }
      socketDeliveries.get(socket.id)?.add(deliveryId);

      // Informer la socket du succès
      socket.join(`delivery:${deliveryId}`);
      if (callback) callback({ success: true });

      // Envoyer l'état initial
      sendInitialDeliveryState(socket, deliveryId);
    } catch (error) {
      console.error(`Erreur lors du suivi de la livraison ${deliveryId}:`, error);
      if (callback) callback({ success: false, error: 'Erreur serveur' });
    }
  });

  // Arrêter de suivre une livraison
  socket.on('untrack_delivery', (deliveryId: string, callback) => {
    try {
      // Supprimer l'utilisateur de la liste des utilisateurs suivant cette livraison
      connectedUsers.get(deliveryId)?.delete(userId);
      if (connectedUsers.get(deliveryId)?.size === 0) {
        connectedUsers.delete(deliveryId);
      }

      // Supprimer la livraison de la liste des livraisons suivies par cette socket
      socketDeliveries.get(socket.id)?.delete(deliveryId);
      if (socketDeliveries.get(socket.id)?.size === 0) {
        socketDeliveries.delete(socket.id);
      }

      // Quitter la room
      socket.leave(`delivery:${deliveryId}`);
      if (callback) callback({ success: true });
    } catch (error) {
      console.error(`Erreur lors de l'arrêt du suivi de la livraison ${deliveryId}:`, error);
      if (callback) callback({ success: false, error: 'Erreur serveur' });
    }
  });

  // Mettre à jour la position (uniquement pour les livreurs)
  socket.on(
    'update_position',
    throttle(async (data, callback) => {
      try {
        // Vérifier le rôle
        if (userRole !== UserRole.DELIVERER) {
          if (callback)
            callback({
              success: false,
              error: 'Seuls les livreurs peuvent mettre à jour les positions',
            });
          return;
        }

        // Valider les données
        const validationResult = positionSchema.safeParse(data);
        if (!validationResult.success) {
          if (callback) callback({ success: false, error: 'Données de position invalides' });
          return;
        }

        const positionData = validationResult.data;

        // Vérifier l'autorisation
        const delivery = await db.delivery.findUnique({
          where: { id: positionData.deliveryId },
          select: { id: true, delivererId: true, status: true },
        });

        if (!delivery) {
          if (callback) callback({ success: false, error: 'Livraison non trouvée' });
          return;
        }

        if (delivery.delivererId !== userId) {
          if (callback)
            callback({
              success: false,
              error: "Vous n'êtes pas le livreur assigné à cette livraison",
            });
          return;
        }

        // Mettre à jour la position dans la base de données
        const updatedPosition = await db.deliveryTrackingPosition.create({
          data: {
            deliveryId: positionData.deliveryId,
            latitude: positionData.latitude,
            longitude: positionData.longitude,
            accuracy: positionData.accuracy,
            heading: positionData.heading,
            speed: positionData.speed,
            timestamp: new Date(),
          },
        });

        // Mettre à jour les dernières coordonnées connues dans la livraison
        await db.delivery.update({
          where: { id: positionData.deliveryId },
          data: {
            currentLat: positionData.latitude,
            currentLng: positionData.longitude,
            lastLocationUpdate: new Date(),
          },
        });

        // Émettre l'événement global
        const positionEvent: DeliveryTrackingEvent = {
          type: 'POSITION_UPDATE',
          deliveryId: positionData.deliveryId,
          position: {
            latitude: positionData.latitude,
            longitude: positionData.longitude,
            accuracy: positionData.accuracy,
            heading: positionData.heading,
            speed: positionData.speed,
            timestamp: new Date(),
          },
        };

        deliveryTrackingEvents.emit('deliveryUpdate', positionEvent);

        if (callback) callback({ success: true, data: updatedPosition });
      } catch (error) {
        console.error('Erreur lors de la mise à jour de la position:', error);
        if (callback) callback({ success: false, error: 'Erreur serveur' });
      }
    }, 1000)
  ); // Throttle à 1 seconde pour éviter trop de mises à jour
}

/**
 * Configure les écouteurs d'événements globaux
 */
function setupGlobalEventListeners() {
  // Écouter les mises à jour de livraison et les diffuser aux clients concernés
  deliveryTrackingEvents.on('deliveryUpdate', (event: DeliveryTrackingEvent) => {
    // Broadcaster l'événement à tous les clients qui suivent cette livraison
    const deliveryRoom = `delivery:${event.deliveryId}`;

    const eventName = getEventNameFromType(event.type);

    // Supprimer certaines données sensibles selon l'événement
    const safeEvent = sanitizeEvent(event);

    // Émettre l'événement dans la room de la livraison
    io?.to(deliveryRoom).emit(eventName, safeEvent);
  });
}

/**
 * Obtient le nom d'événement à partir du type d'événement
 */
function getEventNameFromType(type: DeliveryTrackingEvent['type']): string {
  switch (type) {
    case 'POSITION_UPDATE':
      return 'position_update';
    case 'STATUS_UPDATE':
      return 'status_update';
    case 'ETA_UPDATE':
      return 'eta_update';
    case 'CHECKPOINT_REACHED':
      return 'checkpoint_reached';
    case 'ISSUE_REPORTED':
      return 'issue_reported';
    default:
      return 'delivery_update';
  }
}

/**
 * Sanitize l'événement pour s'assurer qu'aucune donnée sensible n'est envoyée
 */
function sanitizeEvent(event: DeliveryTrackingEvent): any {
  // Clone pour éviter de modifier l'original
  const sanitizedEvent = { ...event };

  // Ajouter d'autres logiques de nettoyage si nécessaire

  return sanitizedEvent;
}

/**
 * Gère la déconnexion d'une socket
 */
function handleSocketDisconnect(socket: Socket) {
  const userId = socket.data.userId;

  // Supprimer la socket de la liste des sockets de l'utilisateur
  userSockets.get(userId)?.delete(socket);
  if (userSockets.get(userId)?.size === 0) {
    userSockets.delete(userId);
  }

  // Supprimer l'utilisateur des livraisons qu'il suivait
  const deliveries = socketDeliveries.get(socket.id);
  if (deliveries) {
    for (const deliveryId of deliveries) {
      connectedUsers.get(deliveryId)?.delete(userId);
      if (connectedUsers.get(deliveryId)?.size === 0) {
        connectedUsers.delete(deliveryId);
      }
    }

    socketDeliveries.delete(socket.id);
  }
}

/**
 * Vérifie si un utilisateur peut suivre une livraison
 */
async function canTrackDelivery(
  userId: string,
  userRole: UserRole,
  deliveryId: string
): Promise<boolean> {
  try {
    // Les administrateurs peuvent tout suivre
    if (userRole === UserRole.ADMIN) {
      return true;
    }

    // Récupérer la livraison
    const delivery = await db.delivery.findUnique({
      where: { id: deliveryId },
      select: {
        id: true,
        clientId: true,
        delivererId: true,
        merchantId: true,
      },
    });

    if (!delivery) {
      return false;
    }

    // Vérifier si l'utilisateur est impliqué dans la livraison
    return (
      delivery.clientId === userId ||
      delivery.delivererId === userId ||
      delivery.merchantId === userId
    );
  } catch (error) {
    console.error('Erreur lors de la vérification des autorisations:', error);
    return false;
  }
}

/**
 * Envoie l'état initial d'une livraison à une socket
 */
async function sendInitialDeliveryState(socket: Socket, deliveryId: string) {
  try {
    // Récupérer les informations de la livraison
    const delivery = await db.delivery.findUnique({
      where: { id: deliveryId },
      include: {
        deliverer: {
          select: {
            id: true,
            user: {
              select: {
                name: true,
                image: true,
              },
            },
          },
        },
        client: {
          select: {
            id: true,
            user: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!delivery) {
      return;
    }

    // Récupérer la dernière position connue
    const lastPosition = await db.deliveryTrackingPosition.findFirst({
      where: { deliveryId },
      orderBy: { timestamp: 'desc' },
    });

    // Récupérer le dernier ETA
    const lastEta = await db.deliveryETA.findFirst({
      where: { deliveryId },
      orderBy: { timestamp: 'desc' },
    });

    // Récupérer les derniers points de passage
    const checkpoints = await db.deliveryCheckpoint.findMany({
      where: { deliveryId },
      orderBy: { timestamp: 'desc' },
      take: 5,
    });

    // Récupérer l'historique de statut
    const statusHistory = await db.deliveryStatusHistory.findMany({
      where: { deliveryId },
      orderBy: { timestamp: 'desc' },
      take: 5,
    });

    // Envoyer l'état initial
    socket.emit('delivery_initial_state', {
      deliveryId,
      delivery: {
        id: delivery.id,
        status: delivery.status,
        pickupAddress: delivery.pickupAddress,
        deliveryAddress: delivery.deliveryAddress,
        estimatedArrival: delivery.estimatedArrival,
        currentLat: delivery.currentLat,
        currentLng: delivery.currentLng,
        lastLocationUpdate: delivery.lastLocationUpdate,
        deliverer: delivery.deliverer
          ? {
              id: delivery.deliverer.id,
              name: delivery.deliverer.user?.name,
              image: delivery.deliverer.user?.image,
            }
          : null,
      },
      lastPosition: lastPosition,
      lastEta: lastEta,
      checkpoints: checkpoints,
      statusHistory: statusHistory,
    });
  } catch (error) {
    console.error(`Erreur lors de l'envoi de l'état initial de la livraison ${deliveryId}:`, error);
  }
}

// Variable globale pour l'instance Socket.IO
let io: SocketIOServer | null = null;

/**
 * Obtient l'instance Socket.IO
 */
export function getSocketServer(): SocketIOServer | null {
  return io;
}

/**
 * Émet un événement de suivi de livraison
 */
export function emitDeliveryTrackingEvent(event: DeliveryTrackingEvent): void {
  deliveryTrackingEvents.emit('deliveryUpdate', event);
}
