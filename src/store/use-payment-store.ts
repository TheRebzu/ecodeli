import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { trpc } from '@/trpc/client';
import { toast } from '@/components/ui/use-toast';
import { env } from '@/env.mjs';

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

// Interface pour le store de paiement
interface PaymentState {
  // État du paiement en cours
  currentPayment: {
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

  // Historique des paiements
  paymentHistory: {
    items: PaymentHistoryItem[];
    pagination: PaginationInfo;
    filter: {
      startDate?: Date;
      endDate?: Date;
      status?: string;
      type?: string;
    };
  };

  // État du formulaire de paiement
  form: PaymentFormState;

  // Méthodes de paiement enregistrées
  paymentMethods: PaymentMethod[];

  // États de chargement et erreurs
  isLoading: boolean;
  isRefreshing: boolean;
  isProcessing: boolean;
  errors: {
    form: Record<string, string> | null;
    api: string | null;
  };

  // Indicateur de mode démo
  isDemoMode: boolean;

  // Actions
  setCurrentPayment: (payment: Partial<PaymentState['currentPayment']>) => void;
  resetCurrentPayment: () => void;
  setPaymentHistory: (data: { items: PaymentHistoryItem[]; pagination: PaginationInfo }) => void;
  setPaymentHistoryFilter: (filter: Partial<PaymentState['paymentHistory']['filter']>) => void;
  setForm: (form: Partial<PaymentFormState>) => void;
  resetForm: () => void;
  setPaymentMethods: (methods: PaymentMethod[]) => void;
  setLoading: (isLoading: boolean) => void;
  setRefreshing: (isRefreshing: boolean) => void;
  setProcessing: (isProcessing: boolean) => void;
  setErrors: (errors: Partial<PaymentState['errors']>) => void;
  clearErrors: () => void;

  // Actions avec API
  createPaymentIntent: (data: PaymentFormState) => Promise<{
    clientSecret: string;
    paymentIntentId: string;
  } | null>;
  capturePayment: (paymentIntentId: string) => Promise<boolean>;
  cancelPayment: (paymentIntentId: string) => Promise<boolean>;
  refundPayment: (paymentIntentId: string, amount?: number) => Promise<boolean>;
  getPaymentMethods: () => Promise<PaymentMethod[]>;
  getPaymentHistory: (page?: number, limit?: number) => Promise<void>;

  // Actions mode démo
  simulatePaymentSuccess: (paymentId: string) => Promise<boolean>;
  simulatePaymentFailure: (paymentId: string, reason?: string) => Promise<boolean>;
  simulatePaymentDispute: (paymentId: string, reason?: string) => Promise<boolean>;
  simulatePaymentRefund: (paymentId: string, amount?: number) => Promise<boolean>;
}

// Valeurs initiales pour le store
const initialState = {
  currentPayment: {
    id: null,
    paymentIntentId: null,
    clientSecret: null,
    amount: null,
    currency: null,
    status: null,
    error: null,
    metadata: null,
    isEscrow: false,
  },
  paymentHistory: {
    items: [],
    pagination: {
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 0,
    },
    filter: {},
  },
  form: {
    amount: 0,
    currency: 'EUR',
    description: '',
  },
  paymentMethods: [],
  isLoading: false,
  isRefreshing: false,
  isProcessing: false,
  errors: {
    form: null,
    api: null,
  },
  isDemoMode: env.NEXT_PUBLIC_DEMO_MODE === 'true',
};

/**
 * Store Zustand pour la gestion des paiements
 * Permet de:
 * - Gérer l'état des paiements en cours
 * - Stocker l'historique des paiements
 * - Gérer les formulaires de paiement
 * - Gérer les erreurs et états de chargement
 * - Supporter le mode démonstration
 */
export const usePaymentStore = create<PaymentState>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // Actions de base pour mettre à jour l'état
        setCurrentPayment: payment =>
          set(state => ({
            currentPayment: {
              ...state.currentPayment,
              ...payment,
            },
          })),

        resetCurrentPayment: () => set({ currentPayment: initialState.currentPayment }),

        setPaymentHistory: data =>
          set(state => ({
            paymentHistory: {
              ...state.paymentHistory,
              items: data.items,
              pagination: data.pagination,
            },
          })),

