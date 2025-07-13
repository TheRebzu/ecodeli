"use client";

import { useState } from "react";
import {
  useStripe,
  useElements,
  PaymentElement,
} from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CreditCard, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface PaymentFormProps {
  amount: number;
  currency: string;
  description: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function PaymentForm({
  amount,
  currency,
  description,
  onSuccess,
  onError,
}: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        setError(submitError.message || "Erreur lors de la soumission");
        setIsLoading(false);
        return;
      }

      const { error: confirmError } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}${window.location.pathname.includes("/fr/") ? "/fr" : "/en"}/payment-success`,
        },
      });

      if (confirmError) {
        setError(confirmError.message || "Erreur lors du paiement");
        onError?.(confirmError.message || "Erreur lors du paiement");
      } else {
        onSuccess?.();
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Erreur inattendue";
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount);
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center gap-2 justify-center">
          <CreditCard className="w-5 h-5" />
          Paiement sécurisé
        </CardTitle>
        <div className="space-y-1 text-sm text-muted-foreground">
          <p>{description}</p>
          <p className="text-lg font-semibold text-foreground">
            {formatAmount(amount, currency)}
          </p>
        </div>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <PaymentElement />

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            type="submit"
            disabled={!stripe || !elements || isLoading}
            className="w-full"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Traitement en cours...
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4 mr-2" />
                Payer {formatAmount(amount, currency)}
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Paiement sécurisé via Stripe. Vos données sont protégées.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
