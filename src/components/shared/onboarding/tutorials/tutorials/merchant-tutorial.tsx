'use client';

import { useEffect } from 'react';
import { useOnboarding } from '@/components/shared/onboarding/onboarding-context';
import { TutorialStep } from '@/components/shared/onboarding/tutorial-step';
import { TutorialProgress } from '@/components/shared/onboarding/tutorial-progress';
import { TutorialNavigation } from '@/components/shared/onboarding/tutorial-navigation';
import { useTranslations } from 'next-intl';

// Définition des étapes du tutoriel commerçant
const MERCHANT_TUTORIAL_STEPS = [
  {
    id: 'welcome',
    title: 'steps.welcome.title',
    description: 'steps.welcome.description',
    image: '/images/onboarding/merchant/welcome.png',
  },
  {
    id: 'dashboard',
    title: 'steps.dashboard.title',
    description: 'steps.dashboard.description',
    image: '/images/onboarding/merchant/dashboard.png',
  },
  {
    id: 'contract',
    title: 'steps.contract.title',
    description: 'steps.contract.description',
    image: '/images/onboarding/merchant/contract.png',
  },
  {
    id: 'announcements',
    title: 'steps.announcements.title',
    description: 'steps.announcements.description',
    image: '/images/onboarding/merchant/announcements.png',
  },
  {
    id: 'deliveries',
    title: 'steps.deliveries.title',
    description: 'steps.deliveries.description',
    image: '/images/onboarding/merchant/deliveries.png',
  },
  {
    id: 'invoices',
    title: 'steps.invoices.title',
    description: 'steps.invoices.description',
    image: '/images/onboarding/merchant/invoices.png',
  },
];

type MerchantTutorialProps = {
  options?: {
    redirectTo?: string;
  };
};

export function MerchantTutorial({ options }: MerchantTutorialProps) {
  const {
    currentStep,
    totalSteps,
    goToNextStep,
    goToPreviousStep,
    completeOnboarding,
    skipOnboarding,
    isCompleting = false,
    setStepsConfiguration,
  } = useOnboarding();

  const t = useTranslations('Merchant.Onboarding');

  // Initialiser le tutoriel avec le bon nombre d'étapes
  useEffect(() => {
    if (setStepsConfiguration) {
      setStepsConfiguration(0, MERCHANT_TUTORIAL_STEPS.length);
    } else {
      // Fallback pour le cas où setStepsConfiguration n'est pas disponible
      if (typeof window !== 'undefined') {
        localStorage.setItem('tutorial-total-steps', MERCHANT_TUTORIAL_STEPS.length.toString());
      }
    }
  }, [setStepsConfiguration]);

  // Récupérer l'étape actuelle
  const currentTutorialStep = MERCHANT_TUTORIAL_STEPS[currentStep];

  // Gérer la complétion du tutoriel
  const handleComplete = async () => {
    await completeOnboarding(options);
  };

  // Gérer le saut du tutoriel
  const handleSkip = async () => {
    await skipOnboarding(options);
  };

  if (!currentTutorialStep) return null;

  const stepsTotalCount = totalSteps || MERCHANT_TUTORIAL_STEPS.length;

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <TutorialStep
        title={t(currentTutorialStep.title)}
        description={t(currentTutorialStep.description)}
        image={currentTutorialStep.image}
        footer={
          <TutorialNavigation
            currentStep={currentStep}
            totalSteps={stepsTotalCount}
            onNext={goToNextStep}
            onPrevious={goToPreviousStep}
            onSkip={handleSkip}
            onComplete={handleComplete}
            isLoading={isCompleting}
          />
        }
      >
        <TutorialProgress currentStep={currentStep} totalSteps={stepsTotalCount} />
      </TutorialStep>
    </div>
  );
}
