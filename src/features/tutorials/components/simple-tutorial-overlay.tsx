"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslations } from "next-intl";
import {
  Package,
  Calendar,
  CreditCard,
  MapPin,
  CheckCircle,
  ArrowRight,
  Star,
  X
} from "lucide-react";

interface SimpleTutorialOverlayProps {
  isVisible: boolean;
  tutorialData: {
    tutorialCompleted: boolean;
    progress: {
      createAnnouncement: boolean;
      makeBooking: boolean;
      viewPayments: boolean;
      trackDelivery: boolean;
    };
    nextStep: string | null;
    blocksNavigation: boolean;
  };
  onStepComplete: (step: string) => Promise<void>;
  onTutorialComplete: () => void;
}

const TUTORIAL_STEPS = [
  {
    id: "CREATE_ANNOUNCEMENT",
    icon: <Package className="h-8 w-8" />,
    title: "Créer une annonce",
    description: "Apprenez à publier votre première annonce de livraison",
    content: "Cliquez sur 'Créer une annonce' pour déposer une demande de livraison. Vous pourrez définir vos adresses de collecte et de livraison, ainsi que le prix que vous êtes prêt à payer.",
    action: "Créer ma première annonce"
  },
  {
    id: "MAKE_BOOKING",
    icon: <Calendar className="h-8 w-8" />,
    title: "Réserver un service",
    description: "Découvrez comment réserver un service à la personne",
    content: "Explorez nos services à domicile : ménage, jardinage, réparations... Réservez facilement un créneau avec un prestataire qualifié.",
    action: "Explorer les services"
  },
  {
    id: "VIEW_PAYMENTS",
    icon: <CreditCard className="h-8 w-8" />,
    title: "Gérer les paiements",
    description: "Consultez vos factures et moyens de paiement",
    content: "Accédez à votre historique de paiements, gérez vos moyens de paiement et consultez vos factures en toute sécurité.",
    action: "Voir mes paiements"
  },
  {
    id: "TRACK_DELIVERY",
    icon: <MapPin className="h-8 w-8" />,
    title: "Suivre une livraison",
    description: "Apprenez à suivre vos livraisons en temps réel",
    content: "Surveillez l'avancement de vos livraisons, communiquez avec votre livreur et recevez des notifications à chaque étape.",
    action: "Suivre une livraison"
  }
];

