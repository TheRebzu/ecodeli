import { useState } from 'react';
import { api } from '@/trpc/react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

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
