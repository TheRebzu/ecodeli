'use client';

import { ReactNode } from 'react';
import { OnboardingProvider } from '@/context/onboarding-context';
import { OnboardingController } from '@/components/onboarding/onboarding-controller';

interface OnboardingWrapperProps {
  children: ReactNode;
  autoStart?: boolean;
}

export function OnboardingWrapper({ children, autoStart = true }: OnboardingWrapperProps) {
  return (
    <OnboardingProvider>
      {children}
      <OnboardingController autoStart={autoStart} />
    </OnboardingProvider>
  );
}
