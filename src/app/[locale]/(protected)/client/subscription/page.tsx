"use client"

import React, { useState, useEffect } from "react"
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
  Info,
  Loader2,
  Sparkles,
  Heart,
  Gift
} from "lucide-react"
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'

// Load Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

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
    color: 'border-gray-200 hover:border-gray-300',
    bgGradient: 'bg-gradient-to-br from-gray-50 to-white',
    badgeColor: 'bg-gray-100 text-gray-700',
    iconColor: 'text-gray-600',
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
    color: 'border-blue-300 hover:border-blue-400',
    bgGradient: 'bg-gradient-to-br from-blue-50 via-white to-blue-50',
    badgeColor: 'bg-blue-100 text-blue-700',
    iconColor: 'text-blue-600',
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
    color: 'border-yellow-300 hover:border-yellow-400',
    bgGradient: 'bg-gradient-to-br from-yellow-50 via-white to-orange-50',
    badgeColor: 'bg-gradient-to-r from-yellow-400 to-orange-400 text-white',
    iconColor: 'text-yellow-600',
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

// Payment Form Component
function PaymentForm({ planId, onSuccess, onError }: {
  planId: 'STARTER' | 'PREMIUM'
  onSuccess: () => void
  onError: (error: string) => void
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [isProcessing, setIsProcessing] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    
    if (!stripe || !elements) {
      onError('Stripe not loaded')
      return
    }

    setIsProcessing(true)

    try {
      // Create payment intent
      const response = await fetch('/api/subscriptions/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create payment intent')
      }

      const { clientSecret } = await response.json()

      // Confirm payment
      const cardElement = elements.getElement(CardElement)
      if (!cardElement) {
        throw new Error('Card element not found')
      }

      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement
        }
      })

      if (result.error) {
        onError(result.error.message || 'Payment failed')
      } else {
        // Create subscription
        const subscriptionResponse = await fetch('/api/subscriptions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            planId,
            paymentMethodId: result.paymentIntent.payment_method
          })
        })

        if (subscriptionResponse.ok) {
          onSuccess()
        } else {
          const error = await subscriptionResponse.json()
          onError(error.error || 'Failed to create subscription')
        }
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Payment failed')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Plan Summary */}
      <div className="text-center p-8 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-100">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full shadow-lg mb-6">
          {React.createElement(plans[planId].icon, { 
            className: `h-10 w-10 ${plans[planId].iconColor}` 
          })}
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">
          Plan {plans[planId].name}
        </h3>
        <div className="text-4xl font-bold text-blue-600 mb-2">
          {plans[planId].price}€
          <span className="text-lg font-normal text-gray-600">/mois</span>
        </div>
        <p className="text-gray-600">
          Facturé mensuellement, annulable à tout moment
        </p>
      </div>

      {/* Payment Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Billing Information */}
        <div className="p-6 border-2 border-gray-200 rounded-xl hover:border-blue-300 transition-colors">
          <h4 className="text-lg font-semibold mb-6 flex items-center">
            <CreditCard className="h-5 w-5 mr-2 text-blue-600" />
            Informations de facturation
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nom sur la carte *
              </label>
              <input
                type="text"
                placeholder="Jean Dupont"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email de facturation *
              </label>
              <input
                type="email"
                placeholder="jean.dupont@example.com"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                required
              />
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Adresse de facturation *
            </label>
            <input
              type="text"
              placeholder="123 Rue de la Paix"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ville *
              </label>
              <input
                type="text"
                placeholder="Paris"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Code postal *
              </label>
              <input
                type="text"
                placeholder="75001"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pays *
              </label>
              <select className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" required>
                <option value="FR">France</option>
                <option value="BE">Belgique</option>
                <option value="CH">Suisse</option>
                <option value="CA">Canada</option>
                <option value="DE">Allemagne</option>
                <option value="ES">Espagne</option>
                <option value="IT">Italie</option>
                <option value="LU">Luxembourg</option>
              </select>
            </div>
          </div>
        </div>

        {/* Payment Method */}
        <div className="p-6 border-2 border-gray-200 rounded-xl hover:border-blue-300 transition-colors">
          <h4 className="text-lg font-semibold mb-4 flex items-center">
            <CreditCard className="h-5 w-5 mr-2 text-blue-600" />
            Informations de carte bancaire
          </h4>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Numéro de carte, date d'expiration et CVV *
            </label>
            <div className="p-4 border border-gray-300 rounded-lg hover:border-blue-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-opacity-20 transition-all">
              <CardElement
                options={{
                  style: {
                    base: {
                      fontSize: '16px',
                      color: '#1f2937',
                      fontFamily: 'system-ui, sans-serif',
                      '::placeholder': {
                        color: '#9ca3af',
                      },
                    },
                    invalid: {
                      color: '#ef4444',
                    },
                  },
                }}
              />
            </div>
          </div>

          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Shield className="h-4 w-4 text-green-600" />
            <span>Vos informations sont sécurisées et chiffrées avec SSL</span>
          </div>
        </div>

        {/* Terms and Conditions */}
        <div className="p-6 bg-gray-50 rounded-xl border border-gray-200">
          <div className="flex items-start space-x-3">
            <input
              type="checkbox"
              id="terms"
              required
              className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="terms" className="text-sm text-gray-700 leading-relaxed">
              J'accepte les{' '}
              <a href="/terms" className="text-blue-600 hover:text-blue-700 underline">
                conditions générales d'utilisation
              </a>{' '}
              et la{' '}
              <a href="/privacy" className="text-blue-600 hover:text-blue-700 underline">
                politique de confidentialité
              </a>{' '}
              d'EcoDeli. Je comprends que mon abonnement sera automatiquement renouvelé chaque mois jusqu'à annulation.
            </label>
          </div>
        </div>

        <Button 
          type="submit" 
          disabled={!stripe || isProcessing}
          className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl"
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Traitement en cours...
            </>
          ) : (
            <>
              <CreditCard className="mr-2 h-5 w-5" />
              Confirmer et Payer {plans[planId].price}€
            </>
          )}
        </Button>
      </form>

      <div className="text-center text-sm text-gray-500 space-y-2">
        <p className="flex items-center justify-center">
          <Shield className="h-4 w-4 mr-1" />
          Paiement sécurisé par Stripe
        </p>
        <p>Vos données bancaires sont chiffrées et sécurisées</p>
      </div>
    </div>
  )
}