        setPaymentHistoryFilter: filter =>
          set(state => ({
            paymentHistory: {
              ...state.paymentHistory,
              filter: {
                ...state.paymentHistory.filter,
                ...filter,
              },
            },
          })),

        setForm: form =>
          set(state => ({
            form: {
              ...state.form,
              ...form,
            },
          })),

        resetForm: () => set({ form: initialState.form }),

        setPaymentMethods: methods => set({ paymentMethods: methods }),

        setLoading: isLoading => set({ isLoading }),

        setRefreshing: isRefreshing => set({ isRefreshing }),

        setProcessing: isProcessing => set({ isProcessing }),

        setErrors: errors =>
          set(state => ({
            errors: {
              ...state.errors,
              ...errors,
            },
          })),

        clearErrors: () => set({ errors: initialState.errors }),

        // Actions avec intégration API
        createPaymentIntent: async data => {
          const state = get();
          set({ isProcessing: true, errors: initialState.errors });

          try {
            // Mode démonstration
            if (state.isDemoMode) {
              // Création d'un identifiant simulé et d'un secret client
              const demoPaymentId = `demo_pi_${Date.now()}`;
              const demoClientSecret = `demo_secret_${Date.now()}`;

              // Simuler un léger délai pour donner l'impression d'une requête réelle
              await new Promise(resolve => setTimeout(resolve, 800));

              // Mettre à jour l'état du paiement
              set(state => ({
                currentPayment: {
                  ...state.currentPayment,
                  id: `payment_${Date.now()}`,
                  paymentIntentId: demoPaymentId,
                  clientSecret: demoClientSecret,
                  amount: data.amount,
                  currency: data.currency,
                  status: 'pending',
                  metadata: {
                    ...data.metadata,
                    demoMode: true,
                    createdAt: new Date().toISOString(),
                  },
                },
                isProcessing: false,
              }));

              return {
                clientSecret: demoClientSecret,
                paymentIntentId: demoPaymentId,
              };
            }

            // Mode réel: appel à l'API tRPC
            const client = trpc.payment.createPaymentIntent.useMutation();
            const result = await client.mutateAsync(data);

            if (result && result.clientSecret && result.paymentIntentId) {
              set(state => ({
                currentPayment: {
                  ...state.currentPayment,
                  id: result.id,
                  paymentIntentId: result.paymentIntentId,
                  clientSecret: result.clientSecret,
                  amount: data.amount,
                  currency: data.currency,
                  status: 'pending',
                  metadata: data.metadata || null,
                },
                isProcessing: false,
              }));

              return {
                clientSecret: result.clientSecret,
                paymentIntentId: result.paymentIntentId,
              };
            }

            throw new Error('Réponse invalide du serveur');
          } catch (error) {
            console.error('Erreur lors de la création du payment intent:', error);

            set({
              isProcessing: false,
              errors: {
                ...get().errors,
                api:
                  error instanceof Error
                    ? error.message
                    : 'Une erreur est survenue lors de la création du paiement',
              },
            });

            toast({
              variant: 'destructive',
              title: 'Erreur de paiement',
              description:
                error instanceof Error
                  ? error.message
                  : 'Une erreur est survenue lors de la création du paiement',
            });

            return null;
          }
        },

        capturePayment: async paymentIntentId => {
          const state = get();
          set({ isProcessing: true });

          try {
            // Mode démonstration
            if (state.isDemoMode) {
              // Simuler un léger délai
              await new Promise(resolve => setTimeout(resolve, 800));

              // Mettre à jour l'état du paiement
              set(state => ({
                currentPayment: {
                  ...state.currentPayment,
                  status: 'succeeded',
                  metadata: {
                    ...state.currentPayment.metadata,
                    capturedAt: new Date().toISOString(),
                  },
                },
                isProcessing: false,
              }));

              // Rafraîchir l'historique des paiements
              await get().getPaymentHistory();

              return true;
            }

            // Mode réel: appel à l'API tRPC
            const client = trpc.payment.capturePayment.useMutation();
            const result = await client.mutateAsync({ paymentIntentId });

            if (result && result.success) {
              set(state => ({
                currentPayment: {
                  ...state.currentPayment,
                  status: 'succeeded',
                  metadata: {
                    ...state.currentPayment.metadata,
                    capturedAt: new Date().toISOString(),
                  },
                },
                isProcessing: false,
              }));

              // Rafraîchir l'historique des paiements
              await get().getPaymentHistory();

              return true;
            }

            throw new Error('Échec de la capture du paiement');
          } catch (error) {
            console.error('Erreur lors de la capture du paiement:', error);

            set({
              isProcessing: false,
              errors: {
                ...get().errors,
                api:
                  error instanceof Error
                    ? error.message
                    : 'Une erreur est survenue lors de la validation du paiement',
              },
            });

            toast({
              variant: 'destructive',
              title: 'Erreur de paiement',
              description:
                error instanceof Error
                  ? error.message
                  : 'Une erreur est survenue lors de la validation du paiement',
            });

            return false;
          }
        },

