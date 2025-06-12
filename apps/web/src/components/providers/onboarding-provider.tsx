'use client';

import { type ReactNode } from 'react';
import { OnboardingProvider } from '@/components/shared/onboarding/onboarding-context';
import { useTranslations } from 'next-intl';

interface OnboardingWrapperProps {
  children: ReactNode;
}

export function OnboardingWrapper({ children }: OnboardingWrapperProps) {
  const t = useTranslations();

  return <OnboardingProvider t={t}>{children}</OnboardingProvider>;
}
