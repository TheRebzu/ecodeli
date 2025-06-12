'use client';

import { useState } from 'react';
import { api } from '@/trpc/react';
import { useToast } from '@/components/ui/use-toast';

type ServiceStatus = 'ACTIVE' | 'INACTIVE' | 'DRAFT' | 'SUSPENDED';
type ServiceCategory = 'DELIVERY' | 'CLEANING' | 'MAINTENANCE' | 'REPAIR' | 'OTHER';

interface ServiceFilters {
  search?: string;
  status?: ServiceStatus;
  category?: ServiceCategory;
  page?: number;
  limit?: number;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  category: ServiceCategory;
  price: number;
  status: ServiceStatus;
  rating: number;
  createdAt: Date;
  updatedAt: Date;
}

export function useAdminServices() {
  const { toast } = useToast();
  const [filters, setFilters] = useState<ServiceFilters>({
    page: 1,
    limit: 10,
  });

  // Query pour récupérer les services
  const {
    data: servicesData,
    isLoading,
    error,
    refetch,
  } = api.adminServices.getAll.useQuery(filters, {
    keepPreviousData: true,
  });

  // Query pour récupérer les statistiques
  const { data: statsData } = api.adminServices.getStats.useQuery(undefined, {
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Mutations
  const createServiceMutation = api.adminServices.create.useMutation({
    onSuccess: () => {
      toast({
        title: 'Service créé',
        description: 'Le service a été créé avec succès.',
      });
      refetch();
    },
    onError: error => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateServiceMutation = api.adminServices.update.useMutation({
    onSuccess: () => {
      toast({
        title: 'Service mis à jour',
        description: 'Le service a été mis à jour avec succès.',
      });
      refetch();
    },
    onError: error => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateStatusMutation = api.adminServices.updateStatus.useMutation({
    onSuccess: () => {
      toast({
        title: 'Statut mis à jour',
        description: 'Le statut du service a été mis à jour.',
      });
      refetch();
    },
    onError: error => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteServiceMutation = api.adminServices.delete.useMutation({
    onSuccess: () => {
      toast({
        title: 'Service supprimé',
        description: 'Le service a été supprimé avec succès.',
      });
      refetch();
    },
    onError: error => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Fonctions utilitaires
  const updateFilters = (newFilters: Partial<ServiceFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const resetFilters = () => {
    setFilters({ page: 1, limit: 10 });
  };

  const createService = (data: {
    name: string;
    description: string;
    category: ServiceCategory;
    price: number;
  }) => {
    createServiceMutation.mutate(data);
  };

  const updateService = (id: string, data: Partial<Service>) => {
    updateServiceMutation.mutate({ id, ...data });
  };

  const updateServiceStatus = (id: string, status: ServiceStatus) => {
    updateStatusMutation.mutate({ id, status });
  };

  const deleteService = (id: string) => {
    deleteServiceMutation.mutate({ id });
  };

  return {
    // Données
    services: servicesData?.services || [],
    total: servicesData?.total || 0,
    stats: statsData,

    // États
    isLoading,
    error,

    // Filtres
    filters,
    updateFilters,
    resetFilters,

    // Actions
    createService,
    updateService,
    updateServiceStatus,
    deleteService,
    refetch,

    // États des mutations
    isCreating: createServiceMutation.isPending,
    isUpdating: updateServiceMutation.isPending,
    isUpdatingStatus: updateStatusMutation.isPending,
    isDeleting: deleteServiceMutation.isPending,
  };
}
