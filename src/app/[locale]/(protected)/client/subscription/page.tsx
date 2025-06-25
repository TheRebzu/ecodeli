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
      'Premier envoi offert si moins de 150€',
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement de votre abonnement...</p>
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
            {subscription && (
              <Card className="border-2 border-blue-500 bg-gradient-to-br from-blue-50 to-white">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {React.createElement(plans[subscription.plan].icon, { 
                        className: "h-8 w-8 text-blue-600" 
                      })}
                      <div>
                        <CardTitle className="text-2xl">
                          Plan {plans[subscription.plan].name}
                        </CardTitle>
                        <p className="text-gray-600">
                          {plans[subscription.plan].price === 0 
                            ? 'Gratuit' 
                            : `${plans[subscription.plan].price}€/mois`
                          }
                        </p>
                      </div>
                    </div>
                    <Badge 
                      variant={subscription.status === 'active' ? 'default' : 'secondary'}
                      className="text-sm"
                    >
                      {subscription.status === 'active' ? 'Actif' : 'Inactif'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold mb-3">Fonctionnalités incluses</h4>
                      <ul className="space-y-2">
                        {plans[subscription.plan].features.map((feature, index) => (
                          <li key={index} className="flex items-start space-x-2">
                            <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-gray-700">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="space-y-4">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Assurance</span>
                          <span className="text-sm text-gray-600">
                            {plans[subscription.plan].insurance === 0 
                              ? 'Non incluse' 
                              : `Jusqu'à ${plans[subscription.plan].insurance}€`
                            }
                          </span>
                        </div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Réduction</span>
                          <span className="text-sm text-gray-600">
                            {plans[subscription.plan].discount}%
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Envoi prioritaire</span>
                          <span className="text-sm text-gray-600">
                            +{plans[subscription.plan].priorityShippingCost}%
                          </span>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">
                        <p>Abonnement depuis le {new Date(subscription.startDate).toLocaleDateString('fr-FR')}</p>
                        {subscription.endDate && (
                          <p>Expire le {new Date(subscription.endDate).toLocaleDateString('fr-FR')}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Onglet Comparaison */}
          <TabsContent value="compare" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {Object.entries(plans).map(([planKey, plan]) => (
                <Card 
                  key={planKey} 
                  className={`relative ${plan.color} ${
                    subscription?.plan === planKey ? 'ring-2 ring-blue-500' : ''
                  }`}
                >
                  {planKey === 'PREMIUM' && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-yellow-500 text-white">
                        <Star className="h-3 w-3 mr-1" />
                        Populaire
                      </Badge>
                    </div>
                  )}
                  <CardHeader>
                    <div className="text-center">
                      {React.createElement(plan.icon, { 
                        className: `h-12 w-12 mx-auto mb-4 ${
                          planKey === 'FREE' ? 'text-gray-600' :
                          planKey === 'STARTER' ? 'text-blue-600' : 'text-yellow-600'
                        }` 
                      })}
                      <CardTitle className="text-xl">{plan.name}</CardTitle>
                      <div className="text-3xl font-bold mt-2">
                        {plan.price === 0 ? 'Gratuit' : `${plan.price}€`}
                        {plan.price > 0 && <span className="text-sm font-normal text-gray-600">/mois</span>}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3 mb-6">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-start space-x-2">
                          <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    
                    {subscription?.plan !== planKey ? (
                      <Button 
                        onClick={() => changePlan(planKey)}
                        disabled={isChanging}
                        className="w-full"
                        variant={planKey === 'PREMIUM' ? 'default' : 'outline'}
                      >
                        {isChanging ? 'Changement...' : `Passer au ${plan.name}`}
                      </Button>
                    ) : (
                      <Button disabled className="w-full">
                        Plan actuel
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Onglet Utilisation */}
          <TabsContent value="usage" className="space-y-6">
            {usageStats && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">
                      Livraisons ce mois
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{usageStats.thisMonth.deliveries}</div>
                    <p className="text-xs text-gray-500">
                      {usageStats.lastMonth.deliveries} le mois dernier
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">
                      Économies réalisées
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {usageStats.thisMonth.savings}€
                    </div>
                    <p className="text-xs text-gray-500">
                      {usageStats.lastMonth.savings}€ le mois dernier
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">
                      Envois prioritaires
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{usageStats.thisMonth.priorityShipments}</div>
                    <p className="text-xs text-gray-500">
                      {subscription?.plan === 'PREMIUM' ? '3 gratuits/mois' : 'Payants'}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">
                      Assurance utilisée
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{usageStats.thisMonth.insuranceUsed}€</div>
                    <p className="text-xs text-gray-500">
                      Couverture max: {subscription ? plans[subscription.plan].insurance : 0}€
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Actions de gestion */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CreditCard className="h-5 w-5" />
                  <span>Gestion de l'abonnement</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium">Facturation automatique</h4>
                    <p className="text-sm text-gray-600">
                      {subscription?.autoRenew ? 'Activée' : 'Désactivée'}
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    {subscription?.autoRenew ? 'Désactiver' : 'Activer'}
                  </Button>
                </div>

                {subscription?.plan !== 'FREE' && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" className="w-full">
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        Annuler l'abonnement
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Confirmer l'annulation</AlertDialogTitle>
                        <AlertDialogDescription>
                          Êtes-vous sûr de vouloir annuler votre abonnement ? 
                          Vous perdrez tous les avantages premium à la fin de la période en cours.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={cancelSubscription}>
                          Confirmer l'annulation
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
} 