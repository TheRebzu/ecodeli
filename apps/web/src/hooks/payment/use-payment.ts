import { useState, useCallback } from 'react';
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
  const [isLoading, setIsLoading] = useState(false);
  
  const createPaymentIntent = useCallback(async (data: PaymentFormState) => {
    setIsLoading(true);
    try {
      const result = await api.payment.createPaymentIntent.mutate(data);
      toast.success('Payment intent créé avec succès');
      return result;
    } catch (error) {
      console.error('Erreur lors de la création du payment intent:', error);
      toast.error(
        error instanceof Error 
          ? error.message 
          : 'Une erreur est survenue lors de la création du paiement'
      );
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    createPaymentIntent,
    isLoading,
  };
};

/**
 * Hook pour capturer un paiement
 */
export const useCapturePayment = () => {
  const [isLoading, setIsLoading] = useState(false);
  
  const capturePayment = useCallback(async (paymentId: string) => {
    setIsLoading(true);
    try {
      const result = await api.payment.capturePayment.mutate({ paymentId });
      toast.success('Paiement capturé avec succès');
      return result;
    } catch (error) {
      console.error('Erreur lors de la capture du paiement:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'Une erreur est survenue lors de la validation du paiement'
      );
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    capturePayment,
    isLoading,
  };
};

/**
 * Hook pour annuler un paiement
 */
export const useCancelPayment = () => {
  const [isLoading, setIsLoading] = useState(false);
  
  const cancelPayment = useCallback(async (paymentId: string) => {
    setIsLoading(true);
    try {
      const result = await api.payment.cancelPayment.mutate({ paymentId });
      toast.success('Paiement annulé avec succès');
      return result;
    } catch (error) {
      console.error('Erreur lors de l\'annulation du paiement:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'Une erreur est survenue lors de l\'annulation du paiement'
      );
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    cancelPayment,
    isLoading,
  };
};

/**
 * Hook pour rembourser un paiement
 */
export const useRefundPayment = () => {
  const [isLoading, setIsLoading] = useState(false);
  
  const refundPayment = useCallback(async (paymentId: string, amount?: number) => {
    setIsLoading(true);
    try {
      const result = await api.payment.refundPayment.mutate({ 
        paymentId, 
        amount 
      });
      toast.success('Remboursement effectué avec succès');
      return result;
    } catch (error) {
      console.error('Erreur lors du remboursement:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'Une erreur est survenue lors du remboursement'
      );
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    refundPayment,
    isLoading,
  };
};

/**
 * Hook pour récupérer les méthodes de paiement
 */
export const usePaymentMethods = () => {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPaymentMethods = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const methods = await api.payment.getPaymentMethods.query();
      setPaymentMethods(methods);
    } catch (err) {
      console.error('Erreur lors du chargement des méthodes de paiement:', err);
      setError('Impossible de charger les méthodes de paiement');
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    paymentMethods,
    isLoading,
    error,
    refetch: fetchPaymentMethods,
  };
};

/**
 * Hook pour récupérer l'historique des paiements
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
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistoryItem[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPaymentHistory = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await api.payment.getPaymentHistory.query({
        page,
        limit,
        filters,
      });
      setPaymentHistory(result.payments);
      setPagination(result.pagination);
    } catch (err) {
      console.error('Erreur lors du chargement de l\'historique:', err);
      setError('Impossible de charger l\'historique des paiements');
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, filters]);

  return {
    paymentHistory,
    pagination,
    isLoading,
    error,
    refetch: fetchPaymentHistory,
  };
};

/**
 * Hook pour les paiements de démonstration
 */
export const useDemoPayments = () => {
  const [isLoading, setIsLoading] = useState(false);

  const createDemoPayment = useCallback(async (
    amount: number,
    currency: string = 'EUR',
    description: string = 'Paiement de démonstration'
  ) => {
    setIsLoading(true);
    try {
      const result = await api.payment.createDemoPayment.mutate({
        amount,
        currency,
        description,
      });
      toast.success('Paiement de démonstration créé avec succès');
      return result;
    } catch (error) {
      console.error('Erreur lors de la création du paiement de démonstration:', error);
      toast.error('Une erreur est survenue lors de la création du paiement de démonstration');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const simulateSuccess = useCallback(async (paymentId: string) => {
    setIsLoading(true);
    try {
      const result = await api.payment.simulatePaymentSuccess.mutate({ paymentId });
      toast.success('Paiement simulé comme réussi');
      return result;
    } catch (error) {
      console.error('Erreur lors de la simulation de succès:', error);
      toast.error('Une erreur est survenue lors de la simulation');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const simulateFailure = useCallback(async (paymentId: string) => {
    setIsLoading(true);
    try {
      const result = await api.payment.simulatePaymentFailure.mutate({ paymentId });
      toast.success('Paiement simulé comme échoué');
      return result;
    } catch (error) {
      console.error('Erreur lors de la simulation d\'échec:', error);
      toast.error('Une erreur est survenue lors de la simulation');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    createDemoPayment,
    simulateSuccess,
    simulateFailure,
    isLoading,
  };
};

/**
 * Hook général pour les opérations de paiement
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
    ...currentPayment,
    ...paymentForm,
    ...createPaymentIntent,
    ...capturePayment,
    ...cancelPayment,
    ...refundPayment,
    ...demoPayments,
  };
}; 