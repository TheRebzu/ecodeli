'use client';

import { useCallback, useState } from 'react';
import { api } from '@/trpc/react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';

// Type simplifié pour la fonction de traduction
type TranslationFunction = (key: string, params?: Record<string, unknown>) => string;

export function useOnboardingStatus() {
  const { data, isLoading, error, refetch } = api.userPreferences.getOnboardingStatus.useQuery(
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
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [totalSteps, setTotalSteps] = useState(0);
  const [isUpdating, setIsUpdating] = useState(false);

  const updateOnboardingStatus = api.userPreferences.updateOnboardingStatus.useMutation({
    onError: () => {
      toast({
        variant: 'destructive',
        title: 'Erreur lors de la mise à jour',
        description: 'Impossible de mettre à jour votre progression.',
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
  const { toast } = useToast();
  const router = useRouter();
  const [isCompleting, setIsCompleting] = useState(false);

  const updateOnboardingStatus = api.userPreferences.updateOnboardingStatus.useMutation({
    onSuccess: () => {
      toast({
        title: '🎉 Félicitations !',
        description: 'Votre tutoriel a été complété avec succès.',
      });
    },
    onError: () => {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de sauvegarder votre progression.',
      });
    },
  });

  const resetOnboardingStatus = api.userPreferences.resetOnboardingStatus.useMutation({
    onSuccess: () => {
      toast({
        title: '🔄 Tutoriel réinitialisé',
        description: 'Vous pouvez maintenant recommencer le tutoriel.',
      });
    },
    onError: () => {
      toast({
        variant: 'destructive',
        title: 'Erreur de réinitialisation',
        description: 'Impossible de réinitialiser le tutoriel.',
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

/**
 * Hook spécialisé pour la Mission 1 (tutoriel obligatoire)
 * Combine les fonctionnalités de statut, navigation et completion
 */
export function useMission1Onboarding() {
  const { status, isLoading, error, refetch } = useOnboardingStatus();
  const navigation = useOnboardingNavigation();
  const completion = useOnboardingCompletion();
  const { toast } = useToast();
  const router = useRouter();

  // Vérifier si Mission 1 est requise
  const isMission1Required = !status?.hasCompletedOnboarding && !status?.tutorialSkipped;

  // Bloquer l'accès à l'application si Mission 1 n'est pas complétée
  const shouldBlockAccess = isMission1Required && !isLoading;

  // Complétion spéciale pour Mission 1 avec redirection automatique
  const completeMission1 = useCallback(async () => {
    try {
      const success = await completion.completeOnboarding({
        redirectTo: '/client', // Redirection par défaut vers le dashboard client
      });

      if (success) {
        toast({
          title: '🎉 Mission 1 accomplie !',
          description:
            "Bienvenue dans l'aventure EcoDeli ! Vous pouvez maintenant utiliser toutes les fonctionnalités.",
        });

        // Actualiser le statut
        refetch();

        return true;
      }
      return false;
    } catch (error) {
      console.error('Erreur lors de la completion de Mission 1:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur de completion',
        description: 'Impossible de terminer Mission 1. Veuillez réessayer.',
      });
      return false;
    }
  }, [completion, toast, refetch]);

  // Fonction pour forcer le redémarrage de Mission 1
  const restartMission1 = useCallback(async () => {
    try {
      await completion.resetOnboarding();
      navigation.goToStep(0);
      refetch();

      toast({
        title: '🔄 Mission 1 redémarrée',
        description: 'Le tutoriel obligatoire va recommencer.',
      });
    } catch (error) {
      console.error('Erreur lors du redémarrage de Mission 1:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de redémarrer Mission 1.',
      });
    }
  }, [completion, navigation, refetch, toast]);

  return {
    // État de Mission 1
    isMission1Required,
    shouldBlockAccess,
    isLoading,
    error,

    // Navigation
    ...navigation,

    // Completion spécialisée
    completeMission1,
    restartMission1,
    isCompleting: completion.isCompleting,

    // Statut utilisateur
    status,
    refetch,
  };
}

/**
 * Hook simplifié pour vérifier si Mission 1 bloque l'accès
 */
export function useMission1AccessControl() {
  const { status, isLoading } = useOnboardingStatus();

  const shouldBlockAccess =
    !isLoading && !status?.hasCompletedOnboarding && !status?.tutorialSkipped;

  return {
    shouldBlockAccess,
    isLoading,
    hasCompletedOnboarding: status?.hasCompletedOnboarding || false,
    tutorialSkipped: status?.tutorialSkipped || false,
  };
}
