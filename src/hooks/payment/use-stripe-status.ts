import { api } from "@/trpc/react";

/**
 * Hook pour vérifier la disponibilité de Stripe
 */
export const useStripeStatus = () => {
  const { data: stripeStatus, isLoading, error } = api.stripeStatus.checkStatus.useQuery(
    undefined,
    {
      staleTime: 1000 * 60 * 5, // Cache pendant 5 minutes
      retry: false
    }
  );

  return {
    isStripeAvailable: stripeStatus?.isAvailable ?? false,
    stripeMessage: stripeStatus?.message ?? "Vérification en cours...",
    isLoading,
    error
  };
};

/**
 * Hook pour afficher des messages conditionnels selon la disponibilité de Stripe
 */
export const useStripeFeatureGuard = () => {
  const { isStripeAvailable, stripeMessage } = useStripeStatus();

  const getPaymentDisabledMessage = () => {
    if (!isStripeAvailable) {
      return "Les paiements par carte ne sont pas disponibles actuellement. Contactez l'administrateur pour plus d'informations.";
    }
    return null;
  };

  const getSubscriptionDisabledMessage = () => {
    if (!isStripeAvailable) {
      return "Les abonnements ne sont pas disponibles actuellement. Contactez l'administrateur pour plus d'informations.";
    }
    return null;
  };

  const getWithdrawalDisabledMessage = () => {
    if (!isStripeAvailable) {
      return "Les retraits ne sont pas disponibles actuellement. Contactez l'administrateur pour plus d'informations.";
    }
    return null;
  };

  return {
    isStripeAvailable,
    stripeMessage,
    getPaymentDisabledMessage,
    getSubscriptionDisabledMessage,
    getWithdrawalDisabledMessage,
    shouldShowPaymentOptions: isStripeAvailable,
    shouldShowSubscriptionOptions: isStripeAvailable,
    shouldShowWithdrawalOptions: isStripeAvailable
  };
}; 