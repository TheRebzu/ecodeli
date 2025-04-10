'use client'

import { useEffect, useState } from 'react'
import { useTutorialContext } from '@/context/tutorial-data-provider'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

export function TutorialOverlay() {
  const {
    isActive,
    currentStep,
    steps,
    nextStep,
    previousStep,
    skipTutorial
  } = useTutorialContext()
  
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const [isReady, setIsReady] = useState(false)
  
  // Attendre que le DOM soit complètement chargé
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsReady(true)
    }, 500)
    
    return () => clearTimeout(timer)
  }, [])
  
  // Mettre à jour la position du tooltip quand l'étape change
  useEffect(() => {
    if (!isActive || !currentStep || !isReady) return
    
    const targetElement = document.getElementById(currentStep.targetElementId)
    if (!targetElement) return
    
    const updatePosition = () => {
      const rect = targetElement.getBoundingClientRect()
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop
      const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft
      
      let top = 0
      let left = 0
      
      // Positionner en fonction de la position spécifiée (par défaut en bas)
      switch (currentStep.position || 'bottom') {
        case 'top':
          top = rect.top + scrollTop - 15 - 150 // hauteur du tooltip + marge
          left = rect.left + scrollLeft + (rect.width / 2) - 150 // centré
          break
        case 'right':
          top = rect.top + scrollTop + (rect.height / 2) - 75
          left = rect.right + scrollLeft + 15
          break
        case 'bottom':
          top = rect.bottom + scrollTop + 15
          left = rect.left + scrollLeft + (rect.width / 2) - 150 // centré
          break
        case 'left':
          top = rect.top + scrollTop + (rect.height / 2) - 75
          left = rect.left + scrollLeft - 15 - 300 // largeur du tooltip + marge
          break
        case 'center':
          top = rect.top + scrollTop + (rect.height / 2) - 75
          left = rect.left + scrollLeft + (rect.width / 2) - 150
          break
      }
      
      // Éviter que le tooltip sorte de l'écran
      const maxLeft = window.innerWidth - 300 // largeur du tooltip
      const maxTop = window.innerHeight - 150 // hauteur du tooltip
      
      top = Math.max(0, Math.min(top, maxTop + scrollTop))
      left = Math.max(0, Math.min(left, maxLeft + scrollLeft))
      
      setPosition({ top, left })
    }
    
    updatePosition()
    
    // Mettre à jour lors du scroll ou du redimensionnement
    window.addEventListener('scroll', updatePosition)
    window.addEventListener('resize', updatePosition)
    
    // Mettre en évidence l'élément cible
    targetElement.classList.add('tutorial-highlight')
    
    return () => {
      window.removeEventListener('scroll', updatePosition)
      window.removeEventListener('resize', updatePosition)
      
      // Retirer la mise en évidence
      targetElement.classList.remove('tutorial-highlight')
    }
  }, [currentStep, isActive, isReady])
  
  if (!isActive || !currentStep || !isReady) {
    return null
  }
  
  const currentIndex = steps.findIndex(step => step.id === currentStep.id)
  const isFirstStep = currentIndex === 0
  const isLastStep = currentIndex === steps.length - 1
  
  return (
    <>
      {/* Overlay semi-transparent pour masquer le reste de l'interface */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-[998]" onClick={skipTutorial} />
      
      {/* Bulle de tutoriel */}
      <div 
        className={cn(
          "fixed z-[999] w-[300px] bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4",
          "border border-gray-200 dark:border-gray-700"
        )}
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
          transition: 'all 0.3s ease'
        }}
      >
        {/* Titre et bouton de fermeture */}
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-medium text-sm">{currentStep.title}</h3>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={skipTutorial}
            aria-label="Fermer le tutoriel"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Contenu */}
        <div className="text-sm text-gray-600 dark:text-gray-300 mb-4">
          {currentStep.content}
        </div>
        
        {/* Indicateur de progression */}
        <div className="w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-full mb-4">
          <div 
            className="h-1 bg-blue-500 rounded-full" 
            style={{ width: `${((currentIndex + 1) / steps.length) * 100}%` }} 
          />
        </div>
        
        {/* Navigation */}
        <div className="flex justify-between items-center">
          <Button
            variant="outline"
            size="sm"
            onClick={previousStep}
            disabled={isFirstStep}
            className={isFirstStep ? 'invisible' : ''}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Précédent
          </Button>
          
          <span className="text-xs text-gray-500">
            {currentIndex + 1} / {steps.length}
          </span>
          
          <Button
            variant="default"
            size="sm"
            onClick={nextStep}
          >
            {isLastStep ? 'Terminer' : 'Suivant'}
            {!isLastStep && <ChevronRight className="h-4 w-4 ml-1" />}
          </Button>
        </div>
      </div>
    </>
  )
} 