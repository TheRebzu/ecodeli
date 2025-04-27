import { appRouter } from '@/server/api/root';
import { createTRPCContext } from '@/server/api/root';

// Create a server-side caller for the tRPC API
export const api = appRouter.createCaller(
  await createTRPCContext({
    req: undefined,
  })
);

export type { AppRouter } from '@/server/api/root';
