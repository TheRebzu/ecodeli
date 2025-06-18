import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { api } from "@/trpc/react";
import {
  useDeliveryTrackingStore,
  useStatusHistory} from "@/store/use-delivery-tracking-store";
import { DeliveryStatus } from "@prisma/client";
import { socket, emitDeliveryTrackingEvent } from "@/socket";

/**
 * Type d'options pour la mise à jour du statut
 */
type StatusUpdateOptions = {
  notes?: string;
  notifyClient?: boolean;
  notifyMerchant?: boolean;
  latitude?: number;
  longitude?: number;
};

/**
 * Hook pour mettre à jour le statut d'une livraison (principalement pour les livreurs)
 * @param deliveryId - ID de la livraison
 */
export function useDeliveryStatusUpdate(deliveryId?: string) {
  const [availableStatuses, setAvailableStatuses] = useState<DeliveryStatus[]>(
    [],
  );
  const [isLoadingStatuses, setIsLoadingStatuses] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastStatusUpdate, setLastStatusUpdate] = useState<{
    status: DeliveryStatus;
    timestamp: Date;
    success: boolean;
  } | null>(null);

  // Fonction pour charger les statuts disponibles
  const fetchAvailableStatuses = useCallback(async () => {
    if (!deliveryId) return;

    setIsLoadingStatuses(true);
    try {
      const statuses = await api.delivery.getAvailableStatuses.query({ id  });
      setAvailableStatuses(statuses);
    } catch (error) {
      console.error(
        "Erreur lors du chargement des statuts disponibles:",
        error,
      );
    } finally {
      setIsLoadingStatuses(false);
    }
  }, [deliveryId]);

  // Fonction pour mettre à jour le statut
  const updateStatus = useCallback(
    async ({
      status,
      options = {}}: {
      status: DeliveryStatus;
      options?: StatusUpdateOptions;
    }) => {
      if (!deliveryId) throw new Error("ID de livraison non spécifié");

      setIsUpdating(true);
      try {
        await api.delivery.updateStatus.mutate({
          id: deliveryId,
          status,
          notes: options.notes,
          notifyClient: options.notifyClient,
          notifyMerchant: options.notifyMerchant,
          location:
            options.latitude && options.longitude
              ? { latitude: options.latitude, longitude: options.longitude }
              : undefined});

        // Mettre à jour le dernier statut
        setLastStatusUpdate({ status,
          timestamp: new Date(),
          success: true });

        // Message de succès
        toast.success(`Statut mis à jour: ${status}`);

        // Recharger les données
        await fetchAvailableStatuses();
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Erreur inconnue";
        toast.error(`Erreur lors de la mise à jour du statut: ${errorMessage}`);
        throw error;
      } finally {
        setIsUpdating(false);
      }
    },
    [deliveryId, fetchAvailableStatuses],
  );

  // Charger les statuts disponibles au montage
  useEffect(() => {
    fetchAvailableStatuses();
  }, [fetchAvailableStatuses]);

  // Vérifier si un statut est disponible
  const isStatusAvailable = useCallback(
    (status: DeliveryStatus): boolean => {
      return availableStatuses.includes(status);
    },
    [availableStatuses],
  );

  return {
    // Actions
    updateStatus,

    // Données
    availableStatuses,
    lastStatusUpdate,

    // Helper functions
    isStatusAvailable,

    // États
    isLoading: isLoadingStatuses,
    isUpdating};
}

/**
 * Hook pour accéder à l'historique des statuts d'une livraison
 * @param deliveryId - ID de la livraison
 */
