'use client'

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { TutorialContextType, TutorialStep, TutorialProgress } from '@/shared/types/onboarding.types'

const TutorialContext = createContext<TutorialContextType | null>(null)

export const useTutorialContext = () => {
  const context = useContext(TutorialContext)
  
  if (!context) {
    throw new Error('useTutorialContext doit être utilisé à l\'intérieur d\'un TutorialProvider')
  }
  
  return context
}

interface TutorialProviderProps {
  children: React.ReactNode
  userId?: string
}

export function TutorialDataProvider({ children, userId }: TutorialProviderProps) {
  const { data: session } = useSession()
  const effectiveUserId = userId || session?.user?.id || ''
  
  const [isActive, setIsActive] = useState(false)
  const [steps, setSteps] = useState<TutorialStep[]>([])
  const [currentStep, setCurrentStep] = useState<TutorialStep | null>(null)
  const [progress, setProgress] = useState<TutorialProgress | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  
  // Charger les données du tutoriel global de l'application
  useEffect(() => {
    const loadTutorialData = async () => {
      if (!effectiveUserId) {
        setIsLoading(false)
        return
      }
      
      try {
        setIsLoading(true)
        
        // Récupérer les étapes du tutoriel
        const stepsResponse = await fetch('/api/client/tutorial/steps')
        if (!stepsResponse.ok) {
          throw new Error('Impossible de récupérer les étapes du tutoriel')
        }
        
        const stepsData = await stepsResponse.json()
        if (stepsData.success) {
          setSteps(stepsData.data)
        }
        
        // Récupérer la progression
        const progressResponse = await fetch('/api/client/tutorial/progress')
        if (!progressResponse.ok) {
          throw new Error('Impossible de récupérer la progression du tutoriel')
        }
        
        const progressData = await progressResponse.json()
        if (progressData.success) {
          setProgress(progressData.data)
          
          // Si un tutoriel est en cours, le reprendre
          if (progressData.data.currentStepId) {
            setIsActive(true)
            const currentStepData = stepsData.data.find(
              (step: TutorialStep) => step.id === progressData.data.currentStepId
            )
            if (currentStepData) {
              setCurrentStep(currentStepData)
            }
          }
        }
      } catch (error) {
        console.error('Erreur lors du chargement des données du tutoriel:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    loadTutorialData()
  }, [effectiveUserId])
  
  // Démarrer un tutoriel
  const startTutorial = async () => {
    if (!steps.length) return
    
    const firstStep = steps[0]
    setIsActive(true)
    setCurrentStep(firstStep)
    
    try {
      const response = await fetch('/api/client/tutorial/progress', {
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
        throw new Error('Impossible de mettre à jour la progression')
      }
      
      const data = await response.json()
      if (data.success) {
        setProgress(data.data)
      }
    } catch (error) {
      console.error('Erreur lors du démarrage du tutoriel:', error)
    }
  }
  
  // Terminer un tutoriel
  const endTutorial = async () => {
    setIsActive(false)
    setCurrentStep(null)
    
    try {
      const response = await fetch('/api/client/tutorial/progress', {
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
        throw new Error('Impossible de mettre à jour la progression')
      }
      
      const data = await response.json()
      if (data.success) {
        setProgress(data.data)
      }
    } catch (error) {
      console.error('Erreur lors de la fin du tutoriel:', error)
    }
  }
  
  // Passer à l'étape suivante
  const nextStep = async () => {
    if (!currentStep) return
    
    const currentIndex = steps.findIndex(step => step.id === currentStep.id)
    if (currentIndex < 0 || currentIndex >= steps.length - 1) {
      await endTutorial()
      return
    }
    
    const nextStepData = steps[currentIndex + 1]
    setCurrentStep(nextStepData)
    
    try {
      const response = await fetch('/api/client/tutorial/progress', {
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
        throw new Error('Impossible de mettre à jour la progression')
      }
      
      const data = await response.json()
      if (data.success) {
        setProgress(data.data)
      }
    } catch (error) {
      console.error('Erreur lors du passage à l\'étape suivante:', error)
    }
  }
  
  // Revenir à l'étape précédente
  const previousStep = async () => {
    if (!currentStep) return
    
    const currentIndex = steps.findIndex(step => step.id === currentStep.id)
    if (currentIndex <= 0) return
    
    const prevStepData = steps[currentIndex - 1]
    setCurrentStep(prevStepData)
    
    try {
      const response = await fetch('/api/client/tutorial/progress', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          currentStepId: prevStepData.id
        })
      })
      
      if (!response.ok) {
        throw new Error('Impossible de mettre à jour la progression')
      }
      
      const data = await response.json()
      if (data.success) {
        setProgress(data.data)
      }
    } catch (error) {
      console.error('Erreur lors du retour à l\'étape précédente:', error)
    }
  }
  
  // Ignorer le tutoriel
  const skipTutorial = async () => {
    await endTutorial()
  }
  
  // Aller à une étape spécifique
  const goToStep = async (stepId: string) => {
    const targetStep = steps.find(step => step.id === stepId)
    if (!targetStep) return
    
    setIsActive(true)
    setCurrentStep(targetStep)
    
    try {
      const response = await fetch('/api/client/tutorial/progress', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          currentStepId: stepId
        })
      })
      
      if (!response.ok) {
        throw new Error('Impossible de mettre à jour la progression')
      }
      
      const data = await response.json()
      if (data.success) {
        setProgress(data.data)
      }
    } catch (error) {
      console.error('Erreur lors du passage à une étape spécifique:', error)
    }
  }
  
  // Valeur du contexte
  const contextValue = useMemo(() => ({
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
    goToStep
  }), [
    isActive,
    currentStep,
    steps,
    progress,
    isLoading
  ])
  
  return (
    <TutorialContext.Provider value={contextValue}>
      {children}
    </TutorialContext.Provider>
  )
} 