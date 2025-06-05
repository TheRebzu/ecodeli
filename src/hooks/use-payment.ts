import { useCallback, useState } from 'react';
import { api } from '@/trpc/react';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { toast } from '@/components/ui/use-toast';
import { usePaymentStore } from '@/store/use-payment-store';
import { useRouter } from 'next/navigation';

// Initialiser Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

// Types exportés depuis le store
export type { PaymentMethod, PaymentHistoryItem } from '@/store/use-payment-store';

/**
 * Hook pour l'initialisation d'un paiement
 * @returns Fonctions et états pour initialiser un paiement
 */
export function useInitiatePayment() {
  const router = useRouter();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  
  const {
    isProcessing,
    errors,
    form,
    setForm,
    resetForm,
    clearErrors,
    createPaymentIntent,
    isDemoMode
  } = usePaymentStore();

  /**
   * Initialise un paiement
   * @param data Données du paiement
   * @param redirectUrl URL de redirection après paiement
   */
  const initiatePayment = useCallback(
    async (
      data: {
        amount: number;
        currency?: string;
        description: string;
        deliveryId?: string;
        serviceId?: string;
        subscriptionId?: string;
        paymentMethodId?: string;
        metadata?: Record<string, any>;
      },
      redirectUrl?: string
    ) => {
      clearErrors();
      
      try {
        // Mettre à jour le formulaire dans le store
        setForm({
          amount: data.amount,
          currency: data.currency || 'EUR',
          description: data.description,
          deliveryId: data.deliveryId,
          serviceId: data.serviceId,
          subscriptionId: data.subscriptionId,
          paymentMethodId: data.paymentMethodId,
          metadata: data.metadata
        });
        
        // Créer l'intent de paiement
        const result = await createPaymentIntent(data);
        
        if (result?.clientSecret) {
          setClientSecret(result.clientSecret);
          
          if (redirectUrl) {
            // Rediriger vers la page de confirmation avec le secret client
            router.push(`${redirectUrl}?payment_intent=${result.paymentIntentId}&client_secret=${result.clientSecret}`);
          }
          
          return {
            success: true,
            clientSecret: result.clientSecret,
            paymentIntentId: result.paymentIntentId
          };
        }
        
        return { success: false, error: 'Impossible de créer l\'intent de paiement' };
      } catch (error) {
        console.error('Erreur lors de l\'initialisation du paiement:', error);
        const errorMessage = error instanceof Error ? error.message : 'Une erreur est survenue lors de l\'initialisation du paiement';
        
        toast({
          variant: 'destructive',
          title: 'Erreur de paiement',
          description: errorMessage
        });
        
        return { success: false, error: errorMessage };
      }
    },
    [clearErrors, setForm, createPaymentIntent, router]
  );

  /**
   * Réinitialise l'état du paiement
   */
  const resetPayment = useCallback(() => {
    resetForm();
    clearErrors();
    setClientSecret(null);
  }, [resetForm, clearErrors]);

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
    initiatePayment,
    resetPayment,
    isProcessing,
    errors,
    clientSecret,
    PaymentElementsProvider,
    isDemoMode
  };
}

/**
 * Hook pour la confirmation d'un paiement
 * @returns Fonctions et états pour confirmer un paiement
 */
