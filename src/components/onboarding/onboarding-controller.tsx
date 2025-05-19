'use client';

import React, { useEffect } from 'react';
import { useOnboarding } from '@/context/onboarding-context';
import { TutorialOverlay } from './tutorial-overlay';
import { ClientTutorial } from './tutorials/client-tutorial';
import { DelivererTutorial } from './tutorials/deliverer-tutorial';
import { MerchantTutorial } from './tutorials/merchant-tutorial';
import { ProviderTutorial } from './tutorials/provider-tutorial';
import { useSession } from 'next-auth/react';

interface OnboardingControllerProps {
  autoStart?: boolean;
  redirectPathAfterCompletion?: string;
}

export function OnboardingController({
  autoStart = true,
  redirectPathAfterCompletion,
}: OnboardingControllerProps) {
  const {
    isActive,
    startOnboarding,
    isFirstLogin,
    hasCompletedOnboarding,
    isLoading,
    closeOnboarding,
  } = useOnboarding();

  const session = useSession();
  const userRole = session.data?.user?.role?.toLowerCase() || '';

  // Démarrer automatiquement le tutoriel si c'est une première connexion
  useEffect(() => {
    if (
      autoStart &&
      isFirstLogin &&
      !hasCompletedOnboarding &&
      !isLoading &&
      !isActive &&
      userRole &&
      userRole !== 'admin' // Ne pas démarrer automatiquement pour les administrateurs
    ) {
      startOnboarding(userRole);
    }
  }, [
    autoStart,
    isFirstLogin,
    hasCompletedOnboarding,
    isLoading,
    isActive,
    userRole,
    startOnboarding,
  ]);

  // Définir les options pour les redirections après tutoriel
  const tutorialOptions = redirectPathAfterCompletion
    ? { redirectTo: redirectPathAfterCompletion }
    : undefined;

  // Sélection du tutoriel en fonction du rôle
  const renderTutorial = () => {
    switch (userRole) {
      case 'client':
        return <ClientTutorial options={tutorialOptions} />;
      case 'deliverer':
        return <DelivererTutorial options={tutorialOptions} />;
      case 'merchant':
        return <MerchantTutorial options={tutorialOptions} />;
      case 'provider':
        return <ProviderTutorial options={tutorialOptions} />;
      case 'admin':
        // Pour les administrateurs, ferme automatiquement le tutoriel
        setTimeout(() => {
          closeOnboarding();
        }, 0);
        return null;
      default:
        return null;
    }
  };

  return <TutorialOverlay isActive={isActive}>{renderTutorial()}</TutorialOverlay>;
}

// Composant pour déclencher manuellement le tutoriel (à utiliser dans les paramètres)
export function OnboardingTrigger({
  role,
  children,
}: {
  role?: string;
  children: React.ReactNode;
}) {
  const { startOnboarding } = useOnboarding();
  const session = useSession();

  const handleTrigger = () => {
    const targetRole = role || session.data?.user?.role?.toLowerCase();
    if (targetRole) {
      startOnboarding(targetRole);
    }
  };

  return (
    <div onClick={handleTrigger} className="cursor-pointer">
      {children}
    </div>
  );
}
