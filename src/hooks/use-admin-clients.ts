import { api } from "@/trpc/react";
import { useSearchParams } from "next/navigation";
import { useState, useMemo } from "react";

export interface ClientFilters {
  search?: string;
  status?: "ACTIVE" | "PENDING_VERIFICATION" | "SUSPENDED" | "INACTIVE";
  sortBy?: "name" | "email" | "createdAt" | "lastLoginAt";
  sortDirection?: "asc" | "desc";
}

export const useAdminClients = () => {
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ClientFilters>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  // Appel tRPC réel pour récupérer les clients
  const {
    data: clientsData,
    isLoading,
    refetch,
    error: queryError,
  } = api.client.getAllClients.useQuery({
    page: currentPage,
    limit: pageSize,
    search: filters.search,
    status: filters.status,
    sortBy: filters.sortBy || "createdAt",
    sortDirection: filters.sortDirection || "desc",
  });

  // Pour l'instant, on simule ces fonctions - à implémenter selon l'API disponible
  const updateClientStatus = async (clientId: string, status: string) => {
    // TODO: Implémenter avec la vraie API
    console.log("Update client status:", clientId, status);
  };

  const suspendClient = async (clientId: string, reason: string) => {
    // TODO: Implémenter avec la vraie API
    console.log("Suspend client:", clientId, reason);
  };

  // Debug: Afficher la structure des données reçues
  console.log("🔍 DEBUG - useAdminClients - Données reçues:", clientsData);
  console.log("Type de clientsData:", typeof clientsData);
  console.log("Clés de clientsData:", clientsData ? Object.keys(clientsData) : "undefined");
  
  // Les données sont déjà transformées et paginées côté serveur
  // Vérifier si les données sont encapsulées dans json par tRPC
  const dataSource = (clientsData as any)?.json || clientsData;
  const transformedClients = dataSource?.clients || [];

  // Calculer les statistiques depuis l'API dédiée
  const { data: statsData } = api.client.getClientStats.useQuery();

  const stats = useMemo(() => {
    if (!statsData) {
      return {
        totalClients: 0,
        activeClients: 0,
        suspendedClients: 0,
        newClientsThisMonth: 0,
      };
    }

    return {
      totalClients: statsData.totalClients,
      activeClients: statsData.activeClients,
      suspendedClients: statsData.suspendedClients,
      newClientsThisMonth: statsData.newClientsThisMonth,
    };
  }, [statsData]);

  // Pagination gérée côté serveur
  const pagination = useMemo(() => {
    const paginationData = dataSource?.pagination;
    if (!paginationData) {
      return {
        totalItems: 0,
        totalPages: 0,
        currentPage: 1,
        pageSize: 10,
        hasNext: false,
        hasPrevious: false,
      };
    }

    return {
      totalItems: paginationData.total,
      totalPages: paginationData.totalPages,
      currentPage: paginationData.page,
      pageSize: paginationData.limit,
      hasNext: paginationData.hasNext,
      hasPrevious: paginationData.hasPrev,
    };
  }, [clientsData?.pagination]);

  // Fonctions de gestion des filtres
  const updateFilters = (newFilters: Partial<ClientFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
    setCurrentPage(1); // Reset page when filters change
  };

  const clearFilters = () => {
    setFilters({});
    setCurrentPage(1);
  };

      return {
      clients: transformedClients,
      pagination,
      stats,
      filters,
      currentPage,
      pageSize,
      isLoading,
      isLoadingStats: isLoading,
      error: error || queryError?.message,
      updateFilters,
      clearFilters,
      setCurrentPage,
      updateClientStatus,
      suspendClient,
      refetch,
    };
};

export type AdminClient = NonNullable<
  ReturnType<typeof useAdminClients>["clients"][0]
>;
