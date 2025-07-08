'use client'

import { useEffect, useRef } from 'react'
import { ClientTutorialOverlay } from './client-tutorial-overlay'
import { useTutorial } from '../hooks/useTutorial'
import { useAuth } from '@/hooks/use-auth'

interface TutorialManagerProps {
  children: React.ReactNode
  autoStart?: boolean
  forceShow?: boolean
}

export function TutorialManager({ 
  children, 
  autoStart = true, 
  forceShow = false 
}: TutorialManagerProps) {
  const { user } = useAuth()
  const {
    tutorialState,
    loading,
    isOpen,
    completeStep,
    completeTutorial,
    closeTutorial,
    startTutorial
  } = useTutorial()

  // Ref pour éviter de redémarrer le tutoriel en boucle
  const hasTriedToStart = useRef(false)

  // Auto-démarrer le tutoriel si nécessaire
  useEffect(() => {
    if (
      autoStart && 
      user?.role === 'CLIENT' && 
      tutorialState?.tutorialRequired && 
      !tutorialState.progress?.isCompleted &&
      !hasTriedToStart.current &&
      !loading
    ) {
      hasTriedToStart.current = true
      startTutorial()
    }
    
    // Reset flag si tutoriel devient non-requis
    if (tutorialState && (!tutorialState.tutorialRequired || tutorialState.progress?.isCompleted)) {
      hasTriedToStart.current = false
    }
  }, [autoStart, user, tutorialState, loading])  // Retiré startTutorial des dépendances

  // Ne pas afficher si pas un client
  if (!user || user.role !== 'CLIENT') {
    return <>{children}</>
  }

  // Ne pas afficher pendant le chargement
  if (loading) {
    return <>{children}</>
  }

  // Ne pas afficher si pas de données de tutoriel
  if (!tutorialState) {
    return <>{children}</>
  }

  // Afficher le tutoriel si requis ou forcé
  const shouldShowTutorial = forceShow || (
    isOpen && 
    tutorialState.tutorialRequired && 
    !tutorialState.progress?.isCompleted
  )

  if (!shouldShowTutorial) {
    return <>{children}</>
  }

  return (
    <>
      {children}
      <ClientTutorialOverlay
        isOpen={shouldShowTutorial}
        tutorialRequired={tutorialState.tutorialRequired}
        currentStep={tutorialState.progress?.currentStep || 1}
        steps={tutorialState.steps}
        settings={tutorialState.settings}
        progressPercentage={tutorialState.progress?.progressPercentage || 0}
        user={{
          name: user.profileData?.firstName && user.profileData?.lastName 
            ? `${user.profileData.firstName} ${user.profileData.lastName}`
            : user.name || user.email,
          email: user.email,
          subscriptionPlan: 'FREE' // À récupérer depuis le profil client
        }}
        onStepComplete={completeStep}
        onTutorialComplete={completeTutorial}
        onClose={tutorialState.settings.blockingOverlay ? undefined : closeTutorial}
      />
    </>
  )
}