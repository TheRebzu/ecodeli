"use client"

import { useState, useEffect } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { 
  Check, 
  Crown, 
  Shield, 
  Zap, 
  CreditCard,
  TrendingUp,
  Package,
  Star,
  AlertTriangle,
  Info
} from "lucide-react"

interface Subscription {
  id: string
  plan: 'FREE' | 'STARTER' | 'PREMIUM'
  status: string
  startDate: string
  endDate?: string
  autoRenew: boolean
}

interface UsageStats {
  thisMonth: {
    deliveries: number
    savings: number
    priorityShipments: number
    insuranceUsed: number
  }
  lastMonth: {
    deliveries: number
    savings: number
  }
}

const plans = {
  FREE: {
    name: 'Free',
    price: 0,
    icon: Package,
    color: 'border-gray-200',
    features: [
      'Annonces de livraison illimitées',
      'Matching avec livreurs',
      'Suivi basique des livraisons',
      'Support par email'
    ],
    insurance: 0,
    discount: 0,
    priorityShippingCost: 15
  },
  STARTER: {
    name: 'Starter',
    price: 9.90,
    icon: Zap,
    color: 'border-blue-500',
    features: [
      'Toutes les fonctionnalités Free',
      'Assurance jusqu\'à 115€/envoi',
      '5% de réduction sur tous les envois',
      'Envoi prioritaire à +5% au lieu de +15%',
      'Support prioritaire',
      'Statistiques détaillées'
    ],
    insurance: 115,
    discount: 5,
    priorityShippingCost: 5
  },
  PREMIUM: {
    name: 'Premium',
    price: 19.99,
    icon: Crown,
    color: 'border-yellow-500',
    features: [
      'Toutes les fonctionnalités Starter',
      'Assurance jusqu\'à 3000€/envoi',
      '9% de réduction sur tous les envois',
      'Premier envoi offert si < 150€',
      '3 envois prioritaires offerts/mois',
      'Livraison express disponible',
      'Support téléphonique 24/7',
      'Accès API développeur'
    ],
    insurance: 3000,
    discount: 9,
    priorityShippingCost: 5,
    freeShipments: 3
  }
}

export default function ClientSubscriptionPage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isChanging, setIsChanging] = useState(false)

  const t = useTranslations()

  useEffect(() => {
    fetchSubscriptionData()
  }, [])

  const fetchSubscriptionData = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/client/subscription')
      
      if (response.ok) {
        const data = await response.json()
        setSubscription(data.subscription)
        setUsageStats(data.usageStats)
      }
    } catch (error) {
      console.error('Erreur récupération abonnement:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const changePlan = async (newPlan: string) => {
    setIsChanging(true)
    try {
      const response = await fetch('/api/client/subscription', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: newPlan })
      })

      if (response.ok) {
        const data = await response.json()
        setSubscription(data.subscription)
        alert(`Abonnement changé pour ${plans[newPlan as keyof typeof plans].name} !`)
      } else {
        const error = await response.json()
        alert(`Erreur: ${error.error}`)
      }
    } catch (error) {
      console.error('Erreur changement abonnement:', error)
      alert('Erreur lors du changement d\'abonnement')
    } finally {
      setIsChanging(false)
    }
  }

  const cancelSubscription = async () => {
    try {
      const response = await fetch('/api/client/subscription', {
        method: 'DELETE'
      })

      if (response.ok) {
        alert('Abonnement annulé. Il restera actif jusqu\'à la fin de la période.')
        fetchSubscriptionData()
      } else {
        const error = await response.json()
        alert(`Erreur: ${error.error}`)
      }
    } catch (error) {
      console.error('Erreur annulation:', error)
      alert('Erreur lors de l\'annulation')
    }
  }

  const currentPlan = subscription ? plans[subscription.plan] : plans.FREE

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            👑 Mon Abonnement
          </h1>
          <p className="text-gray-600">
            Gérez votre abonnement et découvrez les avantages de chaque plan
          </p>
        </div>

        <Tabs defaultValue="current" className="space-y-6">
          <TabsList className="grid grid-cols-3 w-full max-w-md">
            <TabsTrigger value="current">Mon Plan</TabsTrigger>
            <TabsTrigger value="compare">Comparer</TabsTrigger>
            <TabsTrigger value="usage">Utilisation</TabsTrigger>
"use client"

import { useState, useEffect } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { 
  Check, 
  Crown, 
  Shield, 
  Zap, 
  CreditCard,
  TrendingUp,
  Package,
  Star,
  AlertTriangle,
  Info
} from "lucide-react"

