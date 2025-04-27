import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '@/server/api/routers';

// Créer le hook React pour utiliser tRPC
export const trpc = createTRPCReact<AppRouter>();
