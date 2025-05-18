'use client';

// N'importer que le client, pas la partie serveur
import { io, Socket } from 'socket.io-client';

// Variable globale pour stocker l'instance du socket
let socket: Socket | null = null;

/**
 * Version navigateur du client socket.io spécifiquement pour le navigateur
 * Compatible avec Next.js et ne dépend pas des modules Node.js
 * @param token - Token d'authentification utilisateur
 * @returns Instance du socket
 */
export const initializeSocket = (token: string): Socket => {
  // Si on a déjà un socket connecté, le retourner
  if (socket?.connected) return socket;
  
  // Si on a un socket non connecté, le nettoyer d'abord
  if (socket) {
    socket.disconnect();
    socket = null;
  }

  // Configuration spécifique au navigateur (pas de dépendances Node.js)
  const socketOptions = {
    auth: { token },
    autoConnect: true,
    transports: ['websocket', 'polling'],
    forceNew: true,
    path: '/api/socket',
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    timeout: 20000,
  };

  // Déterminer l'URL du serveur (par défaut, même origine)
  const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || (typeof window !== 'undefined' ? window.location.origin : '');

  try {
    // Créer une nouvelle instance socket
    socket = io(socketUrl, socketOptions);

    // Configurer les gestionnaires d'événements
    socket.on('connect', () => {
      console.log('Socket connecté');
    });

    socket.on('connect_error', (error) => {
      console.error('Erreur de connexion socket:', error.message);
    });

    socket.on('disconnect', (reason) => {
      console.log(`Socket déconnecté: ${reason}`);
    });

    socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`Tentative de reconnexion #${attemptNumber}`);
    });

    socket.on('reconnect_failed', () => {
      console.error('Échec de reconnexion après plusieurs tentatives');
    });

    socket.on('error', (error) => {
      console.error('Erreur socket:', error);
    });

    return socket;
  } catch (error) {
    console.error('Erreur lors de la création du socket:', error);
    throw new Error('Impossible de créer la connexion socket');
  }
};

/**
 * Récupère l'instance socket actuelle
 * @returns Instance socket actuelle ou null si non initialisée
 */
export const getSocket = (): Socket | null => socket;

/**
 * Ferme la connexion socket et nettoie les ressources
 */
export const closeSocket = (): void => {
  if (socket) {
    try {
      socket.disconnect();
      socket.removeAllListeners();
      socket = null;
    } catch (error) {
      console.error('Erreur lors de la fermeture du socket:', error);
    }
  }
}; 