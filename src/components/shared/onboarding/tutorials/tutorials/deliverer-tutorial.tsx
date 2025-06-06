'use client';

import { useEffect } from 'react';
import { useOnboarding } from '@/components/shared/onboarding/onboarding-context';
import { TutorialStep } from '../../tutorial-step';
import { TutorialProgress } from '../../tutorial-progress';
import { TutorialNavigation } from '../../tutorial-navigation';

// Labels pour les boutons de navigation du tutoriel
const navigationLabels = {
  skip: 'Passer le tutoriel',
  previous: 'Précédent',
  next: 'Suivant',
  finish: 'Terminer',
};

// Définition des étapes du tutoriel livreur avec traductions intégrées
const DELIVERER_TUTORIAL_STEPS = [
  {
    id: 'welcome',
    titleKey: 'steps.welcome.title',
    descriptionKey: 'steps.welcome.description',
    // Fallbacks de traduction pour éviter les erreurs
    title: 'Bienvenue chez EcoDeli',
    description: 'Découvrez comment livrer efficacement avec notre plateforme écologique.',
    image: '/images/onboarding/deliverer/welcome.png',
  },
  {
    id: 'dashboard',
    titleKey: 'steps.dashboard.title',
    descriptionKey: 'steps.dashboard.description',
    title: 'Votre tableau de bord',
    description: "Consultez vos statistiques, revenus et activités récentes en un coup d'œil.",
    image: '/images/onboarding/deliverer/dashboard.png',
  },
  {
    id: 'announcements',
    titleKey: 'steps.announcements.title',
    descriptionKey: 'steps.announcements.description',
    title: 'Annonces de livraison',
    description: 'Parcourez les annonces disponibles et trouvez des opportunités de livraison.',
    image: '/images/onboarding/deliverer/announcements.png',
  },
  {
    id: 'deliveries',
    titleKey: 'steps.deliveries.title',
    descriptionKey: 'steps.deliveries.description',
    title: 'Gestion des livraisons',
    description:
      'Suivez vos livraisons en cours, planifiez votre itinéraire et communiquez avec les clients.',
    image: '/images/onboarding/deliverer/deliveries.png',
  },
  {
    id: 'routes',
    titleKey: 'steps.routes.title',
    descriptionKey: 'steps.routes.description',
    title: "Création d'itinéraires",
    description: 'Optimisez vos trajets et réduisez votre empreinte carbone.',
    image: '/images/onboarding/deliverer/routes.png',
  },
  {
    id: 'payments',
    titleKey: 'steps.payments.title',
    descriptionKey: 'steps.payments.description',
    title: 'Paiements et revenus',
    description: 'Consultez votre historique de paiements et gérez vos revenus.',
    image: '/images/onboarding/deliverer/payments.png',
  },
];

type DelivererTutorialProps = {
  options?: {
    redirectTo?: string;
  };
};

export function DelivererTutorial({ options }: DelivererTutorialProps) {
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
      setStepsConfiguration(0, DELIVERER_TUTORIAL_STEPS.length);
    } else {
      // Fallback pour le cas où setStepsConfiguration n'est pas disponible
      if (typeof window !== 'undefined') {
        localStorage.setItem('tutorial-total-steps', DELIVERER_TUTORIAL_STEPS.length.toString());
      }
    }
  }, [setStepsConfiguration]);

  // Récupérer l'étape actuelle  const currentTutorialStep = DELIVERER_TUTORIAL_STEPS[currentStep];  // Gérer la complétion du tutoriel  const handleComplete = async () => {    await completeOnboarding(options);  };  // Gérer le saut du tutoriel  const handleSkip = async () => {    // Fermer immédiatement la fenêtre pour une meilleure expérience utilisateur    setIsActive(false);    // Puis mettre à jour la base de données    await skipOnboarding(options);  };

  if (!currentTutorialStep) return null;

  const stepsTotalCount = totalSteps || DELIVERER_TUTORIAL_STEPS.length;

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
