'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { TutorialStep, TutorialProgress, TutorialContextType } from '@/shared/types/onboarding.types'

export function useTutorial(): TutorialContextType {
  const { data: session } = useSession()
  const [isActive, setIsActive] = useState(false)
  const [steps, setSteps] = useState<TutorialStep[]>([])
  const [currentStep, setCurrentStep] = useState<TutorialStep | null>(null)
  const [progress, setProgress] = useState<TutorialProgress | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  
  // Charger les étapes du tutoriel et la progression de l'utilisateur
  const loadTutorialData = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      // Charger les étapes du tutoriel
      const stepsResponse = await fetch('/api/client/tutorial/steps')
      const stepsData = await stepsResponse.json()
      setSteps(stepsData)
      
      // Charger la progression de l'utilisateur
      const progressResponse = await fetch('/api/client/tutorial/progress')
      const progressData = await progressResponse.json()
      setProgress(progressData)
      
      // Définir l'étape courante
      if (progressData.currentStepId) {
        const currentStep = stepsData.find(
          (step: TutorialStep) => step.id === progressData.currentStepId
        )
        setCurrentStep(currentStep || null)
        setIsActive(true)
      }
    } catch (error) {
      setError(error as Error)
      console.error('Erreur lors du chargement du tutoriel:', error)
    } finally {
      setIsLoading(false)
    }
  }
  
  // Démarrer le tutoriel
  const startTutorial = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      // Réinitialiser la progression
      await fetch('/api/client/tutorial/reset', { method: 'POST' })
      
      // Charger les nouvelles données
      await loadTutorialData()
      
      // Définir la première étape comme étape courante
      if (steps.length > 0) {
        setCurrentStep(steps[0])
        setIsActive(true)
      }
    } catch (error) {
      setError(error as Error)
      console.error('Erreur lors du démarrage du tutoriel:', error)
    } finally {
      setIsLoading(false)
    }
  }
  
  // Terminer le tutoriel
  const endTutorial = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      await fetch('/api/client/tutorial/end', { method: 'POST' })
      setCurrentStep(null)
      setIsActive(false)
      
      // Recharger la progression
      await loadTutorialData()
    } catch (error) {
      setError(error as Error)
      console.error('Erreur lors de la fin du tutoriel:', error)
    } finally {
      setIsLoading(false)
    }
  }
  
  // Passer à l'étape suivante
  const nextStep = async () => {
    if (!currentStep || !steps.length) return
    
    try {
      setIsLoading(true)
      setError(null)
      
      const currentIndex = steps.findIndex(step => step.id === currentStep.id)
      if (currentIndex < steps.length - 1) {
        const nextStep = steps[currentIndex + 1]
        
        // Mettre à jour la progression
        await fetch('/api/client/tutorial/progress', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currentStepId: nextStep.id })
        })
        
        setCurrentStep(nextStep)
        await loadTutorialData()
      } else {
        // Si c'était la dernière étape, terminer le tutoriel
        await endTutorial()
      }
    } catch (error) {
      setError(error as Error)
      console.error('Erreur lors du passage à l\'étape suivante:', error)
    } finally {
      setIsLoading(false)
    }
  }
  
  // Revenir à l'étape précédente
  const previousStep = async () => {
    if (!currentStep || !steps.length) return
    
    try {
      setIsLoading(true)
      setError(null)
      
      const currentIndex = steps.findIndex(step => step.id === currentStep.id)
      if (currentIndex > 0) {
        const previousStep = steps[currentIndex - 1]
        
        // Mettre à jour la progression
        await fetch('/api/client/tutorial/progress', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currentStepId: previousStep.id })
        })
        
        setCurrentStep(previousStep)
        await loadTutorialData()
      }
    } catch (error) {
      setError(error as Error)
      console.error('Erreur lors du retour à l\'étape précédente:', error)
    } finally {
      setIsLoading(false)
    }
  }
  
  // Passer le tutoriel
  const skipTutorial = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      await fetch('/api/client/tutorial/skip', { method: 'POST' })
      setCurrentStep(null)
      setIsActive(false)
      
      // Recharger la progression
      await loadTutorialData()
    } catch (error) {
      setError(error as Error)
      console.error('Erreur lors du passage du tutoriel:', error)
    } finally {
      setIsLoading(false)
    }
  }
  
  // Aller à une étape spécifique
  const goToStep = async (stepId: string) => {
    try {
      setIsLoading(true)
      setError(null)
      
      const targetStep = steps.find(step => step.id === stepId)
      if (targetStep) {
        // Mettre à jour la progression
        await fetch('/api/client/tutorial/progress', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currentStepId: stepId })
        })
        
        setCurrentStep(targetStep)
        setIsActive(true)
        await loadTutorialData()
      }
    } catch (error) {
      setError(error as Error)
      console.error('Erreur lors du changement d\'étape:', error)
    } finally {
      setIsLoading(false)
    }
  }
  
  // Charger les données au montage du composant
  useEffect(() => {
    if (session?.user?.id) {
      loadTutorialData()
    }
  }, [session?.user?.id])
  
  return {
    isActive,
    steps,
    currentStep,
    progress,
    isLoading,
    error,
    startTutorial,
    endTutorial,
    nextStep,
    previousStep,
    skipTutorial,
    goToStep
  }
} 