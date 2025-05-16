'use client';

import { useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';
import { useSession } from 'next-auth/react';
import { initializeSocket, closeSocket, getSocket } from '@/socket/socket-client-browser';

/**
 * Hook pour accéder à la connexion socket dans les composants
 * Utilise la version navigateur compatible du client socket.io
 */
export function useSocket() {
  const { data: session } = useSession();
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (session?.user) {
      const token = session.user.id;
      const socketInstance = initializeSocket(token);
      setSocket(socketInstance);

      return () => {
        closeSocket();
      };
    }
  }, [session]);

  return socket;
}
