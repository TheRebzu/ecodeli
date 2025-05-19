import { useState, useCallback } from 'react';
import { api } from '@/trpc/react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

/**
 * Type pour les options du hook useInvoices
 */
interface UseInvoicesOptions {
  initialPage?: number;
  pageSize?: number;
  status?: string;
  refreshInterval?: number;
  initialFetch?: boolean;
}

/**
 * Type pour les options du hook useSubscription
 */
interface UseSubscriptionOptions {
  refreshInterval?: number;
  initialFetch?: boolean;
  onSubscriptionChange?: (newSubscription: any) => void;
}

/**
 * Hook pour la gestion des factures
 * @param options Options de configuration
 * @returns Données et fonctions pour la gestion des factures
 */
export function useInvoices(options: UseInvoicesOptions = {}) {
  const {
    initialPage = 1,
    pageSize = 10,
    status,
    refreshInterval = 0,
    initialFetch = true
  } = options;

  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [currentLimit, setCurrentLimit] = useState(pageSize);
  const [isExporting, setIsExporting] = useState(false);
  const [filters, setFilters] = useState<{
    status?: string;
    startDate?: Date;
    endDate?: Date;
    search?: string;
  }>({
    status
  });

  // Requête pour récupérer les factures
  const {
    data,
    isLoading,
    error,
    refetch
  } = api.billing.getInvoices.useQuery({
    page: currentPage,
    limit: currentLimit,
    status: filters.status as any,
    startDate: filters.startDate,
    endDate: filters.endDate,
    search: filters.search
  }, {
    enabled: initialFetch,
    refetchInterval: refreshInterval > 0 ? refreshInterval : undefined
  });

  // Mutation pour télécharger une facture
  const downloadInvoiceMutation = api.billing.downloadInvoice.useMutation({
    onSuccess: (data) => {
      if (data.downloadUrl) {
        // Déclencher le téléchargement
        const link = document.createElement('a');
        link.href = data.downloadUrl;
        link.download = data.filename || 'facture.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast.success('Facture téléchargée avec succès');
      } else {
        toast.error('Impossible de télécharger la facture');
      }
    },
    onError: (error) => {
      toast.error(`Erreur lors du téléchargement: ${error.message}`);
    }
  });

  // Mutation pour payer une facture
  const payInvoiceMutation = api.billing.payInvoice.useMutation({
    onSuccess: (data) => {
      toast.success('Paiement initié avec succès');
      
      if (data.redirectUrl) {
        router.push(data.redirectUrl);
      } else {
        // Rafraîchir les factures après paiement
        refetch();
      }
    },
    onError: (error) => {
      toast.error(`Erreur lors du paiement: ${error.message}`);
    }
  });

  // Mutation pour exporter les factures
  const exportInvoicesMutation = api.billing.exportInvoices.useMutation({
    onSuccess: (data) => {
      setIsExporting(false);
      
      if (data.downloadUrl) {
        // Déclencher le téléchargement
        const link = document.createElement('a');
        link.href = data.downloadUrl;
        link.download = data.filename || 'factures.zip';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast.success('Factures exportées avec succès');
      } else {
        toast.error('Impossible d\'exporter les factures');
      }
    },
    onError: (error) => {
      setIsExporting(false);
      toast.error(`Erreur lors de l'export: ${error.message}`);
    }
  });

  /**
   * Télécharge une facture au format PDF
   */
  const downloadInvoice = useCallback((invoiceId: string) => {
    downloadInvoiceMutation.mutate({ invoiceId });
  }, [downloadInvoiceMutation]);

  /**
   * Paie une facture
   */
  const payInvoice = useCallback((invoiceId: string, redirectAfterPayment?: string) => {
    payInvoiceMutation.mutate({ 
      invoiceId,
      redirectUrl: redirectAfterPayment
    });
  }, [payInvoiceMutation]);

  /**
   * Change de page
   */
  const goToPage = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  /**
   * Change la taille de la page
   */
  const setPageSize = useCallback((size: number) => {
    setCurrentLimit(size);
    setCurrentPage(1); // Retour à la première page lors du changement de taille
  }, []);

  /**
   * Filtre les factures
   */
  const filterInvoices = useCallback((newFilters: {
    status?: string;
    startDate?: Date;
    endDate?: Date;
    search?: string;
  }) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setCurrentPage(1); // Retour à la première page lors du filtrage
  }, []);

  /**
   * Exporte les factures sélectionnées
   */
  const exportInvoices = useCallback((invoiceIds: string[], format: 'PDF' | 'CSV' = 'PDF') => {
    setIsExporting(true);
    exportInvoicesMutation.mutate({ invoiceIds, format });
  }, [exportInvoicesMutation]);

  /**
   * Rafraîchit les factures
   */
  const refreshInvoices = useCallback(async () => {
    try {
      const result = await refetch();
      return result.data;
    } catch (error) {
      console.error('Erreur lors du rafraîchissement des factures:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Une erreur est survenue lors du rafraîchissement des factures';
      
      toast.error(errorMessage);
      throw error;
    }
  }, [refetch]);

  return {
    invoices: data?.invoices || [],
    pagination: data?.pagination || {
      total: 0,
      page: currentPage,
      limit: currentLimit,
      totalPages: 0
    },
    totalAmount: data?.totalAmount,
    paidAmount: data?.paidAmount,
    overdueAmount: data?.overdueAmount,
    isLoading,
    isExporting,
    error,
    filters,
    currentPage,
    pageSize: currentLimit,
    downloadInvoice,
    payInvoice,
    goToPage,
    setPageSize,
    filterInvoices,
    exportInvoices,
    refreshInvoices,
    isDemoMode: process.env.NEXT_PUBLIC_DEMO_MODE === 'true'
  };
}

