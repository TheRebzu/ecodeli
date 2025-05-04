import { useCallback, useState } from 'react';
import { trpc } from '@/trpc/client';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { toast } from '@/components/ui/use-toast';

// Initialiser Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

export type PaymentMethod = {
  id: string;
  type: string;
  last4: string;
  expiryMonth?: number;
  expiryYear?: number;
  brand?: string;
  isDefault: boolean;
};

export interface PaymentHistoryItem {
  id: string;
  amount: number;
  currency: string;
  status: string;
  date: Date;
  description?: string;
  delivery?: {
    id: string;
    status: string;
  };
  service?: {
    id: string;
    title: string;
  };
}

/**
 * Hook pour gérer les paiements
 */
export function usePayment() {
  const [isLoading, setIsLoading] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);

  // Requêtes tRPC
  const createPaymentIntentMutation = trpc.payment.createPaymentIntent.useMutation();
  const capturePaymentMutation = trpc.payment.capturePayment.useMutation();
  const cancelPaymentMutation = trpc.payment.cancelPayment.useMutation();
  const refundPaymentMutation = trpc.payment.refundPayment.useMutation();
  const addPaymentMethodMutation = trpc.payment.addPaymentMethod.useMutation();
  const removePaymentMethodMutation = trpc.payment.removePaymentMethod.useMutation();
  const paymentMethodsQuery = trpc.payment.getPaymentMethods.useQuery(undefined, {
    enabled: false,
  });
  const paymentHistoryQuery = trpc.payment.getPaymentHistory.useQuery(
    { page: 1, limit: 10 },
    { enabled: false }
  );

  /**
   * Crée un intent de paiement
   */
  const createPaymentIntent = useCallback(
    async (data: {
      amount: number;
      currency?: string;
      deliveryId?: string;
      serviceId?: string;
      subscriptionId?: string;
      paymentMethodId?: string;
      description?: string;
      metadata?: Record<string, string>;
    }) => {
      setIsLoading(true);
      try {
        const { amount, currency = 'eur', deliveryId, serviceId, subscriptionId, paymentMethodId, description, metadata } = data;
        const result = await createPaymentIntentMutation.mutateAsync({
          amount,
          currency,
          deliveryId,
          serviceId,
          subscriptionId,
          paymentMethodId,
          description,
          metadata
        });

        if (result.clientSecret) {
          setClientSecret(result.clientSecret);
          setPaymentIntentId(result.paymentIntentId);
        }

        return result;
      } catch (error) {
        console.error('Erreur lors de la création du payment intent:', error);
        toast({
          variant: 'destructive',
          title: 'Erreur de paiement',
          description: error instanceof Error ? error.message : 'Une erreur est survenue lors de la création du paiement'
        });
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [createPaymentIntentMutation]
  );

  /**
   * Capture un paiement après validation
   */
  const capturePayment = useCallback(
    async (paymentIntentId: string) => {
      setIsLoading(true);
      try {
        const result = await capturePaymentMutation.mutateAsync({ paymentIntentId });
        return result;
      } catch (error) {
        console.error('Erreur lors de la capture du paiement:', error);
        toast({
          variant: 'destructive',
          title: 'Erreur de paiement',
          description: error instanceof Error ? error.message : 'Une erreur est survenue lors de la validation du paiement'
        });
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [capturePaymentMutation]
  );

  /**
   * Annule un paiement
   */
  const cancelPayment = useCallback(
    async (paymentIntentId: string) => {
      setIsLoading(true);
      try {
        const result = await cancelPaymentMutation.mutateAsync({ paymentIntentId });
        return result;
      } catch (error) {
        console.error('Erreur lors de l\'annulation du paiement:', error);
        toast({
          variant: 'destructive',
          title: 'Erreur de paiement',
          description: error instanceof Error ? error.message : 'Une erreur est survenue lors de l\'annulation du paiement'
        });
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [cancelPaymentMutation]
  );

  /**
   * Rembourse un paiement
   */
  const refundPayment = useCallback(
    async (paymentIntentId: string, amount?: number) => {
      setIsLoading(true);
      try {
        const result = await refundPaymentMutation.mutateAsync({ paymentIntentId, amount });
        return result;
      } catch (error) {
        console.error('Erreur lors du remboursement:', error);
        toast({
          variant: 'destructive',
          title: 'Erreur de remboursement',
          description: error instanceof Error ? error.message : 'Une erreur est survenue lors du remboursement'
        });
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [refundPaymentMutation]
  );

  /**
   * Récupère les méthodes de paiement
   */
  const getPaymentMethods = useCallback(async () => {
    try {
      const result = await paymentMethodsQuery.refetch();
      return result.data?.paymentMethods || [];
    } catch (error) {
      console.error('Erreur lors de la récupération des méthodes de paiement:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Une erreur est survenue lors de la récupération des méthodes de paiement'
      });
      return [];
    }
  }, [paymentMethodsQuery]);

  /**
   * Ajoute une méthode de paiement
   */
  const addPaymentMethod = useCallback(
    async (paymentMethodId: string, setAsDefault: boolean = false) => {
      setIsLoading(true);
      try {
        const result = await addPaymentMethodMutation.mutateAsync({
          paymentMethodId,
          setAsDefault
        });
        
        // Actualiser la liste des méthodes de paiement
        await paymentMethodsQuery.refetch();
        
        return result;
      } catch (error) {
        console.error('Erreur lors de l\'ajout de la méthode de paiement:', error);
        toast({
          variant: 'destructive',
          title: 'Erreur',
          description: error instanceof Error ? error.message : 'Une erreur est survenue lors de l\'ajout de la méthode de paiement'
        });
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [addPaymentMethodMutation, paymentMethodsQuery]
  );

  /**
   * Supprime une méthode de paiement
   */
  const removePaymentMethod = useCallback(
    async (paymentMethodId: string) => {
      setIsLoading(true);
      try {
        const result = await removePaymentMethodMutation.mutateAsync({ paymentMethodId });
        
        // Actualiser la liste des méthodes de paiement
        await paymentMethodsQuery.refetch();
        
        return result;
      } catch (error) {
        console.error('Erreur lors de la suppression de la méthode de paiement:', error);
        toast({
          variant: 'destructive',
          title: 'Erreur',
          description: error instanceof Error ? error.message : 'Une erreur est survenue lors de la suppression de la méthode de paiement'
        });
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [removePaymentMethodMutation, paymentMethodsQuery]
  );

  /**
   * Récupère l'historique des paiements
   */
  const getPaymentHistory = useCallback(
    async (page: number = 1, limit: number = 10) => {
      try {
        const result = await paymentHistoryQuery.refetch({ page, limit });
        return result.data || { payments: [], pagination: { total: 0, page, limit, totalPages: 0 } };
      } catch (error) {
        console.error('Erreur lors de la récupération de l\'historique des paiements:', error);
        toast({
          variant: 'destructive',
          title: 'Erreur',
          description: error instanceof Error ? error.message : 'Une erreur est survenue lors de la récupération de l\'historique'
        });
        return { payments: [], pagination: { total: 0, page, limit, totalPages: 0 } };
      }
    },
    [paymentHistoryQuery]
  );

  /**
   * Crée un wrapper Stripe Elements
   */
  const PaymentElementsProvider = useCallback(
    ({ children }: { children: React.ReactNode }) => {
      if (!clientSecret) {
        return <>{children}</>;
      }

      const options = {
        clientSecret,
        appearance: {
          theme: 'stripe',
        },
      };

      return (
        <Elements stripe={stripePromise} options={options}>
          {children}
        </Elements>
      );
    },
    [clientSecret]
  );

  return {
    isLoading,
    clientSecret,
    paymentIntentId,
    createPaymentIntent,
    capturePayment,
    cancelPayment,
    refundPayment,
    getPaymentMethods,
    addPaymentMethod,
    removePaymentMethod,
    getPaymentHistory,
    PaymentElementsProvider,
  };
} 