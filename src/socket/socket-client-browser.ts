'use client';

import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

/**
 * Version navigateur du client socket.io qui ne dépend pas des modules Node.js
 * Initialise la connexion socket avec le serveur
 * @param token - Token d'authentification utilisateur
 * @returns Instance du socket
 */
export const initializeSocket = (token: string): Socket => {
  if (socket) return socket;

  // Configuration spécifique au navigateur (pas de dépendances Node.js)
  const socketOptions = {
    auth: { token },
    autoConnect: true,
    transports: ['websocket', 'polling'],
    forceNew: true,
    path: '/api/socket',
  };

  socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || '', socketOptions);

  socket.on('connect', () => {
    console.log('Socket connecté');
  });

  socket.on('connect_error', (error) => {
    console.error('Erreur de connexion socket:', error);
  });

  socket.on('disconnect', () => {
    console.log('Socket déconnecté');
  });

  return socket;
};

/**
 * Récupère l'instance socket actuelle
 * @returns Instance socket actuelle ou null si non initialisée
 */
export const getSocket = (): Socket | null => socket;

/**
 * Ferme la connexion socket
 */
export const closeSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}; 