interface Subscription {
  id: string
  plan: 'FREE' | 'STARTER' | 'PREMIUM'
  status: string
  startDate: string
  endDate?: string
  autoRenew: boolean
}

interface UsageStats {
  thisMonth: {
    deliveries: number
    savings: number
    priorityShipments: number
    insuranceUsed: number
  }
  lastMonth: {
    deliveries: number
    savings: number
  }
}

const plans = {
  FREE: {
    name: 'Free',
    price: 0,
    icon: Package,
    color: 'border-gray-200',
    features: [
      'Annonces de livraison illimitées',
      'Matching avec livreurs',
      'Suivi basique des livraisons',
      'Support par email'
    ],
    insurance: 0,
    discount: 0,
    priorityShippingCost: 15 // +15%
  },
  STARTER: {
    name: 'Starter',
    price: 9.90,
    icon: Zap,
    color: 'border-blue-500',
    features: [
      'Toutes les fonctionnalités Free',
      'Assurance jusqu\'à 115€/envoi',
      '5% de réduction sur tous les envois',
      'Envoi prioritaire à +5% au lieu de +15%',
      'Support prioritaire',
      'Statistiques détaillées'
    ],
    insurance: 115,
    discount: 5,
    priorityShippingCost: 5 // +5%
  },
  PREMIUM: {
    name: 'Premium',
    price: 19.99,
    icon: Crown,
    color: 'border-yellow-500',
    features: [
      'Toutes les fonctionnalités Starter',
      'Assurance jusqu\'à 3000€/envoi',
      '9% de réduction sur tous les envois',
      'Premier envoi offert si < 150€',
      '3 envois prioritaires offerts/mois',
      'Livraison express disponible',
      'Support téléphonique 24/7',
      'Accès API développeur'
    ],
    insurance: 3000,
    discount: 9,
    priorityShippingCost: 5, // +5% après les 3 gratuits
    freeShipments: 3
  }
}

