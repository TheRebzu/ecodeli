'use client'

import { useEffect } from 'react'
import { FeatureTutorialOverlay } from './feature-tutorial-overlay'
import { useFeatureTutorial } from '@/hooks/client/use-feature-tutorial'
import { useSession } from 'next-auth/react'

interface FeatureTutorialProps {
  featureId: string
  autoStart?: boolean
  onComplete?: () => void
}

/**
 * Composant qui intègre un tutoriel pour une fonctionnalité spécifique
 * Il gère l'affichage du tutoriel en fonction de l'état de la visite de l'utilisateur
 * et utilise le hook useFeatureTutorial pour gérer l'état du tutoriel
 */
export function FeatureTutorial({
  featureId,
  autoStart = true,
  onComplete
}: FeatureTutorialProps) {
  const { data: session } = useSession()
  const userId = session?.user?.id || ''
  
  const {
    isActive,
    currentStep,
    steps,
    isLoading
  } = useFeatureTutorial(featureId, userId)
  
  // Appeler le callback onComplete lorsque le tutoriel est terminé
  useEffect(() => {
    if (!isActive && currentStep === null && steps.length > 0 && !isLoading && onComplete) {
      onComplete()
    }
  }, [isActive, currentStep, steps, isLoading, onComplete])
  
  // Si l'utilisateur n'est pas connecté ou s'il n'y a pas d'étapes, ne rien afficher
  if (!userId || steps.length === 0) {
    return null
  }
  
  return (
    <FeatureTutorialOverlay
      featureId={featureId}
      autoStart={autoStart}
    />
  )
} 