import { appRouter } from '@/server/api/root';
import { createTRPCContext } from '@/server/api/trpc';
import { headers } from 'next/headers';

// Create a server-side caller for the tRPC API
export const createCaller = async () => {
  try {
    // Create a context with request headers
    const headersList = headers();
    const contextWithRequest = await createTRPCContext({
      headers: headersList,
    });

    return appRouter.createCaller(contextWithRequest);
  } catch {
    // Fallback when headers aren't available
    console.warn('Creating tRPC caller without headers - some features may not work');
    const contextWithoutRequest = await createTRPCContext();
    return appRouter.createCaller(contextWithoutRequest);
  }
};

export type { AppRouter } from '@/server/api/root';
