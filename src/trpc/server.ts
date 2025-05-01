import { appRouter } from '@/server/api/root';
import { createTRPCContext } from '@/server/api/trpc';
import { headers } from 'next/headers';
import type { AppRouter } from '@/server/api/root';
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import { cookieToString } from 'next/dist/server/web/spec-extension/cookies';
import superjson from 'superjson';

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

/**
 * Créer un client tRPC pour faire des appels API depuis le serveur
 */
export function api(cookieStore?: ReturnType<(typeof headers)['getAll'] | any>) {
  return createTRPCProxyClient<AppRouter>({
    transformer: superjson,
    links: [
      httpBatchLink({
        url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/trpc`,
        headers() {
          const headersList = new Map();
          // Ajouter les cookies à la requête pour maintenir la session
          if (cookieStore) {
            const stringifiedCookies = cookieToString(cookieStore);
            if (stringifiedCookies) {
              headersList.set('cookie', stringifiedCookies);
            }
          }
          return Object.fromEntries(headersList);
        },
      }),
    ],
  });
}

/**
 * Créer un client tRPC pour les Server Components
 */
export function createServerComponentClient({
  cookies,
}: {
  cookies: ReturnType<(typeof headers)['getAll'] | any>;
}) {
  return createTRPCProxyClient<AppRouter>({
    transformer: superjson,
    links: [
      httpBatchLink({
        url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/trpc`,
        headers() {
          const headersList = new Map();
          // Ajouter les cookies à la requête pour maintenir la session
          if (cookies) {
            const stringifiedCookies = cookieToString(cookies);
            if (stringifiedCookies) {
              headersList.set('cookie', stringifiedCookies);
            }
          }
          return Object.fromEntries(headersList);
        },
      }),
    ],
  });
}
