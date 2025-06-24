"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"

interface TutorialStep {
  id: string
  title: string
  description: string
  component: React.ReactNode
  completed: boolean
  required: boolean
}

interface ClientTutorialOverlayProps {
  userId: string
  onComplete: () => void
}

export function ClientTutorialOverlay({ userId, onComplete }: ClientTutorialOverlayProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [steps, setSteps] = useState<TutorialStep[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [canSkip, setCanSkip] = useState(false)
  const router = useRouter()
  const t = useTranslations()

  useEffect(() => {
    initializeTutorialSteps()
  }, [])

  const initializeTutorialSteps = () => {
    const tutorialSteps: TutorialStep[] = [
      {
        id: "welcome",
        title: "Bienvenue sur EcoDeli",
        description: "Découvrez comment fonctionne notre plateforme de crowdshipping éco-responsable",
        component: <WelcomeStep />,
        completed: false,
        required: true
      },
      {
        id: "create_announcement",
        title: "Créer une annonce",
        description: "Apprenez à publier votre première demande de livraison",
        component: <CreateAnnouncementStep userId={userId} onStepComplete={() => markStepCompleted("create_announcement")} />,
        completed: false,
        required: true
      },
      {
        id: "manage_delivery",
        title: "Gérer vos livraisons",
        description: "Découvrez comment suivre et valider vos livraisons",
        component: <ManageDeliveryStep />,
        completed: false,
        required: true
      },
      {
        id: "book_service",
        title: "Réserver un service",
        description: "Apprenez à réserver des services à la personne",
        component: <BookServiceStep userId={userId} onStepComplete={() => markStepCompleted("book_service")} />,
        completed: false,
        required: false
      },
      {
        id: "manage_payments",
        title: "Gérer vos paiements",
        description: "Configurez vos méthodes de paiement et abonnements",
        component: <ManagePaymentsStep userId={userId} onStepComplete={() => markStepCompleted("manage_payments")} />,
        completed: false,
        required: true
      },
      {
        id: "completion",
        title: "Félicitations !",
        description: "Vous maîtrisez maintenant les bases d'EcoDeli",
        component: <CompletionStep />,
        completed: false,
        required: true
      }
    ]

    setSteps(tutorialSteps)
  }

  const markStepCompleted = async (stepId: string) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, completed: true } : step
    ))

    // Sauvegarder le progrès en base
    try {
      await fetch('/api/client/tutorial/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stepId, completed: true })
      })
    } catch (error) {
      console.error('Erreur sauvegarde progrès tutorial:', error)
    }
  }

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      completeTutorial()
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const completeTutorial = async () => {
    setIsLoading(true)
    
    try {
      // Marquer le tutorial comme terminé
      await fetch('/api/client/tutorial/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: true })
      })

      onComplete()
    } catch (error) {
      console.error('Erreur finalisation tutorial:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const currentStepData = steps[currentStep]
  const progress = ((currentStep + 1) / steps.length) * 100
  const requiredStepsCompleted = steps.filter(s => s.required && s.completed).length
  const totalRequiredSteps = steps.filter(s => s.required).length

  if (!currentStepData) return null

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-auto">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                🎓 Tutorial EcoDeli
                <Badge variant="outline">
                  Étape {currentStep + 1}/{steps.length}
                </Badge>
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                {currentStepData.description}
              </p>
            </div>
            
            {canSkip && currentStep > 0 && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={completeTutorial}
                disabled={requiredStepsCompleted < totalRequiredSteps}
              >
                Ignorer le tutorial
              </Button>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Progression</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Contenu de l'étape actuelle */}
          <div className="bg-gray-50 rounded-lg p-6 min-h-[400px]">
            <h3 className="text-xl font-semibold mb-4">
              {currentStepData.title}
            </h3>
            {currentStepData.component}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={handlePrevious}
              disabled={currentStep === 0}
            >
              ← Précédent
            </Button>

            <div className="flex items-center gap-2">
              {steps.map((step, index) => (
                <div
                  key={step.id}
                  className={`w-3 h-3 rounded-full ${
                    index === currentStep
                      ? 'bg-green-600'
                      : index < currentStep
                      ? 'bg-green-300'
                      : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>

            <Button 
              onClick={handleNext}
              disabled={isLoading || (currentStepData.required && !currentStepData.completed)}
              className="min-w-[100px]"
            >
              {isLoading ? (
                'Finalisation...'
              ) : currentStep === steps.length - 1 ? (
                'Terminer'
              ) : (
                'Suivant →'
              )}
            </Button>
          </div>

          {/* Aide contextuelle */}
          {currentStepData.required && !currentStepData.completed && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                ⚠️ Cette étape est obligatoire. Vous devez la compléter pour continuer.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Composants pour chaque étape du tutorial
function WelcomeStep() {
  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="text-6xl mb-4">🌱</div>
        <h4 className="text-lg font-medium mb-2">
          Bienvenue dans l'économie collaborative éco-responsable !
        </h4>
        <p className="text-gray-600">
          EcoDeli vous permet d'envoyer et recevoir des colis tout en réduisant l'impact environnemental.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <div className="text-center p-4 bg-white rounded-lg border">
          <div className="text-2xl mb-2">📦</div>
          <h5 className="font-medium">Envoyez vos colis</h5>
          <p className="text-sm text-gray-600">Via des livreurs sur leur trajet</p>
        </div>
        <div className="text-center p-4 bg-white rounded-lg border">
          <div className="text-2xl mb-2">🔧</div>
          <h5 className="font-medium">Réservez des services</h5>
          <p className="text-sm text-gray-600">Services à la personne de qualité</p>
        </div>
        <div className="text-center p-4 bg-white rounded-lg border">
          <div className="text-2xl mb-2">💚</div>
          <h5 className="font-medium">Impact positif</h5>
          <p className="text-sm text-gray-600">Réduisez votre empreinte carbone</p>
        </div>
      </div>
    </div>
  )
}

function CreateAnnouncementStep({ userId, onStepComplete }: { userId: string; onStepComplete: () => void }) {
  const [demoCompleted, setDemoCompleted] = useState(false)

  const handleDemoComplete = () => {
    setDemoCompleted(true)
    onStepComplete()
  }

  return (
    <div className="space-y-4">
      <p className="text-gray-600">
        Créer une annonce est simple ! Suivez ces étapes :
      </p>

      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <Badge className="mt-1">1</Badge>
          <div>
            <h5 className="font-medium">Choisissez votre type de demande</h5>
            <p className="text-sm text-gray-600">Livraison de colis, transport de personne, courses, etc.</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Badge className="mt-1">2</Badge>
          <div>
            <h5 className="font-medium">Précisez les détails</h5>
            <p className="text-sm text-gray-600">Adresses, poids, dimensions, date souhaitée</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Badge className="mt-1">3</Badge>
          <div>
            <h5 className="font-medium">Fixez votre prix</h5>
            <p className="text-sm text-gray-600">Prix suggéré automatiquement selon la distance</p>
          </div>
        </div>
      </div>

      <div className="bg-green-50 rounded-lg p-4 mt-6">
        <h5 className="font-medium mb-2">💡 Conseil</h5>
        <p className="text-sm text-green-800">
          Plus votre description est précise, plus vous attirerez des livreurs de qualité !
        </p>
      </div>

      <Button 
        onClick={handleDemoComplete}
        className="w-full mt-4"
        disabled={demoCompleted}
      >
        {demoCompleted ? '✅ Compris !' : 'J\'ai compris comment créer une annonce'}
      </Button>
    </div>
  )
}

function ManageDeliveryStep() {
  return (
    <div className="space-y-4">
      <p className="text-gray-600">
        Une fois votre annonce publiée, voici comment se déroule une livraison :
      </p>

      <div className="space-y-4">
        {[
          { status: 'ACTIVE', label: 'Annonce active', desc: 'Les livreurs peuvent postuler' },
          { status: 'MATCHED', label: 'Livreur sélectionné', desc: 'Vous choisissez parmi les candidatures' },
          { status: 'IN_TRANSIT', label: 'En cours de livraison', desc: 'Suivi temps réel disponible' },
          { status: 'DELIVERED', label: 'Livraison terminée', desc: 'Code de validation requis' }
        ].map((step, index) => (
          <div key={step.status} className="flex items-center gap-3 p-3 bg-white rounded-lg border">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-sm font-medium">
              {index + 1}
            </div>
            <div className="flex-1">
              <h5 className="font-medium">{step.label}</h5>
              <p className="text-sm text-gray-600">{step.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-blue-50 rounded-lg p-4">
        <h5 className="font-medium mb-2">🔢 Code de validation</h5>
        <p className="text-sm text-blue-800">
          Vous recevrez un code à 6 chiffres à donner au livreur pour confirmer la réception.
        </p>
      </div>
    </div>
  )
}

function BookServiceStep({ userId, onStepComplete }: { userId: string; onStepComplete: () => void }) {
  const [understood, setUnderstood] = useState(false)

  return (
    <div className="space-y-4">
      <p className="text-gray-600">
        EcoDeli vous donne aussi accès à des services à la personne de qualité :
      </p>

      <div className="grid grid-cols-2 gap-3">
        {[
          { icon: '🏠', name: 'Ménage' },
          { icon: '🌿', name: 'Jardinage' },
          { icon: '🔧', name: 'Bricolage' },
          { icon: '🐕', name: 'Garde animaux' },
          { icon: '📚', name: 'Cours particuliers' },
          { icon: '💄', name: 'Beauté/Soins' }
        ].map((service) => (
          <div key={service.name} className="text-center p-3 bg-white rounded-lg border">
            <div className="text-2xl mb-1">{service.icon}</div>
            <p className="text-sm font-medium">{service.name}</p>
          </div>
        ))}
      </div>

      <div className="bg-purple-50 rounded-lg p-4">
        <h5 className="font-medium mb-2">⭐ Prestataires vérifiés</h5>
        <p className="text-sm text-purple-800">
          Tous nos prestataires sont vérifiés et notés par la communauté.
        </p>
      </div>

      <Button 
        onClick={() => {
          setUnderstood(true)
          onStepComplete()
        }}
        className="w-full"
        disabled={understood}
      >
        {understood ? '✅ Compris !' : 'Je comprends le système de services'}
      </Button>
    </div>
  )
}

function ManagePaymentsStep({ userId, onStepComplete }: { userId: string; onStepComplete: () => void }) {
  const [planSelected, setPlanSelected] = useState(false)

  const plans = [
    {
      name: 'Gratuit',
      price: '0€/mois',
      features: ['3 colis/mois', 'Support par email'],
      color: 'bg-gray-100'
    },
    {
      name: 'Starter',
      price: '9.90€/mois',
      features: ['20 colis/mois', 'Assurance 115€', 'Support prioritaire'],
      color: 'bg-blue-100'
    },
    {
      name: 'Premium',
      price: '19.99€/mois',
      features: ['Colis illimités', 'Assurance 3000€', 'Support 24/7'],
      color: 'bg-green-100'
    }
  ]

  return (
    <div className="space-y-4">
      <p className="text-gray-600">
        Choisissez le plan qui correspond à vos besoins :
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map((plan) => (
          <div key={plan.name} className={`p-4 rounded-lg border ${plan.color}`}>
            <h5 className="font-semibold">{plan.name}</h5>
            <p className="text-lg font-bold mb-2">{plan.price}</p>
            <ul className="space-y-1">
              {plan.features.map((feature, index) => (
                <li key={index} className="text-sm flex items-center gap-1">
                  <span className="text-green-600">✓</span>
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="bg-orange-50 rounded-lg p-4">
        <h5 className="font-medium mb-2">💳 Paiements sécurisés</h5>
        <p className="text-sm text-orange-800">
          Tous les paiements sont sécurisés via Stripe. Vous pouvez changer de plan à tout moment.
        </p>
      </div>

      <Button 
        onClick={() => {
          setPlanSelected(true)
          onStepComplete()
        }}
        className="w-full"
        disabled={planSelected}
      >
        {planSelected ? '✅ Plan compris !' : 'Je comprends les abonnements'}
      </Button>
    </div>
  )
}

function CompletionStep() {
  return (
    <div className="text-center space-y-6">
      <div className="text-6xl">🎉</div>
      <div>
        <h4 className="text-2xl font-bold mb-2">Félicitations !</h4>
        <p className="text-gray-600">
          Vous maîtrisez maintenant les bases d'EcoDeli. Vous pouvez commencer à utiliser la plateforme.
        </p>
      </div>

      <div className="bg-green-50 rounded-lg p-6">
        <h5 className="font-semibold mb-3">🚀 Prochaines étapes suggérées :</h5>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center text-xs">1</span>
            Créez votre première annonce de livraison
          </div>
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center text-xs">2</span>
            Explorez les services disponibles près de chez vous
          </div>
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center text-xs">3</span>
            Complétez votre profil pour de meilleures recommandations
          </div>
        </div>
      </div>

      <p className="text-sm text-gray-500">
        N'hésitez pas à consulter notre FAQ ou à nous contacter si vous avez des questions !
      </p>
    </div>
  )
}