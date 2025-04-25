import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import superjson from "superjson";
import type { AppRouter } from "@/server/api/root";

export const api = createTRPCReact<AppRouter>();

export const getBaseUrl = () => {
  if (typeof window !== 'undefined')
    return '';
  
  return `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}`;
};

// To use tRPC client directly (e.g., in server components, API routes)
export const trpcClient = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${getBaseUrl()}/api/trpc`,
      headers: () => {
        return {
          'x-trpc-source': 'client',
        };
      },
      transformer: superjson
    }),
  ],
});
