'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/common';

// Définition des libellés par défaut directement dans le composant
const DEFAULT_LABELS = {
  skip: 'Passer le tutoriel',
  previous: 'Précédent',
  next: 'Suivant',
  finish: 'Terminer',
};

type TutorialNavigationProps = {
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onPrevious: () => void;
  onSkip: () => void;
  onComplete: () => void;
  isLoading?: boolean;
  className?: string;
  labels?: {
    skip?: string;
    previous?: string;
    next?: string;
    finish?: string;
  };
};

export function TutorialNavigation({
  currentStep,
  totalSteps,
  onNext,
  onPrevious,
  onSkip,
  onComplete,
  isLoading = false,
  className,
  labels = DEFAULT_LABELS,
}: TutorialNavigationProps) {
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;
  const [isSkipping, setIsSkipping] = useState(false);

  // Fusionner les libellés par défaut avec ceux fournis par les props
  const mergedLabels = {
    ...DEFAULT_LABELS,
    ...labels,
  };

  const handleSkip = async () => {
    setIsSkipping(true);
    await onSkip();
    setIsSkipping(false);
  };

  return (
    <div className={cn('flex justify-between w-full', className)}>
      <div>
        {isFirstStep ? (
          <Button variant="ghost" onClick={handleSkip} disabled={isLoading || isSkipping}>
            {isSkipping ? 'Fermeture...' : mergedLabels.skip}
          </Button>
        ) : (
          <Button variant="outline" onClick={onPrevious} disabled={isLoading || isSkipping}>
            {mergedLabels.previous}
          </Button>
        )}
      </div>

      <div>
        <Button onClick={isLastStep ? onComplete : onNext} disabled={isLoading || isSkipping}>
          {isLastStep ? mergedLabels.finish : mergedLabels.next}
        </Button>
      </div>
    </div>
  );
}
