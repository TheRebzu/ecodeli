'use client';

import { ReactNode } from 'react';
import { NextAuthProvider } from './session-provider';
import { OnboardingWrapper } from './onboarding-provider';
import { TRPCProvider } from './trpc-provider';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <NextAuthProvider>
      <TRPCProvider>
        <OnboardingWrapper>{children}</OnboardingWrapper>
      </TRPCProvider>
    </NextAuthProvider>
  );
}