export function useDeliveryStatusHistory(deliveryId?: string) {
  const [statusHistory, setStatusHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Historique des statuts depuis le store (temps réel)
  const realtimeStatusHistory = useStatusHistory();

  // Fonction pour charger l'historique des statuts
  const fetchStatusHistory = useCallback(async () => {
    if (!deliveryId) return;

    setIsLoading(true);
    setError(null);
    try {
      const history = await api.delivery.getStatusHistory.query({ id  });
      setStatusHistory(history);
    } catch (err) {
      const errorObj =
        err instanceof Error ? err : new Error("Erreur inconnue");
      setError(errorObj);
      console.error(
        "Erreur lors du chargement de l'historique des statuts:",
        errorObj,
      );
    } finally {
      setIsLoading(false);
    }
  }, [deliveryId]);

  // Charger l'historique au montage
  useEffect(() => {
    fetchStatusHistory();
  }, [fetchStatusHistory]);

  // Fusionner les statuts en temps réel avec ceux de l'API
  const mergedStatusHistory = useCallback(() => {
    if (!statusHistory) return realtimeStatusHistory;

    // Si pas de données en temps réel, retourner l'historique de l'API
    if (realtimeStatusHistory.length === 0) return statusHistory;

    // Créer un Map des statuts en temps réel par timestamp pour déduplication
    const realtimeMap = new Map();
    realtimeStatusHistory.forEach((status) => {
      realtimeMap.set(status.timestamp.getTime(), status);
    });

    // Fusionner les deux listes, en évitant les doublons
    const merged = [...statusHistory];

    // Ajouter les entrées en temps réel qui ne sont pas dans l'historique de l'API
    realtimeStatusHistory.forEach((status) => {
      const exists = statusHistory.some(
        (s) => new Date(s.timestamp).getTime() === status.timestamp.getTime(),
      );

      if (!exists) {
        merged.push({ ...status,
          timestamp: status.timestamp });
      }
    });

    // Trier par date décroissante
    return merged.sort((a, b) => {
      const dateA = new Date(a.timestamp).getTime();
      const dateB = new Date(b.timestamp).getTime();
      return dateB - dateA;
    });
  }, [statusHistory, realtimeStatusHistory]);

  // Obtenir le dernier statut
  const getLastStatus = useCallback((): DeliveryStatus | null => {
    const history = mergedStatusHistory();
    if (!history || history.length === 0) return null;

    return history[0].status;
  }, [mergedStatusHistory]);

  // Obtenir la durée totale entre deux statuts
  const getDurationBetweenStatuses = useCallback(
    (startStatus: DeliveryStatus, endStatus: DeliveryStatus): number | null => {
      const history = mergedStatusHistory();
      if (!history || history.length < 2) return null;

      // Trouver les index des statuts demandés
      const sortedHistory = [...history].sort((a, b) => {
        const dateA = new Date(a.timestamp).getTime();
        const dateB = new Date(b.timestamp).getTime();
        return dateA - dateB; // Ordre croissant pour le calcul
      });

      const startIndex = sortedHistory.findIndex(
        (s) => s.status === startStatus,
      );
      const endIndex = sortedHistory.findIndex((s) => s.status === endStatus);

      if (startIndex === -1 || endIndex === -1) return null;

      const startTime = new Date(sortedHistory[startIndex].timestamp).getTime();
      const endTime = new Date(sortedHistory[endIndex].timestamp).getTime();

      return endTime - startTime; // Durée en millisecondes
    },
    [mergedStatusHistory],
  );

  return {
    // Données
    statusHistory: mergedStatusHistory(),
    lastStatus: getLastStatus(),

    // Actions
    refetch: fetchStatusHistory,
    getDurationBetweenStatuses,

    // États
    isLoading,
    error};
}

/**
 * Hook pour calculer et suivre l'ETA d'une livraison
 * @param deliveryId - ID de la livraison
 */
export function useDeliveryETA(deliveryId?: string) {
  const [eta, setEta] = useState<Date | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const calculateETA = useCallback(async () => {
    if (!deliveryId) return;

    setIsCalculating(true);
    try {
      const etaData = await api.delivery.calculateETA.query({ id  });
      setEta(
        etaData.estimatedDeliveryTime
          ? new Date(etaData.estimatedDeliveryTime)
          : null,
      );
    } catch (error) {
      console.error("Erreur lors du calcul de l'ETA:", error);
    } finally {
      setIsCalculating(false);
    }
  }, [deliveryId]);

  useEffect(() => {
    calculateETA();
  }, [calculateETA]);

  return {
    eta,
    isCalculating,
    recalculate: calculateETA};
}

// Hook pour obtenir les détails d'une livraison
export function useDeliveryDetails(deliveryId: string) {
  const { data: delivery, isLoading } = api.delivery.getDetails.useQuery({ deliveryId });

  return {
    delivery,
    isLoading,
    // Propriétés calculées
    isCompleted: delivery?.status === "DELIVERED",
    isCancelled: delivery?.status === "CANCELLED",
    isInProgress: ["PENDING_PICKUP", "PICKED_UP", "IN_TRANSIT"].includes(delivery?.status || ""),
    hasIssues: delivery?.status === "DELAYED" || delivery?.status === "ISSUE",
    // Helpers
    canCancel: delivery?.status && ["PENDING", "PENDING_PICKUP"].includes(delivery.status),
    canUpdate: delivery?.status && !["DELIVERED", "CANCELLED"].includes(delivery.status),
  };
}
