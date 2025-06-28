"use client"

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { loadStripe } from '@stripe/stripe-js'
import {
  Elements,
  CardElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js'
import Link from 'next/link'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface Announcement {
  id: string
  title: string
  description: string
  price: number
  status: string
  urgent: boolean
  serviceType: string
}

function PaymentForm({ announcement, onSuccess }: { announcement: Announcement, onSuccess: () => void }) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'wallet'>('card')

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)

    if (!stripe || !elements) {
      return
    }

    setLoading(true)

    try {
      // Créer l'intent de paiement
      const response = await fetch(`/api/client/announcements/${announcement.id}/create-payment-intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Math.round(announcement.price * 100), // Convertir en centimes
          currency: 'eur'
        })
      })

      const { client_secret } = await response.json()

      if (paymentMethod === 'card') {
        const cardElement = elements.getElement(CardElement)
        if (!cardElement) return

        const { error, paymentIntent } = await stripe.confirmCardPayment(client_secret, {
          payment_method: {
            card: cardElement
          }
        })

        if (error) {
          setError(error.message || 'Erreur de paiement')
        } else if (paymentIntent.status === 'succeeded') {
          onSuccess()
        }
      } else {
        // Paiement depuis le portefeuille
        const walletResponse = await fetch(`/api/client/announcements/${announcement.id}/pay-from-wallet`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: announcement.price
          })
        })

        if (walletResponse.ok) {
          onSuccess()
        } else {
          const errorData = await walletResponse.json()
          setError(errorData.error || 'Solde insuffisant')
        }
      }
    } catch (err) {
      setError('Erreur lors du paiement')
    } finally {
      setLoading(false)
    }
  }

  const finalPrice = announcement.urgent ? Math.round(announcement.price * 1.2) : announcement.price

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Récapitulatif */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="font-medium text-gray-900 mb-3">Récapitulatif</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Prix de base:</span>
            <span>{announcement.price}€</span>
          </div>
          {announcement.urgent && (
            <div className="flex justify-between text-orange-600">
              <span>Supplément urgent (20%):</span>
              <span>+{Math.round(announcement.price * 0.2)}€</span>
            </div>
          )}
          <div className="border-t pt-2 flex justify-between font-medium">
            <span>Total à payer:</span>
            <span>{finalPrice}€</span>
          </div>
        </div>
      </div>

      {/* Méthode de paiement */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Méthode de paiement
        </label>
        <div className="space-y-3">
          <label className="flex items-center">
            <input
              type="radio"
              value="card"
              checked={paymentMethod === 'card'}
              onChange={(e) => setPaymentMethod(e.target.value as 'card' | 'wallet')}
              className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300"
            />
            <span className="ml-2 text-sm text-gray-700">💳 Carte bancaire</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              value="wallet"
              checked={paymentMethod === 'wallet'}
              onChange={(e) => setPaymentMethod(e.target.value as 'card' | 'wallet')}
              className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300"
            />
            <span className="ml-2 text-sm text-gray-700">💰 Portefeuille EcoDeli</span>
          </label>
        </div>
      </div>

      {/* Formulaire de carte */}
      {paymentMethod === 'card' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Informations de carte
          </label>
          <div className="border border-gray-300 rounded-lg p-3">
            <CardElement
              options={{
                style: {
                  base: {
                    fontSize: '16px',
                    color: '#424770',
                    '::placeholder': {
                      color: '#aab7c4',
                    },
                  },
                },
              }}
            />
          </div>
        </div>
      )}

      {/* Bouton de paiement */}
      <button
        type="submit"
        disabled={loading || !stripe || (paymentMethod === 'card' && !elements)}
        className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
      >
        {loading ? 'Traitement en cours...' : `Payer ${finalPrice}€`}
      </button>

      {/* Informations de sécurité */}
      <div className="text-xs text-gray-500 text-center">
        🔒 Paiement sécurisé par Stripe. Vos informations bancaires ne sont jamais stockées.
      </div>
    </form>
  )
}

export default function AnnouncementPaymentPage() {
  const params = useParams()
  const router = useRouter()
  const t = useTranslations()
  const [announcement, setAnnouncement] = useState<Announcement | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (params.id) {
      fetchAnnouncement(params.id as string)
    }
  }, [params.id])

  const fetchAnnouncement = async (id: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/client/announcements/${id}`)
      
      if (!response.ok) {
        throw new Error('Annonce non trouvée')
      }

      const data = await response.json()
      setAnnouncement(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  const handlePaymentSuccess = () => {
    router.push(`/client/announcements/${params.id}?payment=success`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-2xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="bg-white rounded-lg p-6 space-y-4">
              <div className="h-6 bg-gray-200 rounded w-2/3"></div>
              <div className="h-4 bg-gray-200 rounded w-full"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !announcement) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg p-8 text-center">
            <div className="text-red-600 text-lg mb-2">❌</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Erreur</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <Link
              href="/client/announcements"
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
            >
              Retour aux annonces
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (announcement.status !== 'ACTIVE') {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg p-8 text-center">
            <div className="text-yellow-600 text-lg mb-2">⚠️</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Paiement impossible</h3>
            <p className="text-gray-600 mb-4">
              Cette annonce ne peut plus être payée car elle n'est plus active.
            </p>
            <Link
              href={`/client/announcements/${announcement.id}`}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
            >
              Voir l'annonce
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href={`/client/announcements/${announcement.id}`}
            className="text-green-600 hover:text-green-700 text-sm font-medium mb-4 inline-block"
          >
            ← Retour à l'annonce
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Paiement de l'annonce
          </h1>
          <p className="text-gray-600">
            Finalisez le paiement pour activer votre annonce
          </p>
        </div>

        {/* Détails de l'annonce */}
        <div className="bg-white rounded-lg p-6 shadow-sm border mb-6">
          <h2 className="text-xl font-semibold mb-4">Détails de l'annonce</h2>
          <div className="space-y-3">
            <div>
              <h3 className="font-medium text-gray-900">{announcement.title}</h3>
              <p className="text-gray-600 text-sm">{announcement.description}</p>
            </div>
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <span>Type: {announcement.serviceType}</span>
              {announcement.urgent && (
                <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs">
                  ⚡ Urgent
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Formulaire de paiement */}
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <h2 className="text-xl font-semibold mb-6">Informations de paiement</h2>
          
          <Elements stripe={stripePromise}>
            <PaymentForm announcement={announcement} onSuccess={handlePaymentSuccess} />
          </Elements>
        </div>

        {/* Avantages */}
        <div className="mt-6 bg-green-50 rounded-lg p-4">
          <h3 className="font-medium text-green-900 mb-2">
            ✅ Avantages du paiement sécurisé
          </h3>
          <ul className="text-sm text-green-800 space-y-1">
            <li>• Protection contre la fraude</li>
            <li>• Remboursement garanti en cas de problème</li>
            <li>• Support client 24/7</li>
            <li>• Activation immédiate de votre annonce</li>
          </ul>
        </div>
      </div>
    </div>
  )
}