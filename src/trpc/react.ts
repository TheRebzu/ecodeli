import { createTRPCReact } from '@trpc/react-query';
import { type AppRouter } from '@/server/api/root';
import { QueryClient, type QueryClientConfig } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import superjson from 'superjson';

export const api = createTRPCReact<AppRouter>();

// This function can be used to initialize api in client components
export function getQueryClient(config?: QueryClientConfig) {
  return new QueryClient(
    config || {
      defaultOptions: {
        queries: {
          retry: 1,
          refetchOnWindowFocus: false,
          staleTime: 5 * 60 * 1000, // 5 minutes
        },
      },
    }
  );
}

// This function can be used to initialize api in client components
export function getLinks() {
  return [
    httpBatchLink({
      url: '/api/trpc',
      transformer: superjson,
    }),
  ];
}
