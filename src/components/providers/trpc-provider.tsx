import { ReactNode, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { api, getBaseUrl } from '@/hooks/use-trpc';
import { httpBatchLink } from '@trpc/client';
import superjson from 'superjson';

export function TRPCProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  
  // Créer le client tRPC dans le composant pour éviter les problèmes de build
  const [trpcClient] = useState(() => 
    api.createClient({
      links: [
        httpBatchLink({
          url: `${getBaseUrl()}/api/trpc`,
          headers: () => {
            return {
              'Content-Type': 'application/json',
            };
          },
          transformer: superjson,
        }),
      ],
    })
  );

  return (
    <api.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </api.Provider>
  );
}