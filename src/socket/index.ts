// Exporte l'instance configurée du client Socket.io
import { io } from 'socket.io-client';

// Créer une instance de socket
const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000', {
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
