'use client';

import React, { useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { TutorialOverlay } from './tutorial-overlay';
import { ClientTutorial } from './tutorials/client-tutorial';
import { DelivererTutorial } from './tutorials/deliverer-tutorial';
import { MerchantTutorial } from './tutorials/merchant-tutorial';
import { ProviderTutorial } from './tutorials/provider-tutorial';
import { AdminTutorial } from './tutorials/admin-tutorial';
import { useMission1Onboarding, useMission1AccessControl } from '@/hooks/use-onboarding';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface OnboardingControllerProps {
  autoStart?: boolean;
  redirectPathAfterCompletion?: string;
  forceMission1?: boolean; // Force le tutoriel Mission 1 même si déjà complété
  blockingMode?: boolean; // Mode bloquant qui empêche l'accès à l'application
  children?: React.ReactNode; // Contenu à bloquer si Mission 1 n'est pas complétée
}

/**
 * Contrôleur principal pour l'onboarding et Mission 1
 * Gère le tutoriel bloquant obligatoire pour les nouveaux clients
 */
export function OnboardingController({
  autoStart = true,
  redirectPathAfterCompletion,
  forceMission1 = false,
  blockingMode = false,
  children,
}: OnboardingControllerProps) {
  const session = useSession();
  const userRole = session.data?.user?.role?.toLowerCase() || '';
  
  // Utiliser le hook spécialisé Mission 1 pour les clients
  const mission1 = useMission1Onboarding();
  
  // Déterminer si c'est un tutoriel Mission 1 (bloquant)
  const isMission1Required = (
    userRole === 'client' && 
    (mission1.isMission1Required || forceMission1 || blockingMode)
  );

  // Démarrer automatiquement le tutoriel si nécessaire
  useEffect(() => {
    if (
      autoStart &&
      isMission1Required &&
      !mission1.isLoading &&
      userRole === 'client'
    ) {
      // Commencer Mission 1 à l'étape 0
      mission1.setStepsConfiguration(0, 10); // 10 étapes pour Mission 1
    }
  }, [
    autoStart,
    isMission1Required,
    mission1.isLoading,
    userRole,
    mission1
  ]);

  // Gestionnaire pour la completion du tutoriel
  const handleTutorialComplete = useCallback(async () => {
    if (isMission1Required) {
      const success = await mission1.completeMission1();
      if (success && redirectPathAfterCompletion) {
        window.location.href = redirectPathAfterCompletion;
      }
    }
  }, [isMission1Required, mission1, redirectPathAfterCompletion]);

  // Définir les options pour les tutoriels
  const tutorialOptions = {
    redirectTo: redirectPathAfterCompletion,
    onComplete: handleTutorialComplete
  };

  // Sélection du tutoriel en fonction du rôle
  const renderTutorial = () => {
    switch (userRole) {
      case 'client':
        return (
          <ClientTutorial 
            options={tutorialOptions} 
            isMission1={isMission1Required}
            mission1Hook={mission1}
          />
        );
      case 'deliverer':
        return <DelivererTutorial options={tutorialOptions} />;
      case 'merchant':
        return <MerchantTutorial options={tutorialOptions} />;
      case 'provider':
        return <ProviderTutorial options={tutorialOptions} />;
      case 'admin':
      case 'administrator':
        return <AdminTutorial options={tutorialOptions} />;
      default:
        return null;
    }
  };

  // Écran de blocage si Mission 1 est requise
  if (mission1.shouldBlockAccess && !mission1.isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl shadow-2xl border-2 border-red-200">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              🌱 Mission 1 - Découverte d'EcoDeli
            </CardTitle>
            <CardDescription className="text-lg">
              Bienvenue dans l'aventure EcoDeli ! Pour commencer à utiliser la plateforme, 
              vous devez d'abord compléter notre tutoriel obligatoire.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertTitle className="text-red-800">Tutoriel obligatoire</AlertTitle>
              <AlertDescription className="text-red-700">
                Ce tutoriel vous explique les fonctionnalités essentielles d'EcoDeli 
                et les pratiques de livraison durable. Il ne prend que quelques minutes.
              </AlertDescription>
            </Alert>

            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <h4 className="font-semibold text-green-800 mb-2">
                Ce que vous allez apprendre :
              </h4>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• Le concept de livraison écologique d'EcoDeli</li>
                <li>• Comment créer et suivre vos livraisons</li>
                <li>• L'écosystème de services durables</li>
                <li>• Le système de stockage intelligent</li>
                <li>• Les bonnes pratiques environnementales</li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                onClick={() => mission1.setStepsConfiguration(0, 10)}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                size="lg"
              >
                🚀 Commencer Mission 1
              </Button>
              
              {process.env.NODE_ENV === 'development' && (
                <Button
                  variant="outline"
                  onClick={() => mission1.restartMission1()}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Redémarrer
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Interface du tutoriel avec overlay
  const isTutorialActive = mission1.totalSteps > 0 && isMission1Required;

  return (
    <>
      {/* Contenu principal de l'application (bloqué si Mission 1 requise) */}
      {children}
      
      {/* Overlay du tutoriel */}
      <TutorialOverlay 
        isActive={isTutorialActive}
        isBlocking={isMission1Required}
        allowEscape={false} // Mission 1 ne peut pas être fermée
        showProgress={true}
        currentStep={mission1.currentStep}
        totalSteps={mission1.totalSteps}
        title="Mission 1 - Découverte d'EcoDeli"
        isMission1={isMission1Required}
        onEscape={undefined} // Pas d'échappement possible pour Mission 1
      >
        {renderTutorial()}
      </TutorialOverlay>
    </>
  );
}

/**
 * Composant pour déclencher manuellement le tutoriel (à utiliser dans les paramètres)
 */
export function OnboardingTrigger({
  role,
  children,
  variant = 'standard'
}: {
  role?: string;
  children: React.ReactNode;
  variant?: 'standard' | 'mission1';
}) {
  const session = useSession();
  const mission1 = useMission1Onboarding();

  const handleTrigger = () => {
    const targetRole = role || session.data?.user?.role?.toLowerCase();
    
    if (targetRole === 'client' && variant === 'mission1') {
      // Redémarrer Mission 1
      mission1.restartMission1();
    } else if (targetRole) {
      // Démarrer tutoriel standard selon le rôle
      mission1.setStepsConfiguration(0, 10);
    }
  };

  return (
    <div onClick={handleTrigger} className="cursor-pointer">
      {children}
    </div>
  );
}

/**
 * Hook de vérification d'accès simplifié pour les composants
 */
export function useAccessControl() {
  const { shouldBlockAccess, isLoading } = useMission1AccessControl();
  
  return {
    isBlocked: shouldBlockAccess,
    isLoading,
    canAccess: !shouldBlockAccess && !isLoading
  };
}

/**
 * Composant wrapper pour protéger l'accès aux pages
 */
export function MissionProtectedContent({ 
  children, 
  fallback 
}: { 
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { isBlocked, isLoading } = useAccessControl();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
      </div>
    );
  }
  
  if (isBlocked) {
    return fallback || <OnboardingController blockingMode={true} />;
  }
  
  return <>{children}</>;
}
