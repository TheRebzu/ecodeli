'use client';

import { httpBatchLink, createTRPCReact } from '@trpc/react-query';
import { type AppRouter } from '@/server/api/root';
import superjson from 'superjson';

/**
 * Client tRPC configuré pour React avec @trpc/react-query
 */
export const api = createTRPCReact<AppRouter>();

/**
 * Configuration du client tRPC
 */
export const trpcClient = api.createClient({
  transformer: superjson,
  links: [
    httpBatchLink({
      url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/trpc`,
      headers() {
        return {
          'content-type': 'application/json',
        };
      },
    }),
  ],
});

// Export pour compatibilité avec le code existant
export const trpc = api;
