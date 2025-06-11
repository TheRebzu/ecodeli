import { api } from '@/trpc/react';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';

export interface ClientFilters {
  search?: string;
  status?: 'ACTIVE' | 'PENDING_VERIFICATION' | 'SUSPENDED' | 'INACTIVE';
  sortBy?: 'name' | 'email' | 'createdAt' | 'lastLoginAt';
  sortDirection?: 'asc' | 'desc';
}

export function useAdminClients() {
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<ClientFilters>({
    search: searchParams?.get('search') || '',
    status: (searchParams?.get('status') as any) || undefined,
    sortBy: (searchParams?.get('sortBy') as any) || 'createdAt',
    sortDirection: (searchParams?.get('sortDirection') as any) || 'desc',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  // Récupérer la liste des clients
  const {
    data: clientsData,
    isLoading,
    error,
    refetch,
  } = api.client.getAllClients.useQuery({
    page: currentPage,
    limit: pageSize,
    ...filters,
  });



  // Récupérer les statistiques des clients
  const {
    data: stats,
    isLoading: isLoadingStats,
  } = api.client.getClientStats.useQuery();

  const updateFilters = (newFilters: Partial<ClientFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setCurrentPage(1); // Reset page when filters change
  };

  const clearFilters = () => {
    setFilters({
      sortBy: 'createdAt',
      sortDirection: 'desc',
    });
    setCurrentPage(1);
  };

  return {
    // Data - Accès aux données via .json à cause de superjson
    clients: clientsData?.json?.clients || [],
    pagination: clientsData?.json?.pagination || null,
    stats: stats?.json || stats || null,
    
    // State
    filters,
    currentPage,
    pageSize,
    
    // Loading states
    isLoading,
    isLoadingStats,
    error,
    
    // Actions
    updateFilters,
    clearFilters,
    setCurrentPage,
    refetch,
  };
}

export type AdminClient = NonNullable<ReturnType<typeof useAdminClients>['clients'][0]>; 