/**
 * Hook pour la gestion des abonnements
 * @param options Options de configuration
 * @returns Données et fonctions pour la gestion des abonnements
 */
export function useSubscription(options: UseSubscriptionOptions = {}) {
  const {
    refreshInterval = 0,
    initialFetch = true,
    onSubscriptionChange
  } = options;

  const router = useRouter();
  const [isChangingPlan, setIsChangingPlan] = useState(false);
  const [isCancel, setIsCancel] = useState(false);

  // Requête pour obtenir l'abonnement actif
  const {
    data: subscription,
    isLoading,
    error,
    refetch
  } = api.billing.getActiveSubscription.useQuery(undefined, {
    enabled: initialFetch,
    refetchInterval: refreshInterval > 0 ? refreshInterval : undefined,
    onSuccess: (data) => {
      if (onSubscriptionChange && data) {
        onSubscriptionChange(data);
      }
    }
  });

  // Récupérer les forfaits disponibles
  const {
    data: availablePlans,
    isLoading: isLoadingPlans
  } = api.billing.getAvailablePlans.useQuery(undefined, {
    enabled: initialFetch
  });

  // Mutation pour changer de forfait
  const changePlanMutation = api.billing.changePlan.useMutation({
    onSuccess: (data) => {
      setIsChangingPlan(false);
      
      if (data.requiresPayment && data.redirectUrl) {
        toast.success('Vous allez être redirigé vers la page de paiement');
        router.push(data.redirectUrl);
      } else {
        toast.success('Forfait mis à jour avec succès');
        refetch();
      }
    },
    onError: (error) => {
      setIsChangingPlan(false);
      toast.error(`Erreur lors du changement de forfait: ${error.message}`);
    }
  });

  // Mutation pour annuler l'abonnement
  const cancelSubscriptionMutation = api.billing.cancelSubscription.useMutation({
    onSuccess: () => {
      setIsCancel(false);
      toast.success('Abonnement annulé avec succès. Il restera actif jusqu\'à la fin de la période en cours.');
      refetch();
    },
    onError: (error) => {
      setIsCancel(false);
      toast.error(`Erreur lors de l'annulation: ${error.message}`);
    }
  });

  // Mutation pour réactiver un abonnement annulé
  const reactivateSubscriptionMutation = api.billing.reactivateSubscription.useMutation({
    onSuccess: () => {
      toast.success('Abonnement réactivé avec succès');
      refetch();
    },
    onError: (error) => {
      toast.error(`Erreur lors de la réactivation: ${error.message}`);
    }
  });

  /**
   * Change de forfait
   */
  const changePlan = useCallback((planId: string, couponCode?: string) => {
    setIsChangingPlan(true);
    changePlanMutation.mutate({ planId, couponCode });
  }, [changePlanMutation]);

  /**
   * Annule l'abonnement
   */
  const cancelSubscription = useCallback((reason?: string) => {
    setIsCancel(true);
    cancelSubscriptionMutation.mutate({ reason });
  }, [cancelSubscriptionMutation]);

  /**
   * Réactive un abonnement annulé
   */
  const reactivateSubscription = useCallback(() => {
    reactivateSubscriptionMutation.mutate();
  }, [reactivateSubscriptionMutation]);

  /**
   * Rafraîchit les données de l'abonnement
   */
  const refreshSubscription = useCallback(async () => {
    try {
      const result = await refetch();
      return result.data;
    } catch (error) {
      console.error('Erreur lors du rafraîchissement des données d\'abonnement:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Une erreur est survenue lors du rafraîchissement des données d\'abonnement';
      
      toast.error(errorMessage);
      throw error;
    }
  }, [refetch]);

  /**
   * Calcule les jours restants dans la période d'abonnement actuelle
   */
  const getRemainingDays = useCallback(() => {
    if (!subscription?.currentPeriodEnd) return 0;
    
    const now = new Date();
    const endDate = new Date(subscription.currentPeriodEnd);
    const diffTime = endDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return Math.max(0, diffDays);
  }, [subscription]);

  /**
   * Formate la date de fin de période
   */
  const formatPeriodEnd = useCallback(() => {
    if (!subscription?.currentPeriodEnd) return '';
    
    return format(new Date(subscription.currentPeriodEnd), 'dd MMMM yyyy', { locale: fr });
  }, [subscription]);

  return {
    subscription,
    availablePlans,
    isLoading,
    isLoadingPlans,
    isChangingPlan,
    isCancelling: isCancel,
    error,
    changePlan,
    cancelSubscription,
    reactivateSubscription,
    refreshSubscription,
    getRemainingDays,
    formatPeriodEnd,
    hasActiveSubscription: !!subscription?.status && subscription.status === 'ACTIVE',
    isCancelled: !!subscription?.cancelAtPeriodEnd,
    isDemoMode: process.env.NEXT_PUBLIC_DEMO_MODE === 'true'
  };
}

/**
 * Hook pour la gestion de la facturation
 * Fournit des méthodes pour les opérations de facturation automatique
 * et la génération de factures
 */
export const useBilling = () => {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Mutations tRPC
  const runMonthlyBillingMutation = api.billing.runMonthlyBilling.useMutation({
    onSuccess: () => {
      toast.success('Facturation mensuelle exécutée avec succès');
      router.refresh();
    },
    onError: error => {
      toast.error(`Erreur lors de la facturation mensuelle: ${error.message}`);
    },
  });

  const scheduleMonthlyCyclesMutation = api.billing.scheduleMonthlyCycles.useMutation({
    onSuccess: data => {
      toast.success(`${data.cyclesCreated} cycles de facturation planifiés`);
      router.refresh();
    },
    onError: error => {
      toast.error(`Erreur lors de la planification: ${error.message}`);
    },
  });

  const executeScheduledCyclesMutation = api.billing.executeScheduledCycles.useMutation({
    onSuccess: data => {
      toast.success(`${data.cyclesFound} cycles exécutés`);
      router.refresh();
    },
    onError: error => {
      toast.error(`Erreur lors de l'exécution des cycles: ${error.message}`);
    },
  });

  const retryCycleMutation = api.billing.retryCycle.useMutation({
    onSuccess: () => {
      toast.success('Cycle de facturation réexécuté avec succès');
      router.refresh();
    },
    onError: error => {
      toast.error(`Erreur lors de la réexécution: ${error.message}`);
    },
  });

  const sendPaymentRemindersMutation = api.billing.sendPaymentReminders.useMutation({
    onSuccess: data => {
      toast.success(`${data.processedCount} rappels envoyés`);
    },
    onError: error => {
      toast.error(`Erreur lors de l'envoi des rappels: ${error.message}`);
    },
  });

  const processAutomaticPayoutsMutation = api.billing.processAutomaticPayouts.useMutation({
    onSuccess: data => {
      toast.success(`${data.processedCount} virements automatiques traités`);
    },
    onError: error => {
      toast.error(`Erreur lors du traitement des virements: ${error.message}`);
    },
  });

  const generateProviderInvoiceMutation = api.billing.generateProviderInvoice.useMutation({
    onSuccess: data => {
      toast.success(`Facture générée: ${data.invoice.number}`);
      router.push(`/admin/invoices/${data.invoice.id}`);
    },
    onError: error => {
      toast.error(`Erreur lors de la génération de la facture: ${error.message}`);
    },
  });

  const generateMerchantInvoiceMutation = api.billing.generateMerchantInvoice.useMutation({
    onSuccess: data => {
      toast.success(`Facture générée: ${data.invoice.number}`);
      router.push(`/admin/invoices/${data.invoice.id}`);
    },
    onError: error => {
      toast.error(`Erreur lors de la génération de la facture: ${error.message}`);
    },
  });

  // Requête pour les statistiques
  const {
    data: billingStats,
    isLoading: isLoadingStats,
    refetch: refetchStats,
  } = api.billing.getBillingStats.useQuery(
    { period: 'MONTH' },
    { refetchInterval: 60000 * 15 } // Rafraîchir toutes les 15 minutes
  );

  // Fonctions exposées

  /**
   * Lance la facturation mensuelle
   */
  const runMonthlyBilling = async () => {
    setIsLoading(true);
    try {
      await runMonthlyBillingMutation.mutateAsync();
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Planifie les cycles de facturation pour le mois
   */
  const scheduleMonthlyCycles = async (scheduledDate?: Date) => {
    setIsLoading(true);
    try {
      await scheduleMonthlyCyclesMutation.mutateAsync({
        scheduledDate: scheduledDate || new Date(),
      });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Exécute les cycles planifiés pour aujourd'hui
   */
  const executeScheduledCycles = async () => {
    setIsLoading(true);
    try {
      await executeScheduledCyclesMutation.mutateAsync();
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Réexécute un cycle échoué
   */
  const retryCycle = async (billingCycleId: string) => {
    setIsLoading(true);
    try {
      await retryCycleMutation.mutateAsync({ billingCycleId });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Envoie les rappels de paiement
   */
  const sendPaymentReminders = async () => {
    setIsLoading(true);
    try {
      await sendPaymentRemindersMutation.mutateAsync();
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Traite les virements automatiques
   */
  const processAutomaticPayouts = async () => {
    setIsLoading(true);
    try {
      await processAutomaticPayoutsMutation.mutateAsync();
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Génère une facture pour un prestataire
   */
  const generateProviderInvoice = async (providerId: string, month?: number, year?: number) => {
    setIsLoading(true);
    try {
      await generateProviderInvoiceMutation.mutateAsync({
        providerId,
        month,
        year,
      });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Génère une facture pour un commerçant
   */
  const generateMerchantInvoice = async (merchantId: string, month?: number, year?: number) => {
    setIsLoading(true);
    try {
      await generateMerchantInvoiceMutation.mutateAsync({
        merchantId,
        month,
        year,
      });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Formatage de la période de facturation pour affichage
   */
  const formatBillingPeriod = (startDate: Date, endDate: Date) => {
    return `${format(startDate, 'dd MMMM yyyy', { locale: fr })} - ${format(endDate, 'dd MMMM yyyy', { locale: fr })}`;
  };

  return {
    // État
    isLoading,
    billingStats,
    isLoadingStats,

    // Actions
    runMonthlyBilling,
    scheduleMonthlyCycles,
    executeScheduledCycles,
    retryCycle,
    sendPaymentReminders,
    processAutomaticPayouts,
    generateProviderInvoice,
    generateMerchantInvoice,
    refetchStats,

    // Formatage
    formatBillingPeriod,
  };
};

export default useBilling;
