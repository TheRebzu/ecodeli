'use client';

import { createTRPCReact } from '@trpc/react-query';
import { type AppRouter } from '@/server/api/root';
import { QueryClient } from '@tanstack/react-query';

/**
 * Client tRPC pour une utilisation dans les composants React
 */
export const api = createTRPCReact<AppRouter>();
export const trpc = api; // Pour la compatibilité avec le code existant

/**
 * Crée et configure un client de requêtes
 */
export function getQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        staleTime: 5 * 60 * 1000, // 5 minutes
      },
    },
  });
}
