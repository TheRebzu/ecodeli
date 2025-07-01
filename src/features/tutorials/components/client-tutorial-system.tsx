"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { X, ArrowRight, ArrowLeft, HelpCircle } from "lucide-react";
import { useTranslations } from "next-intl";

interface ClientTutorialSystemProps {
  userId: string;
  onComplete?: () => void;
  forceTutorial?: boolean;
}

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  target: string;
  position: "top" | "bottom" | "left" | "right";
  action?: "click" | "input" | "scroll" | "wait";
  content?: string;
  image?: string;
  video?: string;
  highlightClass?: string;
  blockInteraction?: boolean;
}

interface TutorialProgress {
  currentStep: number;
  completedSteps: string[] | number;
  isCompleted: boolean;
  lastCompletedAt?: string;
  skipped: boolean;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: "welcome",
    title: "Bienvenue sur EcoDeli !",
    description: "Nous allons vous guider à travers les fonctionnalités principales de la plateforme.",
    target: "body",
    position: "top",
    blockInteraction: true
  },
  {
    id: "navigation",
    title: "Navigation principale",
    description: "Voici le menu principal. Vous pouvez naviguer entre les différentes sections.",
    target: "[data-tutorial='main-nav']",
    position: "bottom",
    highlightClass: "ring-2 ring-blue-500 ring-opacity-75"
  },
  {
    id: "create-announcement",
    title: "Créer une annonce",
    description: "Cliquez ici pour créer votre première annonce de livraison.",
    target: "[data-tutorial='create-announcement']",
    position: "bottom",
    action: "click",
    highlightClass: "ring-2 ring-green-500 ring-opacity-75"
  },
  {
    id: "announcement-form",
    title: "Formulaire d'annonce",
    description: "Remplissez les détails de votre livraison : adresses, description, prix estimé.",
    target: "[data-tutorial='announcement-form']",
    position: "right",
    blockInteraction: false
  },
  {
    id: "address-input",
    title: "Saisie des adresses",
    description: "Commencez par saisir l'adresse de collecte et de livraison.",
    target: "[data-tutorial='address-input']",
    position: "top",
    action: "input",
    content: "123 Rue de la Paix, Paris"
  },
  {
    id: "price-estimation",
    title: "Estimation du prix",
    description: "Le système calcule automatiquement une estimation basée sur la distance et le type de livraison.",
    target: "[data-tutorial='price-estimation']",
    position: "left"
  },
  {
    id: "payment-methods",
    title: "Méthodes de paiement",
    description: "Choisissez votre mode de paiement préféré. Plusieurs options sont disponibles.",
    target: "[data-tutorial='payment-methods']",
    position: "top"
  },
  {
    id: "tracking",
    title: "Suivi en temps réel",
    description: "Une fois votre annonce acceptée, vous pourrez suivre la livraison en temps réel.",
    target: "[data-tutorial='tracking-section']",
    position: "bottom"
  },
  {
    id: "notifications",
    title: "Notifications",
    description: "Activez les notifications pour être informé des mises à jour de vos livraisons.",
    target: "[data-tutorial='notifications']",
    position: "left"
  },
  {
    id: "profile",
    title: "Votre profil",
    description: "Gérez vos informations personnelles et vos préférences depuis votre profil.",
    target: "[data-tutorial='profile-menu']",
    position: "bottom"
  },
  {
    id: "support",
    title: "Support client",
    description: "En cas de question, notre équipe support est disponible 24h/24.",
    target: "[data-tutorial='support-button']",
    position: "top"
  },
  {
    id: "completion",
    title: "Félicitations !",
    description: "Vous avez terminé le tutoriel. Vous êtes maintenant prêt à utiliser EcoDeli !",
    target: "body",
    position: "top",
    blockInteraction: true
  }
];

