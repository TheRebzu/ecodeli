"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { loadStripe } from "@stripe/stripe-js"
import { Button } from "@/components/ui/button"
import { config } from "@/lib/config"

const stripePromise = loadStripe(config.stripePublicKey)

interface CheckoutButtonProps {
  amount: number
  currency?: string
}

export function CheckoutButton({ amount, currency = "eur" }: CheckoutButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleCheckout = async () => {
    setIsLoading(true)

    try {
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ amount, currency }),
      })

      const { sessionId } = await response.json()

      const stripe = await stripePromise
      const { error } = await stripe!.redirectToCheckout({ sessionId })

      if (error) {
        console.error("Stripe checkout error:", error)
      }
    } catch (err) {
      console.error("Error during checkout:", err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button onClick={handleCheckout} disabled={isLoading}>
      {isLoading ? "Chargement..." : "Payer maintenant"}
    </Button>
  )
}

