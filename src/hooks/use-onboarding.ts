'use client';

export function useOnboarding() {
  // Hook en cours de développement
  return {
    isOnboardingComplete: false,
    currentStep: 0,
    isLoading: false,
    saveOnboardingProgress: (step: number) => console.log('Save progress', step),
    markOnboardingComplete: () => console.log('Mark complete'),
    resetOnboarding: () => console.log('Reset onboarding'),
  };
}