        cancelPayment: async paymentIntentId => {
          const state = get();
          set({ isProcessing: true });

          try {
            // Mode démonstration
            if (state.isDemoMode) {
              // Simuler un léger délai
              await new Promise(resolve => setTimeout(resolve, 500));

              // Mettre à jour l'état du paiement
              set(state => ({
                currentPayment: {
                  ...state.currentPayment,
                  status: 'canceled',
                  metadata: {
                    ...state.currentPayment.metadata,
                    canceledAt: new Date().toISOString(),
                  },
                },
                isProcessing: false,
              }));

              // Rafraîchir l'historique des paiements
              await get().getPaymentHistory();

              return true;
            }

            // Mode réel: appel à l'API tRPC
            const client = trpc.payment.cancelPayment.useMutation();
            const result = await client.mutateAsync({ paymentIntentId });

            if (result && result.success) {
              set(state => ({
                currentPayment: {
                  ...state.currentPayment,
                  status: 'canceled',
                  metadata: {
                    ...state.currentPayment.metadata,
                    canceledAt: new Date().toISOString(),
                  },
                },
                isProcessing: false,
              }));

              // Rafraîchir l'historique des paiements
              await get().getPaymentHistory();

              return true;
            }

            throw new Error("Échec de l'annulation du paiement");
          } catch (error) {
            console.error("Erreur lors de l'annulation du paiement:", error);

            set({
              isProcessing: false,
              errors: {
                ...get().errors,
                api:
                  error instanceof Error
                    ? error.message
                    : "Une erreur est survenue lors de l'annulation du paiement",
              },
            });

            toast({
              variant: 'destructive',
              title: "Erreur d'annulation",
              description:
                error instanceof Error
                  ? error.message
                  : "Une erreur est survenue lors de l'annulation du paiement",
            });

            return false;
          }
        },

        refundPayment: async (paymentIntentId, amount) => {
          const state = get();
          set({ isProcessing: true });

          try {
            // Mode démonstration
            if (state.isDemoMode) {
              // Simuler un léger délai
              await new Promise(resolve => setTimeout(resolve, 800));

              // Mettre à jour l'état du paiement
              set(state => ({
                currentPayment: {
                  ...state.currentPayment,
                  status:
                    amount && amount < (state.currentPayment.amount || 0)
                      ? 'partially_refunded'
                      : 'refunded',
                  metadata: {
                    ...state.currentPayment.metadata,
                    refundedAt: new Date().toISOString(),
                    refundAmount: amount || state.currentPayment.amount,
                    isPartialRefund: amount && amount < (state.currentPayment.amount || 0),
                  },
                },
                isProcessing: false,
              }));

              // Rafraîchir l'historique des paiements
              await get().getPaymentHistory();

              return true;
            }

            // Mode réel: appel à l'API tRPC
            const client = trpc.payment.refundPayment.useMutation();
            const result = await client.mutateAsync({ paymentIntentId, amount });

            if (result && result.success) {
              set(state => ({
                currentPayment: {
                  ...state.currentPayment,
                  status: result.isPartialRefund ? 'partially_refunded' : 'refunded',
                  metadata: {
                    ...state.currentPayment.metadata,
                    refundedAt: new Date().toISOString(),
                    refundAmount: result.refundedAmount,
                    isPartialRefund: result.isPartialRefund,
                  },
                },
                isProcessing: false,
              }));

              // Rafraîchir l'historique des paiements
              await get().getPaymentHistory();

              return true;
            }

            throw new Error('Échec du remboursement');
          } catch (error) {
            console.error('Erreur lors du remboursement:', error);

            set({
              isProcessing: false,
              errors: {
                ...get().errors,
                api:
                  error instanceof Error
                    ? error.message
                    : 'Une erreur est survenue lors du remboursement',
              },
            });

            toast({
              variant: 'destructive',
              title: 'Erreur de remboursement',
              description:
                error instanceof Error
                  ? error.message
                  : 'Une erreur est survenue lors du remboursement',
            });

            return false;
          }
        },

