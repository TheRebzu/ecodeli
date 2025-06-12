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

  // 🔧 FIX: Utiliser la même API que /admin/users qui fonctionne
  const {
    data: usersData,
    isLoading,
    error,
    refetch,
  } = api.adminUser.getUsers.useQuery({
    page: 1,
    limit: 100, // Récupérer plus d'utilisateurs pour filtrer côté client
  });

  // DEBUG: Afficher les données reçues
  console.log('🔍 DEBUG CLIENTS - usersData:', usersData);
  console.log('🔍 DEBUG CLIENTS - usersData?.json?.users:', usersData?.json?.users);

  // Filtrer les clients depuis les données reçues
  const allUsers = usersData?.json?.users || [];
  const clientUsers = allUsers.filter((user: any) => user.role === 'CLIENT');

  // Appliquer les filtres côté frontend
  let filteredClients = clientUsers;

  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    filteredClients = filteredClients.filter(
      (client: any) =>
        client.name?.toLowerCase().includes(searchLower) ||
        client.email?.toLowerCase().includes(searchLower)
    );
  }

  if (filters.status) {
    filteredClients = filteredClients.filter((client: any) => client.status === filters.status);
  }

  // Trier les clients
  filteredClients.sort((a: any, b: any) => {
    const field = filters.sortBy || 'createdAt';
    const direction = filters.sortDirection === 'asc' ? 1 : -1;

    if (field === 'createdAt') {
      return direction * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }
    if (field === 'name') {
      return direction * (a.name || '').localeCompare(b.name || '');
    }
    if (field === 'email') {
      return direction * (a.email || '').localeCompare(b.email || '');
    }
    return 0;
  });

  // Pagination côté frontend
  const totalClients = filteredClients.length;
  const totalPages = Math.ceil(totalClients / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedClients = filteredClients.slice(startIndex, endIndex);

  // Transformer les clients pour match le format attendu
  const clients = paginatedClients.map((client: any) => ({
    id: client.id, // ✅ Utiliser le vrai ID
    name: client.name,
    email: client.email,
    phoneNumber: client.phoneNumber,
    status: client.status,
    isVerified: client.isVerified,
    createdAt: client.createdAt,
    lastLoginAt: client.lastLoginAt,
    client: {
      id: `client-${client.id}`, // ID du profil client simulé
      address: null,
      city: 'Paris', // Données simulées
      postalCode: '75000',
      country: 'France',
    },
    stats: {
      totalOrders: 0,
      totalSpent: 0,
      lastOrderDate: null,
      documentsCount: 0,
    },
  }));

  // Récupérer les statistiques des clients (utiliser la même API)
  const clientStats = {
    totalClients: clientUsers.length,
    activeClients: clientUsers.filter((c: any) => c.status === 'ACTIVE').length,
    suspendedClients: clientUsers.filter((c: any) => c.status === 'SUSPENDED').length,
    newClientsThisMonth: clientUsers.filter((c: any) => {
      const createdAt = new Date(c.createdAt);
      const now = new Date();
      return (
        createdAt.getMonth() === now.getMonth() && createdAt.getFullYear() === now.getFullYear()
      );
    }).length,
  };

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
    // Data - Utiliser les bonnes données avec les vrais IDs
    clients,
    pagination: {
      page: currentPage,
      limit: pageSize,
      total: totalClients,
      totalPages,
      hasNext: currentPage < totalPages,
      hasPrev: currentPage > 1,
    },
    stats: clientStats,

    // State
    filters,
    currentPage,
    pageSize,

    // Loading states
    isLoading,
    isLoadingStats: false, // Pas de loading séparé pour les stats
    error,

    // Actions
    updateFilters,
    clearFilters,
    setCurrentPage,
    refetch,
  };
}

export type AdminClient = NonNullable<ReturnType<typeof useAdminClients>['clients'][0]>;
