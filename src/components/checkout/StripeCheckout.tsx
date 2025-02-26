"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { CreditCard, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface StripeCheckoutProps {
  amount: number // Montant en centimes
  description?: string
  customerId?: string
  successUrl?: string
  cancelUrl?: string
  metadata?: Record<string, string>
  buttonText?: string
  buttonVariant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive"
}

export function StripeCheckout({
  amount,
  description = "Paiement EcoDeli",
  customerId,
  successUrl = `${window.location.origin}/checkout/success`,
  cancelUrl = `${window.location.origin}/checkout/cancel`,
  metadata = {},
  buttonText = "Payer maintenant",
  buttonVariant = "default"
}: StripeCheckoutProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleCheckout = async () => {
    setIsLoading(true)

    try {
      // Appel à l'API pour créer une session Stripe
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          description,
          customerId,
          successUrl,
          cancelUrl,
          metadata: {
            ...metadata,
            // Ajoutez des métadonnées pour le suivi Stripe
            created_at: new Date().toISOString(),
            user_locale: navigator.language,
          }
        }),
      })

      if (!response.ok) {
        throw new Error("Échec de la création de la session de paiement")
      }

      const { sessionUrl } = await response.json()

      // Redirection vers la page de paiement Stripe
      window.location.href = sessionUrl
    } catch (error) {
      console.error("Erreur lors du paiement:", error)
      toast.error("Une erreur est survenue lors de la préparation du paiement. Veuillez réessayer.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      onClick={handleCheckout}
      disabled={isLoading}
      variant={buttonVariant}
      className="w-full flex items-center justify-center gap-2"
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Préparation du paiement...
        </>
      ) : (
        <>
          <CreditCard className="h-4 w-4" />
          {buttonText}
        </>
      )}
    </Button>
  )
}