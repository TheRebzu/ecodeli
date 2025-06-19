"use client";

import React, { useState, useCallback } from "react";
import { api } from "@/trpc/react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import { useTranslations } from "next-intl";
import {
  type PaymentTransaction,
  type PaymentMethod,
  type Invoice,
  type Subscription,
  type Wallet,
  type PaymentStats,
  type CreatePaymentData,
  type CreatePaymentMethodData,
  type CreateSubscriptionData,
  type TopUpWalletData,
  type WithdrawFromWalletData,
} from "@/types/client/payments";

interface UseClientPaymentsProps {
  initialFilters?: {
    type?: PaymentTransaction["metadata"]["type"];
    status?: PaymentTransaction["status"];
    startDate?: Date;
    endDate?: Date;
  };
}

export function useClientPayments({
  initialFilters = {}
}: UseClientPaymentsProps = {}) {
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations("payments");

  const [filters, setFilters] = useState(initialFilters);
  const [error, setError] = useState<string | null>(null);

  // Récupération des transactions - Appel API réel
  const {
    data: transactionsData,
    isLoading: isLoadingTransactions,
    error: transactionsError,
    refetch: refetchTransactions
  } = api.clientPayments.getTransactions.useQuery(filters, {
    staleTime: 30000, // 30 secondes
    refetchOnWindowFocus: false,
  });

  // Récupération des méthodes de paiement - Appel API réel
  const {
    data: paymentMethodsData,
    isLoading: isLoadingPaymentMethods,
    error: paymentMethodsError,
    refetch: refetchPaymentMethods
  } = api.clientPayments.getPaymentMethods.useQuery(undefined, {
    staleTime: 300000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  // Récupération du portefeuille - Appel API réel
  const {
    data: walletData,
    isLoading: isLoadingWallet,
    error: walletError,
    refetch: refetchWallet
  } = api.clientPayments.getWallet.useQuery(undefined, {
    staleTime: 60000, // 1 minute
    refetchOnWindowFocus: false,
  });

  // Récupération des factures - Appel API réel
  const {
    data: invoicesData,
    isLoading: isLoadingInvoices,
    error: invoicesError,
    refetch: refetchInvoices
  } = api.clientPayments.getInvoices.useQuery(undefined, {
    staleTime: 300000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  // Récupération des statistiques - Appel API réel
  const {
    data: statsData,
    isLoading: isLoadingStats,
    error: statsError,
    refetch: refetchStats
  } = api.clientPayments.getStats.useQuery({
    period: "month"
  }, {
    staleTime: 300000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  // Récupération des abonnements - Appel API réel
  const {
    data: subscriptionsData,
    isLoading: isLoadingSubscriptions,
    error: subscriptionsError,
    refetch: refetchSubscriptions
  } = api.clientPayments.getSubscriptions.useQuery(undefined, {
    staleTime: 300000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  // Mutations - Appels API réels
  const createPaymentMutation = api.clientPayments.createPayment.useMutation({
    onSuccess: () => {
      toast({
        title: "Succès",
        description: "Paiement traité avec succès",
      });
      refetchTransactions();
      refetchWallet();
      refetchStats();
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
      setError(error.message);
    },
  });

  const addPaymentMethodMutation = api.clientPayments.addPaymentMethod.useMutation({
    onSuccess: () => {
      toast({
        title: "Succès",
        description: "Méthode de paiement ajoutée avec succès",
      });
      refetchPaymentMethods();
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
      setError(error.message);
    },
  });

  const removePaymentMethodMutation = api.clientPayments.removePaymentMethod.useMutation({
    onSuccess: () => {
      toast({
        title: "Succès",
        description: "Méthode de paiement supprimée avec succès",
      });
      refetchPaymentMethods();
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
      setError(error.message);
    },
  });

  const setDefaultPaymentMethodMutation = api.clientPayments.setDefaultPaymentMethod.useMutation({
    onSuccess: () => {
      toast({
        title: "Succès",
        description: "Méthode de paiement par défaut mise à jour",
      });
      refetchPaymentMethods();
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
      setError(error.message);
    },
  });

  const topUpWalletMutation = api.clientPayments.topUpWallet.useMutation({
    onSuccess: () => {
      toast({
        title: "Succès",
        description: "Portefeuille rechargé avec succès",
      });
      refetchWallet();
      refetchTransactions();
      refetchStats();
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
      setError(error.message);
    },
  });

  const withdrawFromWalletMutation = api.clientPayments.withdrawFromWallet.useMutation({
    onSuccess: () => {
      toast({
        title: "Succès",
        description: "Retrait effectué avec succès",
      });
      refetchWallet();
      refetchTransactions();
      refetchStats();
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
      setError(error.message);
    },
  });

  const createSubscriptionMutation = api.clientPayments.createSubscription.useMutation({
    onSuccess: () => {
      toast({
        title: "Succès",
        description: "Abonnement créé avec succès",
      });
      refetchSubscriptions();
      refetchTransactions();
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
      setError(error.message);
    },
  });

  const cancelSubscriptionMutation = api.clientPayments.cancelSubscription.useMutation({
    onSuccess: () => {
      toast({
        title: "Succès",
        description: "Abonnement annulé avec succès",
      });
      refetchSubscriptions();
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
      setError(error.message);
    },
  });

  const downloadInvoiceMutation = api.clientPayments.downloadInvoice.useMutation({
    onSuccess: (data) => {
      // Télécharger le PDF
      const blob = new Blob([data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `facture-${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Succès",
        description: "Facture téléchargée avec succès",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
      setError(error.message);
    },
  });

  // Actions avec gestion d'erreur unifiée - Appels API réels uniquement
  const createPayment = useCallback(
    async (data: CreatePaymentData) => {
      setError(null);
      return await createPaymentMutation.mutateAsync(data);
    },
    [createPaymentMutation],
  );

  const addPaymentMethod = useCallback(
    async (data: CreatePaymentMethodData) => {
      setError(null);
      return await addPaymentMethodMutation.mutateAsync(data);
    },
    [addPaymentMethodMutation],
  );

  const removePaymentMethod = useCallback(
    async (paymentMethodId: string) => {
      setError(null);
      return await removePaymentMethodMutation.mutateAsync({ paymentMethodId });
    },
    [removePaymentMethodMutation],
  );

  const setDefaultPaymentMethod = useCallback(
    async (paymentMethodId: string) => {
      setError(null);
      return await setDefaultPaymentMethodMutation.mutateAsync({ paymentMethodId });
    },
    [setDefaultPaymentMethodMutation],
  );

  const topUpWallet = useCallback(
    async (data: TopUpWalletData) => {
      setError(null);
      return await topUpWalletMutation.mutateAsync(data);
    },
    [topUpWalletMutation],
  );

  const withdrawFromWallet = useCallback(
    async (data: WithdrawFromWalletData) => {
      setError(null);
      return await withdrawFromWalletMutation.mutateAsync(data);
    },
    [withdrawFromWalletMutation],
  );

  const createSubscription = useCallback(
    async (data: CreateSubscriptionData) => {
      setError(null);
      return await createSubscriptionMutation.mutateAsync(data);
    },
    [createSubscriptionMutation],
  );

  const cancelSubscription = useCallback(
    async (subscriptionId: string, reason?: string) => {
      setError(null);
      return await cancelSubscriptionMutation.mutateAsync({ 
        subscriptionId, 
        reason 
      });
    },
    [cancelSubscriptionMutation],
  );

  const downloadInvoice = useCallback(
    async (invoiceId: string) => {
      setError(null);
      return await downloadInvoiceMutation.mutateAsync({ invoiceId });
    },
    [downloadInvoiceMutation],
  );

  const updateFilters = useCallback(
    (newFilters: Partial<typeof filters>) => {
      setError(null);
      setFilters(prev => ({ ...prev, ...newFilters }));
    },
    [],
  );

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  // Navigation helpers
  const navigateToInvoice = useCallback(
    (invoiceId: string) => {
      router.push(`/client/payments/invoices/${invoiceId}`);
    },
    [router],
  );

  const navigateToTransaction = useCallback(
    (transactionId: string) => {
      router.push(`/client/payments/transactions/${transactionId}`);
    },
    [router],
  );

  const navigateToSubscription = useCallback(
    (subscriptionId: string) => {
      router.push(`/client/payments/subscriptions/${subscriptionId}`);
    },
    [router],
  );

  // Gestion des erreurs centralisée
  React.useEffect(() => {
    if (transactionsError) {
      setError(transactionsError.message);
    }
  }, [transactionsError]);

  React.useEffect(() => {
    if (paymentMethodsError) {
      setError(paymentMethodsError.message);
    }
  }, [paymentMethodsError]);

  React.useEffect(() => {
    if (walletError) {
      setError(walletError.message);
    }
  }, [walletError]);

  React.useEffect(() => {
    if (invoicesError) {
      setError(invoicesError.message);
    }
  }, [invoicesError]);

  React.useEffect(() => {
    if (statsError) {
      setError(statsError.message);
    }
  }, [statsError]);

  React.useEffect(() => {
    if (subscriptionsError) {
      setError(subscriptionsError.message);
    }
  }, [subscriptionsError]);

  return {
    // Données
    transactions: transactionsData?.transactions || [],
    paymentMethods: paymentMethodsData || [],
    wallet: walletData,
    invoices: invoicesData || [],
    stats: statsData,
    subscriptions: subscriptionsData || [],
    filters,
    
    // Chargement et erreurs
    isLoading: isLoadingTransactions || isLoadingPaymentMethods || isLoadingWallet || isLoadingInvoices || isLoadingStats || isLoadingSubscriptions,
    isLoadingTransactions,
    isLoadingPaymentMethods,
    isLoadingWallet,
    isLoadingInvoices,
    isLoadingStats,
    isLoadingSubscriptions,
    error,
    
    // Actions
    createPayment,
    addPaymentMethod,
    removePaymentMethod,
    setDefaultPaymentMethod,
    topUpWallet,
    withdrawFromWallet,
    createSubscription,
    cancelSubscription,
    downloadInvoice,
    updateFilters,
    resetError,
    
    // Navigation
    navigateToInvoice,
    navigateToTransaction,
    navigateToSubscription,
    
    // Utilitaires
    refetchTransactions,
    refetchPaymentMethods,
    refetchWallet,
    refetchInvoices,
    refetchStats,
    refetchSubscriptions,
    
    // Méta-données
    transactionsMeta: transactionsData ? {
      total: transactionsData.total,
      page: transactionsData.page,
      limit: transactionsData.limit,
      hasMore: transactionsData.hasMore,
    } : null,
    
    // États des mutations
    isCreatingPayment: createPaymentMutation.isPending,
    isAddingPaymentMethod: addPaymentMethodMutation.isPending,
    isRemovingPaymentMethod: removePaymentMethodMutation.isPending,
    isSettingDefaultPaymentMethod: setDefaultPaymentMethodMutation.isPending,
    isToppingUpWallet: topUpWalletMutation.isPending,
    isWithdrawingFromWallet: withdrawFromWalletMutation.isPending,
    isCreatingSubscription: createSubscriptionMutation.isPending,
    isCancellingSubscription: cancelSubscriptionMutation.isPending,
    isDownloadingInvoice: downloadInvoiceMutation.isPending,
  };
}