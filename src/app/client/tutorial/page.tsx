'use client';

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, X, AlertCircle, Info, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { TutorialStep } from '@/shared/types/onboarding.types'

// Étapes du tutoriel (fictives pour l'instant)
const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Bienvenue sur EcoDeli',
    description: 'Bienvenue dans votre espace client EcoDeli ! Ce tutoriel vous guidera à travers les principales fonctionnalités de la plateforme pour vous aider à prendre en main l\'outil rapidement.',
    order: 0,
    isCompleted: false,
    position: 'center'
  },
  {
    id: 'announcements',
    title: 'Gestion des annonces',
    description: 'Créez, suivez et gérez vos annonces de livraison facilement. Vous pouvez publier des demandes de transport et recevoir des offres de livreurs.',
    targetElementId: 'nav-announcements',
    order: 1,
    isCompleted: false,
    position: 'right'
  },
  {
    id: 'storage',
    title: 'Casiers temporaires',
    description: 'Réservez des casiers temporaires pour stocker vos colis avant leur expédition ou après leur réception.',
    targetElementId: 'nav-storage',
    order: 2,
    isCompleted: false,
    position: 'right'
  },
  {
    id: 'tracking',
    title: 'Suivi de colis en temps réel',
    description: 'Suivez vos colis en temps réel sur la carte et recevez des notifications à chaque étape de la livraison.',
    targetElementId: 'nav-tracking',
    order: 3,
    isCompleted: false,
    position: 'right'
  },
  {
    id: 'services',
    title: 'Services à domicile',
    description: 'Découvrez et réservez nos services à domicile, comme le montage de meubles ou l\'installation d\'équipements.',
    targetElementId: 'nav-services',
    order: 4,
    isCompleted: false,
    position: 'right'
  },
  {
    id: 'profile',
    title: 'Votre profil',
    description: 'Personnalisez votre profil, modifiez vos informations personnelles et gérez vos préférences de communication.',
    targetElementId: 'nav-profile',
    order: 5,
    isCompleted: false,
    position: 'top'
  },
  {
    id: 'finish',
    title: 'Félicitations !',
    description: 'Vous avez terminé le tutoriel et vous êtes maintenant prêt à utiliser toutes les fonctionnalités d\'EcoDeli. Vous pouvez relancer ce tutoriel à tout moment depuis votre profil.',
    order: 6,
    isCompleted: false,
    position: 'center'
  }
]

export default function TutorialPage() {
  const router = useRouter()
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [steps, setSteps] = useState<TutorialStep[]>(TUTORIAL_STEPS)
  const [isLoading, setIsLoading] = useState(false)
  
  const currentStep = steps[currentStepIndex]
  const progress = Math.round((currentStepIndex / (steps.length - 1)) * 100)
  
  // Simuler le chargement des données utilisateur
  useEffect(() => {
    // Ici, vous chargeriez normalement la progression du tutoriel depuis l'API
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 1000)
    
    return () => clearTimeout(timer)
  }, [])
  
  // Cette fonction serait normalement appelée pour mettre à jour la progression dans la base de données
  const updateProgress = async (stepId: string, isCompleted: boolean = true) => {
    setIsLoading(true)
    
    try {
      // Simulation d'un appel API pour mettre à jour la progression
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Mettre à jour localement
      setSteps(prev => 
        prev.map(step => 
          step.id === stepId ? { ...step, isCompleted } : step
        )
      )
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la progression:', error)
    } finally {
      setIsLoading(false)
    }
  }
  
  const handleNextStep = async () => {
    if (currentStepIndex < steps.length - 1) {
      await updateProgress(currentStep.id)
      setCurrentStepIndex(prev => prev + 1)
    }
  }
  
  const handlePreviousStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1)
    }
  }
  
  const handleSkip = async () => {
    const confirmed = window.confirm('Êtes-vous sûr de vouloir quitter le tutoriel ? Vous pourrez y revenir plus tard depuis votre profil.')
    if (confirmed) {
      await updateProgress('tutorial', true)
      router.push('/client/dashboard')
    }
  }
  
  const handleFinish = async () => {
    await updateProgress(currentStep.id)
    router.push('/client/dashboard')
  }
  
  // Animation pour mettre en évidence l'élément ciblé (à implémenter avec une bibliothèque comme Framer Motion)
  useEffect(() => {
    if (currentStep.targetElementId) {
      const targetElement = document.getElementById(currentStep.targetElementId)
      if (targetElement) {
        // Ajouter une classe pour animer/mettre en évidence l'élément
        targetElement.classList.add('tutorial-highlight')
        
        // Nettoyer en supprimant la classe lorsque l'étape change
        return () => {
          targetElement.classList.remove('tutorial-highlight')
        }
      }
    }
  }, [currentStep])

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 p-4">
      {/* Progress bar */}
      <div className="fixed top-4 left-4 right-4 z-10">
        <Progress value={progress} className="h-2" />
        <div className="mt-1 text-xs text-right text-muted-foreground">
          Étape {currentStepIndex + 1} sur {steps.length}
        </div>
      </div>
      
      {/* Overlay modal */}
      <div className="fixed inset-0 bg-black/50 z-30" onClick={handleSkip}></div>
      
      {/* Bubble content */}
      <Card className={`z-40 max-w-md w-full shadow-lg ${
        currentStep.position === 'center' ? 'fixed' : 'absolute'
      } ${
        currentStep.position === 'right' ? 'left-4 top-1/2 -translate-y-1/2' :
        currentStep.position === 'left' ? 'right-4 top-1/2 -translate-y-1/2' :
        currentStep.position === 'top' ? 'bottom-4 left-1/2 -translate-x-1/2' :
        currentStep.position === 'bottom' ? 'top-4 left-1/2 -translate-x-1/2' :
        'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'
      }`}>
        <Button 
          variant="ghost" 
          size="icon" 
          className="absolute right-2 top-2" 
          onClick={handleSkip}
          aria-label="Fermer le tutoriel"
        >
          <X className="h-4 w-4" />
        </Button>
        
        <CardHeader>
          <div className="flex items-center gap-2">
            {currentStepIndex === 0 || currentStepIndex === steps.length - 1 ? (
              <Info className="h-5 w-5 text-blue-500" />
            ) : (
              <AlertCircle className="h-5 w-5 text-amber-500" />
            )}
            <CardTitle>{currentStep.title}</CardTitle>
          </div>
          {currentStepIndex === steps.length - 1 && (
            <CardDescription>
              <div className="flex items-center mt-2 text-green-600">
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Tutoriel terminé avec succès !
              </div>
            </CardDescription>
          )}
        </CardHeader>
        
        <CardContent>
          <p>{currentStep.description}</p>
        </CardContent>
        
        <CardFooter className="flex justify-between">
          <div>
            {currentStepIndex > 0 && (
              <Button 
                variant="outline" 
                onClick={handlePreviousStep}
                disabled={isLoading}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Précédent
              </Button>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="secondary" 
              onClick={handleSkip}
              disabled={isLoading}
            >
              Ignorer
            </Button>
            
            {currentStepIndex < steps.length - 1 ? (
              <Button 
                onClick={handleNextStep}
                disabled={isLoading}
              >
                Suivant
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button 
                onClick={handleFinish}
                disabled={isLoading}
              >
                Terminer
                <CheckCircle2 className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}

