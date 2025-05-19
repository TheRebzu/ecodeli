'use client';

import React, { useEffect, useCallback } from 'react';
import { useOnboarding } from '@/context/onboarding-context';
import { TutorialOverlay } from './tutorial-overlay';
import { ClientTutorial } from './tutorials/client-tutorial';
import { DelivererTutorial } from './tutorials/deliverer-tutorial';
import { MerchantTutorial } from './tutorials/merchant-tutorial';
import { ProviderTutorial } from './tutorials/provider-tutorial';
import { AdminTutorial } from './tutorials/admin-tutorial';
import { useSession } from 'next-auth/react';
import { X } from 'lucide-react';

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
    skipOnboarding,
    setIsActive,
  } = useOnboarding();

  const session = useSession();
  const userRole = session.data?.user?.role?.toLowerCase() || '';

  // Gestionnaire pour la touche Escape
  const handleEscKey = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isActive) {
        closeOnboarding();
      }
    },
    [closeOnboarding, isActive]
  );

  // Ajout de l'écouteur d'événement pour la touche Escape
  useEffect(() => {
    window.addEventListener('keydown', handleEscKey);
    return () => {
      window.removeEventListener('keydown', handleEscKey);
    };
  }, [handleEscKey]);

  // Démarrer automatiquement le tutoriel si c'est une première connexion
  useEffect(() => {
    if (
      autoStart &&
      isFirstLogin &&
      !hasCompletedOnboarding &&
      !isLoading &&
      !isActive &&
      userRole
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
      case 'administrator':
        return <AdminTutorial options={tutorialOptions} />;
      default:
        return null;
    }
  };

  // Rendu conditionnel du tutoriel avec le bouton d'échappement
  return (
    <TutorialOverlay isActive={isActive}>
      {/* Bouton d'échappement d'urgence */}
      {isActive && (
        <div className="absolute top-3 right-3 z-50">
          <button
            onClick={() => {
              // Fermer la fenêtre et marquer le tutoriel comme sauté
              setIsActive(false);
              // Puis mettre à jour la base de données
              skipOnboarding(tutorialOptions);
            }}
            className="p-1 rounded-full hover:bg-slate-100 transition-colors"
            aria-label="Fermer le tutoriel"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}
      {renderTutorial()}
    </TutorialOverlay>
  );
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
