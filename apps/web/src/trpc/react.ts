'use client';

import { createTRPCReact } from '@trpc/react-query';
import { type AppRouter } from '@/server/api/root';

/**
 * Client tRPC pour une utilisation dans les composants React
 */
export const api = createTRPCReact<AppRouter>();
export const trpc = api; // Pour la compatibilité avec le code existant
