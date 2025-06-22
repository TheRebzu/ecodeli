import { api } from "@/trpc/react";
import { useToast } from "@/hooks/use-toast";
import { useMemo } from "react";

/**
 * Hook personnalisé pour la gestion du planning des livreurs
 * 
 * Fonctionnalités selon Mission 1 :
 * - Gestion du planning et des déplacements
 * - Indication des trajets à l'avance
 * - Notifications pour annonces correspondantes
 */

interface CreatePlanningData {
  startDate: string;
  endDate: string;
  startLocation: {
    address: string;
    latitude: number;
    longitude: number;
    city: string;
  };
  endLocation: {
    address: string;
    latitude: number;
    longitude: number;
    city: string;
  };
  vehicleType: "CAR" | "BIKE" | "SCOOTER" | "TRUCK" | "VAN";
  availableCapacity: number;
  notes?: string;
}

interface PlanningFilters {
  page?: number;
  limit?: number;
  status?: "ACTIVE" | "COMPLETED" | "CANCELLED";
  startDate?: string;
  endDate?: string;
  vehicleType?: "CAR" | "BIKE" | "SCOOTER" | "TRUCK" | "VAN";
}

interface UpdatePlanningData {
  id: string;
  startDate?: string;
  endDate?: string;
  startLocation?: {
    address: string;
    latitude: number;
    longitude: number;
    city: string;
  };
  endLocation?: {
    address: string;
    latitude: number;
    longitude: number;
    city: string;
  };
  vehicleType?: "CAR" | "BIKE" | "SCOOTER" | "TRUCK" | "VAN";
  availableCapacity?: number;
  notes?: string;
  status?: "ACTIVE" | "COMPLETED" | "CANCELLED";
}

export function useDelivererPlanning() {
  const { toast } = useToast();
  const utils = api.useUtils();

  // Queries
  const planningStats = api.delivererPlanning.getPlanningStats.useQuery();

  const getPlannings = (filters?: PlanningFilters) => {
    return api.delivererPlanning.getMyPlannings.useQuery(filters);
  };

  const getPlanningById = (id: string) => {
    return api.delivererPlanning.getPlanningById.useQuery(
      { id },
      { enabled: !!id }
    );
  };

  // Mutations
  const createPlanningMutation = api.delivererPlanning.createPlanning.useMutation({
    onSuccess: (data) => {
      toast({
        title: "Succès",
        description: data.message,
      });
      // Invalider les caches pour refaire les requêtes
      utils.delivererPlanning.getMyPlannings.invalidate();
      utils.delivererPlanning.getPlanningStats.invalidate();
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updatePlanningMutation = api.delivererPlanning.updatePlanning.useMutation({
    onSuccess: (data) => {
      toast({
        title: "Succès",
        description: data.message,
      });
      utils.delivererPlanning.getMyPlannings.invalidate();
      utils.delivererPlanning.getPlanningById.invalidate();
      utils.delivererPlanning.getPlanningStats.invalidate();
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deletePlanningMutation = api.delivererPlanning.deletePlanning.useMutation({
    onSuccess: (data) => {
      toast({
        title: "Succès",
        description: data.message,
      });
      utils.delivererPlanning.getMyPlannings.invalidate();
      utils.delivererPlanning.getPlanningStats.invalidate();
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Functions
  const createPlanning = async (data: CreatePlanningData) => {
    return createPlanningMutation.mutateAsync(data);
  };

  const updatePlanning = async (data: UpdatePlanningData) => {
    return updatePlanningMutation.mutateAsync(data);
  };

  const deletePlanning = async (id: string) => {
    return deletePlanningMutation.mutateAsync({ id });
  };

  // Computed values
  const isLoading = useMemo(() => {
    return (
      createPlanningMutation.isPending ||
      updatePlanningMutation.isPending ||
      deletePlanningMutation.isPending
    );
  }, [
    createPlanningMutation.isPending,
    updatePlanningMutation.isPending,
    deletePlanningMutation.isPending,
  ]);

  return {
    // Data
    planningStats: planningStats.data,
    
    // Functions
    getPlannings,
    getPlanningById,
    createPlanning,
    updatePlanning,
    deletePlanning,
    
    // States
    isLoading,
    isCreating: createPlanningMutation.isPending,
    isUpdating: updatePlanningMutation.isPending,
    isDeleting: deletePlanningMutation.isPending,
    
    // Errors
    createError: createPlanningMutation.error,
    updateError: updatePlanningMutation.error,
    deleteError: deletePlanningMutation.error,
    statsError: planningStats.error,
    
    // Loading states
    isStatsLoading: planningStats.isLoading,
  };
}
