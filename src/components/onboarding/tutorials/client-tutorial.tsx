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

// Définition des étapes du tutoriel client avec traductions intégrées
const CLIENT_TUTORIAL_STEPS = [
  {
    id: 'welcome',
    titleKey: 'steps.welcome.title',
    descriptionKey: 'steps.welcome.description',
    // Fallbacks de traduction pour éviter les erreurs
    title: 'Bienvenue chez EcoDeli',
    description: 'Découvrez comment utiliser notre plateforme écologique pour vos livraisons.',
    image: '/images/onboarding/client/welcome.png',
  },
  {
    id: 'dashboard',
    titleKey: 'steps.dashboard.title',
    descriptionKey: 'steps.dashboard.description',
    title: 'Votre tableau de bord',
    description: "Consultez vos commandes récentes et l'état de vos livraisons en un coup d'œil.",
    image: '/images/onboarding/client/dashboard.png',
  },
  {
    id: 'announcements',
    titleKey: 'steps.announcements.title',
    descriptionKey: 'steps.announcements.description',
    title: 'Annonces et demandes',
    description: 'Créez et gérez vos annonces de livraison pour trouver des livreurs rapidement.',
    image: '/images/onboarding/client/announcements.png',
  },
  {
    id: 'deliveries',
    titleKey: 'steps.deliveries.title',
    descriptionKey: 'steps.deliveries.description',
    title: 'Suivi des livraisons',
    description:
      "Suivez en temps réel l'état de vos livraisons et évaluez vos livreurs après chaque service.",
    image: '/images/onboarding/client/deliveries.png',
  },
  {
    id: 'services',
    titleKey: 'steps.services.title',
    descriptionKey: 'steps.services.description',
    title: 'Services disponibles',
    description: 'Découvrez les services écologiques proposés par nos partenaires.',
    image: '/images/onboarding/client/services.png',
  },
  {
    id: 'storage',
    titleKey: 'steps.storage.title',
    descriptionKey: 'steps.storage.description',
    title: 'Gestion du stockage',
    description: 'Gérez vos boîtes et emballages réutilisables pour une logistique durable.',
    image: '/images/onboarding/client/storage.png',
  },
];

type ClientTutorialProps = {
  options?: {
    redirectTo?: string;
  };
};

export function ClientTutorial({ options }: ClientTutorialProps) {
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
      setStepsConfiguration(0, CLIENT_TUTORIAL_STEPS.length);
    } else {
      // Fallback pour le cas où setStepsConfiguration n'est pas disponible
      if (typeof window !== 'undefined') {
        localStorage.setItem('tutorial-total-steps', CLIENT_TUTORIAL_STEPS.length.toString());
      }
    }
  }, [setStepsConfiguration]);

  // Récupérer l'étape actuelle
  const currentTutorialStep = CLIENT_TUTORIAL_STEPS[currentStep];

  // Gérer la complétion du tutoriel
  const handleComplete = async () => {
    await completeOnboarding(options);
  };

  // Gérer le saut du tutoriel
  const handleSkip = async () => {
    await skipOnboarding(options);
  };

  if (!currentTutorialStep) return null;

  const stepsTotalCount = totalSteps || CLIENT_TUTORIAL_STEPS.length;

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