        getPaymentMethods: async () => {
          const state = get();
          set({ isLoading: true });

          try {
            // Mode démonstration
            if (state.isDemoMode) {
              // Simuler un léger délai
              await new Promise(resolve => setTimeout(resolve, 600));

              // Méthodes de paiement démo
              const demoMethods: PaymentMethod[] = [
                {
                  id: 'pm_demo_card_visa',
                  type: 'card',
                  last4: '4242',
                  expiryMonth: 12,
                  expiryYear: new Date().getFullYear() + 2,
                  brand: 'visa',
                  isDefault: true,
                },
                {
                  id: 'pm_demo_card_mastercard',
                  type: 'card',
                  last4: '5555',
                  expiryMonth: 10,
                  expiryYear: new Date().getFullYear() + 1,
                  brand: 'mastercard',
                  isDefault: false,
                },
              ];

              set({
                paymentMethods: demoMethods,
                isLoading: false,
              });

              return demoMethods;
            }

            // Mode réel: appel à l'API tRPC
            const paymentMethodsQuery = trpc.payment.getPaymentMethods.useQuery();
            const result = await paymentMethodsQuery.refetch();

            if (result.data && result.data.paymentMethods) {
              set({
                paymentMethods: result.data.paymentMethods,
                isLoading: false,
              });

              return result.data.paymentMethods;
            }

            set({ isLoading: false });
            return [];
          } catch (error) {
            console.error('Erreur lors de la récupération des méthodes de paiement:', error);

            set({
              isLoading: false,
              errors: {
                ...get().errors,
                api:
                  error instanceof Error
                    ? error.message
                    : 'Une erreur est survenue lors de la récupération des méthodes de paiement',
              },
            });

            toast({
              variant: 'destructive',
              title: 'Erreur',
              description:
                error instanceof Error
                  ? error.message
                  : 'Une erreur est survenue lors de la récupération des méthodes de paiement',
            });

            return [];
          }
        },

        getPaymentHistory: async (page = 1, limit = 10) => {
          const state = get();
          set({ isRefreshing: true });

          try {
            // Préparation des filtres
            const { filter } = state.paymentHistory;

            // Mode démonstration
            if (state.isDemoMode) {
              // Simuler un léger délai
              await new Promise(resolve => setTimeout(resolve, 700));

              // Historique de paiements démo
              const demoItems: PaymentHistoryItem[] = [
                {
                  id: 'pay_demo_1',
                  amount: 24.99,
                  currency: 'EUR',
                  status: 'completed',
                  date: new Date(Date.now() - 86400000),
                  description: 'Livraison colis #12345',
                  delivery: {
                    id: 'del_12345',
                    status: 'delivered',
                  },
                },
                {
                  id: 'pay_demo_2',
                  amount: 49.99,
                  currency: 'EUR',
                  status: 'completed',
                  date: new Date(Date.now() - 172800000),
                  description: 'Service de nettoyage',
                  service: {
                    id: 'srv_12345',
                    title: 'Nettoyage professionnel',
                  },
                },
                {
                  id: 'pay_demo_3',
                  amount: 19.99,
                  currency: 'EUR',
                  status: 'pending',
                  date: new Date(),
                  description: 'Abonnement mensuel',
                },
                {
                  id: 'pay_demo_4',
                  amount: 34.5,
                  currency: 'EUR',
                  status: 'refunded',
                  date: new Date(Date.now() - 259200000),
                  description: 'Livraison colis #54321',
                  delivery: {
                    id: 'del_54321',
                    status: 'cancelled',
                  },
                },
              ];

              // Pagination démo
              const demoPagination: PaginationInfo = {
                total: demoItems.length,
                page,
                limit,
                totalPages: Math.ceil(demoItems.length / limit),
              };

              set({
                paymentHistory: {
                  ...state.paymentHistory,
                  items: demoItems,
                  pagination: demoPagination,
                },
                isRefreshing: false,
              });

              return;
            }

            // Mode réel: appel à l'API tRPC
            const paymentHistoryQuery = trpc.payment.getPaymentHistory.useQuery();
            const result = await paymentHistoryQuery.refetch({
              page,
              limit,
              startDate: filter.startDate,
              endDate: filter.endDate,
              status: filter.status,
              type: filter.type,
            });

            if (result.data) {
              set({
                paymentHistory: {
                  ...state.paymentHistory,
                  items: result.data.payments,
                  pagination: result.data.pagination,
                },
                isRefreshing: false,
              });
            } else {
              set({
                paymentHistory: {
                  ...state.paymentHistory,
                  items: [],
                  pagination: {
                    total: 0,
                    page,
                    limit,
                    totalPages: 0,
                  },
                },
                isRefreshing: false,
              });
            }
          } catch (error) {
            console.error("Erreur lors de la récupération de l'historique des paiements:", error);

            set({
              isRefreshing: false,
              errors: {
                ...get().errors,
                api:
                  error instanceof Error
                    ? error.message
                    : "Une erreur est survenue lors de la récupération de l'historique",
              },
            });

            toast({
              variant: 'destructive',
              title: 'Erreur',
              description:
                error instanceof Error
                  ? error.message
                  : "Une erreur est survenue lors de la récupération de l'historique",
            });
          }
        },

