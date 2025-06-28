"use client"

import { useState, useEffect } from "react"
import { loadStripe, StripeElementsOptions } from "@stripe/stripe-js"
import {
  Elements,
  CardElement,
  useStripe,
  useElements
} from "@stripe/react-stripe-js"

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface AnnouncementPaymentProps {
  announcementId: string
  amount: number
  onPaymentSuccess: (paymentIntentId: string) => void
  onPaymentError: (error: string) => void
}

interface PaymentFormProps extends AnnouncementPaymentProps {
  clientSecret: string
}

function PaymentForm({ 
  announcementId, 
  amount, 
  clientSecret,
  onPaymentSuccess, 
  onPaymentError 
}: PaymentFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [processing, setProcessing] = useState(false)
  const [paymentError, setPaymentError] = useState<string | null>(null)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!stripe || !elements) {
      return
    }

    setProcessing(true)
    setPaymentError(null)

    const cardElement = elements.getElement(CardElement)

    if (!cardElement) {
      setPaymentError('Erreur de chargement du formulaire de paiement')
      setProcessing(false)
      return
    }

    try {
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            // Could add user billing details here
          }
        }
      })

      if (error) {
        setPaymentError(error.message || 'Erreur de paiement')
        onPaymentError(error.message || 'Erreur de paiement')
      } else if (paymentIntent.status === 'succeeded') {
        onPaymentSuccess(paymentIntent.id)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue'
      setPaymentError(errorMessage)
      onPaymentError(errorMessage)
    } finally {
      setProcessing(false)
    }
  }

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#424770',
        '::placeholder': {
          color: '#aab7c4',
        },
        fontFamily: 'system-ui, -apple-system, sans-serif'
      },
      invalid: {
        color: '#9e2146',
      },
    },
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 mb-2">💳 Paiement sécurisé</h3>
        <p className="text-blue-700 text-sm">
          Votre paiement sera bloqué jusqu'à la livraison confirmée. 
          Aucun prélèvement ne sera effectué avant la validation de la livraison.
        </p>
      </div>

      <div className="bg-white border border-gray-300 rounded-lg p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Informations de carte bancaire
        </label>
        <CardElement options={cardElementOptions} />
      </div>

      {paymentError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600 text-sm">{paymentError}</p>
        </div>
      )}

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-gray-700">Montant de la livraison:</span>
          <span className="font-semibold">{amount.toFixed(2)}€</span>
        </div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-gray-700">Frais de service (3%):</span>
          <span className="font-semibold">{(amount * 0.03).toFixed(2)}€</span>
        </div>
        <div className="border-t pt-2">
          <div className="flex justify-between items-center">
            <span className="font-bold text-gray-900">Total à autoriser:</span>
            <span className="font-bold text-green-600 text-lg">
              {(amount * 1.03).toFixed(2)}€
            </span>
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={!stripe || processing}
        className="w-full bg-green-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {processing ? (
          <>🔄 Traitement en cours...</>
        ) : (
          <>🔒 Autoriser le paiement</>
        )}
      </button>

      <p className="text-xs text-gray-500 text-center">
        En autorisant ce paiement, vous acceptez que le montant soit prélevé uniquement 
        après la confirmation de livraison par le code de validation.
      </p>
    </form>
  )
}

export function AnnouncementPayment({
  announcementId,
  amount,
  onPaymentSuccess,
  onPaymentError
}: AnnouncementPaymentProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const createPaymentIntent = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch('/api/shared/payments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            announcementId,
            amount: Math.round(amount * 1.03 * 100), // Convert to cents and add fees
            currency: 'eur',
            capture_method: 'manual' // Important: manual capture for escrow
          })
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Erreur lors de la création du paiement')
        }

        setClientSecret(data.client_secret)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue'
        setError(errorMessage)
        onPaymentError(errorMessage)
      } finally {
        setLoading(false)
      }
    }

    createPaymentIntent()
  }, [announcementId, amount, onPaymentError])

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-8">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-32 bg-gray-200 rounded mb-4"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (error || !clientSecret) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-8">
        <div className="text-center">
          <div className="text-red-600 text-4xl mb-4">⚠️</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Erreur de paiement
          </h3>
          <p className="text-gray-600 mb-4">
            {error || 'Impossible d\'initialiser le paiement'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700"
          >
            Réessayer
          </button>
        </div>
      </div>
    )
  }

  const elementsOptions: StripeElementsOptions = {
    clientSecret,
    appearance: {
      theme: 'stripe',
      variables: {
        colorPrimary: '#16a34a',
      }
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Autorisation de paiement
        </h2>
        <p className="text-gray-600">
          Autorisez le paiement pour cette livraison. Le montant sera prélevé uniquement 
          après la confirmation de livraison.
        </p>
      </div>

      <Elements stripe={stripePromise} options={elementsOptions}>
        <PaymentForm
          announcementId={announcementId}
          amount={amount}
          clientSecret={clientSecret}
          onPaymentSuccess={onPaymentSuccess}
          onPaymentError={onPaymentError}
        />
      </Elements>
    </div>
  )
}