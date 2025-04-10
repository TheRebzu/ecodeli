'use client'

import * as React from 'react'
import { createContext, useContext } from 'react'
import { useTutorial } from '@/hooks/client/use-tutorial'
import { TutorialContextType } from '@/shared/types/onboarding.types'

// Créer le contexte
const TutorialContext = createContext<TutorialContextType | undefined>(undefined)

interface TutorialProviderProps {
  children: React.ReactNode
}

export function TutorialProvider({ children }: TutorialProviderProps): React.ReactElement {
  // Utiliser le hook useTutorial pour obtenir la logique et l'état
  const tutorial = useTutorial()

  return (
    <TutorialContext.Provider value={tutorial}>
      {children}
    </TutorialContext.Provider>
  )
}

// Hook personnalisé pour utiliser le contexte
export function useTutorialContext(): TutorialContextType {
  const context = useContext(TutorialContext)
  
  if (context === undefined) {
    throw new Error('useTutorialContext must be used within a TutorialProvider')
  }
  
  return context
} 