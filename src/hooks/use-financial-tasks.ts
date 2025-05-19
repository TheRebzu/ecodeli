import { useState, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { api } from '@/trpc/react';
import {
  CreateFinancialTaskInput,
  UpdateFinancialTaskInput,
  FinancialTaskFilters,
  FinancialTaskSortOptions,
} from '@/types/financial-task';

export function useFinancialTasks() {
  const { toast } = useToast();

  // État pour les filtres et la pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [filters, setFilters] = useState<FinancialTaskFilters>({});
  const [sort, setSort] = useState<FinancialTaskSortOptions>({
    field: 'createdAt',
    direction: 'desc',
  });

  // Requête pour récupérer les tâches financières
  const tasksQuery = api.financialTask.getUserTasks.useQuery(
    {
      page,
      limit,
      sortField: sort.field,
      sortDirection: sort.direction,
      filters,
    },
    {
      keepPreviousData: true,
      staleTime: 1000 * 60, // 1 minute
    }
  );

  // Requête pour récupérer les statistiques
  const statsQuery = api.financialTask.getTaskStats.useQuery(undefined, {
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Mutation pour créer une nouvelle tâche
  const createMutation = api.financialTask.createTask.useMutation({
    onSuccess: () => {
      toast({
        title: 'Tâche créée',
        description: 'La tâche financière a été créée avec succès.',
        variant: 'success',
      });
      // Actualiser les données
      tasksQuery.refetch();
      statsQuery.refetch();
    },
    onError: error => {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de créer la tâche financière',
        variant: 'destructive',
      });
    },
  });

  // Mutation pour mettre à jour une tâche
  const updateMutation = api.financialTask.updateTask.useMutation({
    onSuccess: () => {
      toast({
        title: 'Tâche mise à jour',
        description: 'La tâche financière a été mise à jour avec succès.',
        variant: 'success',
      });
      tasksQuery.refetch();
      statsQuery.refetch();
    },
    onError: error => {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de mettre à jour la tâche financière',
        variant: 'destructive',
      });
    },
  });

  // Mutation pour changer le statut d'une tâche
  const toggleStatusMutation = api.financialTask.toggleTaskStatus.useMutation({
    onSuccess: () => {
      tasksQuery.refetch();
      statsQuery.refetch();
    },
    onError: error => {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de changer le statut de la tâche',
        variant: 'destructive',
      });
    },
  });

  // Mutation pour supprimer une tâche
  const deleteMutation = api.financialTask.deleteTask.useMutation({
    onSuccess: () => {
      toast({
        title: 'Tâche supprimée',
        description: 'La tâche financière a été supprimée avec succès.',
        variant: 'success',
      });
      tasksQuery.refetch();
      statsQuery.refetch();
    },
    onError: error => {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de supprimer la tâche financière',
        variant: 'destructive',
      });
    },
  });

  // Fonction pour récupérer une tâche par ID
  const getTaskById = api.financialTask.getTaskById.useQuery;

  // Fonction pour créer une nouvelle tâche
  const createTask = useCallback(
    (data: CreateFinancialTaskInput) => {
      createMutation.mutate(data);
    },
    [createMutation]
  );

  // Fonction pour mettre à jour une tâche
  const updateTask = useCallback(
    (data: UpdateFinancialTaskInput) => {
      updateMutation.mutate(data);
    },
    [updateMutation]
  );

  // Fonction pour changer le statut d'une tâche
  const toggleTaskStatus = useCallback(
    (id: string, completed: boolean) => {
      toggleStatusMutation.mutate({ id, completed });
    },
    [toggleStatusMutation]
  );

  // Fonction pour supprimer une tâche
  const deleteTask = useCallback(
    (id: string) => {
      deleteMutation.mutate({ id });
    },
    [deleteMutation]
  );

  // Fonction pour changer de page
  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  // Fonction pour changer le nombre d'éléments par page
  const handleLimitChange = useCallback((newLimit: number) => {
    setLimit(newLimit);
    setPage(1); // Réinitialiser à la première page
  }, []);

  // Fonction pour changer les filtres
  const handleFilterChange = useCallback((newFilters: FinancialTaskFilters) => {
    setFilters(newFilters);
    setPage(1); // Réinitialiser à la première page
  }, []);

  // Fonction pour changer le tri
  const handleSortChange = useCallback((newSort: FinancialTaskSortOptions) => {
    setSort(newSort);
  }, []);

  return {
    // Données
    tasks: tasksQuery.data?.tasks || [],
    totalTasks: tasksQuery.data?.total || 0,
    currentPage: tasksQuery.data?.page || 1,
    totalPages: tasksQuery.data?.totalPages || 1,
    pageSize: tasksQuery.data?.limit || limit,
    filters,
    sort,
    stats: statsQuery.data,

    // États de chargement
    isLoadingTasks: tasksQuery.isLoading,
    isLoadingStats: statsQuery.isLoading,
    isCreatingTask: createMutation.isLoading,
    isUpdatingTask: updateMutation.isLoading,
    isTogglingStatus: toggleStatusMutation.isLoading,
    isDeletingTask: deleteMutation.isLoading,

    // Actions
    createTask,
    updateTask,
    toggleTaskStatus,
    deleteTask,
    handlePageChange,
    handleLimitChange,
    handleFilterChange,
    handleSortChange,
    refetchTasks: tasksQuery.refetch,
    refetchStats: statsQuery.refetch,

    // Utils
    getTaskById,
  };
}
