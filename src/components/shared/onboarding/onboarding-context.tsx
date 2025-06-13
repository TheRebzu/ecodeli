"use client";

import React, {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";

// Types pour le contexte onboarding
export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
}

export interface OnboardingContextType {
  // État du tutoriel
  isActive: boolean;
  currentStep: number;
  steps: OnboardingStep[];

  // Actions
  startOnboarding: () => void;
  nextStep: () => void;
  previousStep: () => void;
  completeStep: (stepId: string) => void;
  skipOnboarding: () => void;
  resetOnboarding: () => void;
}

// Contexte React
const OnboardingContext = createContext<OnboardingContextType | undefined>(
  undefined,
);

// Provider du contexte
interface OnboardingProviderProps {
  children: ReactNode;
  steps?: OnboardingStep[];
}

export function OnboardingProvider({
  children,
  steps = [],
}: OnboardingProviderProps) {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [onboardingSteps, setOnboardingSteps] =
    useState<OnboardingStep[]>(steps);

  const startOnboarding = () => {
    setIsActive(true);
    setCurrentStep(0);
  };

  const nextStep = () => {
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Fin du tutoriel
      setIsActive(false);
    }
  };

  const previousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const completeStep = (stepId: string) => {
    setOnboardingSteps((prev: OnboardingStep[]) =>
      prev.map((step: OnboardingStep) =>
        step.id === stepId ? { ...step, completed: true } : step,
      ),
    );
  };

  const skipOnboarding = () => {
    setIsActive(false);
  };

  const resetOnboarding = () => {
    setIsActive(false);
    setCurrentStep(0);
    setOnboardingSteps((prev: OnboardingStep[]) =>
      prev.map((step: OnboardingStep) => ({ ...step, completed: false })),
    );
  };

  const value: OnboardingContextType = {
    isActive,
    currentStep,
    steps: onboardingSteps,
    startOnboarding,
    nextStep,
    previousStep,
    completeStep,
    skipOnboarding,
    resetOnboarding,
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

// Hook pour utiliser le contexte
export const useOnboarding = (): OnboardingContextType => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error(
      "useOnboarding doit être utilisé dans un OnboardingProvider",
    );
  }
  return context;
};
