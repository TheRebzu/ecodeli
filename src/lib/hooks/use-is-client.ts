'use client';

import { useEffect, useState } from 'react';

/**
 * Hook qui permet de savoir si le code s'exécute côté client
 * Utile pour éviter les erreurs d'hydratation
 */
export function useIsClient() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return isClient;
} 