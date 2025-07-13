"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, ArrowRight, ArrowLeft, X } from "lucide-react";
import { useRouter } from "next/navigation";

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  content: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: "welcome",
    title: "Bienvenue sur EcoDeli",
    description: "Découvrez notre plateforme de livraison écologique",
    content:
      "EcoDeli vous permet de créer des annonces pour vos livraisons et de réserver des services à la personne. Notre réseau de livreurs et prestataires vous garantit un service de qualité.",
  },
  {
    id: "announcements",
    title: "Créer une annonce",
    description: "Publiez vos demandes de livraison",
    content:
      "Créez des annonces pour vos colis, courses ou déménagements. Nos livreurs recevront une notification et pourront accepter votre demande.",
    action: {
      label: "Créer ma première annonce",
      href: "/client/announcements/create",
    },
  },
  {
    id: "services",
    title: "Réserver un service",
    description: "Trouvez des prestataires qualifiés",
    content:
      "Réservez des services comme le ménage, le jardinage, la garde d'animaux avec nos prestataires vérifiés.",
    action: {
      label: "Parcourir les services",
      href: "/client/services",
    },
  },
  {
    id: "storage",
    title: "Box de stockage",
    description: "Stockez temporairement vos affaires",
    content:
      "Louez des box de stockage sécurisés dans nos entrepôts pour stocker temporairement vos affaires.",
    action: {
      label: "Voir les box disponibles",
      href: "/client/storage",
    },
  },
  {
    id: "subscription",
    title: "Abonnements Premium",
    description: "Débloquez plus de fonctionnalités",
    content:
      "Passez à un abonnement Starter (9€/mois) ou Premium (19€/mois) pour plus d'annonces et de services prioritaires.",
    action: {
      label: "Voir les abonnements",
      href: "/client/subscription",
    },
  },
];

interface ClientTutorialStepsProps {
  onComplete: () => void;
  onSkip: () => void;
}

export function ClientTutorialSteps({
  onComplete,
  onSkip,
}: ClientTutorialStepsProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const router = useRouter();

  const handleNext = () => {
    setCompletedSteps((prev) => new Set(prev).add(currentStep));

    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepClick = (stepIndex: number) => {
    setCurrentStep(stepIndex);
  };

  const handleComplete = async () => {
    try {
      const response = await fetch("/api/client/tutorial/complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        onComplete();
      }
    } catch (error) {
      console.error("Erreur lors de la completion du tutoriel:", error);
    }
  };

  const handleActionClick = () => {
    const step = TUTORIAL_STEPS[currentStep];
    if (step.action?.onClick) {
      step.action.onClick();
    } else if (step.action?.href) {
      router.push(step.action.href);
    }
  };

  const currentStepData = TUTORIAL_STEPS[currentStep];
  const progress = ((currentStep + 1) / TUTORIAL_STEPS.length) * 100;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Tutoriel EcoDeli</h2>
              <p className="text-gray-600">
                Étape {currentStep + 1} sur {TUTORIAL_STEPS.length}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onSkip}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-4 h-4" />
              Ignorer
            </Button>
          </div>

          {/* Progress bar */}
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Steps indicators */}
          <div className="flex items-center justify-between mt-4">
            {TUTORIAL_STEPS.map((step, index) => (
              <button
                key={step.id}
                onClick={() => handleStepClick(index)}
                className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all ${
                  index === currentStep
                    ? "border-blue-600 bg-blue-600 text-white"
                    : completedSteps.has(index)
                      ? "border-green-600 bg-green-600 text-white"
                      : index < currentStep
                        ? "border-blue-300 bg-blue-100 text-blue-600"
                        : "border-gray-300 bg-gray-100 text-gray-400"
                }`}
              >
                {completedSteps.has(index) ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <span className="text-xs font-medium">{index + 1}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{currentStep + 1}</Badge>
                <CardTitle>{currentStepData.title}</CardTitle>
              </div>
              <CardDescription>{currentStepData.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 leading-relaxed">
                {currentStepData.content}
              </p>

              {currentStepData.action && (
                <div className="mt-6">
                  <Button
                    onClick={handleActionClick}
                    className="w-full"
                    variant="outline"
                  >
                    {currentStepData.action.label}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 0}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Précédent
            </Button>

            <div className="flex gap-2">
              <Button variant="ghost" onClick={onSkip}>
                Ignorer le tutoriel
              </Button>
              <Button onClick={handleNext}>
                {currentStep === TUTORIAL_STEPS.length - 1 ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Terminer
                  </>
                ) : (
                  <>
                    Suivant
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
