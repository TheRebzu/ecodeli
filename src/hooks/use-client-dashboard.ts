'use client';

import { useCallback, useState } from 'react';
import { api } from '@/trpc/react';
import { useToast } from '@/components/ui/use-toast';

export const useClientDashboard = () => {
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Requêtes tRPC pour récupérer les données du dashboard
  const {
    data: stats,
    isLoading: isLoadingStats,
    error: statsError,
    refetch: refetchStats,
  } = api.client.getDashboardStats.useQuery();

  const {
    data: recentActivity,
    isLoading: isLoadingActivity,
    error: activityError,
    refetch: refetchActivity,
  } = api.client.getRecentActivity.useQuery();

  const {
    data: financialMetrics,
    isLoading: isLoadingFinancial,
    error: financialError,
    refetch: refetchFinancial,
  } = api.client.getFinancialMetrics.useQuery();

  const {
    data: activeItems,
    isLoading: isLoadingActiveItems,
    error: activeItemsError,
    refetch: refetchActiveItems,
  } = api.client.getActiveItems.useQuery();

  // Fonction pour rafraîchir toutes les données
  const refreshDashboard = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        refetchStats(),
        refetchActivity(),
        refetchFinancial(),
        refetchActiveItems(),
      ]);
      toast({
        title: 'Succès',
        description: 'Tableau de bord actualisé',
      });
    } catch {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: "Impossible d'actualiser le tableau de bord",
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [refetchStats, refetchActivity, refetchFinancial, refetchActiveItems, toast]);

  // État global de chargement
  const isLoading =
    isLoadingStats ||
    isLoadingActivity ||
    isLoadingFinancial ||
    isLoadingActiveItems ||
    isRefreshing;

  // Agrégation des erreurs
  const hasError = !!statsError || !!activityError || !!financialError || !!activeItemsError;

  return {
    // Données
    stats,
    recentActivity,
    financialMetrics,
    activeItems,

    // États
    isLoading,
    isRefreshing,
    hasError,

    // Actions
    refreshDashboard,
  };
};
