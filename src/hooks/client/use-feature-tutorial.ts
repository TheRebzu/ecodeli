'use client'

import { useState, useEffect, useCallback } from 'react'
import { useIsClient } from '@/hooks/use-is-client'
import { TutorialStep } from '@/shared/types/onboarding.types'

export interface FeatureTutorialProgress {
  id: string
  userId: string
  featureId: string
  currentStepId: string | null
  completedSteps: string[]
  isCompleted: boolean
  lastUpdated: Date
}

export interface UseFeatureTutorialResult {
  isActive: boolean
  currentStep: TutorialStep | null
  steps: TutorialStep[]
  progress: FeatureTutorialProgress | null
  isLoading: boolean
  startTutorial: () => Promise<void>
  endTutorial: () => Promise<void>
  nextStep: () => Promise<void>
  previousStep: () => Promise<void>
  skipTutorial: () => Promise<void>
  goToStep: (stepId: string) => Promise<void>
  isFirstVisit: boolean
  markAsVisited: () => void
}

export function useFeatureTutorial(
  featureId: string, 
  userId: string
): UseFeatureTutorialResult {
  const [isActive, setIsActive] = useState(false)
  const [currentStep, setCurrentStep] = useState<TutorialStep | null>(null)
  const [steps, setSteps] = useState<TutorialStep[]>([])
  const [progress, setProgress] = useState<FeatureTutorialProgress | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isFirstVisit, setIsFirstVisit] = useState(false)
  const isClient = useIsClient()

  // Vérifier si c'est la première visite de l'utilisateur à cette fonctionnalité
  const checkFirstVisit = useCallback(() => {
    if (!isClient) return
    
    const visitKey = `feature-visited-${featureId}`
    const hasVisited = localStorage.getItem(visitKey)
    
    if (!hasVisited) {
      setIsFirstVisit(true)
    }
  }, [featureId, isClient])
  
  // Marquer la fonctionnalité comme visitée
  const markAsVisited = useCallback(() => {
    if (!isClient) return
    
    const visitKey = `feature-visited-${featureId}`
    localStorage.setItem(visitKey, 'true')
    setIsFirstVisit(false)
  }, [featureId, isClient])

  // Charger les étapes du tutoriel et la progression
  const loadTutorialData = useCallback(async () => {
    if (!featureId || !userId || !isClient) return

    try {
      setIsLoading(true)
      
      // Récupérer les étapes du tutoriel pour cette fonctionnalité
      const stepsResponse = await fetch(`/api/client/tutorial/features?featureId=${featureId}`)
      if (!stepsResponse.ok) {
        throw new Error(`Impossible de récupérer les étapes du tutoriel pour ${featureId}`)
      }
      
      const stepsData = await stepsResponse.json()
      
      if (stepsData.success && Array.isArray(stepsData.data)) {
        setSteps(stepsData.data)
      }
      
      // Récupérer la progression de l'utilisateur pour cette fonctionnalité
      const progressResponse = await fetch(`/api/client/tutorial/features/${featureId}/progress`)
      if (!progressResponse.ok) {
        throw new Error(`Impossible de récupérer la progression du tutoriel pour ${featureId}`)
      }
      
      const progressData = await progressResponse.json()
      
      if (progressData.success) {
        setProgress(progressData.data)
        
        // Définir l'étape courante
        if (progressData.data.currentStepId) {
          const step = stepsData.data.find((s: TutorialStep) => s.id === progressData.data.currentStepId)
          if (step) {
            setCurrentStep(step)
          }
        } else if (stepsData.data.length > 0 && !progressData.data.isCompleted) {
          setCurrentStep(stepsData.data[0])
        }
      }
    } catch (error) {
      console.error(`Erreur lors du chargement des données du tutoriel pour ${featureId}:`, error)
    } finally {
      setIsLoading(false)
    }
  }, [featureId, userId, isClient])

  // Initialiser le tutoriel
  useEffect(() => {
    if (isClient && featureId && userId) {
      loadTutorialData()
      checkFirstVisit()
    }
  }, [isClient, featureId, userId, loadTutorialData, checkFirstVisit])

  // Démarrer le tutoriel
  const startTutorial = useCallback(async () => {
    if (!steps.length) return
    
    setIsActive(true)
    const firstStep = steps[0]
    setCurrentStep(firstStep)
    
    try {
      const response = await fetch(`/api/client/tutorial/features/${featureId}/progress`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          currentStepId: firstStep.id,
          isCompleted: false
        })
      })
      
      if (!response.ok) {
        throw new Error(`Impossible de mettre à jour la progression pour ${featureId}`)
      }
      
      const data = await response.json()
      
      if (data.success) {
        setProgress(data.data)
      }
    } catch (error) {
      console.error(`Erreur lors du démarrage du tutoriel pour ${featureId}:`, error)
    }
  }, [featureId, steps])

  // Terminer le tutoriel
  const endTutorial = useCallback(async () => {
    try {
      const response = await fetch(`/api/client/tutorial/features/${featureId}/progress`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          currentStepId: null,
          isCompleted: true
        })
      })
      
      if (!response.ok) {
        throw new Error(`Impossible de mettre à jour la progression pour ${featureId}`)
      }
      
      const data = await response.json()
      
      if (data.success) {
        setIsActive(false)
        setCurrentStep(null)
        setProgress(data.data)
        markAsVisited()
      }
    } catch (error) {
      console.error(`Erreur lors de la fin du tutoriel pour ${featureId}:`, error)
    }
  }, [featureId, markAsVisited])

  // Passer à l'étape suivante
  const nextStep = useCallback(async () => {
    if (!currentStep || !steps.length) return
    
    const currentIndex = steps.findIndex(step => step.id === currentStep.id)
    if (currentIndex < 0 || currentIndex >= steps.length - 1) {
      await endTutorial()
      return
    }
    
    try {
      const nextStepData = steps[currentIndex + 1]
      
      const response = await fetch(`/api/client/tutorial/features/${featureId}/progress`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          currentStepId: nextStepData.id,
          completedStepId: currentStep.id
        })
      })
      
      if (!response.ok) {
        throw new Error(`Impossible de mettre à jour la progression pour ${featureId}`)
      }
      
      const data = await response.json()
      
      if (data.success) {
        setCurrentStep(nextStepData)
        setProgress(data.data)
      }
    } catch (error) {
      console.error(`Erreur lors du passage à l'étape suivante pour ${featureId}:`, error)
    }
  }, [currentStep, steps, endTutorial, featureId])

  // Revenir à l'étape précédente
  const previousStep = useCallback(async () => {
    if (!currentStep || !steps.length) return
    
    const currentIndex = steps.findIndex(step => step.id === currentStep.id)
    if (currentIndex <= 0) return
    
    try {
      const prevStepData = steps[currentIndex - 1]
      
      const response = await fetch(`/api/client/tutorial/features/${featureId}/progress`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          currentStepId: prevStepData.id
        })
      })
      
      if (!response.ok) {
        throw new Error(`Impossible de mettre à jour la progression pour ${featureId}`)
      }
      
      const data = await response.json()
      
      if (data.success) {
        setCurrentStep(prevStepData)
        setProgress(data.data)
      }
    } catch (error) {
      console.error(`Erreur lors du retour à l'étape précédente pour ${featureId}:`, error)
    }
  }, [currentStep, steps, featureId])

  // Sauter le tutoriel
  const skipTutorial = useCallback(async () => {
    try {
      const response = await fetch(`/api/client/tutorial/features/${featureId}/progress`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          currentStepId: null,
          isCompleted: true
        })
      })
      
      if (!response.ok) {
        throw new Error(`Impossible de mettre à jour la progression pour ${featureId}`)
      }
      
      const data = await response.json()
      
      if (data.success) {
        setIsActive(false)
        setCurrentStep(null)
        setProgress(data.data)
        markAsVisited()
      }
    } catch (error) {
      console.error(`Erreur lors de l'ignorance du tutoriel pour ${featureId}:`, error)
    }
  }, [featureId, markAsVisited])

  // Aller à une étape spécifique
  const goToStep = useCallback(async (stepId: string) => {
    const targetStep = steps.find(step => step.id === stepId)
    if (!targetStep) return
    
    try {
      const response = await fetch(`/api/client/tutorial/features/${featureId}/progress`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          currentStepId: stepId
        })
      })
      
      if (!response.ok) {
        throw new Error(`Impossible de mettre à jour la progression pour ${featureId}`)
      }
      
      const data = await response.json()
      
      if (data.success) {
        setCurrentStep(targetStep)
        setProgress(data.data)
      }
    } catch (error) {
      console.error(`Erreur lors du passage à une étape spécifique pour ${featureId}:`, error)
    }
  }, [steps, featureId])

  return {
    isActive,
    currentStep,
    steps,
    progress,
    isLoading,
    startTutorial,
    endTutorial,
    nextStep,
    previousStep,
    skipTutorial,
    goToStep,
    isFirstVisit,
    markAsVisited
  }
} 