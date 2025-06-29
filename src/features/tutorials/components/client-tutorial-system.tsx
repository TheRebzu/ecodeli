"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { X, ArrowRight, ArrowLeft, Play, Pause, RotateCcw, CheckCircle, Circle, HelpCircle } from "lucide-react";
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
  completedSteps: string[];
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
  const [overlay, setOverlay] = useState<HTMLDivElement | null>(null);
  const [tooltip, setTooltip] = useState<HTMLDivElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [autoAdvance, setAutoAdvance] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    checkTutorialStatus();
    return () => {
      cleanupTutorial();
    };
  }, [userId]);

  useEffect(() => {
    if (isActive) {
      showCurrentStep();
    } else {
      cleanupTutorial();
    }
  }, [isActive, currentStep]);

  useEffect(() => {
    if (isPlaying && autoAdvance) {
      intervalRef.current = setInterval(() => {
        nextStep();
      }, 5000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, autoAdvance, currentStep]);

  const checkTutorialStatus = async () => {
    try {
      const response = await fetch(`/api/client/tutorial?userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        
        // Vérifier si l'utilisateur existe avant de continuer
        if (data.success === false || data.message?.includes('non trouvé')) {
          console.warn('Utilisateur non trouvé, désactivation du tutoriel');
          setIsActive(false);
          return;
        }
        
        setProgress(data.progress);
        
        if (forceTutorial || (!data.progress?.isCompleted && !data.progress?.skipped)) {
          setIsActive(true);
          setCurrentStep(data.progress?.currentStep || 0);
        }
      }
    } catch (error) {
      console.error("Error checking tutorial status:", error);
      // Ne pas activer le tutoriel en cas d'erreur
      setIsActive(false);
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
        console.warn('Erreur lors de la mise à jour du tutoriel, arrêt');
        setIsActive(false);
      }
    } catch (error) {
      console.error("Error updating tutorial progress:", error);
      setIsActive(false); // Arrêter le tutoriel en cas d'erreur
    }
  };

  const createOverlay = () => {
    const existingOverlay = document.getElementById("tutorial-overlay");
    if (existingOverlay) {
      existingOverlay.remove();
    }

    const overlayDiv = document.createElement("div");
    overlayDiv.id = "tutorial-overlay";
    overlayDiv.className = "fixed inset-0 z-[9998] pointer-events-none";
    overlayDiv.style.background = "rgba(0, 0, 0, 0.7)";
    document.body.appendChild(overlayDiv);
    setOverlay(overlayDiv);

    return overlayDiv;
  };

  const createTooltip = (step: TutorialStep, targetElement: Element) => {
    const existingTooltip = document.getElementById("tutorial-tooltip");
    if (existingTooltip) {
      existingTooltip.remove();
    }

    const tooltipDiv = document.createElement("div");
    tooltipDiv.id = "tutorial-tooltip";
    tooltipDiv.className = "fixed z-[9999] bg-white rounded-lg shadow-xl border max-w-sm";
    
    const rect = targetElement.getBoundingClientRect();
    let top, left;

    switch (step.position) {
      case "top":
        top = rect.top - 20;
        left = rect.left + rect.width / 2;
        tooltipDiv.style.transform = "translate(-50%, -100%)";
        break;
      case "bottom":
        top = rect.bottom + 20;
        left = rect.left + rect.width / 2;
        tooltipDiv.style.transform = "translate(-50%, 0)";
        break;
      case "left":
        top = rect.top + rect.height / 2;
        left = rect.left - 20;
        tooltipDiv.style.transform = "translate(-100%, -50%)";
        break;
      case "right":
        top = rect.top + rect.height / 2;
        left = rect.right + 20;
        tooltipDiv.style.transform = "translate(0, -50%)";
        break;
    }

    tooltipDiv.style.top = `${top}px`;
    tooltipDiv.style.left = `${left}px`;

    tooltipDiv.innerHTML = `
      <div class="p-4">
        <div class="flex justify-between items-start mb-2">
          <h3 class="font-semibold text-lg">${step.title}</h3>
          <button id="tutorial-close" class="text-gray-500 hover:text-gray-700">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        <p class="text-gray-600 mb-4">${step.description}</p>
        
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="text-sm text-gray-500">${currentStep + 1}/${TUTORIAL_STEPS.length}</span>
            <div class="w-20 h-2 bg-gray-200 rounded">
              <div class="h-2 bg-blue-500 rounded" style="width: ${((currentStep + 1) / TUTORIAL_STEPS.length) * 100}%"></div>
            </div>
          </div>
          
          <div class="flex items-center gap-2">
            <button id="tutorial-play-pause" class="p-1 rounded ${isPlaying ? 'text-orange-500' : 'text-green-500'}">
              ${isPlaying ? 
                '<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/></svg>' :
                '<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>'
              }
            </button>
            
            ${currentStep > 0 ? `
              <button id="tutorial-prev" class="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded">
                Précédent
              </button>
            ` : ''}
            
            <button id="tutorial-next" class="px-3 py-1 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded">
              ${currentStep === TUTORIAL_STEPS.length - 1 ? 'Terminer' : 'Suivant'}
            </button>
            
            <button id="tutorial-skip" class="px-3 py-1 text-sm text-gray-500 hover:text-gray-700">
              Passer
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(tooltipDiv);
    setTooltip(tooltipDiv);

    // Ajouter les event listeners
    document.getElementById("tutorial-close")?.addEventListener("click", closeTutorial);
    document.getElementById("tutorial-next")?.addEventListener("click", nextStep);
    document.getElementById("tutorial-prev")?.addEventListener("click", prevStep);
    document.getElementById("tutorial-skip")?.addEventListener("click", skipTutorial);
    document.getElementById("tutorial-play-pause")?.addEventListener("click", togglePlayPause);

    return tooltipDiv;
  };

  const highlightElement = (element: Element, highlightClass?: string) => {
    // Supprimer les anciens highlights
    document.querySelectorAll("[data-tutorial-highlight]").forEach(el => {
      el.removeAttribute("data-tutorial-highlight");
      el.classList.remove("ring-2", "ring-blue-500", "ring-green-500", "ring-opacity-75");
    });

    // Ajouter le highlight
    element.setAttribute("data-tutorial-highlight", "true");
    if (highlightClass) {
      element.className += ` ${highlightClass}`;
    } else {
      element.classList.add("ring-2", "ring-blue-500", "ring-opacity-75");
    }

    // Créer un cutout dans l'overlay
    if (overlay) {
      const rect = element.getBoundingClientRect();
      overlay.style.clipPath = `polygon(0% 0%, 0% 100%, ${rect.left - 10}px 100%, ${rect.left - 10}px ${rect.top - 10}px, ${rect.right + 10}px ${rect.top - 10}px, ${rect.right + 10}px ${rect.bottom + 10}px, ${rect.left - 10}px ${rect.bottom + 10}px, ${rect.left - 10}px 100%, 100% 100%, 100% 0%)`;
    }

    // Scroll vers l'élément si nécessaire
    element.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const showCurrentStep = () => {
    const step = TUTORIAL_STEPS[currentStep];
    if (!step) return;

    const overlayDiv = createOverlay();
    
    if (step.target === "body") {
      createTooltip(step, document.body);
    } else {
      const targetElement = document.querySelector(step.target);
      if (targetElement) {
        highlightElement(targetElement, step.highlightClass);
        createTooltip(step, targetElement);
        
        if (step.blockInteraction) {
          overlayDiv.style.pointerEvents = "all";
        }
      } else {
        console.warn(`Tutorial target not found: ${step.target}`);
        setTimeout(() => showCurrentStep(), 1000); // Retry after 1 second
      }
    }
  };

  const nextStep = () => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      const newStep = currentStep + 1;
      setCurrentStep(newStep);
      updateTutorialProgress({
        currentStep: newStep,
        completedSteps: [...progress.completedSteps, TUTORIAL_STEPS[currentStep].id]
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
      lastCompletedAt: new Date().toISOString()
    });
    closeTutorial();
    onComplete?.();
  };

  const closeTutorial = () => {
    setIsActive(false);
    setIsPlaying(false);
    cleanupTutorial();
  };

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const restartTutorial = () => {
    setCurrentStep(0);
    setIsActive(true);
    setIsPlaying(false);
    updateTutorialProgress({
      currentStep: 0,
      completedSteps: [],
      isCompleted: false,
      skipped: false
    });
  };

  const cleanupTutorial = () => {
    // Supprimer l'overlay
    const overlayElement = document.getElementById("tutorial-overlay");
    if (overlayElement) {
      overlayElement.remove();
    }

    // Supprimer le tooltip
    const tooltipElement = document.getElementById("tutorial-tooltip");
    if (tooltipElement) {
      tooltipElement.remove();
    }

    // Supprimer les highlights
    document.querySelectorAll("[data-tutorial-highlight]").forEach(el => {
      el.removeAttribute("data-tutorial-highlight");
      el.classList.remove("ring-2", "ring-blue-500", "ring-green-500", "ring-opacity-75");
    });

    // Nettoyer les timers
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    setOverlay(null);
    setTooltip(null);
  };

  // Interface de contrôle du tutoriel (toujours visible)
  return (
    <>
      {!isActive && (
        <div className="fixed bottom-4 right-4 z-[9997]">
          <Button
            onClick={() => setIsActive(true)}
            variant="outline"
            size="sm"
            className="bg-white shadow-lg border-blue-200 hover:border-blue-300"
          >
            <HelpCircle className="h-4 w-4 mr-2" />
            {progress.isCompleted ? t("restart_tutorial") : t("start_tutorial")}
          </Button>
        </div>
      )}

      {isActive && (
        <div className="fixed top-4 right-4 z-[9997]">
          <Card className="w-80 shadow-lg">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">Tutoriel EcoDeli</CardTitle>
                <Button variant="ghost" size="sm" onClick={closeTutorial}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Étape {currentStep + 1} sur {TUTORIAL_STEPS.length}</span>
                  <span>{Math.round(((currentStep + 1) / TUTORIAL_STEPS.length) * 100)}%</span>
                </div>
                <Progress value={((currentStep + 1) / TUTORIAL_STEPS.length) * 100} />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={togglePlayPause}
                    className={isPlaying ? "text-orange-600" : "text-green-600"}
                  >
                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={restartTutorial}
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={prevStep}
                    disabled={currentStep === 0}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={nextStep}
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="text-sm text-gray-600">
                <h4 className="font-medium">{TUTORIAL_STEPS[currentStep]?.title}</h4>
                <p className="mt-1">{TUTORIAL_STEPS[currentStep]?.description}</p>
              </div>

              <div className="flex justify-between">
                <Button variant="ghost" size="sm" onClick={skipTutorial}>
                  Passer le tutoriel
                </Button>
                <Button size="sm" onClick={currentStep === TUTORIAL_STEPS.length - 1 ? completeTutorial : nextStep}>
                  {currentStep === TUTORIAL_STEPS.length - 1 ? "Terminer" : "Continuer"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}