export default function ClientTutorialSystem({ userId, onComplete, forceTutorial = false }: ClientTutorialSystemProps) {
  const t = useTranslations("client.tutorial");
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState<TutorialProgress>({
    currentStep: 0,
    completedSteps: [],
    isCompleted: false,
    skipped: false
  });

  useEffect(() => {
    checkTutorialStatus();
    return () => {
      cleanupTutorial();
    };
  }, [userId]);

  useEffect(() => {
    if (!isActive) {
      cleanupTutorial();
    }
  }, [isActive]);


  const checkTutorialStatus = async () => {
    try {
      const response = await fetch(`/api/client/tutorial?userId=${userId}`);
      
      if (response.ok) {
        const data = await response.json();
        
        // Vérifier si l'utilisateur existe avant de continuer
        if (data.success === false || data.message?.includes('non trouvé')) {
          setIsActive(false);
          cleanupTutorial();
          return;
        }
        
        setProgress(data.progress || {
          currentStep: 0,
          completedSteps: [],
          isCompleted: false,
          skipped: false
        });
        
        // Activer le tutoriel seulement si :
        // 1. Il est requis par le système (nouvel utilisateur)
        // 2. OU si forcé manuellement
        const shouldActivate = data.tutorialRequired || forceTutorial;
        
        if (shouldActivate) {
          setIsActive(true);
          setCurrentStep(data.progress?.currentStep || 0);
        } else {
          setIsActive(false);
          cleanupTutorial();
        }
      } else {
        setIsActive(false);
        cleanupTutorial();
      }
    } catch (error) {
      console.error("Error checking tutorial status:", error);
      setIsActive(false);
      cleanupTutorial();
    }
  };

  const updateTutorialProgress = async (stepData: Partial<TutorialProgress>) => {
    try {
      const response = await fetch("/api/client/tutorial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          ...stepData
        })
      });
      
      if (!response.ok) {
        setIsActive(false);
      }
    } catch (error) {
      console.error("Error updating tutorial progress:", error);
      setIsActive(false);
    }
  };

  // Fonctions simplifiées supprimées - on garde seulement l'interface simple

  const nextStep = () => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      const newStep = currentStep + 1;
      setCurrentStep(newStep);
      updateTutorialProgress({
        currentStep: newStep,
        completedSteps: Array.isArray(progress.completedSteps) 
          ? [...progress.completedSteps, TUTORIAL_STEPS[currentStep].id]
          : [TUTORIAL_STEPS[currentStep].id]
      });
    } else {
      completeTutorial();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      const newStep = currentStep - 1;
      setCurrentStep(newStep);
      updateTutorialProgress({ currentStep: newStep });
    }
  };

  const skipTutorial = async () => {
    await updateTutorialProgress({
      skipped: true,
      isCompleted: false
    });
    closeTutorial();
  };

  const completeTutorial = async () => {
    await updateTutorialProgress({
      isCompleted: true,
      completedSteps: TUTORIAL_STEPS.map(s => s.id),
      lastCompletedAt: new Date().toISOString(),
      currentStep: TUTORIAL_STEPS.length - 1
    });
    
    closeTutorial();
    onComplete?.();
  };

  const closeTutorial = () => {
    setIsActive(false);
    setIsPlaying(false);
    cleanupTutorial();
  };

  const restartTutorial = () => {
    setCurrentStep(0);
    setIsActive(true);
    updateTutorialProgress({
      currentStep: 0,
      completedSteps: [],
      isCompleted: false,
      skipped: false
    });
  };

  const cleanupTutorial = () => {
    // Supprimer tous les éléments du tutoriel qui pourraient rester
    const overlayElement = document.getElementById("tutorial-overlay");
    if (overlayElement) {
      overlayElement.remove();
    }

    const tooltipElement = document.getElementById("tutorial-tooltip");
    if (tooltipElement) {
      tooltipElement.remove();
    }

    // Supprimer les highlights
    document.querySelectorAll("[data-tutorial-highlight]").forEach(el => {
      el.removeAttribute("data-tutorial-highlight");
      el.classList.remove("ring-2", "ring-blue-500", "ring-green-500", "ring-opacity-75");
    });
  };

  // Interface de contrôle du tutoriel
  return (
    <>
      {/* Bouton pour relancer le tutoriel (seulement si complété) */}
      {!isActive && progress.isCompleted && (
        <div className="fixed bottom-6 right-6 z-50">
          <Button
            onClick={() => {
              setIsActive(true);
              setCurrentStep(0);
            }}
            variant="outline"
            size="sm"
            className="bg-white shadow-lg border-blue-200 hover:border-blue-300"
          >
            <HelpCircle className="h-4 w-4 mr-2" />
            Relancer le tutoriel
          </Button>
        </div>
      )}

      {/* Interface du tutoriel actif */}
      {isActive && (
        <div className="fixed top-6 right-6 z-50">
          <Card className="w-96 shadow-xl border-blue-200">
            <CardHeader className="pb-3 bg-blue-50">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg text-blue-900">🎓 Tutoriel EcoDeli</CardTitle>
                <Button variant="ghost" size="sm" onClick={closeTutorial}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
              {/* Barre de progression */}
              <div>
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Étape {currentStep + 1} sur {TUTORIAL_STEPS.length}</span>
                  <span>{Math.round(((currentStep + 1) / TUTORIAL_STEPS.length) * 100)}%</span>
                </div>
                <Progress value={((currentStep + 1) / TUTORIAL_STEPS.length) * 100} className="h-2" />
              </div>

              {/* Contenu de l'étape */}
              <div className="min-h-[120px]">
                <h4 className="font-semibold text-lg mb-2 text-gray-900">
                  {TUTORIAL_STEPS[currentStep]?.title}
                </h4>
                <p className="text-gray-600 leading-relaxed">
                  {TUTORIAL_STEPS[currentStep]?.description}
                </p>
              </div>

              {/* Contrôles */}
              <div className="flex justify-between items-center pt-4 border-t">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={skipTutorial}
                  className="text-gray-500 hover:text-gray-700"
                >
                  Passer le tutoriel
                </Button>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={prevStep}
                    disabled={currentStep === 0}
                  >
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Précédent
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={currentStep === TUTORIAL_STEPS.length - 1 ? completeTutorial : nextStep}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {currentStep === TUTORIAL_STEPS.length - 1 ? "Terminer" : "Continuer"}
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}