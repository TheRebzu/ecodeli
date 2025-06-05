'use client';

import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { useOnboardingStatus, useOnboardingCompletion } from '@/hooks/use-onboarding';
import { useSession } from 'next-auth/react';

// Type de fonction de traduction simplifié
type TranslationFunction = (key: string, params?: Record<string, unknown>) => string;

// Valeurs de traduction par défaut comme fallback
const defaultTranslations: Record<string, string> = {
  'error.title': 'Erreur',
  'complete.success.title': 'Tutoriel terminé',
  'reset.success.title': 'Tutoriel réinitialisé',
};

// Fonction de traduction par défaut qui utilise les valeurs de fallback
const defaultTranslationFunction: TranslationFunction = key => {
  return defaultTranslations[key] || key;
};

type OnboardingContextType = {
  isActive: boolean;
  currentStep: number;
  totalSteps: number;
  hasCompletedOnboarding: boolean;
  isFirstLogin: boolean;
  isTutorialSkipped: boolean;
  isLoading: boolean;
  startOnboarding: (tutorialType?: string) => void;
  closeOnboarding: () => void;
  completeOnboarding: (options?: { redirectTo?: string }) => Promise<boolean>;
  skipOnboarding: (options?: { redirectTo?: string }) => Promise<boolean>;
  resetOnboarding: () => Promise<boolean>;
  goToNextStep: () => void;
  goToPreviousStep: () => void;
  goToStep: (step: number) => Promise<void>;
  isCompleting?: boolean;
  setStepsConfiguration?: (currentStepIndex: number, totalStepsCount: number) => void;
  setIsActive: (isActive: boolean) => void;
};

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

interface OnboardingProviderProps {
  children: ReactNode;
  t?: TranslationFunction;
}

export function OnboardingProvider({ children, t: externalT }: OnboardingProviderProps) {
  // Utiliser les traductions fournies ou les valeurs par défaut
  const translationFunction = externalT || defaultTranslationFunction;

  const [isActive, setIsActive] = useState(false);
  const [tutorialType, setTutorialType] = useState<string | undefined>(undefined);
  const [isFirstLogin, setIsFirstLogin] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [totalSteps, setTotalSteps] = useState(0);

  const { status, isLoading } = useOnboardingStatus();
  const completion = useOnboardingCompletion(translationFunction);
  const session = useSession();

  // Vérifier si c'est la première connexion lorsque la session ou le statut change
  useEffect(() => {
    if (session.status === 'authenticated' && status && !isLoading) {
      // Vérifier la première connexion et si le tutoriel n'a pas été complété
      // Note: nous vérifions juste si le tutoriel n'a pas été complété, car lastLoginAt n'est pas disponible
      const isFirstTime = !status.hasCompletedOnboarding;
      setIsFirstLogin(isFirstTime);

      // Activer automatiquement le tutoriel lors de la première connexion
      // mais pas pour les administrateurs
      const userRole = session.data?.user?.role?.toLowerCase();
      if (isFirstTime && !isActive && userRole && userRole !== 'admin') {
        setIsActive(true);
        // Définir le type de tutoriel en fonction du rôle de l'utilisateur
        setTutorialType(userRole);
      }
    }
  }, [session, status, isLoading, isActive]);

  // Démarrer le tutoriel d'onboarding
  const startOnboarding = (type?: string) => {
    // Ne pas démarrer le tutoriel pour les administrateurs
    if (type === 'admin' || (!type && session.data?.user?.role?.toLowerCase() === 'admin')) {
      return;
    }

    if (type) {
      setTutorialType(type);
    } else if (!tutorialType && session.data?.user?.role) {
      setTutorialType(session.data.user.role.toLowerCase());
    }
    setIsActive(true);
    goToStep(0);
  };

  // Fermer le tutoriel sans le marquer comme complété
  const closeOnboarding = () => {
    setIsActive(false);
  };

  // Navigation manuelle des étapes
  const goToStep = async (step: number) => {
    if (status) {
      setCurrentStep(step);
    }
  };

  const goToNextStep = () => {
    if (currentStep < totalSteps - 1) {
      goToStep(currentStep + 1);
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 0) {
      goToStep(currentStep - 1);
    }
  };

  const setStepsConfiguration = (currentStepIndex: number, totalStepsCount: number) => {
    setCurrentStep(currentStepIndex);
    setTotalSteps(totalStepsCount);
  };

  // Pour compléter le tutoriel et marquer comme terminé
  const handleCompleteOnboarding = async (options?: { redirectTo?: string }) => {
    const result = await completion.completeOnboarding(options);
    if (result) {
      setIsActive(false);
    }
    return result;
  };

  // Pour sauter le tutoriel
  const handleSkipOnboarding = async (options?: { redirectTo?: string }) => {
    try {
      // Fermer immédiatement la fenêtre pour une meilleure expérience utilisateur
      setIsActive(false);

      // Puis mettre à jour l'état dans la base de données
      const result = await completion.skipOnboarding(options);
      return result;
    } catch (error) {
      console.error('Erreur lors du saut du tutoriel:', error);
      return false;
    }
  };

  return (
    <OnboardingContext.Provider
      value={{
        isActive,
        currentStep,
        totalSteps,
        hasCompletedOnboarding: status?.hasCompletedOnboarding || false,
        isFirstLogin,
        isTutorialSkipped: status?.tutorialSkipped || false,
        isLoading,
        startOnboarding,
        closeOnboarding,
        completeOnboarding: handleCompleteOnboarding,
        skipOnboarding: handleSkipOnboarding,
        resetOnboarding: completion.resetOnboarding,
        goToNextStep,
        goToPreviousStep,
        goToStep,
        isCompleting: completion.isCompleting,
        setStepsConfiguration,
        setIsActive,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);

  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }

  return context;
}
