'use client';

import { api } from '@/trpc/react';

export function useProviderDashboard() {
  const {
    data: stats,
    isLoading: isLoadingStats,
    refetch: refetchStats,
  } = api.provider.getDashboardStats.useQuery();

  const { data: upcomingAppointments, isLoading: isLoadingAppointments } =
    api.provider.getUpcomingAppointments.useQuery({ limit: 5 });

  const { data: recentInterventions, isLoading: isLoadingInterventions } =
    api.provider.getRecentInterventions.useQuery({ limit: 10 });

  const { data: revenueChart, isLoading: isLoadingChart } = api.provider.getRevenueChart.useQuery({
    period: 'month',
  });

  const { data: recentRatings, isLoading: isLoadingRatings } =
    api.provider.getRecentRatings.useQuery({ limit: 5 });

  const isLoading = isLoadingStats || isLoadingAppointments || isLoadingInterventions;

  return {
    stats,
    upcomingAppointments,
    recentInterventions,
    revenueChart,
    recentRatings,
    isLoading,
    isLoadingStats,
    isLoadingAppointments,
    isLoadingInterventions,
    isLoadingChart,
    isLoadingRatings,
    refetchStats,
  };
}
