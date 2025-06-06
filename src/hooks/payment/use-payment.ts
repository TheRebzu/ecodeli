import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/trpc/react';
import { toast } from 'sonner';

// Types pour les méthodes de paiement
export type PaymentMethod = {
  id: string;
  type: string;
  last4: string;
  expiryMonth?: number;
  expiryYear?: number;
  brand?: string;
  isDefault: boolean;
};

// Types pour les éléments de l'historique des paiements
export type PaymentHistoryItem = {
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
};

// Type pour la pagination de l'historique
export type PaginationInfo = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

// État du formulaire de paiement
export type PaymentFormState = {
  amount: number;
  currency: string;
  description: string;
  deliveryId?: string;
  serviceId?: string;
  subscriptionId?: string;
  paymentMethodId?: string;
  metadata?: Record<string, any>;
};

// Interface pour l'état du paiement en cours
export type CurrentPaymentState = {
  id: string | null;
  paymentIntentId: string | null;
  clientSecret: string | null;
  amount: number | null;
  currency: string | null;
  status: string | null;
  error: string | null;
  metadata: Record<string, any> | null;
  isEscrow: boolean;
};

/**
 * Hook principal pour gérer l'état du paiement en cours
 */
export const useCurrentPayment = () => {
  const [currentPayment, setCurrentPayment] = useState<CurrentPaymentState>({
    id: null,
    paymentIntentId: null,
    clientSecret: null,
    amount: null,
    currency: null,
    status: null,
    error: null,
    metadata: null,
    isEscrow: false,
  });

  const updateCurrentPayment = useCallback((updates: Partial<CurrentPaymentState>) => {
    setCurrentPayment(prev => ({ ...prev, ...updates }));
  }, []);

  const resetCurrentPayment = useCallback(() => {
    setCurrentPayment({
      id: null,
      paymentIntentId: null,
      clientSecret: null,
      amount: null,
      currency: null,
      status: null,
      error: null,
      metadata: null,
      isEscrow: false,
    });
  }, []);

  return {
    currentPayment,
    updateCurrentPayment,
    resetCurrentPayment,
  };
};

/**
 * Hook pour gérer le formulaire de paiement
 */
export const usePaymentForm = () => {
  const [form, setForm] = useState<PaymentFormState>({
    amount: 0,
    currency: 'EUR',
    description: '',
  });

  const [errors, setErrors] = useState<Record<string, string> | null>(null);

  const updateForm = useCallback((updates: Partial<PaymentFormState>) => {
    setForm(prev => ({ ...prev, ...updates }));
  }, []);

  const resetForm = useCallback(() => {
    setForm({
      amount: 0,
      currency: 'EUR',
      description: '',
    });
    setErrors(null);
  }, []);

  const setFormErrors = useCallback((formErrors: Record<string, string> | null) => {
    setErrors(formErrors);
  }, []);

  return {
    form,
    errors,
    updateForm,
    resetForm,
    setFormErrors,
  };
};

/**
 * Hook pour créer un payment intent
 */
export const useCreatePaymentIntent = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: PaymentFormState) => {
      const result = await api.payment.createPaymentIntent.mutate(data);
      return result;
    },
    onSuccess: () => {
      toast.success('Payment intent créé avec succès');
      // Invalider les queries liées aux paiements
      queryClient.invalidateQueries({ queryKey: ['payments'] });
    },
    onError: (error) => {
      console.error('Erreur lors de la création du payment intent:', error);
      toast.error(
        error instanceof Error 
          ? error.message 
          : 'Une erreur est survenue lors de la création du paiement'
      );
    },
  });
};

/**
 * Hook pour capturer un paiement
 */
export const useCapturePayment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (paymentId: string) => {
      const result = await api.payment.capturePayment.mutate({ paymentId });
      return result;
    },
    onSuccess: () => {
      toast.success('Paiement capturé avec succès');
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['payment-history'] });
    },
    onError: (error) => {
      console.error('Erreur lors de la capture du paiement:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'Une erreur est survenue lors de la validation du paiement'
      );
    },
  });
};

/**
 * Hook pour annuler un paiement
 */
export const useCancelPayment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (paymentId: string) => {
      const result = await api.payment.cancelPayment.mutate({ paymentId });
      return result;
    },
    onSuccess: () => {
      toast.success('Paiement annulé avec succès');
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['payment-history'] });
    },
    onError: (error) => {
      console.error("Erreur lors de l'annulation du paiement:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Une erreur est survenue lors de l'annulation du paiement"
      );
    },
  });
};

/**
 * Hook pour rembourser un paiement
 */
