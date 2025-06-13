"use client";

import { useState, useEffect } from "react";
// import { api } from "@/trpc/react";

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
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [summary, setSummary] = useState<Summary>({
    totalRevenue: 0,
    totalCommissions: 0,
    netAmount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = () => {
    setIsLoading(true);
    setError(null);

    // Simuler le chargement avec données mock
    setTimeout(() => {
      const mockInvoices: Invoice[] = [
        {
          id: "1",
          status: "PAID",
          amounts: { netAmount: 850 },
          scheduledDelivery: new Date(),
        },
        {
          id: "2",
          status: "ISSUED",
          amounts: { netAmount: 650 },
          scheduledDelivery: new Date(),
        },
      ];
      
      setInvoices(mockInvoices);
      setSummary({
        totalRevenue: 1500,
        totalCommissions: 150,
        netAmount: 1350,
        currentMonth: {
          earnings: 1500,
          hours: 45,
          interventions: 12,
          averageHourlyRate: 33.33,
          commission: 150,
          netEarnings: 1350,
        },
        previousMonth: {
          earnings: 1200,
          hours: 38,
          interventions: 10,
        },
        yearToDate: {
          earnings: 12500,
          hours: 380,
          interventions: 95,
          averageHourlyRate: 32.89,
        },
        goals: {
          monthlyTarget: 2000,
          yearlyTarget: 20000,
          monthlyProgress: 67.5,
          yearlyProgress: 62.5,
        },
        trends: {
          earningsGrowth: 25.0,
          hoursGrowth: 18.4,
          rateGrowth: 1.3,
        },
      });
      setIsLoading(false);
    }, 1000);
  };

  const downloadInvoice = async (id: string) => {
    // Mock download functionality
    console.log(`Downloading invoice ${id}`);
  };

  const viewInvoice = (id: string) => {
    // Mock view functionality
    console.log(`Viewing invoice ${id}`);
  };

  useEffect(() => {
    refetch();
  }, [options.year, options.month, options.status]);

  return {
    invoices,
    summary,
    isLoading,
    error,
    refetch,
    downloadInvoice,
    viewInvoice,
  };
}
