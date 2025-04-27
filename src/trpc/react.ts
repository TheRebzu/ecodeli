import { createTRPCReact } from '@trpc/react-query';
import { type AppRouter } from '@/server/api/root';
import { QueryClient } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import superjson from 'superjson';

export const api = createTRPCReact<AppRouter>();

// This function can be used to initialize api in client components
export function getQueryClient() {
  return new QueryClient();
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