export default function SimpleTutorialOverlay({
  isVisible,
  tutorialData,
  onStepComplete,
  onTutorialComplete
}: SimpleTutorialOverlayProps) {
  const t = useTranslations("client.tutorial");
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completing, setCompleting] = useState(false);

  const completedSteps = Object.values(tutorialData.progress).filter(Boolean).length;
  const progressPercentage = (completedSteps / TUTORIAL_STEPS.length) * 100;

  useEffect(() => {
    if (tutorialData.nextStep) {
      const stepIndex = TUTORIAL_STEPS.findIndex(step => step.id === tutorialData.nextStep);
      if (stepIndex !== -1) {
        setCurrentStepIndex(stepIndex);
      }
    }
  }, [tutorialData.nextStep]);

  const currentStep = TUTORIAL_STEPS[currentStepIndex];
  const isStepCompleted = currentStep && tutorialData.progress[currentStep.id as keyof typeof tutorialData.progress];

  const handleStepComplete = async () => {
    if (!currentStep || completing) return;

    setCompleting(true);
    try {
      await onStepComplete(currentStep.id);
      
      // Si toutes les étapes sont complétées
      if (completedSteps === TUTORIAL_STEPS.length - 1) {
        onTutorialComplete();
      } else {
        // Passer à l'étape suivante non complétée
        const nextIncompleteIndex = TUTORIAL_STEPS.findIndex((step, index) => 
          index > currentStepIndex && !tutorialData.progress[step.id as keyof typeof tutorialData.progress]
        );
        if (nextIncompleteIndex !== -1) {
          setCurrentStepIndex(nextIncompleteIndex);
        }
      }
    } catch (error) {
      console.error("Error completing step:", error);
    } finally {
      setCompleting(false);
    }
  };

  const goToStep = (stepIndex: number) => {
    setCurrentStepIndex(stepIndex);
  };

  if (!isVisible || tutorialData.tutorialCompleted) {
    return null;
  }

  return (
    <Dialog 
      open={isVisible} 
      onOpenChange={() => {}}
    >
      <DialogContent 
        className="max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onPointerDownOutside={(e) => tutorialData.blocksNavigation && e.preventDefault()}
        onEscapeKeyDown={(e) => tutorialData.blocksNavigation && e.preventDefault()}
      >
        <div className="p-6">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="p-3 bg-green-100 rounded-full">
                <Star className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Bienvenue sur EcoDeli
                </h1>
                <p className="text-gray-600">
                  Découvrez toutes les fonctionnalités en 4 étapes simples
                </p>
              </div>
            </div>
            
            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Progression du tutoriel</span>
                <span>{Math.round(progressPercentage)}%</span>
              </div>
              <Progress value={progressPercentage} className="h-3" />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Steps Navigation */}
            <div className="lg:col-span-1">
              <h3 className="font-semibold text-gray-900 mb-4">Étapes du tutoriel</h3>
              <div className="space-y-3">
                {TUTORIAL_STEPS.map((step, index) => {
                  const isCompleted = tutorialData.progress[step.id as keyof typeof tutorialData.progress];
                  const isCurrent = index === currentStepIndex;
                  
                  return (
                    <button
                      key={step.id}
                      onClick={() => goToStep(index)}
                      className={`w-full text-left p-4 rounded-lg border transition-all ${
                        isCurrent
                          ? 'border-blue-500 bg-blue-50 shadow-sm'
                          : isCompleted
                          ? 'border-green-300 bg-green-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          isCompleted
                            ? 'bg-green-100 text-green-600'
                            : isCurrent
                            ? 'bg-blue-100 text-blue-600'
                            : 'bg-gray-100 text-gray-400'
                        }`}>
                          {isCompleted ? (
                            <CheckCircle className="h-5 w-5" />
                          ) : (
                            step.icon
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{step.title}</p>
                          <p className="text-xs text-gray-500 mt-1">{step.description}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Current Step Content */}
            <div className="lg:col-span-2">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4 mb-6">
                    <div className="p-3 bg-blue-100 rounded-lg">
                      {currentStep.icon}
                    </div>
                    <div className="flex-1">
                      <h2 className="text-xl font-semibold text-gray-900 mb-2">
                        {currentStep.title}
                      </h2>
                      <p className="text-gray-600 mb-4">
                        {currentStep.description}
                      </p>
                      <p className="text-gray-700 leading-relaxed">
                        {currentStep.content}
                      </p>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-700 mb-3">
                      Pour continuer, vous devez terminer cette étape :
                    </p>
                    <Button
                      onClick={handleStepComplete}
                      disabled={isStepCompleted || completing}
                      className="w-full"
                      size="lg"
                    >
                      {isStepCompleted ? (
                        <>
                          <CheckCircle className="h-5 w-5 mr-2" />
                          Étape terminée
                        </>
                      ) : completing ? (
                        "Validation en cours..."
                      ) : (
                        <>
                          {currentStep.action}
                          <ArrowRight className="h-5 w-5 ml-2" />
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Navigation Buttons */}
                  <div className="flex justify-between mt-6 pt-4 border-t">
                    <Button
                      variant="outline"
                      onClick={() => currentStepIndex > 0 && setCurrentStepIndex(currentStepIndex - 1)}
                      disabled={currentStepIndex === 0}
                    >
                      Précédent
                    </Button>
                    
                    <div className="flex gap-2">
                      {TUTORIAL_STEPS.map((_, index) => (
                        <div
                          key={index}
                          className={`w-2 h-2 rounded-full ${
                            index === currentStepIndex
                              ? 'bg-blue-500'
                              : tutorialData.progress[TUTORIAL_STEPS[index].id as keyof typeof tutorialData.progress]
                              ? 'bg-green-500'
                              : 'bg-gray-300'
                          }`}
                        />
                      ))}
                    </div>

                    <Button
                      variant="outline"
                      onClick={() => currentStepIndex < TUTORIAL_STEPS.length - 1 && setCurrentStepIndex(currentStepIndex + 1)}
                      disabled={currentStepIndex === TUTORIAL_STEPS.length - 1}
                    >
                      Suivant
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Warning Message */}
              {tutorialData.blocksNavigation && (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <div className="p-1">
                      <svg className="h-5 w-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-yellow-800">
                        Tutoriel obligatoire
                      </p>
                      <p className="text-sm text-yellow-700 mt-1">
                        Vous devez terminer ce tutoriel pour pouvoir naviguer librement dans l'application.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}