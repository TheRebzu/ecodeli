'use client';

import { useState, ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { api } from '@/trpc/react';
import { getQueryClient } from '@/trpc/react';
import { httpBatchLink } from '@trpc/client';
import superjson from 'superjson';

interface TRPCProviderProps {
  children: ReactNode;
}

export function TRPCProvider({ children }: TRPCProviderProps) {
  const [queryClient] = useState(() => getQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <api.Provider
        queryClient={queryClient}
        client={api.createClient({
          links: [
            httpBatchLink({
              url: '/api/trpc',
              transformer: superjson,
              headers: () => {
                return {
                  'x-trpc-source': 'react',
                };
              },
            }),
          ],
        })}
      >
        {children}
      </api.Provider>
    </QueryClientProvider>
  );
}