export function usePaymentConfirmation() {
  const {
    currentPayment,
    isProcessing,
    capturePayment,
    cancelPayment,
    refundPayment,
    simulatePaymentSuccess,
    simulatePaymentFailure,
    simulatePaymentDispute,
    simulatePaymentRefund,
    isDemoMode
  } = usePaymentStore();

  /**
   * Confirme un paiement
   * @param paymentIntentId ID de l'intent de paiement
   */
  const confirmPayment = useCallback(
    async (paymentIntentId: string) => {
      try {
        const result = await capturePayment(paymentIntentId);
        
        if (result) {
          toast({
            title: 'Paiement confirmé',
            description: 'Le paiement a été traité avec succès'
          });
        }
        
        return { success: result };
      } catch (error) {
        console.error('Erreur lors de la confirmation du paiement:', error);
        const errorMessage = error instanceof Error ? error.message : 'Une erreur est survenue lors de la confirmation du paiement';
        
        toast({
          variant: 'destructive',
          title: 'Erreur de paiement',
          description: errorMessage
        });
        
        return { success: false, error: errorMessage };
      }
    },
    [capturePayment]
  );

  /**
   * Annule un paiement
   * @param paymentIntentId ID de l'intent de paiement
   */
  const cancelPaymentIntent = useCallback(
    async (paymentIntentId: string) => {
      try {
        const result = await cancelPayment(paymentIntentId);
        
        if (result) {
          toast({
            title: 'Paiement annulé',
            description: 'Le paiement a été annulé avec succès'
          });
        }
        
        return { success: result };
      } catch (error) {
        console.error('Erreur lors de l\'annulation du paiement:', error);
        const errorMessage = error instanceof Error ? error.message : 'Une erreur est survenue lors de l\'annulation du paiement';
        
        toast({
          variant: 'destructive',
          title: 'Erreur d\'annulation',
          description: errorMessage
        });
        
        return { success: false, error: errorMessage };
      }
    },
    [cancelPayment]
  );

  /**
   * Rembourse un paiement
   * @param paymentIntentId ID de l'intent de paiement
   * @param amount Montant à rembourser (optionnel, rembourse tout si non spécifié)
   */
  const refundPaymentIntent = useCallback(
    async (paymentIntentId: string, amount?: number) => {
      try {
        const result = await refundPayment(paymentIntentId, amount);
        
        if (result) {
          toast({
            title: 'Remboursement effectué',
            description: amount
              ? `Le remboursement partiel de ${amount} € a été effectué avec succès`
              : 'Le remboursement a été effectué avec succès'
          });
        }
        
        return { success: result };
      } catch (error) {
        console.error('Erreur lors du remboursement:', error);
        const errorMessage = error instanceof Error ? error.message : 'Une erreur est survenue lors du remboursement';
        
        toast({
          variant: 'destructive',
          title: 'Erreur de remboursement',
          description: errorMessage
        });
        
        return { success: false, error: errorMessage };
      }
    },
    [refundPayment]
  );

  // Fonctions de simulation en mode démo
  const simulateSuccess = useCallback(
    async (paymentId: string) => {
      if (!isDemoMode) return { success: false, error: 'Mode démo non activé' };
      
      try {
        const result = await simulatePaymentSuccess(paymentId);
        return { success: result };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erreur lors de la simulation';
        return { success: false, error: errorMessage };
      }
    },
    [isDemoMode, simulatePaymentSuccess]
  );

  const simulateFailure = useCallback(
    async (paymentId: string, reason?: string) => {
      if (!isDemoMode) return { success: false, error: 'Mode démo non activé' };
      
      try {
        const result = await simulatePaymentFailure(paymentId, reason);
        return { success: result };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erreur lors de la simulation';
        return { success: false, error: errorMessage };
      }
    },
    [isDemoMode, simulatePaymentFailure]
  );

  const simulateDispute = useCallback(
    async (paymentId: string, reason?: string) => {
      if (!isDemoMode) return { success: false, error: 'Mode démo non activé' };
      
      try {
        const result = await simulatePaymentDispute(paymentId, reason);
        return { success: result };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erreur lors de la simulation';
        return { success: false, error: errorMessage };
      }
    },
    [isDemoMode, simulatePaymentDispute]
  );

  const simulateRefund = useCallback(
    async (paymentId: string, amount?: number) => {
      if (!isDemoMode) return { success: false, error: 'Mode démo non activé' };
      
      try {
        const result = await simulatePaymentRefund(paymentId, amount);
        return { success: result };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erreur lors de la simulation';
        return { success: false, error: errorMessage };
      }
    },
    [isDemoMode, simulatePaymentRefund]
  );

  return {
    currentPayment,
    isProcessing,
    confirmPayment,
    cancelPayment: cancelPaymentIntent,
    refundPayment: refundPaymentIntent,
    simulateSuccess,
    simulateFailure,
    simulateDispute,
    simulateRefund,
    isDemoMode
  };
}

/**
 * Hook pour l'historique des paiements
 * @returns Fonctions et états pour gérer l'historique des paiements
 */
export function usePaymentHistory() {
  const {
    paymentHistory,
    isRefreshing,
    getPaymentHistory,
    setPaymentHistoryFilter,
    paymentMethods,
    getPaymentMethods,
    isDemoMode
  } = usePaymentStore();

  /**
   * Charge l'historique des paiements
   * @param page Numéro de page
   * @param limit Nombre d'éléments par page
   */
  const loadPaymentHistory = useCallback(
    async (page: number = 1, limit: number = 10) => {
      try {
        await getPaymentHistory(page, limit);
        return { success: true };
      } catch (error) {
        console.error('Erreur lors du chargement de l\'historique des paiements:', error);
        const errorMessage = error instanceof Error ? error.message : 'Une erreur est survenue lors du chargement de l\'historique';
        
        toast({
          variant: 'destructive',
          title: 'Erreur',
          description: errorMessage
        });
        
        return { success: false, error: errorMessage };
      }
    },
    [getPaymentHistory]
  );

  /**
   * Filtre l'historique des paiements
   * @param filter Filtre à appliquer
   */
  const filterPaymentHistory = useCallback(
    (filter: {
      startDate?: Date;
      endDate?: Date;
      status?: string;
      type?: string;
    }) => {
      setPaymentHistoryFilter(filter);
      loadPaymentHistory(1);
    },
    [setPaymentHistoryFilter, loadPaymentHistory]
  );

  /**
   * Charge les méthodes de paiement
   */
  const loadPaymentMethods = useCallback(async () => {
    try {
      const methods = await getPaymentMethods();
      return { success: true, methods };
    } catch (error) {
      console.error('Erreur lors du chargement des méthodes de paiement:', error);
      const errorMessage = error instanceof Error ? error.message : 'Une erreur est survenue lors du chargement des méthodes de paiement';
      
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: errorMessage
      });
      
      return { success: false, error: errorMessage };
    }
  }, [getPaymentMethods]);

  return {
    paymentHistory,
    paymentMethods,
    isRefreshing,
    loadPaymentHistory,
    filterPaymentHistory,
    loadPaymentMethods,
    isDemoMode
  };
}

/**
 * Hook pour gérer les paiements (compatible avec code existant)
 * @deprecated Utiliser plutôt useInitiatePayment, usePaymentConfirmation et usePaymentHistory
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