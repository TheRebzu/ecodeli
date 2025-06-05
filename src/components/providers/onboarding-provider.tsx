'use client';

import { type ReactNode } from 'react';
import { OnboardingProvider } from '@/context/onboarding-context';
import { useTranslations } from 'next-intl';

interface OnboardingWrapperProps {
  children: ReactNode;
}

export function OnboardingWrapper({ children }: OnboardingWrapperProps) {
  const t = useTranslations();

  return (
    <OnboardingProvider t={t}>
      {children}
    </OnboardingProvider>
  );
} 