        // Fonctions spécifiques au mode démo
        simulatePaymentSuccess: async paymentId => {
          const state = get();
          if (!state.isDemoMode) return false;

          set({ isProcessing: true });

          try {
            // Simuler une requête au webhook démo
            await fetch('/api/webhooks/stripe/demo', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                eventType: 'payment_intent.succeeded',
                paymentId,
                amount: state.currentPayment.amount,
                status: 'succeeded',
                metadata: {
                  userId: 'current_user', // Normalement ceci viendrait de la session
                  demoMode: true,
                },
              }),
            });

            // Mettre à jour l'état local
            set(state => ({
              currentPayment: {
                ...state.currentPayment,
                status: 'succeeded',
                metadata: {
                  ...state.currentPayment.metadata,
                  processedAt: new Date().toISOString(),
                },
              },
              isProcessing: false,
            }));

            // Rafraîchir l'historique
            await get().getPaymentHistory();

            toast({
              title: 'Paiement réussi',
              description: 'Le paiement a été traité avec succès (mode démo)',
            });

            return true;
          } catch (error) {
            console.error('Erreur lors de la simulation de paiement réussi:', error);

            set({
              isProcessing: false,
              errors: {
                ...get().errors,
                api:
                  error instanceof Error
                    ? error.message
                    : 'Une erreur est survenue lors de la simulation',
              },
            });

            toast({
              variant: 'destructive',
              title: 'Erreur de simulation',
              description:
                error instanceof Error
                  ? error.message
                  : 'Une erreur est survenue lors de la simulation',
            });

            return false;
          }
        },

        simulatePaymentFailure: async (paymentId, reason) => {
          const state = get();
          if (!state.isDemoMode) return false;

          set({ isProcessing: true });

          try {
            // Simuler une requête au webhook démo
            await fetch('/api/webhooks/stripe/demo', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                eventType: 'payment_intent.payment_failed',
                paymentId,
                amount: state.currentPayment.amount,
                status: 'failed',
                metadata: {
                  userId: 'current_user', // Normalement ceci viendrait de la session
                  reason: reason || 'Échec du paiement en mode démonstration',
                  demoMode: true,
                },
              }),
            });

            // Mettre à jour l'état local
            set(state => ({
              currentPayment: {
                ...state.currentPayment,
                status: 'failed',
                error: reason || 'Échec du paiement en mode démonstration',
                metadata: {
                  ...state.currentPayment.metadata,
                  failedAt: new Date().toISOString(),
                  reason: reason || 'Échec du paiement en mode démonstration',
                },
              },
              isProcessing: false,
            }));

            // Rafraîchir l'historique
            await get().getPaymentHistory();

            toast({
              variant: 'destructive',
              title: 'Paiement échoué',
              description: reason || 'Échec du paiement en mode démonstration',
            });

            return true;
          } catch (error) {
            console.error("Erreur lors de la simulation d'échec de paiement:", error);

            set({
              isProcessing: false,
              errors: {
                ...get().errors,
                api:
                  error instanceof Error
                    ? error.message
                    : 'Une erreur est survenue lors de la simulation',
              },
            });

            toast({
              variant: 'destructive',
              title: 'Erreur de simulation',
              description:
                error instanceof Error
                  ? error.message
                  : 'Une erreur est survenue lors de la simulation',
            });

            return false;
          }
        },

        simulatePaymentDispute: async (paymentId, reason) => {
          const state = get();
          if (!state.isDemoMode) return false;

          set({ isProcessing: true });

          try {
            // Simuler une requête au webhook démo
            await fetch('/api/webhooks/stripe/demo', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                eventType: 'charge.dispute.created',
                paymentId,
                amount: state.currentPayment.amount,
                status: 'disputed',
                metadata: {
                  userId: 'current_user', // Normalement ceci viendrait de la session
                  reason: reason || 'Contestation client en mode démonstration',
                  demoMode: true,
                },
              }),
            });

            // Mettre à jour l'état local
            set(state => ({
              currentPayment: {
                ...state.currentPayment,
                status: 'disputed',
                metadata: {
                  ...state.currentPayment.metadata,
                  disputeDate: new Date().toISOString(),
                  disputeReason: reason || 'Contestation client en mode démonstration',
                },
              },
              isProcessing: false,
            }));

            // Rafraîchir l'historique
            await get().getPaymentHistory();

            toast({
              variant: 'warning',
              title: 'Paiement contesté',
              description: "Ce paiement fait maintenant l'objet d'une contestation (mode démo)",
            });

            return true;
          } catch (error) {
            console.error('Erreur lors de la simulation de contestation:', error);

            set({
              isProcessing: false,
              errors: {
                ...get().errors,
                api:
                  error instanceof Error
                    ? error.message
                    : 'Une erreur est survenue lors de la simulation',
              },
            });

            toast({
              variant: 'destructive',
              title: 'Erreur de simulation',
              description:
                error instanceof Error
                  ? error.message
                  : 'Une erreur est survenue lors de la simulation',
            });

            return false;
          }
        },

        simulatePaymentRefund: async (paymentId, amount) => {
          const state = get();
          if (!state.isDemoMode) return false;

          set({ isProcessing: true });

          try {
            // Simuler une requête au webhook démo
            await fetch('/api/webhooks/stripe/demo', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                eventType: 'charge.refunded',
                paymentId,
                amount: amount || state.currentPayment.amount,
                status:
                  amount && amount < (state.currentPayment.amount || 0)
                    ? 'partially_refunded'
                    : 'refunded',
                metadata: {
                  userId: 'current_user', // Normalement ceci viendrait de la session
                  isPartialRefund: amount && amount < (state.currentPayment.amount || 0),
                  refundAmount: amount || state.currentPayment.amount,
                  demoMode: true,
                },
              }),
            });

            // Mettre à jour l'état local
            set(state => ({
              currentPayment: {
                ...state.currentPayment,
                status:
                  amount && amount < (state.currentPayment.amount || 0)
                    ? 'partially_refunded'
                    : 'refunded',
                metadata: {
                  ...state.currentPayment.metadata,
                  refundedAt: new Date().toISOString(),
                  refundAmount: amount || state.currentPayment.amount,
                  isPartialRefund: amount && amount < (state.currentPayment.amount || 0),
                },
              },
              isProcessing: false,
            }));

            // Rafraîchir l'historique
            await get().getPaymentHistory();

            toast({
              title: 'Remboursement effectué',
              description: 'Le remboursement a été traité avec succès (mode démo)',
            });

            return true;
          } catch (error) {
            console.error('Erreur lors de la simulation de remboursement:', error);

            set({
              isProcessing: false,
              errors: {
                ...get().errors,
                api:
                  error instanceof Error
                    ? error.message
                    : 'Une erreur est survenue lors de la simulation',
              },
            });

            toast({
              variant: 'destructive',
              title: 'Erreur de simulation',
              description:
                error instanceof Error
                  ? error.message
                  : 'Une erreur est survenue lors de la simulation',
            });

            return false;
          }
        },
      }),
      {
        name: 'payment-store',
        // On ne sauvegarde pas les états de chargement et les erreurs
        partialize: state => ({
          paymentHistory: {
            filter: state.paymentHistory.filter,
          },
          paymentMethods: state.paymentMethods,
          form: state.form,
          isDemoMode: state.isDemoMode,
        }),
      }
    )
  )
);