export const useRefundPayment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ paymentId, amount, reason }: { 
      paymentId: string; 
      amount?: number; 
      reason: string;
    }) => {
      const result = await api.payment.refundPayment.mutate({ 
        paymentId, 
        amount, 
        reason 
      });
      return result;
    },
    onSuccess: () => {
      toast.success('Remboursement effectué avec succès');
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['payment-history'] });
    },
    onError: (error) => {
      console.error('Erreur lors du remboursement:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'Une erreur est survenue lors du remboursement'
      );
    },
  });
};

/**
 * Hook pour récupérer les méthodes de paiement
 */
export const usePaymentMethods = () => {
  return useQuery({
    queryKey: ['payment-methods'],
    queryFn: async () => {
      const result = await api.payment.getPaymentMethods.query();
      return result.paymentMethods || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
};

/**
 * Hook pour l'historique des paiements avec pagination
 */
export const usePaymentHistory = (
  page: number = 1,
  limit: number = 10,
  filters?: {
    startDate?: Date;
    endDate?: Date;
    status?: string;
    type?: string;
  }
) => {
  return useQuery({
    queryKey: ['payment-history', page, limit, filters],
    queryFn: async () => {
      const result = await api.payment.getPaymentHistory.query({
        page,
        limit,
        startDate: filters?.startDate,
        endDate: filters?.endDate,
        status: filters?.status,
        type: filters?.type,
      });
      return {
        items: result.payments || [],
        pagination: {
          total: result.total,
          page,
          limit,
          totalPages: result.pages,
        } as PaginationInfo,
      };
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: false,
  });
};

/**
 * Hook pour les paiements démonstration (mode démo)
 */
export const useDemoPayments = () => {
  const [isDemoMode] = useState(process.env.NEXT_PUBLIC_DEMO_MODE === 'true');

  const simulatePaymentSuccess = useCallback(async (paymentId: string) => {
    if (!isDemoMode) return false;

    try {
      await fetch('/api/webhooks/stripe/demo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventType: 'payment_intent.succeeded',
          paymentId,
          status: 'succeeded',
          metadata: {
            demoMode: true,
          },
        }),
      });

      toast.success('Paiement réussi (mode démo)');
      return true;
    } catch (error) {
      console.error('Erreur lors de la simulation de paiement réussi:', error);
      toast.error('Erreur de simulation');
      return false;
    }
  }, [isDemoMode]);

  const simulatePaymentFailure = useCallback(async (paymentId: string, reason?: string) => {
    if (!isDemoMode) return false;

    try {
      await fetch('/api/webhooks/stripe/demo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventType: 'payment_intent.payment_failed',
          paymentId,
          status: 'failed',
          metadata: {
            reason: reason || 'Échec du paiement en mode démonstration',
            demoMode: true,
          },
        }),
      });

      toast.error(reason || 'Paiement échoué (mode démo)');
      return true;
    } catch (error) {
      console.error("Erreur lors de la simulation d'échec de paiement:", error);
      toast.error('Erreur de simulation');
      return false;
    }
  }, [isDemoMode]);

  return {
    isDemoMode,
    simulatePaymentSuccess,
    simulatePaymentFailure,
  };
};

/**
 * Hook composite pour gérer tous les aspects des paiements
 */
export const usePayments = () => {
  const currentPayment = useCurrentPayment();
  const paymentForm = usePaymentForm();
  const createPaymentIntent = useCreatePaymentIntent();
  const capturePayment = useCapturePayment();
  const cancelPayment = useCancelPayment();
  const refundPayment = useRefundPayment();
  const demoPayments = useDemoPayments();

  return {
    // État du paiement courant
    ...currentPayment,
    
    // Formulaire de paiement
    ...paymentForm,
    
    // Mutations
    createPaymentIntent,
    capturePayment,
    cancelPayment,
    refundPayment,
    
    // Fonctions démo
    ...demoPayments,
    
    // États de chargement depuis les mutations
    isCreating: createPaymentIntent.isPending,
    isCapturing: capturePayment.isPending,
    isCanceling: cancelPayment.isPending,
    isRefunding: refundPayment.isPending,
    
    // États d'erreur depuis les mutations
    createError: createPaymentIntent.error,
    captureError: capturePayment.error,
    cancelError: cancelPayment.error,
    refundError: refundPayment.error,
  };
};

// Export des hooks individuels pour une utilisation spécifique
export {
  useCurrentPayment,
  usePaymentForm,
  useCreatePaymentIntent,
  useCapturePayment,
  useCancelPayment,
  useRefundPayment,
  usePaymentMethods,
  usePaymentHistory,
  useDemoPayments,
}; 