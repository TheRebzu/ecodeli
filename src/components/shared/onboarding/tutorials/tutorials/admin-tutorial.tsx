'use client';

import { useEffect } from 'react';
import { useOnboarding } from '@/context/onboarding-context';
import { TutorialStep } from '../tutorial-step';
import { TutorialProgress } from '../tutorial-progress';
import { TutorialNavigation } from '../tutorial-navigation';

// Labels pour les boutons de navigation du tutoriel
const navigationLabels = {
  skip: 'Passer le tutoriel',
  previous: 'Précédent',
  next: 'Suivant',
  finish: 'Terminer',
};

// Définition des étapes du tutoriel administrateur
const ADMIN_TUTORIAL_STEPS = [
  {
    id: 'welcome',
    titleKey: 'steps.admin.welcome.title',
    descriptionKey: 'steps.admin.welcome.description',
    // Fallbacks de traduction pour éviter les erreurs
    title: 'Bienvenue sur le panneau administrateur',
    description: 'Découvrez comment gérer efficacement la plateforme EcoDeli.',
    image: '/images/onboarding/admin/welcome.png',
  },
  {
    id: 'user-management',
    titleKey: 'steps.admin.users.title',
    descriptionKey: 'steps.admin.users.description',
    title: 'Gestion des utilisateurs',
    description: 'Gérez les utilisateurs, leurs rôles et leurs permissions sur la plateforme.',
    image: '/images/onboarding/admin/users.png',
  },
  {
    id: 'verification',
    titleKey: 'steps.admin.verification.title',
    descriptionKey: 'steps.admin.verification.description',
    title: 'Vérification des documents',
    description: 'Validez les documents soumis par les livreurs, commerçants et prestataires.',
    image: '/images/onboarding/admin/verification.png',
  },
  {
    id: 'dashboard',
    titleKey: 'steps.admin.dashboard.title',
    descriptionKey: 'steps.admin.dashboard.description',
    title: 'Tableau de bord administratif',
    description: 'Suivez les statistiques importantes et les indicateurs clés de performance.',
    image: '/images/onboarding/admin/dashboard.png',
  },
  {
    id: 'settings',
    titleKey: 'steps.admin.settings.title',
    descriptionKey: 'steps.admin.settings.description',
    title: 'Paramètres de la plateforme',
    description: 'Configurez les paramètres globaux et les options de la plateforme.',
    image: '/images/onboarding/admin/settings.png',
  },
];

type AdminTutorialProps = {
  options?: {
    redirectTo?: string;
  };
};

export function AdminTutorial({ options }: AdminTutorialProps) {
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

  // Initialiser le tutoriel avec le bon nombre d'étapes
  useEffect(() => {
    if (setStepsConfiguration) {
      setStepsConfiguration(0, ADMIN_TUTORIAL_STEPS.length);
    } else {
      // Fallback pour le cas où setStepsConfiguration n'est pas disponible
      if (typeof window !== 'undefined') {
        localStorage.setItem('tutorial-total-steps', ADMIN_TUTORIAL_STEPS.length.toString());
      }
    }
  }, [setStepsConfiguration]);

  // Récupérer l'étape actuelle
  const currentTutorialStep = ADMIN_TUTORIAL_STEPS[currentStep];

  // Gérer la complétion du tutoriel
  const handleComplete = async () => {
    await completeOnboarding(options);
  };

  // Gérer le saut du tutoriel
  const handleSkip = async () => {
    await skipOnboarding(options);
  };

  if (!currentTutorialStep) return null;

  const stepsTotalCount = totalSteps || ADMIN_TUTORIAL_STEPS.length;

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <TutorialStep
        title={currentTutorialStep.title}
        description={currentTutorialStep.description}
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
            labels={navigationLabels}
          />
        }
      >
        <TutorialProgress currentStep={currentStep} totalSteps={stepsTotalCount} />
      </TutorialStep>
    </div>
  );
}
