"use client";

import { useStripeFeatureGuard } from "@/hooks/payment/use-stripe-status";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, AlertTriangle } from "lucide-react";

interface StripeStatusIndicatorProps {
  showFullMessage?: boolean;
  size?: "sm" | "default" | "lg";
}

/**
 * Composant pour afficher l'état de Stripe
 */
export const StripeStatusIndicator = ({ 
  showFullMessage = false,
  size = "default" 
}: StripeStatusIndicatorProps) => {
  const { 
    isStripeAvailable, 
    stripeMessage 
  } = useStripeFeatureGuard();

  if (showFullMessage) {
    return (
      <Alert variant={isStripeAvailable ? "default" : "destructive"}>
        {isStripeAvailable ? (
          <CheckCircle className="h-4 w-4" />
        ) : (
          <XCircle className="h-4 w-4" />
        )}
        <AlertDescription>
          {stripeMessage}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Badge 
      variant={isStripeAvailable ? "default" : "destructive"}
      className={`
        ${size === "sm" ? "text-xs" : ""}
        ${size === "lg" ? "text-base px-3 py-1" : ""}
      `}
    >
      {isStripeAvailable ? (
        <CheckCircle className="mr-1 h-3 w-3" />
      ) : (
        <XCircle className="mr-1 h-3 w-3" />
      )}
      {isStripeAvailable ? "Paiements activés" : "Paiements désactivés"}
    </Badge>
  );
};

/**
 * Composant pour masquer le contenu si Stripe n'est pas disponible
 */
export const StripeFeatureGuard = ({ 
  children,
  fallback,
  showMessage = true 
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showMessage?: boolean;
}) => {
  const { 
    isStripeAvailable, 
    getPaymentDisabledMessage 
  } = useStripeFeatureGuard();

  if (!isStripeAvailable) {
    if (fallback) {
      return <>{fallback}</>;
    }

    if (showMessage) {
      const message = getPaymentDisabledMessage();
      return (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {message}
          </AlertDescription>
        </Alert>
      );
    }

    return null;
  }

  return <>{children}</>;
};

/**
 * Hook pour désactiver les boutons de paiement
 */
export const usePaymentButtonState = () => {
  const { isStripeAvailable, getPaymentDisabledMessage } = useStripeFeatureGuard();

  return {
    disabled: !isStripeAvailable,
    disabledMessage: getPaymentDisabledMessage(),
    isStripeAvailable
  };
}; 