"use client";

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/components/ui/use-toast";

interface TutorialStep {
  id: number;
  title: string;
  description: string;
  type: string;
  mandatory: boolean;
  estimatedTime: number;
  completed: boolean;
  timeSpent: number;
  skipped: boolean;
  order: number;
}

interface TutorialProgress {
  userId: string;
  totalSteps: number;
  completedSteps: number;
  mandatorySteps: number;
  completedMandatory: number;
  progressPercentage: number;
  currentStep: number;
  isCompleted: boolean;
  startedAt: string;
  completedAt?: string;
  totalTimeSpent: number;
}

interface TutorialState {
  tutorialRequired: boolean;
  steps: TutorialStep[];
  progress: TutorialProgress | null;
  settings: {
    blockingOverlay: boolean;
    allowSkip: boolean;
    autoSave: boolean;
    showProgress: boolean;
  };
}

interface TutorialCompletion {
  totalTimeSpent: number;
  stepsCompleted: number[];
  feedback?: string;
  rating?: number;
}

export function useTutorial() {
  const { toast } = useToast();
  const [tutorialState, setTutorialState] = useState<TutorialState | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  // Charger l'état du tutoriel
  const loadTutorial = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/client/tutorial");

      if (!response.ok) {
        throw new Error("Erreur lors du chargement du tutoriel");
      }

      const data = await response.json();

      if (data.success) {
        setTutorialState({
          tutorialRequired: data.tutorialRequired,
          steps: data.steps,
          progress: data.progress,
          settings: {
            blockingOverlay: data.tutorialRequired,
            allowSkip: false,
            autoSave: true,
            showProgress: true,
          },
        });

        // Ouvrir automatiquement si requis
        if (data.tutorialRequired && !data.progress?.isCompleted) {
          setIsOpen(true);
        }
      } else {
        throw new Error(data.error || "Erreur inconnue");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Erreur inconnue";
      setError(errorMessage);
      console.error("Erreur chargement tutoriel:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Démarrer le tutoriel
  const startTutorial = useCallback(async () => {
    try {
      const response = await fetch("/api/client/tutorial?action=start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Erreur lors du démarrage du tutoriel");
      }

      const data = await response.json();

      if (data.success) {
        await loadTutorial(); // Recharger l'état
        setIsOpen(true);

        toast({
          title: "📚 Tutoriel démarré",
          description: "Bienvenue dans le tutoriel EcoDeli !",
        });
      } else {
        throw new Error(data.error || "Erreur inconnue");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Erreur démarrage tutoriel";
      toast({
        title: "❌ Erreur",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, [loadTutorial, toast]);

  // Compléter une étape
  const completeStep = useCallback(
    async (stepId: number, timeSpent: number) => {
      try {
        const response = await fetch(
          "/api/client/tutorial?action=complete-step",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ stepId, timeSpent }),
          },
        );

        if (!response.ok) {
          throw new Error("Erreur lors de la complétion de l'étape");
        }

        const data = await response.json();

        if (data.success) {
          await loadTutorial(); // Recharger l'état
        } else {
          throw new Error(data.error || "Erreur inconnue");
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Erreur complétion étape";
        toast({
          title: "❌ Erreur",
          description: errorMessage,
          variant: "destructive",
        });
        throw err;
      }
    },
    [loadTutorial, toast],
  );

  // Passer une étape
  const skipStep = useCallback(
    async (stepId: number) => {
      try {
        const response = await fetch("/api/client/tutorial?action=skip-step", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ stepId }),
        });

        if (!response.ok) {
          throw new Error("Erreur lors du passage de l'étape");
        }

        const data = await response.json();

        if (data.success) {
          await loadTutorial(); // Recharger l'état
        } else {
          throw new Error(data.error || "Erreur inconnue");
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Erreur passage étape";
        toast({
          title: "❌ Erreur",
          description: errorMessage,
          variant: "destructive",
        });
        throw err;
      }
    },
    [loadTutorial, toast],
  );

  // Terminer le tutoriel
  const completeTutorial = useCallback(
    async (completionData: TutorialCompletion) => {
      try {
        const response = await fetch("/api/client/tutorial?action=complete", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(completionData),
        });

        if (!response.ok) {
          throw new Error("Erreur lors de la finalisation du tutoriel");
        }

        const data = await response.json();

        if (data.success) {
          await loadTutorial(); // Recharger l'état
          setIsOpen(false);

          toast({
            title: "🎉 Tutoriel terminé !",
            description: "Félicitations ! Vous maîtrisez maintenant EcoDeli.",
          });
        } else {
          throw new Error(data.error || "Erreur inconnue");
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Erreur finalisation tutoriel";
        toast({
          title: "❌ Erreur",
          description: errorMessage,
          variant: "destructive",
        });
        throw err;
      }
    },
    [loadTutorial, toast],
  );

  // Fermer le tutoriel (si autorisé)
  const closeTutorial = useCallback(() => {
    if (
      tutorialState?.settings.blockingOverlay &&
      tutorialState?.tutorialRequired
    ) {
      toast({
        title: "⚠️ Tutoriel obligatoire",
        description:
          "Vous devez terminer le tutoriel pour accéder à la plateforme.",
        variant: "destructive",
      });
      return false;
    }

    setIsOpen(false);
    return true;
  }, [tutorialState, toast]);

  // Ouvrir le tutoriel manuellement
  const openTutorial = useCallback(() => {
    setIsOpen(true);
  }, []);

  // Réinitialiser le tutoriel (pour développement)
  const resetTutorial = useCallback(async () => {
    try {
      const response = await fetch("/api/client/tutorial?action=reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la réinitialisation");
      }

      const data = await response.json();

      if (data.success) {
        await loadTutorial();

        toast({
          title: "🔄 Tutoriel réinitialisé",
          description: "Le tutoriel a été remis à zéro.",
        });
      } else {
        throw new Error(data.error || "Erreur inconnue");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Erreur réinitialisation";
      toast({
        title: "❌ Erreur",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, [loadTutorial, toast]);

  // Charger au montage
  useEffect(() => {
    loadTutorial();
  }, [loadTutorial]);

  return {
    // État
    tutorialState,
    loading,
    error,
    isOpen,

    // Actions
    startTutorial,
    completeStep,
    skipStep,
    completeTutorial,
    closeTutorial,
    openTutorial,
    resetTutorial,

    // Helpers
    reload: loadTutorial,
  };
}
