/**
 * Point d'entrée principal pour Socket.IO dans l'application
 * Gère intelligemment les imports selon l'environnement (client/serveur)
 */

// Détection de l'environnement
export const isClient = typeof window !== 'undefined';
export const isServer = !isClient;

// Export des types communs
export type { DeliveryPosition, DeliveryTrackingEventType } from './delivery-tracking-client';

// Exports conditionnels pour le client/serveur
if (isClient) {
  // En environnement navigateur, exporter uniquement les fonctions client
  // Ces exports seront tree-shakés correctement par Next.js
  module.exports = {
    // Types
    isClient,
    isServer,
    
    // Fonctions spécifiques au client
    getClientSocket: async () => {
      const { getClientSocket } = await import('./adapter');
      return getClientSocket();
    },
    
    initializeClientSocket: async (token: string) => {
      const { initializeClientSocket } = await import('./adapter');
      return initializeClientSocket(token);
    },
    
    closeClientSocket: async () => {
      const { closeClientSocket } = await import('./adapter');
      return closeClientSocket();
    },
  };
} else {
  // En environnement serveur, exporter uniquement les fonctions serveur
  module.exports = {
    // Types
    isClient,
    isServer,
    
    // Fonctions spécifiques au serveur
    getSocketServer: async () => {
      const { getSocketServer } = await import('./adapter');
      return getSocketServer();
    },
    
    initializeSocketServer: async (httpServer: any) => {
      const { initializeSocketServer } = await import('./server');
      return initializeSocketServer(httpServer);
    },
  };
}