export default function ClientSubscriptionPage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isChanging, setIsChanging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showPaymentForm, setShowPaymentForm] = useState<'STARTER' | 'PREMIUM' | null>(null)

  const fetchSubscriptionData = async () => {
    try {
      setIsLoading(true)
      const [subscriptionRes, usageRes] = await Promise.all([
        fetch('/api/subscriptions'),
        fetch('/api/subscriptions/usage')
      ])

      if (subscriptionRes.ok) {
        const subscriptionData = await subscriptionRes.json()
        setSubscription(subscriptionData.subscription)
      }

      if (usageRes.ok) {
        const usageData = await usageRes.json()
        setUsageStats(usageData.usage)
      }
    } catch (error) {
      console.error('Error fetching subscription data:', error)
      setError('Erreur lors du chargement des données d\'abonnement')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchSubscriptionData()
  }, [])

  const changePlan = async (newPlan: string) => {
    if (newPlan === 'FREE') {
      // Handle downgrade to free
      try {
        setIsChanging(true)
        const response = await fetch('/api/subscriptions/cancel', {
          method: 'POST'
        })
        if (response.ok) {
          setSuccess('Abonnement annulé avec succès')
          fetchSubscriptionData()
        } else {
          setError('Erreur lors de l\'annulation')
        }
      } catch (error) {
        setError('Erreur lors de l\'annulation')
      } finally {
        setIsChanging(false)
      }
    } else {
      // Show payment form for paid plans
      setShowPaymentForm(newPlan as 'STARTER' | 'PREMIUM')
    }
  }

  const handlePaymentSuccess = () => {
    setShowPaymentForm(null)
    setSuccess('Abonnement activé avec succès !')
    fetchSubscriptionData()
  }

  const handlePaymentError = (errorMessage: string) => {
    setError(errorMessage)
  }

  const cancelSubscription = async () => {
    try {
      const response = await fetch('/api/subscriptions/cancel', {
        method: 'POST'
      })
      if (response.ok) {
        setSuccess('Abonnement annulé. Il restera actif jusqu\'à la fin de la période.')
        fetchSubscriptionData()
      } else {
        setError('Erreur lors de l\'annulation')
      }
    } catch (error) {
      setError('Erreur lors de l\'annulation')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full shadow-lg">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Chargement...</h3>
            <p className="text-gray-600">Récupération de vos informations d'abonnement</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full shadow-xl mb-8">
            <Crown className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent mb-6">
            Mon Abonnement EcoDeli
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Gérez votre abonnement et découvrez tous les avantages exclusifs de chaque plan pour optimiser vos livraisons
          </p>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="mb-8 p-6 bg-red-50 border-l-4 border-red-400 rounded-xl shadow-lg">
            <div className="flex items-start">
              <AlertTriangle className="h-6 w-6 text-red-600 mr-3 mt-0.5" />
              <div className="flex-1">
                <p className="text-red-800 font-medium">{error}</p>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setError(null)}
                  className="mt-3 text-red-600 hover:text-red-700 hover:bg-red-100"
                >
                  Fermer
                </Button>
              </div>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-8 p-6 bg-green-50 border-l-4 border-green-400 rounded-xl shadow-lg">
            <div className="flex items-start">
              <Check className="h-6 w-6 text-green-600 mr-3 mt-0.5" />
              <div className="flex-1">
                <p className="text-green-800 font-medium">{success}</p>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setSuccess(null)}
                  className="mt-3 text-green-600 hover:text-green-700 hover:bg-green-100"
                >
                  Fermer
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Payment Form Modal */}
        {showPaymentForm && (
          <div className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-2xl w-full mx-4 shadow-2xl my-8 max-h-[90vh] overflow-y-auto">
              <div className="p-8">
                <div className="text-center mb-8">
                  <h3 className="text-3xl font-bold text-gray-900 mb-2">
                    Finaliser votre abonnement
                  </h3>
                  <p className="text-gray-600">
                    Quelques secondes pour activer votre plan {plans[showPaymentForm].name}
                  </p>
                </div>
                
                <Elements stripe={stripePromise}>
                  <PaymentForm
                    planId={showPaymentForm}
                    onSuccess={handlePaymentSuccess}
                    onError={handlePaymentError}
                  />
                </Elements>

                <Button
                  variant="outline"
                  className="w-full mt-6 h-12 text-lg border-2 hover:bg-gray-50"
                  onClick={() => setShowPaymentForm(null)}
                >
                  Annuler
                </Button>
              </div>
            </div>
          </div>
        )}

        <Tabs defaultValue="current" className="space-y-10">
          <TabsList className="grid grid-cols-3 w-full max-w-md mx-auto h-14 bg-white/80 backdrop-blur-sm border border-gray-200 shadow-lg">
            <TabsTrigger value="current" className="text-lg font-medium data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              Mon Plan
            </TabsTrigger>
            <TabsTrigger value="compare" className="text-lg font-medium data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              Comparer
            </TabsTrigger>
            <TabsTrigger value="usage" className="text-lg font-medium data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              Utilisation
            </TabsTrigger>
          </TabsList>

          {/* Current Plan Tab */}
          <TabsContent value="current" className="space-y-8">
            {subscription && (
              <Card className={`border-2 ${plans[subscription.plan].color} ${plans[subscription.plan].bgGradient} shadow-xl hover:shadow-2xl transition-all duration-300`}>
                <CardHeader className="pb-8">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-6">
                      <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full shadow-lg">
                        {React.createElement(plans[subscription.plan].icon, { 
                          className: `h-8 w-8 ${plans[subscription.plan].iconColor}` 
                        })}
                      </div>
                      <div>
                        <CardTitle className="text-3xl font-bold text-gray-900 mb-2">
                          Plan {plans[subscription.plan].name}
                        </CardTitle>
                        <p className="text-xl text-gray-600">
                          {plans[subscription.plan].price === 0 
                            ? 'Gratuit pour toujours' 
                            : `${plans[subscription.plan].price}€/mois`
                          }
                        </p>
                      </div>
                    </div>
                    <Badge 
                      className={`text-lg px-4 py-2 ${plans[subscription.plan].badgeColor} shadow-md`}
                    >
                      {subscription.status === 'active' ? '✓ Actif' : 'Inactif'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    <div>
                      <h4 className="text-xl font-bold mb-6 flex items-center">
                        <Star className="h-5 w-5 mr-2 text-yellow-500" />
                        Fonctionnalités incluses
                      </h4>
                      <ul className="space-y-4">
                        {plans[subscription.plan].features.map((feature, index) => (
                          <li key={index} className="flex items-start space-x-3">
                            <div className="inline-flex items-center justify-center w-6 h-6 bg-green-100 rounded-full flex-shrink-0 mt-0.5">
                              <Check className="h-4 w-4 text-green-600" />
                            </div>
                            <span className="text-gray-700 leading-relaxed">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="space-y-6">
                      <div className="bg-white/60 backdrop-blur-sm p-6 rounded-2xl shadow-lg">
                        <h5 className="text-lg font-semibold mb-4 text-gray-900">Avantages du plan</h5>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between py-2">
                            <span className="font-medium flex items-center">
                              <Shield className="h-4 w-4 mr-2 text-blue-600" />
                              Assurance
                            </span>
                            <span className="text-gray-600 font-semibold">
                              {plans[subscription.plan].insurance === 0 
                                ? 'Non incluse' 
                                : `Jusqu'à ${plans[subscription.plan].insurance}€`
                              }
                            </span>
                          </div>
                          <div className="flex items-center justify-between py-2">
                            <span className="font-medium flex items-center">
                              <TrendingUp className="h-4 w-4 mr-2 text-green-600" />
                              Réduction
                            </span>
                            <span className="text-green-600 font-bold">
                              -{plans[subscription.plan].discount}%
                            </span>
                          </div>
                          <div className="flex items-center justify-between py-2">
                            <span className="font-medium flex items-center">
                              <Zap className="h-4 w-4 mr-2 text-yellow-600" />
                              Envoi prioritaire
                            </span>
                            <span className="text-yellow-600 font-semibold">
                              +{plans[subscription.plan].priorityShippingCost}%
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-center text-gray-500 bg-white/40 backdrop-blur-sm p-4 rounded-xl">
                        <p className="text-sm">
                          <Heart className="h-4 w-4 inline mr-1 text-red-500" />
                          Abonné depuis le {new Date(subscription.startDate).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </p>
                        {subscription.endDate && (
                          <p className="text-sm mt-1">
                            Expire le {new Date(subscription.endDate).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric'
                            })}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Compare Plans Tab */}
          <TabsContent value="compare" className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {Object.entries(plans).map(([planKey, plan]) => (
                <Card 
                  key={planKey} 
                  className={`relative ${plan.color} ${plan.bgGradient} shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-105 ${
                    subscription?.plan === planKey ? 'ring-4 ring-blue-500 ring-opacity-50' : ''
                  }`}
                >
                  {planKey === 'PREMIUM' && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <Badge className={`${plan.badgeColor} text-white shadow-lg px-4 py-2 text-sm font-semibold`}>
                        <Sparkles className="h-4 w-4 mr-1" />
                        Le plus populaire
                      </Badge>
                    </div>
                  )}
                  
                  <CardHeader className="text-center pb-8 pt-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full shadow-lg mb-6 mx-auto">
                      {React.createElement(plan.icon, { 
                        className: `h-10 w-10 ${plan.iconColor}` 
                      })}
                    </div>
                    <CardTitle className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</CardTitle>
                    <div className="text-4xl font-bold text-gray-900 mb-3">
                      {plan.price === 0 ? 'Gratuit' : `${plan.price}€`}
                      {plan.price > 0 && <span className="text-lg font-normal text-gray-600">/mois</span>}
                    </div>
                    {plan.price === 0 ? (
                      <p className="text-gray-600">Pour toujours</p>
                    ) : (
                      <p className="text-gray-600">Facturé mensuellement</p>
                    )}
                  </CardHeader>
                  
                  <CardContent className="pt-0 pb-8">
                    <ul className="space-y-4 mb-8">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-start space-x-3">
                          <div className="inline-flex items-center justify-center w-5 h-5 bg-green-100 rounded-full flex-shrink-0 mt-0.5">
                            <Check className="h-3 w-3 text-green-600" />
                          </div>
                          <span className="text-sm text-gray-700 leading-relaxed">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    
                    {subscription?.plan !== planKey ? (
                      <Button 
                        onClick={() => changePlan(planKey)}
                        disabled={isChanging}
                        className={`w-full h-12 text-lg font-semibold transition-all duration-200 ${
                          planKey === 'PREMIUM' 
                            ? 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white shadow-lg hover:shadow-xl'
                            : planKey === 'STARTER'
                            ? 'bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white shadow-lg hover:shadow-xl'
                            : 'border-2 border-gray-300 hover:border-gray-400 bg-white hover:bg-gray-50'
                        }`}
                      >
                        {isChanging ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Changement...
                          </>
                        ) : (
                          <>
                            {planKey === 'FREE' ? 'Revenir au gratuit' : `Passer au ${plan.name}`}
                            {planKey === 'PREMIUM' && <Crown className="ml-2 h-4 w-4" />}
                            {planKey === 'STARTER' && <Zap className="ml-2 h-4 w-4" />}
                          </>
                        )}
                      </Button>
                    ) : (
                      <Button disabled className="w-full h-12 text-lg font-semibold bg-gray-100 text-gray-500">
                        ✓ Plan actuel
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Usage Tab */}
          <TabsContent value="usage" className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-gradient-to-br from-blue-50 to-white border border-blue-200 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-semibold text-blue-900 flex items-center">
                    <Package className="h-5 w-5 mr-2" />
                    Livraisons ce mois
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600 mb-2">
                    {usageStats?.thisMonth?.deliveries || 0}
                  </div>
                  <p className="text-sm text-blue-600/70">
                    {usageStats?.lastMonth?.deliveries || 0} le mois dernier
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-50 to-white border border-green-200 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-semibold text-green-900 flex items-center">
                    <TrendingUp className="h-5 w-5 mr-2" />
                    Économies réalisées
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600 mb-2">
                    {(usageStats?.thisMonth?.savings || 0).toFixed(2)}€
                  </div>
                  <p className="text-sm text-green-600/70">
                    {(usageStats?.lastMonth?.savings || 0).toFixed(2)}€ le mois dernier
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-yellow-50 to-white border border-yellow-200 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-semibold text-yellow-900 flex items-center">
                    <Zap className="h-5 w-5 mr-2" />
                    Envois prioritaires
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-yellow-600 mb-2">
                    {usageStats?.thisMonth?.priorityShipments || 0}
                  </div>
                  <p className="text-sm text-yellow-600/70">
                    {subscription?.plan === 'PREMIUM' ? '3 gratuits/mois' : 'Payants'}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-white border border-purple-200 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-semibold text-purple-900 flex items-center">
                    <Shield className="h-5 w-5 mr-2" />
                    Assurance utilisée
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-purple-600 mb-2">
                    {(usageStats?.thisMonth?.insuranceUsed || 0).toFixed(2)}€
                  </div>
                  <p className="text-sm text-purple-600/70">
                    Couverture max: {subscription ? plans[subscription.plan].insurance : 0}€
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Info message if no usage data */}
            {(!usageStats || (usageStats.thisMonth.deliveries === 0 && usageStats.lastMonth.deliveries === 0)) && (
              <div className="text-center py-16">
                <div className="bg-gradient-to-br from-blue-50 via-white to-indigo-50 border border-blue-200 rounded-3xl p-12 shadow-xl max-w-2xl mx-auto">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full shadow-lg mb-8">
                    <Gift className="h-10 w-10 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">
                    Commencez votre aventure EcoDeli !
                  </h3>
                  <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                    Créez votre première annonce de livraison pour voir apparaître ici toutes vos statistiques d'usage et économies réalisées.
                  </p>
                  <Button 
                    onClick={() => window.location.href = '/client/announcements/create'}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    <Sparkles className="mr-2 h-5 w-5" />
                    Créer ma première annonce
                  </Button>
                </div>
              </div>
            )}

            {/* Subscription Management */}
            <Card className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 shadow-xl">
              <CardHeader className="pb-6">
                <CardTitle className="text-2xl font-bold text-gray-900 flex items-center">
                  <CreditCard className="h-6 w-6 mr-3 text-blue-600" />
                  Gestion de l'abonnement
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-6 bg-white rounded-2xl border border-gray-200 shadow-md">
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-1">Facturation automatique</h4>
                    <p className="text-gray-600">
                      {subscription?.autoRenew ? '✓ Activée - Renouvelé automatiquement' : '⚠️ Désactivée - Renouvelé manuellement'}
                    </p>
                  </div>
                  <Button variant="outline" size="lg" className="border-2 hover:bg-gray-50">
                    {subscription?.autoRenew ? 'Désactiver' : 'Activer'}
                  </Button>
                </div>

                {subscription?.plan !== 'FREE' && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-lg hover:shadow-xl">
                        <AlertTriangle className="h-5 w-5 mr-2" />
                        Annuler l'abonnement
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="max-w-md">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-xl font-bold">Confirmer l'annulation</AlertDialogTitle>
                        <AlertDialogDescription className="text-gray-600 leading-relaxed">
                          Êtes-vous sûr de vouloir annuler votre abonnement {subscription && plans[subscription.plan] ? plans[subscription.plan].name : ''} ? 
                          Vous perdrez tous les avantages premium à la fin de la période en cours et retournerez au plan gratuit.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="border-2">Annuler</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={cancelSubscription}
                          className="bg-red-600 hover:bg-red-700"
                        >
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