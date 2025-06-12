'use client';

import { useState } from 'react';
import { api } from '@/trpc/react';
import { useToast } from '@/components/ui/use-toast';

interface PerformanceFilters {
  contractId?: string;
  merchantId?: string;
  period?: 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  year?: number;
  month?: number;
  quarter?: number;
  dateFrom?: Date;
  dateTo?: Date;
  sortBy?:
    | 'totalRevenue'
    | 'totalCommissions'
    | 'totalOrders'
    | 'averageOrderValue'
    | 'customerSatisfaction';
  sortOrder?: 'asc' | 'desc';
  page: number;
  limit: number;
}

export function useContractPerformance(initialFilters: Partial<PerformanceFilters> = {}) {
  const { toast } = useToast();
  const [filters, setFilters] = useState<PerformanceFilters>({
    period: 'MONTHLY',
    year: new Date().getFullYear(),
    sortBy: 'totalRevenue',
    sortOrder: 'desc',
    page: 1,
    limit: 10,
    ...initialFilters,
  });

  // Queries
  const {
    data: performanceData,
    isLoading: isLoadingPerformance,
    error: performanceError,
    refetch: refetchPerformance,
  } = api.admin.contracts.getPerformance.useQuery(filters);

  const { data: performanceStats, isLoading: isLoadingStats } =
    api.admin.contracts.getPerformanceStats.useQuery({
      period: filters.period,
      year: filters.year,
      month: filters.month,
      quarter: filters.quarter,
    });

  const { data: performanceTrends, isLoading: isLoadingTrends } =
    api.admin.contracts.getPerformanceTrends.useQuery({
      contractId: filters.contractId,
      period: filters.period,
      year: filters.year,
    });

  const { data: topPerformers, isLoading: isLoadingTopPerformers } =
    api.admin.contracts.getTopPerformers.useQuery({
      period: filters.period,
      year: filters.year,
      month: filters.month,
      quarter: filters.quarter,
      limit: 10,
    });

  // Mutations
  const updatePerformanceMutation = api.admin.contracts.updatePerformance.useMutation({
    onSuccess: () => {
      toast({
        title: 'Performance mise à jour',
        description: 'Les données de performance ont été mises à jour avec succès.',
      });
      refetchPerformance();
    },
    onError: error => {
      toast({
        title: 'Erreur',
        description: `Impossible de mettre à jour les performances: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const generatePerformanceReportMutation =
    api.admin.contracts.generatePerformanceReport.useMutation({
      onSuccess: data => {
        toast({
          title: 'Rapport généré',
          description: 'Le rapport de performance a été généré avec succès.',
        });
        // Télécharger le rapport ou afficher l'URL
        if (data.downloadUrl) {
          window.open(data.downloadUrl, '_blank');
        }
      },
      onError: error => {
        toast({
          title: 'Erreur',
          description: `Impossible de générer le rapport: ${error.message}`,
          variant: 'destructive',
        });
      },
    });

  const recalculatePerformanceMutation = api.admin.contracts.recalculatePerformance.useMutation({
    onSuccess: () => {
      toast({
        title: 'Recalcul terminé',
        description: 'Les performances ont été recalculées avec succès.',
      });
      refetchPerformance();
    },
    onError: error => {
      toast({
        title: 'Erreur',
        description: `Impossible de recalculer les performances: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Actions
  const updatePerformance = async (contractId: string, data: any) => {
    await updatePerformanceMutation.mutateAsync({
      contractId,
      ...data,
    });
  };

  const generateReport = async (reportType: 'PDF' | 'EXCEL' | 'CSV', filters?: any) => {
    await generatePerformanceReportMutation.mutateAsync({
      format: reportType,
      filters: { ...filters, ...filters },
    });
  };

  const recalculatePerformance = async (contractId?: string) => {
    await recalculatePerformanceMutation.mutateAsync({
      contractId,
      period: filters.period,
      year: filters.year,
      month: filters.month,
      quarter: filters.quarter,
    });
  };

  // Filtres et pagination
  const updateFilters = (newFilters: Partial<PerformanceFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const resetFilters = () => {
    setFilters({
      period: 'MONTHLY',
      year: new Date().getFullYear(),
      sortBy: 'totalRevenue',
      sortOrder: 'desc',
      page: 1,
      limit: 10,
    });
  };

  const goToPage = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
  };

  const changePageSize = (limit: number) => {
    setFilters(prev => ({ ...prev, limit, page: 1 }));
  };

  const changePeriod = (period: 'MONTHLY' | 'QUARTERLY' | 'YEARLY') => {
    setFilters(prev => ({
      ...prev,
      period,
      page: 1,
      // Reset month/quarter based on period
      month: period === 'MONTHLY' ? new Date().getMonth() + 1 : undefined,
      quarter: period === 'QUARTERLY' ? Math.ceil((new Date().getMonth() + 1) / 3) : undefined,
    }));
  };

  const changeYear = (year: number) => {
    setFilters(prev => ({ ...prev, year, page: 1 }));
  };

  const changeSort = (sortBy: string, sortOrder: 'asc' | 'desc' = 'desc') => {
    setFilters(prev => ({ ...prev, sortBy, sortOrder, page: 1 }));
  };

  // Utilitaires
  const isLoading =
    isLoadingPerformance ||
    updatePerformanceMutation.isPending ||
    generatePerformanceReportMutation.isPending ||
    recalculatePerformanceMutation.isPending;

  const performance = performanceData?.performance || [];
  const totalPerformance = performanceData?.total || 0;
  const totalPages = Math.ceil(totalPerformance / filters.limit);

  // Calculs de métriques
  const calculateGrowthRate = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const calculateAverageMetrics = () => {
    if (performance.length === 0) return null;

    const totals = performance.reduce(
      (acc, item) => ({
        revenue: acc.revenue + (item.totalRevenue || 0),
        commissions: acc.commissions + (item.totalCommissions || 0),
        orders: acc.orders + (item.totalOrders || 0),
        satisfaction: acc.satisfaction + (item.customerSatisfaction || 0),
        successRate: acc.successRate + (item.deliverySuccessRate || 0),
      }),
      { revenue: 0, commissions: 0, orders: 0, satisfaction: 0, successRate: 0 }
    );

    const count = performance.length;
    const ordersCount = performance.filter(p => p.totalOrders > 0).length;

    return {
      averageRevenue: totals.revenue / count,
      averageCommissions: totals.commissions / count,
      averageOrders: totals.orders / count,
      averageOrderValue: ordersCount > 0 ? totals.revenue / totals.orders : 0,
      averageSatisfaction: totals.satisfaction / count,
      averageSuccessRate: totals.successRate / count,
      totalRevenue: totals.revenue,
      totalCommissions: totals.commissions,
      totalOrders: totals.orders,
    };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(value / 100);
  };

  return {
    // Data
    performance,
    performanceStats,
    performanceTrends,
    topPerformers,
    totalPerformance,
    totalPages,
    currentPage: filters.page,
    pageSize: filters.limit,
    filters,

    // Loading states
    isLoading,
    isLoadingPerformance,
    isLoadingStats,
    isLoadingTrends,
    isLoadingTopPerformers,

    // Error states
    error: performanceError,

    // Actions
    updatePerformance,
    generateReport,
    recalculatePerformance,

    // Filters and pagination
    updateFilters,
    resetFilters,
    goToPage,
    changePageSize,
    changePeriod,
    changeYear,
    changeSort,
    refetch: refetchPerformance,

    // Utilities
    calculateGrowthRate,
    calculateAverageMetrics,
    formatCurrency,
    formatPercentage,
  };
}