export default function ClientSubscriptionPage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isChanging, setIsChanging] = useState(false)

  const t = useTranslations()

  useEffect(() => {
    fetchSubscriptionData()
  }, [])

  const fetchSubscriptionData = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/client/subscription')
      
      if (response.ok) {
        const data = await response.json()
        setSubscription(data.subscription)
        setUsageStats(data.usageStats)
      }
    } catch (error) {
      console.error('Erreur récupération abonnement:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const changePlan = async (newPlan: string) => {
    setIsChanging(true)
    try {
      const response = await fetch('/api/client/subscription', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: newPlan })
      })

      if (response.ok) {
        const data = await response.json()
        setSubscription(data.subscription)
        alert(`Abonnement changé pour ${plans[newPlan as keyof typeof plans].name} !`)
      } else {
        const error = await response.json()
        alert(`Erreur: ${error.error}`)
      }
    } catch (error) {
      console.error('Erreur changement abonnement:', error)
      alert('Erreur lors du changement d\'abonnement')
    } finally {
      setIsChanging(false)
    }
  }

  const cancelSubscription = async () => {
    try {
      const response = await fetch('/api/client/subscription', {
        method: 'DELETE'
      })

      if (response.ok) {
        alert('Abonnement annulé. Il restera actif jusqu\'à la fin de la période.')
        fetchSubscriptionData()
      } else {
        const error = await response.json()
        alert(`Erreur: ${error.error}`)
      }
    } catch (error) {
      console.error('Erreur annulation:', error)
      alert('Erreur lors de l\'annulation')
    }
  }

  const currentPlan = subscription ? plans[subscription.plan] : plans.FREE

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            👑 Mon Abonnement
          </h1>
          <p className="text-gray-600">
            Gérez votre abonnement et découvrez les avantages de chaque plan
          </p>
        </div>

        <Tabs defaultValue="current" className="space-y-6">
          <TabsList className="grid grid-cols-3 w-full max-w-md">
            <TabsTrigger value="current">Mon Plan</TabsTrigger>
            <TabsTrigger value="compare">Comparer</TabsTrigger>
            <TabsTrigger value="usage">Utilisation</TabsTrigger>
          </TabsList>

          {/* Onglet Plan Actuel */}
          <TabsContent value="current" className="space-y-6">
            <Card className={`${currentPlan.color} border-2`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <currentPlan.icon className="w-8 h-8 text-blue-600" />
                    <div>
                      <CardTitle className="text-2xl">{currentPlan.name}</CardTitle>
                      <p className="text-gray-600">Plan actuel</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-blue-600">
                      {currentPlan.price === 0 ? 'Gratuit' : `${currentPlan.price}€`}
                    </p>
                    {currentPlan.price > 0 && (
                      <p className="text-sm text-gray-500">/mois</p>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <Shield className="w-5 h-5 text-blue-600" />
                      <span className="font-medium">Assurance</span>
                    </div>
                    <p className="text-2xl font-bold text-blue-600">
                      {currentPlan.insurance === 0 ? 'Aucune' : `${currentPlan.insurance}€`}
                    </p>
                    <p className="text-sm text-gray-600">par envoi</p>
                  </div>

                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <TrendingUp className="w-5 h-5 text-green-600" />
                      <span className="font-medium">Réduction</span>
                    </div>
                    <p className="text-2xl font-bold text-green-600">
                      {currentPlan.discount}%
                    </p>
                    <p className="text-sm text-gray-600">sur tous les envois</p>
                  </div>

                  <div className="bg-orange-50 p-4 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <Zap className="w-5 h-5 text-orange-600" />
                      <span className="font-medium">Prioritaire</span>
                    </div>
                    <p className="text-2xl font-bold text-orange-600">
                      +{currentPlan.priorityShippingCost}%
                    </p>
                    <p className="text-sm text-gray-600">supplément</p>
                  </div>
                </div>

                {subscription && subscription.plan !== 'FREE' && (
                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="font-medium">Prochaine facturation</p>
                        <p className="text-sm text-gray-600">
                          {subscription.endDate 
                            ? new Date(subscription.endDate).toLocaleDateString('fr-FR')
                            : 'Indéterminée'
                          }
                        </p>
                      </div>
                      <Badge variant={subscription.status === 'active' ? 'default' : 'secondary'}>
                        {subscription.status}
                      </Badge>
                    </div>

                    <div className="flex space-x-2">
                      {subscription.plan !== 'PREMIUM' && (
                        <Button 
                          onClick={() => changePlan('PREMIUM')}
                          disabled={isChanging}
                        >
                          <Crown className="w-4 h-4 mr-2" />
                          Passer au Premium
                        </Button>
                      )}
                      
                      {subscription.plan === 'PREMIUM' && (
                        <Button 
                          onClick={() => changePlan('STARTER')}
                          variant="outline"
                          disabled={isChanging}
                        >
                          Rétrograder au Starter
                        </Button>
                      )}

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm">
                            <AlertTriangle className="w-4 h-4 mr-2" />
                            Annuler
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Annuler l'abonnement ?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Votre abonnement restera actif jusqu'à la fin de la période payée. 
                              Vous perdrez ensuite tous les avantages du plan {currentPlan.name}.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Conserver</AlertDialogCancel>
                            <AlertDialogAction onClick={cancelSubscription}>
                              Confirmer l'annulation
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {subscription?.plan === 'FREE' && (
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 text-white">
                <h3 className="text-xl font-semibold mb-2">
                  Découvrez les avantages Premium ! 🚀
                </h3>
                <p className="mb-4 opacity-90">
                  Économisez jusqu'à 9% sur vos envois et bénéficiez d'une assurance jusqu'à 3000€
                </p>
                <Button 
                  variant="secondary" 
                  onClick={() => changePlan('STARTER')}
                  disabled={isChanging}
                >
                  Commencer avec Starter - 9.90€/mois
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Onglet Comparaison */}
          <TabsContent value="compare" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {Object.entries(plans).map(([key, plan]) => {
                const isCurrentPlan = subscription?.plan === key
                const IconComponent = plan.icon
                
                return (
                  <Card 
                    key={key} 
                    className={`${plan.color} border-2 ${
                      isCurrentPlan ? 'ring-2 ring-blue-500 ring-offset-2' : ''
                    }`}
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <IconComponent className="w-6 h-6" />
                          <CardTitle>{plan.name}</CardTitle>
                        </div>
                        {isCurrentPlan && (
                          <Badge>Actuel</Badge>
                        )}
                      </div>
                      <div className="text-center">
                        <p className="text-3xl font-bold">
                          {plan.price === 0 ? 'Gratuit' : `${plan.price}€`}
                        </p>
                        {plan.price > 0 && (
                          <p className="text-sm text-gray-500">/mois</p>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <ul className="space-y-2">
                        {plan.features.map((feature, index) => (
                          <li key={index} className="flex items-start space-x-2">
                            <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span className="text-sm">{feature}</span>
                          </li>
                        ))}
                      </ul>

                      {!isCurrentPlan && (
                        <Button 
                          className="w-full"
                          variant={key === 'PREMIUM' ? 'default' : 'outline'}
                          onClick={() => changePlan(key)}
                          disabled={isChanging}
                        >
                          {key === 'FREE' ? 'Rétrograder' : 'Choisir ce plan'}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </TabsContent>

          {/* Onglet Utilisation */}
          <TabsContent value="usage" className="space-y-6">
            {usageStats && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center space-x-2 mb-2">
                        <Package className="w-5 h-5 text-blue-600" />
                        <span className="font-medium">Livraisons</span>
                      </div>
                      <p className="text-2xl font-bold">{usageStats.thisMonth.deliveries}</p>
                      <p className="text-sm text-gray-600">ce mois</p>
                      {usageStats.lastMonth.deliveries > 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                          {usageStats.lastMonth.deliveries} le mois dernier
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center space-x-2 mb-2">
                        <TrendingUp className="w-5 h-5 text-green-600" />
                        <span className="font-medium">Économies</span>
                      </div>
                      <p className="text-2xl font-bold text-green-600">
                        {usageStats.thisMonth.savings}€
                      </p>
                      <p className="text-sm text-gray-600">ce mois</p>
                      {usageStats.lastMonth.savings > 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                          {usageStats.lastMonth.savings}€ le mois dernier
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center space-x-2 mb-2">
                        <Zap className="w-5 h-5 text-orange-600" />
                        <span className="font-medium">Prioritaires</span>
                      </div>
                      <p className="text-2xl font-bold">
                        {usageStats.thisMonth.priorityShipments}
                      </p>
                      <p className="text-sm text-gray-600">envois ce mois</p>
                      {subscription?.plan === 'PREMIUM' && (
                        <Progress 
                          value={(usageStats.thisMonth.priorityShipments / 3) * 100} 
                          className="mt-2 h-2"
                        />
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center space-x-2 mb-2">
                        <Shield className="w-5 h-5 text-purple-600" />
                        <span className="font-medium">Assurance</span>
                      </div>
                      <p className="text-2xl font-bold">
                        {usageStats.thisMonth.insuranceUsed}€
                      </p>
                      <p className="text-sm text-gray-600">couverture utilisée</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Recommandations */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Info className="w-5 h-5" />
                      <span>Recommandations</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {subscription?.plan === 'FREE' && usageStats.thisMonth.deliveries >= 3 && (
                      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-blue-800 font-medium">💡 Économisez avec Starter</p>
                        <p className="text-blue-700 text-sm mt-1">
                          Avec {usageStats.thisMonth.deliveries} livraisons ce mois, 
                          vous économiseriez ~{(usageStats.thisMonth.deliveries * 2.5).toFixed(0)}€ 
                          avec le plan Starter !
                        </p>
                      </div>
                    )}

                    {subscription?.plan === 'STARTER' && usageStats.thisMonth.deliveries >= 8 && (
                      <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                        <p className="text-yellow-800 font-medium">👑 Passez au Premium</p>
                        <p className="text-yellow-700 text-sm mt-1">
                          Avec votre utilisation intensive, le plan Premium vous ferait 
                          économiser encore plus avec ses 9% de réduction !
                        </p>
                      </div>
                    )}

                    {usageStats.thisMonth.deliveries === 0 && (
                      <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <p className="text-gray-800 font-medium">📦 Commencez à utiliser EcoDeli</p>
                        <p className="text-gray-700 text-sm mt-1">
                          Créez votre première annonce pour découvrir notre service !
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>

        {/* FAQ */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Questions fréquentes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Puis-je changer de plan à tout moment ?</h4>
              <p className="text-sm text-gray-600">
                Oui, vous pouvez changer de plan à tout moment. 
                Le changement prend effet immédiatement et la facturation est ajustée au prorata.
              </p>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Que se passe-t-il si j'annule mon abonnement ?</h4>
              <p className="text-sm text-gray-600">
                Votre abonnement reste actif jusqu'à la fin de la période payée. 
                Vous pouvez le réactiver à tout moment avant l'expiration.
              </p>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Comment fonctionne l'assurance ?</h4>
              <p className="text-sm text-gray-600">
                L'assurance couvre automatiquement vos envois jusqu'au montant spécifié. 
                En cas de perte ou de dommage, déclarez l'incident dans votre espace client.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 