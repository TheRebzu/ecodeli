"use client";

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { 
  PlayCircle,
  CheckCircle,
  Clock,
  BookOpen,
  Video,
  FileText,
  Users,
  Target,
  Zap,
  Star,
  Award,
  Download,
  ExternalLink,
  ChevronRight,
  Loader2,
  Trophy,
  Calendar,
  MessageCircle,
  Phone,
  Mail,
  Rocket,
  Settings,
  ShoppingCart,
  BarChart3,
  DollarSign,
  Package,
  Truck,
  Shield,
  HelpCircle,
  Lightbulb,
  Briefcase,
  Globe
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/components/ui/use-toast'

interface OnboardingStep {
  id: string
  title: string
  description: string
  type: 'video' | 'tutorial' | 'document' | 'quiz' | 'setup'
  duration: number // en minutes
  completed: boolean
  required: boolean
  category: string
  icon: any
  content?: {
    videoUrl?: string
    documentUrl?: string
    tutorialSteps?: Array<{
      title: string
      description: string
      action?: string
    }>
    quizQuestions?: Array<{
      question: string
      options: string[]
      correct: number
    }>
  }
}

interface OnboardingProgress {
  totalSteps: number
  completedSteps: number
  currentLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert'
  badges: Array<{
    id: string
    name: string
    description: string
    earnedAt: string
    icon: string
  }>
  estimatedTimeRemaining: number
}

export default function MerchantOnboardingPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState<OnboardingProgress | null>(null)
  const [steps, setSteps] = useState<OnboardingStep[]>([])
  const [activeStep, setActiveStep] = useState<OnboardingStep | null>(null)
  const [currentCategory, setCurrentCategory] = useState<string>('essentials')
  const [playingVideo, setPlayingVideo] = useState<string | null>(null)

  useEffect(() => {
    fetchOnboardingData()
  }, [])

  const fetchOnboardingData = async () => {
    try {
      setLoading(true)
      const [progressRes, stepsRes] = await Promise.all([
        fetch('/api/merchant/onboarding/progress', { credentials: 'include' }),
        fetch('/api/merchant/onboarding/steps', { credentials: 'include' })
      ])
      
      if (progressRes.ok) {
        const progressData = await progressRes.json()
        setProgress(progressData.progress || getDemoProgress())
      } else {
        setProgress(getDemoProgress())
      }

      if (stepsRes.ok) {
        const stepsData = await stepsRes.json()
        setSteps(stepsData.steps || getDemoSteps())
      } else {
        setSteps(getDemoSteps())
      }
    } catch (error) {
      console.error('Erreur chargement onboarding:', error)
      setProgress(getDemoProgress())
      setSteps(getDemoSteps())
    } finally {
      setLoading(false)
    }
  }

  const getDemoProgress = (): OnboardingProgress => ({
    totalSteps: 25,
    completedSteps: 12,
    currentLevel: 'intermediate',
    badges: [
      {
        id: '1',
        name: 'Premier pas',
        description: 'Compte configuré avec succès',
        earnedAt: new Date(Date.now() - 86400000).toISOString(),
        icon: 'rocket'
      },
      {
        id: '2',
        name: 'Configurateur',
        description: 'Service lâcher de chariot configuré',
        earnedAt: new Date(Date.now() - 3600000).toISOString(),
        icon: 'settings'
      }
    ],
    estimatedTimeRemaining: 85
  })

  const getDemoSteps = (): OnboardingStep[] => [
    {
      id: '1',
      title: 'Bienvenue chez EcoDeli',
      description: 'Découvrez la plateforme de crowdshipping qui révolutionne la livraison',
      type: 'video',
      duration: 5,
      completed: true,
      required: true,
      category: 'essentials',
      icon: Rocket,
      content: {
        videoUrl: '/videos/welcome-ecodeli.mp4'
      }
    },
    {
      id: '2',
      title: 'Configuration de votre profil commerçant',
      description: 'Renseignez vos informations pour commencer à vendre',
      type: 'setup',
      duration: 10,
      completed: true,
      required: true,
      category: 'essentials',
      icon: Settings,
      content: {
        tutorialSteps: [
          {
            title: 'Informations de base',
            description: 'Nom de votre entreprise, adresse, secteur d\'activité',
            action: 'Compléter le profil'
          },
          {
            title: 'Documents légaux',
            description: 'SIRET, RCS, assurance professionnelle',
            action: 'Uploader les documents'
          },
          {
            title: 'Coordonnées bancaires',
            description: 'RIB pour recevoir vos paiements',
            action: 'Ajouter un RIB'
          }
        ]
      }
    },
    {
      id: '3',
      title: 'Le service "Lâcher de chariot" expliqué',
      description: 'Maîtrisez le service phare d\'EcoDeli pour maximiser vos ventes',
      type: 'video',
      duration: 12,
      completed: false,
      required: true,
      category: 'cart-drop',
      icon: ShoppingCart,
      content: {
        videoUrl: '/videos/cart-drop-explained.mp4'
      }
    },
    {
      id: '4',
      title: 'Configuration des zones de livraison',
      description: 'Définissez vos zones et tarifs de livraison',
      type: 'tutorial',
      duration: 15,
      completed: false,
      required: true,
      category: 'cart-drop',
      icon: Target,
      content: {
        tutorialSteps: [
          {
            title: 'Définir vos zones',
            description: 'Ajoutez les codes postaux que vous souhaitez desservir',
            action: 'Configurer les zones'
          },
          {
            title: 'Fixer les tarifs',
            description: 'Prix de base, prix au kilomètre, seuils de gratuité',
            action: 'Définir la grille tarifaire'
          },
          {
            title: 'Créneaux horaires',
            description: 'Heures de livraison disponibles selon les jours',
            action: 'Planifier les créneaux'
          }
        ]
      }
    },
    {
      id: '5',
      title: 'Intégration avec votre caisse',
      description: 'Connectez votre système de caisse avec EcoDeli',
      type: 'tutorial',
      duration: 20,
      completed: false,
      required: false,
      category: 'integration',
      icon: Package,
      content: {
        tutorialSteps: [
          {
            title: 'Choisir votre intégration',
            description: 'API, plugins Shopify/WooCommerce, ou solutions sur-mesure',
            action: 'Voir les options'
          },
          {
            title: 'Configuration technique',
            description: 'Paramètres API et webhooks',
            action: 'Configurer l\'API'
          },
          {
            title: 'Tests en environnement',
            description: 'Vérifier que tout fonctionne correctement',
            action: 'Lancer les tests'
          }
        ]
      }
    },
    {
      id: '6',
      title: 'Comprendre vos commissions',
      description: 'Comment sont calculées vos commissions et comment les optimiser',
      type: 'video',
      duration: 8,
      completed: false,
      required: true,
      category: 'business',
      icon: DollarSign,
      content: {
        videoUrl: '/videos/commission-explained.mp4'
      }
    },
    {
      id: '7',
      title: 'Tableau de bord et analytics',
      description: 'Suivez vos performances et analysez vos données',
      type: 'tutorial',
      duration: 12,
      completed: false,
      required: false,
      category: 'analytics',
      icon: BarChart3,
      content: {
        tutorialSteps: [
          {
            title: 'Métriques principales',
            description: 'Chiffre d\'affaires, nombre de commandes, satisfaction client',
            action: 'Explorer le dashboard'
          },
          {
            title: 'Rapports détaillés',
            description: 'Analyses temporelles et géographiques',
            action: 'Générer un rapport'
          }
        ]
      }
    },
    {
      id: '8',
      title: 'Quiz de validation des connaissances',
      description: 'Testez vos connaissances sur EcoDeli',
      type: 'quiz',
      duration: 10,
      completed: false,
      required: true,
      category: 'validation',
      icon: Award,
      content: {
        quizQuestions: [
          {
            question: 'Quel est le service phare d\'EcoDeli ?',
            options: ['Livraison express', 'Lâcher de chariot', 'Transport de personnes', 'Stockage'],
            correct: 1
          },
          {
            question: 'Comment est calculée votre commission ?',
            options: ['Fixe par commande', 'Pourcentage du CA', 'Selon la distance', 'Selon le poids'],
            correct: 1
          },
          {
            question: 'Quel délai de paiement pour un contrat standard ?',
            options: ['7 jours', '15 jours', '30 jours', '45 jours'],
            correct: 2
          }
        ]
      }
    }
  ]

  const categories = [
    { id: 'essentials', name: 'Essentiels', icon: Rocket, color: 'text-blue-600' },
    { id: 'cart-drop', name: 'Lâcher de chariot', icon: ShoppingCart, color: 'text-green-600' },
    { id: 'integration', name: 'Intégrations', icon: Package, color: 'text-purple-600' },
    { id: 'business', name: 'Business', icon: Briefcase, color: 'text-orange-600' },
    { id: 'analytics', name: 'Analytics', icon: BarChart3, color: 'text-red-600' },
    { id: 'validation', name: 'Validation', icon: Award, color: 'text-yellow-600' }
  ]

  const handleCompleteStep = async (stepId: string) => {
    try {
      const response = await fetch('/api/merchant/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ stepId })
      })

      if (response.ok) {
        setSteps(prev => prev.map(step => 
          step.id === stepId ? { ...step, completed: true } : step
        ))
        
        if (progress) {
          setProgress(prev => prev ? {
            ...prev,
            completedSteps: prev.completedSteps + 1
          } : null)
        }

        toast({
          title: "Étape terminée",
          description: "Félicitations ! Vous progressez dans votre formation EcoDeli"
        })
      }
    } catch (error) {
      console.error('Erreur completion étape:', error)
    }
  }

  const getProgressPercentage = () => {
    if (!progress) return 0
    return Math.round((progress.completedSteps / progress.totalSteps) * 100)
  }

  const getLevelBadge = (level: string) => {
    const levels = {
      beginner: { text: 'Débutant', color: 'bg-gray-100 text-gray-800' },
      intermediate: { text: 'Intermédiaire', color: 'bg-blue-100 text-blue-800' },
      advanced: { text: 'Avancé', color: 'bg-purple-100 text-purple-800' },
      expert: { text: 'Expert', color: 'bg-gold-100 text-gold-800' }
    }
    return levels[level as keyof typeof levels] || levels.beginner
  }

  const getStepsByCategory = (categoryId: string) => {
    return steps.filter(step => step.category === categoryId)
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'video': return Video
      case 'tutorial': return BookOpen
      case 'document': return FileText
      case 'quiz': return Award
      case 'setup': return Settings
      default: return BookOpen
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Chargement de votre formation...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* En-tête avec progression */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold">Formation commerçant EcoDeli</h1>
            <p className="text-muted-foreground">
              Maîtrisez tous les aspects de la plateforme pour maximiser vos ventes
            </p>
          </div>
          {progress && (
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {getProgressPercentage()}%
              </div>
              <Badge className={getLevelBadge(progress.currentLevel).color}>
                {getLevelBadge(progress.currentLevel).text}
              </Badge>
            </div>
          )}
        </div>

        {progress && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{progress.completedSteps} / {progress.totalSteps} étapes terminées</span>
              <span>~{progress.estimatedTimeRemaining} min restantes</span>
            </div>
            <Progress value={getProgressPercentage()} className="h-3" />
          </div>
        )}
      </div>

      {/* Badges obtenus */}
      {progress?.badges && progress.badges.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Vos badges obtenus
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {progress.badges.map((badge) => (
                <div key={badge.id} className="flex items-center gap-2 bg-yellow-50 rounded-lg p-3">
                  <div className="h-8 w-8 rounded-full bg-yellow-500 flex items-center justify-center text-white">
                    <Star className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-medium">{badge.name}</div>
                    <div className="text-xs text-muted-foreground">{badge.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation par catégories */}
      <div className="flex flex-wrap gap-2 mb-6">
        {categories.map((category) => {
          const categorySteps = getStepsByCategory(category.id)
          const completedCount = categorySteps.filter(step => step.completed).length
          const Icon = category.icon

          return (
            <Button
              key={category.id}
              variant={currentCategory === category.id ? "default" : "outline"}
              onClick={() => setCurrentCategory(category.id)}
              className="flex items-center gap-2"
            >
              <Icon className={`h-4 w-4 ${category.color}`} />
              {category.name}
              <Badge variant="secondary" className="ml-1">
                {completedCount}/{categorySteps.length}
              </Badge>
            </Button>
          )
        })}
      </div>

      {/* Contenu des étapes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Liste des étapes */}
        <div className="lg:col-span-2 space-y-4">
          {getStepsByCategory(currentCategory).map((step) => {
            const TypeIcon = getTypeIcon(step.type)
            const StepIcon = step.icon

            return (
              <Card 
                key={step.id} 
                className={`cursor-pointer transition-all ${
                  step.completed ? 'bg-green-50 border-green-200' : 
                  activeStep?.id === step.id ? 'ring-2 ring-primary' : 'hover:bg-muted/50'
                }`}
                onClick={() => setActiveStep(step)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-lg ${
                      step.completed ? 'bg-green-500 text-white' : 'bg-primary/10 text-primary'
                    }`}>
                      {step.completed ? (
                        <CheckCircle className="h-5 w-5" />
                      ) : (
                        <StepIcon className="h-5 w-5" />
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-medium">{step.title}</h3>
                        <div className="flex items-center gap-2">
                          <TypeIcon className="h-4 w-4 text-muted-foreground" />
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">{step.duration} min</span>
                          {step.required && (
                            <Badge variant="outline" className="text-xs">Obligatoire</Badge>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">{step.description}</p>
                      
                      {!step.completed && (
                        <div className="flex items-center gap-2 mt-2">
                          <Button size="sm" onClick={(e) => {
                            e.stopPropagation()
                            setActiveStep(step)
                          }}>
                            <PlayCircle className="h-4 w-4 mr-2" />
                            Commencer
                          </Button>
                          {step.type === 'video' && (
                            <Button variant="outline" size="sm" onClick={(e) => {
                              e.stopPropagation()
                              setPlayingVideo(step.id)
                            }}>
                              <Video className="h-4 w-4 mr-2" />
                              Regarder
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Panneau de détails */}
        <div>
          {activeStep ? (
            <StepDetailPanel 
              step={activeStep} 
              onComplete={handleCompleteStep}
              onClose={() => setActiveStep(null)}
            />
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Sélectionnez une étape</h3>
                <p className="text-muted-foreground">
                  Choisissez une étape dans la liste pour voir les détails et commencer votre apprentissage
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Support et aide */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            Besoin d'aide ?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
              <MessageCircle className="h-5 w-5 text-blue-600" />
              <div>
                <div className="font-medium">Chat en direct</div>
                <div className="text-sm text-muted-foreground">Support immédiat</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
              <Phone className="h-5 w-5 text-green-600" />
              <div>
                <div className="font-medium">01 42 56 78 90</div>
                <div className="text-sm text-muted-foreground">Lun-Ven 9h-18h</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
              <Mail className="h-5 w-5 text-purple-600" />
              <div>
                <div className="font-medium">formation@ecodeli.fr</div>
                <div className="text-sm text-muted-foreground">Questions formation</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialog vidéo */}
      <Dialog open={!!playingVideo} onOpenChange={() => setPlayingVideo(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {steps.find(s => s.id === playingVideo)?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="aspect-video bg-black rounded-lg flex items-center justify-center">
            <div className="text-white text-center">
              <Video className="h-16 w-16 mx-auto mb-4" />
              <p>Lecteur vidéo (simulation)</p>
              <p className="text-sm opacity-70">
                {steps.find(s => s.id === playingVideo)?.content?.videoUrl}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Panneau de détails d'une étape
interface StepDetailPanelProps {
  step: OnboardingStep
  onComplete: (stepId: string) => void
  onClose: () => void
}

function StepDetailPanel({ step, onComplete, onClose }: StepDetailPanelProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([])
  const [quizCompleted, setQuizCompleted] = useState(false)
  const [quizScore, setQuizScore] = useState(0)

  const handleQuizAnswer = (answerIndex: number) => {
    const newAnswers = [...selectedAnswers]
    newAnswers[currentQuestionIndex] = answerIndex
    setSelectedAnswers(newAnswers)
  }

  const handleNextQuestion = () => {
    if (step.content?.quizQuestions && currentQuestionIndex < step.content.quizQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    } else {
      // Quiz terminé, calculer le score
      const questions = step.content?.quizQuestions || []
      const score = selectedAnswers.reduce((acc, answer, index) => {
        return acc + (answer === questions[index]?.correct ? 1 : 0)
      }, 0)
      setQuizScore(score)
      setQuizCompleted(true)
    }
  }

  const TypeIcon = getTypeIcon(step.type)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <TypeIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{step.title}</CardTitle>
              <CardDescription>{step.description}</CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ×
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {step.duration} minutes
          </div>
          {step.required && (
            <Badge variant="outline">Obligatoire</Badge>
          )}
          {step.completed && (
            <Badge variant="default" className="bg-green-600">
              <CheckCircle className="h-3 w-3 mr-1" />
              Terminé
            </Badge>
          )}
        </div>

        {/* Contenu selon le type */}
        {step.type === 'video' && (
          <div className="space-y-4">
            <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <Video className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Lecteur vidéo</p>
                <p className="text-xs text-muted-foreground">
                  {step.content?.videoUrl}
                </p>
              </div>
            </div>
            {!step.completed && (
              <Button onClick={() => onComplete(step.id)} className="w-full">
                Marquer comme terminé
              </Button>
            )}
          </div>
        )}

        {step.type === 'tutorial' && step.content?.tutorialSteps && (
          <div className="space-y-4">
            {step.content.tutorialSteps.map((tutorialStep, index) => (
              <div key={index} className="border rounded-lg p-4">
                <h4 className="font-medium mb-2">{tutorialStep.title}</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  {tutorialStep.description}
                </p>
                {tutorialStep.action && (
                  <Button variant="outline" size="sm">
                    {tutorialStep.action}
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                )}
              </div>
            ))}
            {!step.completed && (
              <Button onClick={() => onComplete(step.id)} className="w-full">
                Marquer comme terminé
              </Button>
            )}
          </div>
        )}

        {step.type === 'quiz' && step.content?.quizQuestions && (
          <div className="space-y-4">
            {!quizCompleted ? (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    Question {currentQuestionIndex + 1} sur {step.content.quizQuestions.length}
                  </span>
                  <Progress 
                    value={(currentQuestionIndex / step.content.quizQuestions.length) * 100} 
                    className="w-24 h-2" 
                  />
                </div>
                
                <div className="border rounded-lg p-6">
                  <h4 className="font-medium mb-4">
                    {step.content.quizQuestions[currentQuestionIndex]?.question}
                  </h4>
                  <div className="space-y-2">
                    {step.content.quizQuestions[currentQuestionIndex]?.options.map((option, index) => (
                      <button
                        key={index}
                        onClick={() => handleQuizAnswer(index)}
                        className={`w-full text-left p-3 rounded-lg border transition-colors ${
                          selectedAnswers[currentQuestionIndex] === index
                            ? 'border-primary bg-primary/5'
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
                
                <Button 
                  onClick={handleNextQuestion}
                  disabled={selectedAnswers[currentQuestionIndex] === undefined}
                  className="w-full"
                >
                  {currentQuestionIndex < step.content.quizQuestions.length - 1 ? 'Question suivante' : 'Terminer le quiz'}
                </Button>
              </>
            ) : (
              <div className="text-center space-y-4">
                <div className="text-6xl">
                  {quizScore === step.content.quizQuestions.length ? '🎉' : 
                   quizScore >= step.content.quizQuestions.length * 0.7 ? '👍' : '📚'}
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">
                    {quizScore === step.content.quizQuestions.length ? 'Parfait !' :
                     quizScore >= step.content.quizQuestions.length * 0.7 ? 'Bien joué !' : 'Continuez vos efforts !'}
                  </h3>
                  <p className="text-muted-foreground">
                    Vous avez obtenu {quizScore} / {step.content.quizQuestions.length} bonnes réponses
                  </p>
                </div>
                {quizScore >= step.content.quizQuestions.length * 0.7 && (
                  <Button onClick={() => onComplete(step.id)} className="w-full">
                    Valider l'étape
                  </Button>
                )}
                {quizScore < step.content.quizQuestions.length * 0.7 && (
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setCurrentQuestionIndex(0)
                      setSelectedAnswers([])
                      setQuizCompleted(false)
                      setQuizScore(0)
                    }}
                    className="w-full"
                  >
                    Recommencer le quiz
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {step.type === 'setup' && step.content?.tutorialSteps && (
          <div className="space-y-4">
            <Alert>
              <Lightbulb className="h-4 w-4" />
              <AlertDescription>
                Cette étape nécessite de configurer des paramètres dans votre compte EcoDeli
              </AlertDescription>
            </Alert>
            
            {step.content.tutorialSteps.map((setupStep, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground text-sm flex items-center justify-center">
                    {index + 1}
                  </div>
                  <h4 className="font-medium">{setupStep.title}</h4>
                </div>
                <p className="text-sm text-muted-foreground mb-3 ml-9">
                  {setupStep.description}
                </p>
                {setupStep.action && (
                  <div className="ml-9">
                    <Button variant="outline" size="sm">
                      {setupStep.action}
                      <ExternalLink className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
            
            {!step.completed && (
              <Button onClick={() => onComplete(step.id)} className="w-full">
                J'ai terminé la configuration
              </Button>
            )}
          </div>
        )}

        {step.type === 'document' && (
          <div className="space-y-4">
            <div className="border rounded-lg p-6 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h4 className="font-medium mb-2">Document de formation</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Consultez le document PDF pour cette étape
              </p>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Télécharger le document
              </Button>
            </div>
            
            {!step.completed && (
              <Button onClick={() => onComplete(step.id)} className="w-full">
                J'ai lu le document
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function getTypeIcon(type: string) {
  switch (type) {
    case 'video': return Video
    case 'tutorial': return BookOpen
    case 'document': return FileText
    case 'quiz': return Award
    case 'setup': return Settings
    default: return BookOpen
  }
} 