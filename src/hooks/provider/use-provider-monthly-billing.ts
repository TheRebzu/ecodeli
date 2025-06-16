"use client";

import { useState } from "react";
import { api } from "@/trpc/react";

// Types
interface MonthlyBilling {
  id: string;
  month: string;
  year: number;
  totalRevenue: number;
  totalCommissions: number;
  netAmount: number;
  status: "PENDING" | "PROCESSED" | "PAID";
  services: {
    id: string;
    name: string;
    count: number;
    revenue: number;
  }[];
  createdAt: Date;
  paidAt?: Date;
}

interface UseProviderMonthlyBillingOptions {
  year?: number;
  month?: number;
  status?: string;
}

interface Invoice {
  id: string;
  status: "DRAFT" | "ISSUED" | "PAID" | "OVERDUE";
  amounts: {
    netAmount: number;
  };
  scheduledDelivery: Date;
}

interface Summary {
  totalRevenue: number;
  totalCommissions: number;
  netAmount: number;
  currentMonth: {
    earnings: number;
    hours: number;
    interventions: number;
    averageHourlyRate: number;
    commission: number;
    netEarnings: number;
  };
  previousMonth: {
    earnings: number;
    hours: number;
    interventions: number;
  };
  yearToDate: {
    earnings: number;
    hours: number;
    interventions: number;
    averageHourlyRate: number;
  };
  goals: {
    monthlyTarget: number;
    yearlyTarget: number;
    monthlyProgress: number;
    yearlyProgress: number;
  };
  trends: {
    earningsGrowth: number;
    hoursGrowth: number;
    rateGrowth: number;
  };
}

interface UseProviderMonthlyBillingReturn {
  invoices: Invoice[];
  summary: Summary;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  downloadInvoice: (id: string) => Promise<void>;
  viewInvoice: (id: string) => void;
}

export function useProviderMonthlyBilling(
  options: UseProviderMonthlyBillingOptions = {},
): UseProviderMonthlyBillingReturn {
  const [error, setError] = useState<string | null>(null);

  // Appels tRPC réels pour récupérer les données
  const {
    data: invoicesData,
    isLoading: invoicesLoading,
    refetch: refetchInvoices,
  } = api.provider.billing.getProviderInvoices.useQuery(
    {
      year: options.year,
      month: options.month,
      status: options.status,
        },
        {
      onError: (err: any) => {
        setError(err.message || "Erreur lors du chargement des factures");
      },
        },
  );

  const {
    data: summaryData,
    isLoading: summaryLoading,
    refetch: refetchSummary,
  } = api.provider.billing.getProviderSummary.useQuery(
    {
      year: options.year,
      month: options.month,
        },
    {
      onError: (err: any) => {
        setError(err.message || "Erreur lors du chargement du résumé");
      },
        },
  );

  const downloadInvoiceMutation = api.provider.billing.downloadInvoice.useMutation({
    onError: (err: any) => {
      setError(err.message || "Erreur lors du téléchargement");
        },
      });

  const refetch = () => {
    setError(null);
    refetchInvoices();
    refetchSummary();
  };

  const downloadInvoice = async (id: string) => {
    try {
      const result = await downloadInvoiceMutation.mutateAsync({ id  });
      // Télécharger le fichier PDF
      if (result.downloadUrl) {
        window.open(result.downloadUrl, 'blank');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors du téléchargement");
    }
  };

  const viewInvoice = (id: string) => {
    // Navigation vers la page de détail de la facture
    window.location.href = `/provider/invoices/${id}`;
  };

  // Valeurs par défaut pour les données manquantes
  const defaultSummary: Summary = {
    totalRevenue: 0,
    totalCommissions: 0,
    netAmount: 0,
    currentMonth: {
      earnings: 0,
      hours: 0,
      interventions: 0,
      averageHourlyRate: 0,
      commission: 0,
      netEarnings: 0,
    },
    previousMonth: {
      earnings: 0,
      hours: 0,
      interventions: 0,
    },
    yearToDate: {
      earnings: 0,
      hours: 0,
      interventions: 0,
      averageHourlyRate: 0,
    },
    goals: {
      monthlyTarget: 0,
      yearlyTarget: 0,
      monthlyProgress: 0,
      yearlyProgress: 0,
    },
    trends: {
      earningsGrowth: 0,
      hoursGrowth: 0,
      rateGrowth: 0,
    },
  };

  return {
    invoices: invoicesData?.invoices || [],
    summary: summaryData?.summary || defaultSummary,
    isLoading: invoicesLoading || summaryLoading,
    error,
    refetch,
    downloadInvoice,
    viewInvoice,
  };
}
