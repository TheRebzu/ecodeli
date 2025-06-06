'use client';

import { useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';
import { useSession } from 'next-auth/react';

/**
 * Hook pour accéder à la connexion socket dans les composants
 * Utilise la version navigateur compatible du client socket.io
 * avec vérification explicite de l'environnement client
 */
export function useSocket() {
  const { data: session } = useSession();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Vérification explicite que nous sommes côté client
    if (typeof window !== 'undefined' && session?.user) {
      const token = session.user.id;
      setIsConnecting(true);

      // Import dynamique pour éviter les erreurs de bundling côté serveur
      import('@/socket/socket-client-browser')
        .then(({ initializeSocket }) => {
          try {
            const socketInstance = initializeSocket(token);
            setSocket(socketInstance);
            setError(null);
          } catch (err) {
            console.error("Erreur d'initialisation du socket:", err);
            setError(err instanceof Error ? err : new Error("Erreur d'initialisation du socket"));
          } finally {
            setIsConnecting(false);
          }
        })
        .catch(err => {
          console.error("Erreur lors de l'import du client socket:", err);
          setError(err instanceof Error ? err : new Error("Erreur d'import du client socket"));
          setIsConnecting(false);
        });

      // Fonction de nettoyage
      return () => {
        // Import dynamique pour la fermeture aussi
        import('@/socket/socket-client-browser')
          .then(({ closeSocket }) => {
            closeSocket();
            setSocket(null);
          })
          .catch(err => console.error('Erreur lors de la fermeture du socket:', err));
      };
    }
  }, [session]);

  return { socket, isConnecting, error };
}
