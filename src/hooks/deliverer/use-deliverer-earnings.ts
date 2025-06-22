import { api } from "@/trpc/react";
import { useToast } from "@/hooks/use-toast";
import { useMemo } from "react";

/**
 * Hook personnalisé pour la gestion des gains des livreurs
 * 
 * Fonctionnalités selon Mission 1 :
 * - Gestion des paiements
 * - Suivi des gains et revenus
 * - Historique des paiements
 * - Factures et documents
 */

interface EarningsFilters {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  status?: "PENDING" | "PAID" | "CANCELLED";
  deliveryType?: "STANDARD" | "EXPRESS" | "SAME_DAY" | "SCHEDULED";
}

interface PaymentFilters {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  status?: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  method?: "BANK_TRANSFER" | "STRIPE" | "WALLET";
}

interface WithdrawalRequest {
  amount: number;
  method: "BANK_TRANSFER" | "STRIPE";
  bankDetails?: {
    accountNumber: string;
    routingNumber: string;
    accountHolder: string;
  };
}

export function useDelivererEarnings() {
  const { toast } = useToast();
  const utils = api.useUtils();

  // Queries principales
  const earningsSummary = api.delivererEarnings.getEarningsSummary.useQuery();

  const getEarningsHistory = (filters?: EarningsFilters) => {
    return api.delivererEarnings.getEarningsHistory.useQuery(filters);
  };

  const getPaymentHistory = (filters?: PaymentFilters) => {
    return api.delivererEarnings.getPaymentHistory.useQuery(filters);
  };

  const getDetailedEarnings = (deliveryId: string) => {
    return api.delivererEarnings.getDetailedEarnings.useQuery(
      { deliveryId },
      { enabled: !!deliveryId }
    );
  };

  // Mutations
  const requestWithdrawalMutation = api.delivererEarnings.requestWithdrawal.useMutation({
    onSuccess: (data) => {
      toast({
        title: "Demande de retrait envoyée",
        description: data.message,
      });
      // Invalider les caches
      utils.delivererEarnings.getEarningsSummary.invalidate();
      utils.delivererEarnings.getPaymentHistory.invalidate();
    },
    onError: (error) => {
      toast({
        title: "Erreur de retrait",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const generateInvoiceMutation = api.delivererEarnings.generateInvoice.useMutation({
    onSuccess: (data) => {
      toast({
        title: "Facture générée",
        description: "La facture a été générée avec succès",
      });
      // Télécharger automatiquement
      if (data.invoice?.url) {
        window.open(data.invoice.url, '_blank');
      }
    },
    onError: (error) => {
      toast({
        title: "Erreur de génération",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Functions
  const requestWithdrawal = async (data: WithdrawalRequest) => {
    return requestWithdrawalMutation.mutateAsync(data);
  };

  const generateInvoice = async (month: number, year: number) => {
    return generateInvoiceMutation.mutateAsync({ month, year });
  };

  // Computed values
  const isLoading = useMemo(() => {
    return (
      requestWithdrawalMutation.isPending ||
      generateInvoiceMutation.isPending
    );
  }, [
    requestWithdrawalMutation.isPending,
    generateInvoiceMutation.isPending,
  ]);

  // Statistiques calculées
  const stats = useMemo(() => {
    if (!earningsSummary.data) return null;

    const data = earningsSummary.data;
    return {
      ...data,
      // Calculs additionnels
      pendingPercentage: data.totalEarnings > 0 
        ? Math.round((data.pendingPayments / data.totalEarnings) * 100)
        : 0,
      averageEarningsPerDelivery: data.completedDeliveries > 0
        ? Math.round((data.totalEarnings / data.completedDeliveries) * 100) / 100
        : 0,
      growthTrend: data.growthRate > 0 ? 'up' : data.growthRate < 0 ? 'down' : 'stable'
    };
  }, [earningsSummary.data]);

  return {
    // Data
    earningsSummary: earningsSummary.data,
    stats,
    
    // Functions
    getEarningsHistory,
    getPaymentHistory,
    getDetailedEarnings,
    requestWithdrawal,
    generateInvoice,
    
    // States
    isLoading,
    isRequestingWithdrawal: requestWithdrawalMutation.isPending,
    isGeneratingInvoice: generateInvoiceMutation.isPending,
    
    // Loading states
    isSummaryLoading: earningsSummary.isLoading,
    
    // Errors
    summaryError: earningsSummary.error,
    withdrawalError: requestWithdrawalMutation.error,
    invoiceError: generateInvoiceMutation.error,
    
    // Success states
    withdrawalSuccess: requestWithdrawalMutation.isSuccess,
    invoiceSuccess: generateInvoiceMutation.isSuccess,
  };
}
