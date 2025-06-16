"use client";

import React, { useEffect, useCallback, useState } from "react";
import { X, AlertTriangle, Clock, Shield, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils/common";

interface TutorialOverlayProps {
  children: React.ReactNode;
  isActive: boolean;
  isBlocking?: boolean;
  allowEscape?: boolean;
  showProgress?: boolean;
  currentStep?: number;
  totalSteps?: number;
  onEscape?: () => void;
  title?: string;
  isMission1?: boolean;
  showTimer?: boolean; // Afficher un timer pour Mission 1
  estimatedTime?: number; // Temps estimé en minutes
}

export function TutorialOverlay({
  children,
  isActive,
  isBlocking = false,
  allowEscape = true,
  showProgress = false,
  currentStep = 0,
  totalSteps = 0,
  onEscape,
  title,
  isMission1 = false,
  showTimer = false,
  estimatedTime = 5}: TutorialOverlayProps) {
  const [timeSpent, setTimeSpent] = useState(0);

  // Timer pour Mission 1
  useEffect(() => {
    if (isActive && isMission1 && showTimer) {
      const timer = setInterval(() => {
        setTimeSpent((prev) => prev + 1);
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [isActive, isMission1, showTimer]);

  // Gestionnaire pour la touche Escape
  const handleEscKey = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape" && isActive && allowEscape && onEscape) {
        event.preventDefault();
        onEscape();
      } else if (event.key === "Escape" && isBlocking) {
        // Empêcher la fermeture si c'est un tutoriel bloquant
        event.preventDefault();
        // Optionnel : afficher un message d'avertissement
      }
    },
    [isActive, allowEscape, isBlocking, onEscape],
  );

  // Empêcher le défilement de la page en arrière-plan
  useEffect(() => {
    if (isActive) {
      document.body.style.overflow = "hidden";

      // Ajouter l'écouteur pour la touche Escape
      window.addEventListener("keydown", handleEscKey);

      return () => {
        document.body.style.overflow = "unset";
        window.removeEventListener("keydown", handleEscKey);
      };
    }
  }, [isActive, handleEscKey]);

  // N'affiche rien si non actif
  if (!isActive) return null;

  // Calculer le pourcentage de progression
  const progressPercentage =
    totalSteps > 0 ? ((currentStep + 1) / totalSteps) * 100 : 0;

  // Formatage du temps
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  // Estimation du temps restant
  const estimatedTimeRemaining =
    totalSteps > 0
      ? Math.max(
          0,
          Math.round(
            (estimatedTime * 60 * (totalSteps - currentStep - 1)) / totalSteps,
          ),
        )
      : 0;

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center",
        isBlocking
          ? "bg-black/90 backdrop-blur-md" // Plus sombre pour les tutoriels bloquants
          : "bg-background/80 backdrop-blur-sm",
      )}
      onClick={(e) => {
        // Empêcher la fermeture par clic sur l'arrière-plan si c'est bloquant
        if (isBlocking) {
          e.preventDefault();
        }
      }}
    >
      <div
        className={cn(
          "w-full max-w-5xl p-6 overflow-auto max-h-[95vh] relative rounded-lg shadow-xl",
          "bg-white dark:bg-gray-900",
          isBlocking && "border-2 border-primary shadow-2xl",
          isMission1 && "border-2 border-red-500 shadow-red-200/50",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête avec titre et indicateurs */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {title && (
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {title}
              </h2>
            )}

            {isMission1 && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Mission 1 - Tutoriel obligatoire
              </Badge>
            )}

            {isBlocking && !isMission1 && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Shield className="h-3 w-3" />
                Tutoriel requis
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Timer pour Mission 1 */}
            {showTimer && isMission1 && (
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Clock className="h-4 w-4" />
                <span>{formatTime(timeSpent)}</span>
                {estimatedTimeRemaining > 0 && (
                  <span className="text-xs text-gray-500">
                    (~{formatTime(estimatedTimeRemaining)} restant)
                  </span>
                )}
              </div>
            )}

            {showProgress && totalSteps > 0 && (
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Étape {currentStep + 1} sur {totalSteps}
              </div>
            )}

            {allowEscape && !isBlocking && onEscape && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onEscape}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
                aria-label="Fermer le tutoriel"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Barre de progression */}
        {showProgress && totalSteps > 0 && (
          <div className="mb-6">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className={cn(
                  "h-2 rounded-full transition-all duration-500",
                  isMission1 ? "bg-red-500" : "bg-primary",
                )}
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            {isMission1 && (
              <div className="mt-1 flex justify-between text-xs text-gray-500">
                <span>Début</span>
                <span>{progressPercentage.toFixed(0)}% complété</span>
                <span>Fin de Mission 1</span>
              </div>
            )}
          </div>
        )}

        {/* Message d'avertissement pour Mission 1 */}
        {isMission1 && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-medium">
                Tutoriel obligatoire - Mission 1
              </span>
            </div>
            <p className="mt-2 text-sm text-red-700 dark:text-red-300">
              Ce tutoriel doit être complété avant de pouvoir accéder à la
              plateforme. Il vous permettra de comprendre les fonctionnalités
              essentielles d'EcoDeli.
            </p>

            {/* Statistiques de progression */}
            <div className="mt-4 grid grid-cols-3 gap-4 text-center">
              <div className="bg-red-100 dark:bg-red-800/20 p-2 rounded">
                <div className="text-red-800 dark:text-red-200 font-semibold">
                  {currentStep + 1}/{totalSteps}
                </div>
                <div className="text-xs text-red-600 dark:text-red-400">
                  Étapes
                </div>
              </div>

              <div className="bg-red-100 dark:bg-red-800/20 p-2 rounded">
                <div className="text-red-800 dark:text-red-200 font-semibold">
                  {showTimer ? formatTime(timeSpent) : "~5 min"}
                </div>
                <div className="text-xs text-red-600 dark:text-red-400">
                  Durée
                </div>
              </div>

              <div className="bg-red-100 dark:bg-red-800/20 p-2 rounded">
                <div className="text-red-800 dark:text-red-200 font-semibold">
                  {progressPercentage.toFixed(0)}%
                </div>
                <div className="text-xs text-red-600 dark:text-red-400">
                  Complété
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Alertes contextuelles */}
        {isBlocking && !isMission1 && (
          <Alert className="mb-6 border-yellow-200 bg-yellow-50">
            <Shield className="h-4 w-4" />
            <AlertTitle>Tutoriel requis</AlertTitle>
            <AlertDescription>
              Ce tutoriel est nécessaire pour accéder aux fonctionnalités
              complètes de la plateforme.
            </AlertDescription>
          </Alert>
        )}

        {/* Encouragements selon la progression */}
        {isMission1 && currentStep > 0 && (
          <div className="mb-4">
            {progressPercentage < 25 && (
              <Alert className="border-blue-200 bg-blue-50">
                <Star className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  Excellent début ! Vous découvrez les bases d'EcoDeli.
                </AlertDescription>
              </Alert>
            )}

            {progressPercentage >= 25 && progressPercentage < 50 && (
              <Alert className="border-green-200 bg-green-50">
                <Star className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Très bien ! Vous maîtrisez déjà les concepts principaux.
                </AlertDescription>
              </Alert>
            )}

            {progressPercentage >= 50 && progressPercentage < 75 && (
              <Alert className="border-purple-200 bg-purple-50">
                <Star className="h-4 w-4 text-purple-600" />
                <AlertDescription className="text-purple-800">
                  Fantastique ! Plus que quelques étapes avant la fin de Mission
                  1.
                </AlertDescription>
              </Alert>
            )}

            {progressPercentage >= 75 && progressPercentage < 100 && (
              <Alert className="border-yellow-200 bg-yellow-50">
                <Star className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800">
                  Presque fini ! Vous êtes sur le point de terminer Mission 1.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Contenu principal */}
        <div className="relative">{children}</div>

        {/* Pied de page avec informations contextuelles */}
        {isMission1 && (
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-4">
                <span>🌱 EcoDeli - Mission 1</span>
                <span>📚 Tutoriel interactif</span>
                <span>⏱️ ~{estimatedTime} minutes</span>
              </div>

              <div className="flex items-center gap-2">
                <span>Progression sauvegardée automatiquement</span>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
