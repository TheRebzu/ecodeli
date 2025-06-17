import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { trpc } from "@/trpc/react";
import { TutorialStep, TutorialProgress, UserRole } from "@prisma/client";

export interface TutorialConfig {
  id: string;
  title: string;
  description: string;
  steps: TutorialStepConfig[];
  userRole: UserRole;
  isBlocking: boolean;
  priority: number;
}

export interface TutorialStepConfig {
  id: string;
  title: string;
  description: string;
  content: string;
  targetElement?: string;
  position?: "top" | "bottom" | "left" | "right" | "center";
  isOptional: boolean;
  order: number;
  overlayConfig?: OverlayConfig;
}

export interface OverlayConfig {
  showBackdrop: boolean;
  allowClickOutside: boolean;
  highlightTarget: boolean;
  animation?: "fade" | "slide" | "zoom";
  customStyles?: React.CSSProperties;
}

export interface TutorialState {
  currentTutorial: TutorialConfig | null;
  currentStep: number;
  isVisible: boolean;
  isBlocked: boolean;
  completedTutorials: string[];
  availableTutorials: TutorialConfig[];
  progress: TutorialProgress[];
}

export const useTutorial = () => {
  const { data: session } = useSession();
  const [state, setState] = useState<TutorialState>({
    currentTutorial: null,
    currentStep: 0,
    isVisible: false,
    isBlocked: false,
    completedTutorials: [],
    availableTutorials: [],
    progress: [],
  });

  // Queries
  const { data: userProgress, refetch: refetchProgress } = trpc.tutorial.getUserProgress.useQuery(
    undefined,
    { enabled: !!session?.user?.id }
  );

  const { data: availableTutorials } = trpc.tutorial.getAvailableTutorials.useQuery(
    { userRole: session?.user?.role as UserRole },
    { enabled: !!session?.user?.role }
  );

  // Mutations
  const updateProgressMutation = trpc.tutorial.updateProgress.useMutation();
  const completeTutorialMutation = trpc.tutorial.completeTutorial.useMutation();
  const skipTutorialMutation = trpc.tutorial.skipTutorial.useMutation();

  // Update state when data changes
  useEffect(() => {
    setState(prev => ({
      ...prev,
      availableTutorials: availableTutorials || [],
      progress: userProgress || [],
      completedTutorials: (userProgress || [])
        .filter(p => p.isCompleted)
        .map(p => p.tutorialId),
    }));
  }, [availableTutorials, userProgress]);

  // Check for blocking tutorials on login
  useEffect(() => {
    if (session?.user && availableTutorials) {
      const blockingTutorial = availableTutorials.find(
        tutorial => 
          tutorial.isBlocking && 
          !state.completedTutorials.includes(tutorial.id)
      );

      if (blockingTutorial) {
        startTutorial(blockingTutorial.id);
      }
    }
  }, [session?.user, availableTutorials, state.completedTutorials]);

  const startTutorial = useCallback(async (tutorialId: string) => {
    const tutorial = state.availableTutorials.find(t => t.id === tutorialId);
    if (!tutorial) return;

    // Get existing progress or start from beginning
    const existingProgress = state.progress.find(p => p.tutorialId === tutorialId);
    const currentStep = existingProgress?.currentStep || 0;

    setState(prev => ({
      ...prev,
      currentTutorial: tutorial,
      currentStep,
      isVisible: true,
      isBlocked: tutorial.isBlocking,
    }));

    // Track tutorial start
    if (!existingProgress) {
      await updateProgressMutation.mutateAsync({
        tutorialId,
        currentStep: 0,
        isCompleted: false,
      });
    }
  }, [state.availableTutorials, state.progress, updateProgressMutation]);

  const nextStep = useCallback(async () => {
    if (!state.currentTutorial) return;

    const nextStepIndex = state.currentStep + 1;
    const isLastStep = nextStepIndex >= state.currentTutorial.steps.length;

    if (isLastStep) {
      await completeTutorial();
    } else {
      setState(prev => ({
        ...prev,
        currentStep: nextStepIndex,
      }));

      await updateProgressMutation.mutateAsync({
        tutorialId: state.currentTutorial.id,
        currentStep: nextStepIndex,
        isCompleted: false,
      });
    }
  }, [state.currentTutorial, state.currentStep, updateProgressMutation]);

  const previousStep = useCallback(async () => {
    if (!state.currentTutorial || state.currentStep <= 0) return;

    const prevStepIndex = state.currentStep - 1;
    
    setState(prev => ({
      ...prev,
      currentStep: prevStepIndex,
    }));

    await updateProgressMutation.mutateAsync({
      tutorialId: state.currentTutorial.id,
      currentStep: prevStepIndex,
      isCompleted: false,
    });
  }, [state.currentTutorial, state.currentStep, updateProgressMutation]);

  const skipStep = useCallback(async () => {
    const currentStepConfig = state.currentTutorial?.steps[state.currentStep];
    if (!currentStepConfig?.isOptional) return;

    await nextStep();
  }, [state.currentTutorial, state.currentStep, nextStep]);

  const completeTutorial = useCallback(async () => {
    if (!state.currentTutorial) return;

    await completeTutorialMutation.mutateAsync({
      tutorialId: state.currentTutorial.id,
    });

    setState(prev => ({
      ...prev,
      currentTutorial: null,
      currentStep: 0,
      isVisible: false,
      isBlocked: false,
      completedTutorials: [...prev.completedTutorials, state.currentTutorial!.id],
    }));

    await refetchProgress();
  }, [state.currentTutorial, completeTutorialMutation, refetchProgress]);

  const skipTutorial = useCallback(async () => {
    if (!state.currentTutorial || state.currentTutorial.isBlocking) return;

    await skipTutorialMutation.mutateAsync({
      tutorialId: state.currentTutorial.id,
    });

    setState(prev => ({
      ...prev,
      currentTutorial: null,
      currentStep: 0,
      isVisible: false,
      isBlocked: false,
    }));

    await refetchProgress();
  }, [state.currentTutorial, skipTutorialMutation, refetchProgress]);

  const closeTutorial = useCallback(() => {
    if (state.currentTutorial?.isBlocking) return; // Cannot close blocking tutorials

    setState(prev => ({
      ...prev,
      currentTutorial: null,
      currentStep: 0,
      isVisible: false,
      isBlocked: false,
    }));
  }, [state.currentTutorial]);

  const restartTutorial = useCallback(() => {
    if (!state.currentTutorial) return;

    setState(prev => ({
      ...prev,
      currentStep: 0,
    }));
  }, [state.currentTutorial]);

  const jumpToStep = useCallback(async (stepIndex: number) => {
    if (!state.currentTutorial || stepIndex < 0 || stepIndex >= state.currentTutorial.steps.length) {
      return;
    }

    setState(prev => ({
      ...prev,
      currentStep: stepIndex,
    }));

    await updateProgressMutation.mutateAsync({
      tutorialId: state.currentTutorial.id,
      currentStep: stepIndex,
      isCompleted: false,
    });
  }, [state.currentTutorial, updateProgressMutation]);

  // Helper functions
  const getCurrentStepConfig = useCallback(() => {
    if (!state.currentTutorial) return null;
    return state.currentTutorial.steps[state.currentStep] || null;
  }, [state.currentTutorial, state.currentStep]);

  const getTutorialProgress = useCallback((tutorialId: string) => {
    return state.progress.find(p => p.tutorialId === tutorialId);
  }, [state.progress]);

  const isTutorialCompleted = useCallback((tutorialId: string) => {
    return state.completedTutorials.includes(tutorialId);
  }, [state.completedTutorials]);

  const hasBlockingTutorials = useCallback(() => {
    return state.availableTutorials.some(
      tutorial => 
        tutorial.isBlocking && 
        !state.completedTutorials.includes(tutorial.id)
    );
  }, [state.availableTutorials, state.completedTutorials]);

  const getNextBlockingTutorial = useCallback(() => {
    return state.availableTutorials
      .filter(tutorial => 
        tutorial.isBlocking && 
        !state.completedTutorials.includes(tutorial.id)
      )
      .sort((a, b) => a.priority - b.priority)[0] || null;
  }, [state.availableTutorials, state.completedTutorials]);

  return {
    // State
    ...state,
    currentStepConfig: getCurrentStepConfig(),
    
    // Actions
    startTutorial,
    nextStep,
    previousStep,
    skipStep,
    completeTutorial,
    skipTutorial,
    closeTutorial,
    restartTutorial,
    jumpToStep,
    
    // Helpers
    getTutorialProgress,
    isTutorialCompleted,
    hasBlockingTutorials,
    getNextBlockingTutorial,
    
    // Loading states
    isUpdating: updateProgressMutation.isLoading,
    isCompleting: completeTutorialMutation.isLoading,
    isSkipping: skipTutorialMutation.isLoading,
  };
};