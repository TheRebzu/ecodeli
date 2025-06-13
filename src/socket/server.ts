import { Server } from "socket.io";
import { verifyToken } from "@/server/auth/session";

// Optimisations pour Socket.IO
const ioConfig = {
  pingTimeout: 60000, // 60 secondes
  pingInterval: 25000, // 25 secondes
  transports: ["websocket", "polling"], // Préférer WebSocket, fallback sur polling
  path: "/api/socket", // Chemin personnalisé
  maxHttpBufferSize: 1e6, // 1MB
};

// Variable globale pour stocker l'instance du serveur Socket.IO
let globalSocketServer: Server | null = null;

export async function initializeSocketServer(httpServer: any) {
  // Création du serveur Socket.IO sans Redis
  const io = new Server(httpServer, ioConfig);

  // Stocker l'instance dans la variable globale
  globalSocketServer = io;

  // Middleware d'authentification
  io.use(async (socket: any, next: any) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error("Authentication error"));

      const session = await verifyToken(token);
      if (!session) return next(new Error("Invalid token"));

      // Stocker les informations utilisateur dans le socket
      socket.user = {
        id: session.user.id,
        role: session.user.role,
      };

      next();
    } catch (_error) {
      next(new Error("Authentication error"));
    }
  });

  // Événements de connexion
  io.on("connection", (socket: any) => {
    console.log(`User connected: ${socket.user.id}, role: ${socket.user.role}`);

    // Rejoindre les chambres appropriées selon le rôle
    setupUserRooms(socket);

    // Configuration des événements de livraison
    const deliveryTracking = require("./delivery-tracking");
    if (deliveryTracking) {
      deliveryTracking(io, socket);
    }

    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.user.id}`);
    });
  });

  return io;
}

/**
 * Obtient l'instance actuelle du serveur Socket.IO
 * @returns L'instance actuelle ou null si non initialisée
 */
export function getSocketServer(): Server | null {
  return globalSocketServer;
}

// Configurer les chambres selon le rôle de l'utilisateur
function setupUserRooms(socket: any) {
  const { id: _id, role: _role } = socket.user;

  // Chambre personnelle
  socket.join(`user:${id}`);

  // Chambres basées sur le rôle
  if (role === "DELIVERER") {
    socket.join("deliverers");
  } else if (role === "CLIENT") {
    socket.join("clients");
  } else if (role === "MERCHANT") {
    socket.join("merchants");
  } else if (role === "ADMIN") {
    socket.join("admins");
  }
}
