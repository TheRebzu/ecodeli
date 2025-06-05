'use client';

import { ReactNode } from 'react';
import { TRPCProvider } from './trpc-provider';
import ThemeProvider from './theme-provider';
import { SessionProvider } from 'next-auth/react';
import { Toaster } from '@/components/ui/toaster';

interface ProvidersProps {
  children: ReactNode;
  session?: any;
}

export function Providers({ children, session }: ProvidersProps) {
  return (
    <SessionProvider session={session}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <TRPCProvider>
          {children}
          <Toaster />
        </TRPCProvider>
      </ThemeProvider>
    </SessionProvider>
  );
} 