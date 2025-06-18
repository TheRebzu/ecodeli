"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { useToast } from "@/components/ui/use-toast";

export interface ProviderFilters {
  search?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export function useAdminProviders(initialFilters: Partial<ProviderFilters> = {}) {
  const { toast } = useToast();
  
  // États des filtres
  const [filters, setFilters] = useState<ProviderFilters>({
    page: 1,
    limit: 50,
    sortBy: "createdAt",
    sortOrder: "desc",
    ...initialFilters,
  });

  // Requêtes tRPC
  const {
    data: providersData,
    isLoading: isLoadingProviders,
    error: providersError,
    refetch: refetchProviders,
  } = api.admin.providers.getAll.useQuery({
    search: filters.search || undefined,
    status: filters.status !== "all" ? filters.status : undefined,
    sortBy: filters.sortBy || "createdAt",
    sortOrder: filters.sortOrder || "desc",
    page: filters.page || 1,
    limit: filters.limit || 50,
  });

  const {
    data: stats,
    isLoading: isLoadingStats,
    error: statsError,
    refetch: refetchStats,
  } = api.admin.providers.getStats.useQuery();

  // Mutations
  const updateStatusMutation = api.admin.providers.updateStatus.useMutation({
    onSuccess: () => {
      toast({
        title: "Statut mis à jour",
        description: "Le statut du prestataire a été mis à jour avec succès.",
      });
      refetchProviders();
      refetchStats();
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Erreur lors de la mise à jour du statut : " + error.message,
        variant: "destructive",
      });
    },
  });

  const createProviderMutation = api.admin.providers.create.useMutation({
    onSuccess: () => {
      toast({
        title: "Prestataire créé",
        description: "Le prestataire a été créé avec succès.",
      });
      refetchProviders();
      refetchStats();
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Erreur lors de la création : " + error.message,
        variant: "destructive",
      });
    },
  });

  const updateProviderMutation = api.admin.providers.update.useMutation({
    onSuccess: () => {
      toast({
        title: "Prestataire mis à jour",
        description: "Le prestataire a été mis à jour avec succès.",
      });
      refetchProviders();
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Erreur lors de la mise à jour : " + error.message,
        variant: "destructive",
      });
    },
  });

  const deleteProviderMutation = api.admin.providers.delete.useMutation({
    onSuccess: () => {
      toast({
        title: "Prestataire supprimé",
        description: "Le prestataire a été supprimé avec succès.",
      });
      refetchProviders();
      refetchStats();
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Erreur lors de la suppression : " + error.message,
        variant: "destructive",
      });
    },
  });

  const exportMutation = api.admin.providers.exportData.useMutation({
    onSuccess: (data) => {
      // Télécharger le fichier CSV
      const blob = new Blob([data.csv], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `prestataires_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Export réussi",
        description: "Les données ont été exportées avec succès.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur d'export",
        description: "Erreur lors de l'export : " + error.message,
        variant: "destructive",
      });
    },
  });

  // Fonctions utilitaires
  const updateFilters = (newFilters: Partial<ProviderFilters>) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters,
      // Reset page when changing other filters
      page: newFilters.page !== undefined ? newFilters.page : 1,
    }));
  };

  const resetFilters = () => {
    setFilters({
      page: 1,
      limit: 50,
      sortBy: "createdAt",
      sortOrder: "desc",
    });
  };

  const handlePageChange = (page: number) => {
    updateFilters({ page });
  };

  const handleStatusChange = (providerId: string, newStatus: string) => {
    updateStatusMutation.mutate({ id: providerId, status: newStatus });
  };

  const handleExport = (exportFilters?: Partial<ProviderFilters>) => {
    exportMutation.mutate({
      format: "csv",
      filters: {
        search: exportFilters?.search || filters.search || undefined,
        status: exportFilters?.status !== "all" ? exportFilters?.status : undefined,
      },
    });
  };

  const handleCreateProvider = async (providerData: any) => {
    return createProviderMutation.mutateAsync(providerData);
  };

  const handleUpdateProvider = async (id: string, providerData: any) => {
    return updateProviderMutation.mutateAsync({ id, ...providerData });
  };

  const handleDeleteProvider = async (id: string) => {
    return deleteProviderMutation.mutateAsync({ id });
  };

  return {
    // Data
    providers: providersData?.providers || [],
    total: providersData?.total || 0,
    totalPages: providersData?.totalPages || 1,
    stats,
    filters,

    // Loading states
    isLoadingProviders,
    isLoadingStats,
    isCreating: createProviderMutation.isPending,
    isUpdating: updateProviderMutation.isPending,
    isUpdatingStatus: updateStatusMutation.isPending,
    isDeleting: deleteProviderMutation.isPending,
    isExporting: exportMutation.isPending,

    // Error states
    error: providersError || statsError,

    // Actions
    updateFilters,
    resetFilters,
    handlePageChange,
    handleStatusChange,
    handleExport,
    handleCreateProvider,
    handleUpdateProvider,
    handleDeleteProvider,

    // Refetch functions
    refetchProviders,
    refetchStats,
  };
} 