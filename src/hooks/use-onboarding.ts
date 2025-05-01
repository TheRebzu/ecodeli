'use client';

import { useCallback, useState } from 'react';
import { useTrpc } from '@/trpc/client';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';

// Type simplifié pour la fonction de traduction
type TranslationFunction = (key: string, params?: Record<string, unknown>) => string;

export function useOnboardingStatus() {
  const { client } = useTrpc();
  const { data, isLoading, error, refetch } = client.userPreferences.getOnboardingStatus.useQuery(
    undefined,
    {
      refetchOnWindowFocus: false,
      refetchOnMount: true,
      staleTime: 1000 * 60 * 5, // 5 minutes
    }
  );

  return {
    status: data,
    isLoading,
    error,
    refetch,
  };
}

export function useOnboardingNavigation() {
  const { client } = useTrpc();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [totalSteps, setTotalSteps] = useState(0);
  const [isUpdating, setIsUpdating] = useState(false);

  const updateOnboardingStatus = client.userPreferences.updateOnboardingStatus.useMutation({
    onError: () => {
      toast({
        variant: 'destructive',
        title: t('error.title'),
      });
    },
  });

  const goToStep = useCallback(
    async (step: number) => {
      setIsUpdating(true);
      try {
        await updateOnboardingStatus.mutateAsync({
          lastOnboardingStep: step,
        });
        setCurrentStep(step);
      } catch (error) {
        console.error("Erreur lors de la mise à jour de l'étape:", error);
      } finally {
        setIsUpdating(false);
      }
    },
    [updateOnboardingStatus]
  );

  const goToNextStep = useCallback(() => {
    if (currentStep < totalSteps - 1) {
      goToStep(currentStep + 1);
    }
  }, [currentStep, totalSteps, goToStep]);

  const goToPreviousStep = useCallback(() => {
    if (currentStep > 0) {
      goToStep(currentStep - 1);
    }
  }, [currentStep, goToStep]);

  const setStepsConfiguration = useCallback((currentStepIndex: number, totalStepsCount: number) => {
    setCurrentStep(currentStepIndex);
    setTotalSteps(totalStepsCount);
  }, []);

  return {
    currentStep,
    totalSteps,
    goToStep,
    goToNextStep,
    goToPreviousStep,
    isUpdating,
    setStepsConfiguration,
  };
}

export function useOnboardingCompletion(
  t: TranslationFunction = key => key // Fonction de traduction par défaut
) {
  const { client } = useTrpc();
  const { toast } = useToast();
  const router = useRouter();
  const [isCompleting, setIsCompleting] = useState(false);

  const updateOnboardingStatus = client.userPreferences.updateOnboardingStatus.useMutation({
    onSuccess: () => {
      toast({
        title: t('complete.success.title'),
      });
    },
    onError: () => {
      toast({
        variant: 'destructive',
        title: t('error.title'),
      });
    },
  });

  const resetOnboardingStatus = client.userPreferences.resetOnboardingStatus.useMutation({
    onSuccess: () => {
      toast({
        title: t('reset.success.title'),
      });
    },
    onError: () => {
      toast({
        variant: 'destructive',
        title: t('error.title'),
      });
    },
  });

  const completeOnboarding = useCallback(
    async (options?: { redirectTo?: string }) => {
      setIsCompleting(true);
      try {
        await updateOnboardingStatus.mutateAsync({
          hasCompletedOnboarding: true,
          onboardingCompletionDate: new Date().toISOString(),
          tutorialSkipped: false,
        });

        if (options?.redirectTo) {
          router.push(options.redirectTo);
        }

        setIsCompleting(false);
        return true;
      } catch (error) {
        console.error('Erreur lors de la finalisation du tutoriel:', error);
        setIsCompleting(false);
        return false;
      }
    },
    [updateOnboardingStatus, router]
  );

  const skipOnboarding = useCallback(
    async (options?: { redirectTo?: string }) => {
      setIsCompleting(true);
      try {
        await updateOnboardingStatus.mutateAsync({
          hasCompletedOnboarding: true,
          onboardingCompletionDate: new Date().toISOString(),
          tutorialSkipped: true,
        });

        if (options?.redirectTo) {
          router.push(options.redirectTo);
        }

        setIsCompleting(false);
        return true;
      } catch (error) {
        console.error('Erreur lors du saut du tutoriel:', error);
        setIsCompleting(false);
        return false;
      }
    },
    [updateOnboardingStatus, router]
  );

  const resetOnboarding = useCallback(async () => {
    try {
      await resetOnboardingStatus.mutateAsync();
      return true;
    } catch (error) {
      console.error('Erreur lors de la réinitialisation du tutoriel:', error);
      return false;
    }
  }, [resetOnboardingStatus]);

  return {
    completeOnboarding,
    skipOnboarding,
    resetOnboarding,
    isCompleting,
  };
}
