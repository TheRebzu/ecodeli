import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server } from 'socket.io';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 3000;

// Préparer l'application Next.js
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  // Créer le serveur HTTP
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Créer le serveur Socket.IO
  const io = new Server(httpServer, {
    path: '/socket.io/',
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || `http://localhost:${port}`,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Middleware d'authentification simple
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error'));
    }
    // Validation du token ici (simplifiée pour le moment)
    socket.userId = socket.handshake.auth.userId;
    socket.userRole = socket.handshake.auth.role;
    next();
  });

  // Gestion des connexions
  io.on('connection', (socket) => {
    console.log(`✅ User connected: ${socket.userId} (${socket.userRole})`);

    // Rejoindre les salles appropriées
    socket.join(`user:${socket.userId}`);
    if (socket.userRole) {
      socket.join(`role:${socket.userRole.toLowerCase()}`);
    }

    // Événements personnalisés
    socket.on('join-user-room', (userId) => {
      socket.join(`user:${userId}`);
    });

    socket.on('join-role-room', (role) => {
      socket.join(`role:${role}`);
    });

    socket.on('test-event', (data) => {
      console.log('📤 Test event received:', data);
      socket.emit('test-response', { 
        message: 'Test reçu avec succès!', 
        timestamp: new Date().toISOString(),
        originalData: data 
      });
    });

    socket.on('disconnect', (reason) => {
      console.log(`❌ User disconnected: ${socket.userId} - ${reason}`);
    });
  });

  // Démarrer le serveur
  httpServer
    .once('error', (err) => {
      console.error('❌ Server error:', err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`✅ Server ready on http://${hostname}:${port}`);
      console.log(`🔌 Socket.IO ready on ws://${hostname}:${port}/socket.io/`);
    });
}); 