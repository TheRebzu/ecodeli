"use client";

import { useState, useEffect } from 'react';

interface TutorialProgress {
  createAnnouncement: boolean;
  makeBooking: boolean;
  viewPayments: boolean;
  trackDelivery: boolean;
}

interface TutorialData {
  tutorialCompleted: boolean;
  progress: TutorialProgress;
  nextStep: string | null;
  blocksNavigation: boolean;
}

interface UseSimpleTutorialReturn {
  tutorialData: TutorialData | null;
  isLoading: boolean;
  error: string | null;
  completeStep: (step: string) => Promise<void>;
  refetch: () => Promise<void>;
  showTutorial: boolean;
  hideTutorial: () => void;
}

export function useSimpleTutorial(): UseSimpleTutorialReturn {
  const [tutorialData, setTutorialData] = useState<TutorialData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);

  const fetchTutorialStatus = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/client/tutorial/complete', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch tutorial status');
      }

      const data = await response.json();
      setTutorialData(data);
      
      // Afficher le tutoriel si nécessaire
      if (data.blocksNavigation && !data.tutorialCompleted) {
        setShowTutorial(true);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Error fetching tutorial status:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const completeStep = async (step: string) => {
    try {
      const response = await fetch('/api/client/tutorial/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          step,
          completed: true
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to complete tutorial step');
      }

      const data = await response.json();
      
      // Update local state with the new progress
      if (data.success && tutorialData) {
        const newTutorialData = {
          ...tutorialData,
          tutorialCompleted: data.tutorialCompleted,
          progress: data.tutorialProgress,
          nextStep: data.nextStep,
          blocksNavigation: !data.tutorialCompleted
        };
        
        setTutorialData(newTutorialData);
        
        // Masquer le tutoriel si terminé
        if (data.tutorialCompleted) {
          setShowTutorial(false);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to complete step';
      setError(errorMessage);
      console.error('Error completing tutorial step:', err);
      throw err;
    }
  };

  const hideTutorial = () => {
    // Ne permettre de masquer que si le tutoriel n'est pas bloquant
    if (tutorialData && !tutorialData.blocksNavigation) {
      setShowTutorial(false);
    }
  };

  useEffect(() => {
    fetchTutorialStatus();
  }, []);

  return {
    tutorialData,
    isLoading,
    error,
    completeStep,
    refetch: fetchTutorialStatus,
    showTutorial,
    hideTutorial
  };
}