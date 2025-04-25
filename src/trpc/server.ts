import { httpBatchLink } from '@trpc/client';
import { createTRPCProxyClient } from '@trpc/client';
import { headers } from 'next/headers';
import { appRouter } from '@/server/api/root';
import superjson from 'superjson';
import type { AppRouter } from '@/server/api/root';

export const api = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/trpc`,
      async headers() {
        const heads = new Map(await headers());
        heads.set('x-trpc-source', 'server');
        return Object.fromEntries(heads);
      },
      transformer: superjson
    }),
  ],
}); 