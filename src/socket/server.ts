import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import { verifyToken } from '../server/auth/session';

// Optimisations pour Socket.IO
const ioConfig = {
  pingTimeout: 60000, // 60 secondes
  pingInterval: 25000, // 25 secondes
  transports: ['websocket', 'polling'], // Préférer WebSocket, fallback sur polling
  path: '/api/socket', // Chemin personnalisé
  maxHttpBufferSize: 1e6, // 1MB
};

export async function initializeSocketServer(httpServer) {
  // Création des clients Redis pour PubSub
  const pubClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  });

  const subClient = pubClient.duplicate();

  await Promise.all([pubClient.connect(), subClient.connect()]);

  // Création du serveur Socket.IO
  const io = new Server(httpServer, ioConfig);

  // Configurer l'adaptateur Redis pour le scaling horizontal
  io.adapter(createAdapter(pubClient, subClient));

  // Middleware d'authentification
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('Authentication error'));

      const session = await verifyToken(token);
      if (!session) return next(new Error('Invalid token'));

      // Stocker les informations utilisateur dans le socket
      socket.user = {
        id: session.user.id,
        role: session.user.role,
      };

      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  // Événements de connexion
  io.on('connection', socket => {
    console.log(`User connected: ${socket.user.id}, role: ${socket.user.role}`);

    // Rejoindre les chambres appropriées selon le rôle
    setupUserRooms(socket);

    // Configuration des événements de livraison
    require('./delivery-tracking')(io, socket);

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.user.id}`);
    });
  });

  return io;
}

// Configurer les chambres selon le rôle de l'utilisateur
function setupUserRooms(socket) {
  const { id, role } = socket.user;

  // Chambre personnelle
  socket.join(`user:${id}`);

  // Chambres basées sur le rôle
  if (role === 'DELIVERER') {
    socket.join('deliverers');
  } else if (role === 'CLIENT') {
    socket.join('clients');
  } else if (role === 'MERCHANT') {
    socket.join('merchants');
  } else if (role === 'ADMIN') {
    socket.join('admins');
  }
}
