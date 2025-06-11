'use client';

import { api } from '@/trpc/react';
import { useToast } from '@/components/ui/use-toast';

export interface ServiceCategory {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  servicesCount: number;
  isActive: boolean;
  createdAt: Date;
}

export function useServiceCategories() {
  const { toast } = useToast();

  // Query pour récupérer les catégories
  const {
    data: categoriesData,
    isLoading,
    error,
    refetch,
  } = api.adminServices.categories.getAll.useQuery();

  // Mutations
  const createCategoryMutation = api.adminServices.categories.create.useMutation({
    onSuccess: () => {
      toast({
        title: 'Catégorie créée',
        description: 'La catégorie a été créée avec succès.',
      });
      refetch();
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateCategoryMutation = api.adminServices.categories.update.useMutation({
    onSuccess: () => {
      toast({
        title: 'Catégorie mise à jour',
        description: 'La catégorie a été mise à jour avec succès.',
      });
      refetch();
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const toggleStatusMutation = api.adminServices.categories.toggleStatus.useMutation({
    onSuccess: () => {
      toast({
        title: 'Statut mis à jour',
        description: 'Le statut de la catégorie a été mis à jour.',
      });
      refetch();
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteCategoryMutation = api.adminServices.categories.delete.useMutation({
    onSuccess: () => {
      toast({
        title: 'Catégorie supprimée',
        description: 'La catégorie a été supprimée avec succès.',
      });
      refetch();
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Fonctions utilitaires
  const createCategory = (data: {
    name: string;
    description: string;
    color: string;
    icon: string;
  }) => {
    createCategoryMutation.mutate(data);
  };

  const updateCategory = (id: string, data: Partial<ServiceCategory>) => {
    updateCategoryMutation.mutate({ id, ...data });
  };

  const toggleCategoryStatus = (id: string, isActive: boolean) => {
    toggleStatusMutation.mutate({ id, isActive });
  };

  const deleteCategory = (id: string) => {
    deleteCategoryMutation.mutate({ id });
  };

  return {
    // Données
    categories: categoriesData?.categories || [],
    total: categoriesData?.total || 0,
    
    // États
    isLoading,
    error,
    
    // Actions
    createCategory,
    updateCategory,
    toggleCategoryStatus,
    deleteCategory,
    refetch,
    
    // États des mutations
    isCreating: createCategoryMutation.isPending,
    isUpdating: updateCategoryMutation.isPending,
    isTogglingStatus: toggleStatusMutation.isPending,
    isDeleting: deleteCategoryMutation.isPending,
  };
} 