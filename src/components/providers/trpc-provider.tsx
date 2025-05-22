'use client';

import { useState, ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { api, getQueryClient } from '@/trpc/react';
import { httpBatchLink } from '@trpc/client';
import superjson from 'superjson';

interface TRPCProviderProps {
  children: ReactNode;
}

export function TRPCProvider({ children }: TRPCProviderProps) {
  const [queryClient] = useState(() => getQueryClient());

  const [trpcClient] = useState(() =>
    api.createClient({
      links: [
        httpBatchLink({
          url: '/api/trpc',
          headers: () => {
            return {
              'x-trpc-source': 'react',
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
