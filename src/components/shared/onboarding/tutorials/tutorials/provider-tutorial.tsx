"use client";

import { useEffect } from "react";
import { useOnboarding } from "@/components/shared/onboarding/onboarding-context";
import { TutorialStep } from "@/components/shared/onboarding/tutorial-step";
import { TutorialProgress } from "@/components/shared/onboarding/tutorial-progress";
import { TutorialNavigation } from "@/components/shared/onboarding/tutorial-navigation";
import { useTranslations } from "next-intl";

// Définition des étapes du tutoriel prestataire
const PROVIDER_TUTORIAL_STEPS = [
  {
    id: "welcome",
    title: "steps.welcome.title",
    description: "steps.welcome.description",
    image: "/images/onboarding/provider/welcome.png"},
  {
    id: "dashboard",
    title: "steps.dashboard.title",
    description: "steps.dashboard.description",
    image: "/images/onboarding/provider/dashboard.png"},
  {
    id: "services",
    title: "steps.services.title",
    description: "steps.services.description",
    image: "/images/onboarding/provider/services.png"},
  {
    id: "appointments",
    title: "steps.appointments.title",
    description: "steps.appointments.description",
    image: "/images/onboarding/provider/appointments.png"},
  {
    id: "schedule",
    title: "steps.schedule.title",
    description: "steps.schedule.description",
    image: "/images/onboarding/provider/schedule.png"},
  {
    id: "ratings",
    title: "steps.ratings.title",
    description: "steps.ratings.description",
    image: "/images/onboarding/provider/ratings.png"}];

type ProviderTutorialProps = {
  options?: {
    redirectTo?: string;
  };
};

export function ProviderTutorial({ options }: ProviderTutorialProps) {
  const {
    currentStep,
    totalSteps,
    goToNextStep,
    goToPreviousStep,
    completeOnboarding,
    skipOnboarding} = useOnboarding();

  const t = useTranslations("Provider.Onboarding");

  // Initialiser le tutoriel avec le bon nombre d'étapes
  useEffect(() => {
    // Nous devons ajouter setStepsConfiguration au contexte d'onboarding
    if (typeof window !== "undefined") {
      // Fallback temporaire en attendant la mise à jour du contexte
      localStorage.setItem(
        "tutorial-total-steps",
        PROVIDER_TUTORIAL_STEPS.length.toString(),
      );
    }
  }, []);

  // Récupérer l'étape actuelle
  const currentTutorialStep = PROVIDER_TUTORIAL_STEPS[currentStep];

  // Gérer la complétion du tutoriel
  const handleComplete = async () => {
    await completeOnboarding(options);
  };

  // Gérer le saut du tutoriel
  const handleSkip = async () => {
    await skipOnboarding(options);
  };

  if (!currentTutorialStep) return null;

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <TutorialStep
        title={t(currentTutorialStep.title)}
        description={t(currentTutorialStep.description)}
        image={currentTutorialStep.image}
        footer={
          <TutorialNavigation
            currentStep={currentStep}
            totalSteps={totalSteps || PROVIDER_TUTORIAL_STEPS.length}
            onNext={goToNextStep}
            onPrevious={goToPreviousStep}
            onSkip={handleSkip}
            onComplete={handleComplete}
            isLoading={false}
          />
        }
      >
        <TutorialProgress
          currentStep={currentStep}
          totalSteps={totalSteps || PROVIDER_TUTORIAL_STEPS.length}
        />
      </TutorialStep>
    </div>
  );
}
