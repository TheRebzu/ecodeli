import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '@/server/api/root';

/**
 * Client-side TRPC Instance for React components
 */
export const trpc = createTRPCReact<AppRouter>(); 