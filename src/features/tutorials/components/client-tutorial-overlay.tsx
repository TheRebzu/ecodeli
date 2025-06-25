'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronRight, ChevronLeft, Check, Clock, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { useTranslations } from 'next-intl'

interface TutorialStep {
  id: number
  title: string
  description: string
  type: string
  mandatory: boolean
  estimatedTime: number
  completed: boolean
  timeSpent: number
  skipped: boolean
}

interface TutorialSettings {
  blockingOverlay: boolean
  allowSkip: boolean
  autoSave: boolean
  showProgress: boolean
}

interface ClientTutorialOverlayProps {
  isOpen: boolean
  tutorialRequired: boolean
  currentStep: number
  steps: TutorialStep[]
  settings: TutorialSettings
  progressPercentage: number
  user: {
    name: string
    email: string
    subscriptionPlan: string
  }
  onStepComplete: (stepId: number, timeSpent: number) => Promise<void>
  onTutorialComplete: (data: {
    totalTimeSpent: number
    stepsCompleted: number[]
    feedback?: string
    rating?: number
  }) => Promise<void>
  onClose?: () => void
}

export function ClientTutorialOverlay({
  isOpen,
  tutorialRequired,
  currentStep,
  steps,
  settings,
  progressPercentage,
  user,
  onStepComplete,
  onTutorialComplete,
  onClose
}: ClientTutorialOverlayProps) {
  const t = useTranslations('tutorial')
  
  const [activeStepIndex, setActiveStepIndex] = useState(0)
  const [stepStartTime, setStepStartTime] = useState<number>(Date.now())
  const [totalStartTime] = useState<number>(Date.now())
  const [isCompleting, setIsCompleting] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [rating, setRating] = useState<number>(0)
  const [showFeedback, setShowFeedback] = useState(false)

  const activeStep = steps[activeStepIndex]
  const isLastStep = activeStepIndex === steps.length - 1
  const mandatorySteps = steps.filter(s => s.mandatory)
  const completedMandatory = mandatorySteps.filter(s => s.completed).length

  // Mettre à jour l'étape active quand currentStep change
  useEffect(() => {
    const stepIndex = steps.findIndex(s => s.id === currentStep)
    if (stepIndex !== -1) {
      setActiveStepIndex(stepIndex)
      setStepStartTime(Date.now())
    }
  }, [currentStep, steps])

  // Empêcher la fermeture si le tutoriel est obligatoire
  useEffect(() => {
    if (tutorialRequired && settings.blockingOverlay) {
      // Bloquer les raccourcis clavier
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape' || (e.ctrlKey && e.key === 'w')) {
          e.preventDefault()
          e.stopPropagation()
        }
      }

      // Bloquer le clic droit et autres interactions
      const handleContextMenu = (e: Event) => {
        e.preventDefault()
      }

      document.addEventListener('keydown', handleKeyDown, true)
      document.addEventListener('contextmenu', handleContextMenu, true)

      return () => {
        document.removeEventListener('keydown', handleKeyDown, true)
        document.removeEventListener('contextmenu', handleContextMenu, true)
      }
    }
  }, [tutorialRequired, settings.blockingOverlay])

  const handleStepComplete = async () => {
    if (!activeStep) return

    const timeSpent = Date.now() - stepStartTime
    
    try {
      await onStepComplete(activeStep.id, timeSpent)
      
      // Passer à l'étape suivante ou terminer
      if (isLastStep || completedMandatory === mandatorySteps.length - 1) {
        setShowFeedback(true)
      } else {
        const nextMandatoryStep = steps.find(s => s.mandatory && !s.completed)
        if (nextMandatoryStep) {
          const nextIndex = steps.findIndex(s => s.id === nextMandatoryStep.id)
          setActiveStepIndex(nextIndex)
          setStepStartTime(Date.now())
        }
      }
    } catch (error) {
      console.error('Error completing step:', error)
    }
  }

  const handleTutorialComplete = async () => {
    setIsCompleting(true)
    
    try {
      const totalTimeSpent = Date.now() - totalStartTime
      const completedStepIds = steps.filter(s => s.completed).map(s => s.id)
      
      await onTutorialComplete({
        totalTimeSpent,
        stepsCompleted: completedStepIds,
        feedback: feedback || undefined,
        rating: rating || undefined
      })
      
      onClose?.()
    } catch (error) {
      console.error('Error completing tutorial:', error)
    } finally {
      setIsCompleting(false)
    }
  }

  const handlePreviousStep = () => {
    if (activeStepIndex > 0) {
      setActiveStepIndex(activeStepIndex - 1)
      setStepStartTime(Date.now())
    }
  }

  const handleNextStep = () => {
    if (activeStepIndex < steps.length - 1) {
      setActiveStepIndex(activeStepIndex + 1)
      setStepStartTime(Date.now())
    }
  }

  const renderStepContent = () => {
    if (!activeStep) return null

    switch (activeStep.type) {
      case 'welcome':
        return (
          <div className="text-center space-y-6">
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center">
              <span className="text-2xl">🌱</span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Bienvenue {user.name.split(' ')[0]} sur EcoDeli !
              </h2>
              <p className="text-gray-600">
                Découvrez notre plateforme éco-responsable de crowdshipping
              </p>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <div className="w-12 h-12 mx-auto bg-blue-100 rounded-lg flex items-center justify-center mb-2">
                  📦
                </div>
                <p className="font-medium">Livraisons</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 mx-auto bg-green-100 rounded-lg flex items-center justify-center mb-2">
                  🚚
                </div>
                <p className="font-medium">Transport</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 mx-auto bg-purple-100 rounded-lg flex items-center justify-center mb-2">
                  🏠
                </div>
                <p className="font-medium">Services</p>
              </div>
            </div>
          </div>
        )

      case 'profile':
        return (
          <div className="space-y-4">
            <div className="text-center">
              <h2 className="text-xl font-bold mb-2">{activeStep.title}</h2>
              <p className="text-gray-600 mb-4">{activeStep.description}</p>
            </div>
            <Card>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Nom complet</span>
                    <Badge variant="outline">✓ Complété</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Email</span>
                    <Badge variant="outline">✓ Complété</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Téléphone</span>
                    <Badge variant="secondary">Optionnel</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Adresse</span>
                    <Badge variant="secondary">Recommandé</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )

      case 'subscription':
        return (
          <div className="space-y-4">
            <div className="text-center">
              <h2 className="text-xl font-bold mb-2">{activeStep.title}</h2>
              <p className="text-gray-600 mb-4">{activeStep.description}</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Card className={user.subscriptionPlan === 'FREE' ? 'ring-2 ring-blue-500' : ''}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Free</CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <div className="text-2xl font-bold">0€</div>
                  <div className="text-xs text-gray-500 mb-2">/mois</div>
                  <ul className="text-xs space-y-1">
                    <li>• Livraisons de base</li>
                    <li>• Support standard</li>
                  </ul>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Starter</CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <div className="text-2xl font-bold">9.90€</div>
                  <div className="text-xs text-gray-500 mb-2">/mois</div>
                  <ul className="text-xs space-y-1">
                    <li>• Assurance 115€</li>
                    <li>• Réduction 5%</li>
                  </ul>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Premium</CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <div className="text-2xl font-bold">19.99€</div>
                  <div className="text-xs text-gray-500 mb-2">/mois</div>
                  <ul className="text-xs space-y-1">
                    <li>• Assurance 3000€</li>
                    <li>• Réduction 9%</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        )

      case 'announcement':
        return (
          <div className="space-y-4">
            <div className="text-center">
              <h2 className="text-xl font-bold mb-2">{activeStep.title}</h2>
              <p className="text-gray-600 mb-4">{activeStep.description}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-sm">1</span>
                  </div>
                  <span className="text-sm">Choisir le type de livraison</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-sm">2</span>
                  </div>
                  <span className="text-sm">Définir les adresses</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-sm">3</span>
                  </div>
                  <span className="text-sm">Fixer le prix et horaires</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <Check className="w-4 h-4 text-green-600" />
                  </div>
                  <span className="text-sm">Publier l'annonce</span>
                </div>
              </div>
            </div>
          </div>
        )

      case 'completion':
        return (
          <div className="text-center space-y-6">
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center">
              <Check className="w-10 h-10 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Félicitations !
              </h2>
              <p className="text-gray-600">
                Vous êtes maintenant prêt à utiliser EcoDeli
              </p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <h3 className="font-medium text-green-800 mb-2">Fonctionnalités débloquées :</h3>
              <ul className="text-sm text-green-700 space-y-1">
                <li>✓ Création d'annonces illimitées</li>
                <li>✓ Réservation de services</li>
                <li>✓ Accès au support prioritaire</li>
                <li>✓ Tableau de bord avancé</li>
              </ul>
            </div>
          </div>
        )

      default:
        return (
          <div className="text-center space-y-4">
            <h2 className="text-xl font-bold">{activeStep.title}</h2>
            <p className="text-gray-600">{activeStep.description}</p>
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                Cette étape vous guidera à travers {activeStep.type}.
              </p>
            </div>
          </div>
        )
    }
  }

  const renderFeedbackForm = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Félicitations ! 🎉
        </h2>
        <p className="text-gray-600">
          Vous avez terminé le tutoriel obligatoire. Aidez-nous à l'améliorer !
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Notez votre expérience (optionnel)
          </label>
          <div className="flex justify-center space-x-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                className={`p-1 ${
                  star <= rating ? 'text-yellow-400' : 'text-gray-300'
                }`}
              >
                <Star className="w-6 h-6 fill-current" />
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Commentaires (optionnel)
          </label>
          <Textarea
            placeholder="Partagez vos impressions sur le tutoriel..."
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={3}
            maxLength={500}
          />
          <div className="text-right text-xs text-gray-500 mt-1">
            {feedback.length}/500
          </div>
        </div>
      </div>

      <div className="flex space-x-3">
        <Button
          variant="outline"
          onClick={handleTutorialComplete}
          className="flex-1"
        >
          Passer
        </Button>
        <Button
          onClick={handleTutorialComplete}
          disabled={isCompleting}
          className="flex-1"
        >
          {isCompleting ? 'Finalisation...' : 'Terminer'}
        </Button>
      </div>
    </div>
  )

  if (!isOpen || !tutorialRequired) {
    return null
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm"
        style={{ pointerEvents: 'all' }}
      >
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <span className="text-lg">🌱</span>
                  </div>
                  <div>
                    <h1 className="text-lg font-semibold">Tutoriel EcoDeli</h1>
                    <p className="text-sm text-gray-500">
                      Étape {activeStepIndex + 1} sur {steps.length}
                    </p>
                  </div>
                </div>
                
                {/* Empêcher la fermeture si obligatoire */}
                {!settings.blockingOverlay && onClose && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                )}
              </div>

              {/* Progress Bar */}
              {settings.showProgress && (
                <div className="px-6 py-3 bg-gray-50 border-b">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Progression</span>
                    <span className="text-sm text-gray-500">
                      {progressPercentage}%
                    </span>
                  </div>
                  <Progress value={progressPercentage} className="h-2" />
                  <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                    <span>{completedMandatory}/{mandatorySteps.length} étapes obligatoires</span>
                    <div className="flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      <span>~{activeStep?.estimatedTime}s</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Content */}
              <div className="p-6">
                {showFeedback ? renderFeedbackForm() : renderStepContent()}
              </div>

              {/* Footer */}
              {!showFeedback && (
                <div className="flex items-center justify-between p-6 border-t bg-gray-50">
                  <Button
                    variant="outline"
                    onClick={handlePreviousStep}
                    disabled={activeStepIndex === 0}
                    className="flex items-center"
                  >
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Précédent
                  </Button>

                  <div className="flex items-center space-x-2">
                    {steps.map((step, index) => (
                      <div
                        key={step.id}
                        className={`w-2 h-2 rounded-full ${
                          index === activeStepIndex
                            ? 'bg-blue-500'
                            : step.completed
                            ? 'bg-green-500'
                            : 'bg-gray-300'
                        }`}
                      />
                    ))}
                  </div>

                  {isLastStep ? (
                    <Button onClick={handleStepComplete} className="flex items-center">
                      Terminer
                      <Check className="w-4 h-4 ml-2" />
                    </Button>
                  ) : (
                    <Button onClick={handleStepComplete} className="flex items-center">
                      Suivant
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
} 