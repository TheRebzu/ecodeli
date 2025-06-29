"use client";

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useSimpleTutorial } from '../hooks/useSimpleTutorial';
import SimpleTutorialOverlay from '../components/simple-tutorial-overlay';

interface TutorialProviderProps {
  children: React.ReactNode;
}

export default function TutorialProvider({ children }: TutorialProviderProps) {
  const pathname = usePathname();
  const {
    tutorialData,
    isLoading,
    showTutorial,
    completeStep,
    hideTutorial
  } = useSimpleTutorial();

  // Ne montrer le tutoriel que sur les pages client
  const isClientArea = pathname?.includes('/client');
  const shouldShowTutorial = isClientArea && showTutorial && tutorialData && !tutorialData.tutorialCompleted;

  const handleStepComplete = async (step: string) => {
    try {
      await completeStep(step);
    } catch (error) {
      console.error('Error completing tutorial step:', error);
    }
  };

  const handleTutorialComplete = () => {
    hideTutorial();
  };

  if (isLoading) {
    return <>{children}</>;
  }

  return (
    <>
      {children}
      {shouldShowTutorial && tutorialData && (
        <SimpleTutorialOverlay
          isVisible={shouldShowTutorial}
          tutorialData={tutorialData}
          onStepComplete={handleStepComplete}
          onTutorialComplete={handleTutorialComplete}
        />
      )}
    </>
  );
}