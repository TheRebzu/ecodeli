import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { trpc } from '@/trpc/client';
import { useDeliveryTrackingStore, useStatusHistory } from '@/store/use-delivery-tracking-store';
import { DeliveryStatus } from '@prisma/client';
import { socket, emitDeliveryTrackingEvent } from '@/socket';

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
  const queryClient = useQueryClient();
  const [lastStatusUpdate, setLastStatusUpdate] = useState<{
    status: DeliveryStatus;
    timestamp: Date;
    success: boolean;
  } | null>(null);

  // Récupérer les statuts disponibles pour la transition suivante
  const { data: availableStatuses, isLoading: isLoadingStatuses } = useQuery({
    queryKey: ['available-statuses', deliveryId],
    queryFn: async () => {
      if (!deliveryId) return [];
      return await trpc.delivery.getAvailableStatuses.query({ id: deliveryId });
    },
    enabled: !!deliveryId,
    staleTime: 1000 * 60, // 1 minute
  });

  // Mutation pour mettre à jour le statut
  const { mutate: updateStatus, isPending: isUpdating } = useMutation({
    mutationFn: async ({
      status,
      options = {},
    }: {
      status: DeliveryStatus;
      options?: StatusUpdateOptions;
    }) => {
      if (!deliveryId) throw new Error('ID de livraison non spécifié');

      return await trpc.delivery.updateStatus.mutate({
        id: deliveryId,
        status,
        notes: options.notes,
        notifyClient: options.notifyClient,
        notifyMerchant: options.notifyMerchant,
        location:
          options.latitude && options.longitude
            ? { latitude: options.latitude, longitude: options.longitude }
            : undefined,
      });
    },
    onSuccess: (data, variables) => {
      // Mettre à jour le dernier statut
      setLastStatusUpdate({
        status: variables.status,
        timestamp: new Date(),
        success: true,
      });

      // Message de succès
      toast.success(`Statut mis à jour: ${variables.status}`);

      // Invalider les requêtes liées
      queryClient.invalidateQueries({ queryKey: ['delivery', deliveryId] });
      queryClient.invalidateQueries({ queryKey: ['delivery-history', deliveryId] });
      queryClient.invalidateQueries({ queryKey: ['available-statuses', deliveryId] });
    },
    onError: error => {
      toast.error(`Erreur lors de la mise à jour du statut: ${error.message}`);
    },
  });

  // Vérifier si un statut est disponible
  const isStatusAvailable = useCallback(
    (status: DeliveryStatus): boolean => {
      if (!availableStatuses) return false;
      return availableStatuses.includes(status);
    },
    [availableStatuses]
  );

  return {
    // Actions
    updateStatus,

    // Données
    availableStatuses: availableStatuses || [],
    lastStatusUpdate,

    // Helper functions
    isStatusAvailable,

    // États
    isLoading: isLoadingStatuses,
    isUpdating,
  };
}

/**
 * Hook pour accéder à l'historique des statuts d'une livraison
 * @param deliveryId - ID de la livraison
 */
export function useDeliveryStatusHistory(deliveryId?: string) {
  // Historique des statuts depuis le store (temps réel)
  const realtimeStatusHistory = useStatusHistory();

  // Requête pour obtenir l'historique complet des statuts
  const {
    data: statusHistory,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['status-history', deliveryId],
    queryFn: async () => {
      if (!deliveryId) return [];
      return await trpc.delivery.getStatusHistory.query({ id: deliveryId });
    },
    enabled: !!deliveryId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Fusionner les statuts en temps réel avec ceux de l'API
  const mergedStatusHistory = useCallback(() => {
    if (!statusHistory) return realtimeStatusHistory;

    // Si pas de données en temps réel, retourner l'historique de l'API
    if (realtimeStatusHistory.length === 0) return statusHistory;

    // Créer un Map des statuts en temps réel par timestamp pour déduplication
    const realtimeMap = new Map();
    realtimeStatusHistory.forEach(status => {
      realtimeMap.set(status.timestamp.getTime(), status);
    });

    // Fusionner les deux listes, en évitant les doublons
    const merged = [...statusHistory];

    // Ajouter les entrées en temps réel qui ne sont pas dans l'historique de l'API
    realtimeStatusHistory.forEach(status => {
      const exists = statusHistory.some(
        s => new Date(s.timestamp).getTime() === status.timestamp.getTime()
      );

      if (!exists) {
        merged.push({
          ...status,
          timestamp: status.timestamp,
        });
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

      const startIndex = sortedHistory.findIndex(s => s.status === startStatus);
      const endIndex = sortedHistory.findIndex(s => s.status === endStatus);

      if (startIndex === -1 || endIndex === -1) return null;

      // Calculer la durée en millisecondes
      const startTime = new Date(sortedHistory[startIndex].timestamp).getTime();
      const endTime = new Date(sortedHistory[endIndex].timestamp).getTime();

      return endTime - startTime;
    },
    [mergedStatusHistory]
  );

  return {
    // Données
    statusHistory: mergedStatusHistory(),

    // Fonctions utilitaires
    getLastStatus,
    getDurationBetweenStatuses,

    // États
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook pour gérer l'estimation du temps d'arrivée (ETA)
 * @param deliveryId - ID de la livraison
 */
export function useDeliveryETA(deliveryId?: string) {
  const queryClient = useQueryClient();
  const [lastEtaUpdate, setLastEtaUpdate] = useState<Date | null>(null);

  // Récupérer l'ETA actuel depuis le store Zustand
  const { lastEta, metrics } = useDeliveryTrackingStore(state => ({
    lastEta: state.lastEta,
    metrics: state.metrics,
  }));

  // Requête pour obtenir le dernier ETA calculé par le serveur
  const {
    data: serverEta,
    isLoading,
    error,
    refetch: refetchEta,
  } = useQuery({
    queryKey: ['delivery-eta', deliveryId],
    queryFn: async () => {
      if (!deliveryId) return null;
      return await trpc.delivery.getETA.query({ id: deliveryId });
    },
    enabled: !!deliveryId,
    staleTime: 1000 * 30, // 30 secondes
  });

  // Calculer l'ETA le plus récent (entre le serveur et le temps réel)
  const mostRecentEta = useCallback(() => {
    if (!lastEta && !serverEta) return null;

    if (!lastEta) return serverEta;
    if (!serverEta)
      return {
        estimatedArrival: lastEta.eta,
        remainingDistance: lastEta.distance,
        timestamp: lastEta.timestamp,
      };

    // Comparer les timestamps
    const lastEtaTime = new Date(lastEta.timestamp).getTime();
    const serverEtaTime = new Date(serverEta.timestamp).getTime();

    return lastEtaTime > serverEtaTime
      ? {
          estimatedArrival: lastEta.eta,
          remainingDistance: lastEta.distance,
          timestamp: lastEta.timestamp,
        }
      : serverEta;
  }, [lastEta, serverEta]);

  // Mutation pour mettre à jour l'ETA
  const { mutate: updateEta, isPending: isUpdating } = useMutation({
    mutationFn: async ({
      estimatedArrival,
      remainingDistance,
    }: {
      estimatedArrival: Date;
      remainingDistance: number;
    }) => {
      if (!deliveryId) throw new Error('ID de livraison non spécifié');

      return await trpc.delivery.updateETA.mutate({
        id: deliveryId,
        estimatedArrival,
        remainingDistance,
      });
    },
    onSuccess: () => {
      // Mettre à jour le dernier ETA
      setLastEtaUpdate(new Date());

      // Invalider les requêtes liées
      queryClient.invalidateQueries({ queryKey: ['delivery-eta', deliveryId] });
      queryClient.invalidateQueries({ queryKey: ['delivery', deliveryId] });

      // Message de succès
      toast.success('ETA mis à jour avec succès');

      // Émettre l'événement en temps réel
      if (socket && socket.connected && deliveryId) {
        const etaInfo = mostRecentEta();
        if (etaInfo) {
          emitDeliveryTrackingEvent({
            type: 'ETA_UPDATE',
            deliveryId,
            eta: etaInfo.estimatedArrival,
            distance: etaInfo.remainingDistance,
          });
        }
      }
    },
    onError: error => {
      toast.error(`Erreur lors de la mise à jour de l'ETA: ${error.message}`);
    },
  });

  // Formater l'ETA en texte lisible
  const formatETA = useCallback(
    (includeDistance = true): string => {
      const eta = mostRecentEta();
      if (!eta) return 'ETA indisponible';

      const estimatedArrival = new Date(eta.estimatedArrival);
      const now = new Date();

      // Si l'ETA est dépassé
      if (estimatedArrival < now) {
        return 'Arrivée imminente';
      }

      // Calculer la différence en minutes
      const diffMs = estimatedArrival.getTime() - now.getTime();
      const diffMinutes = Math.round(diffMs / 60000);

      // Formater le texte
      let etaText = '';

      if (diffMinutes < 1) {
        etaText = "Moins d'une minute";
      } else if (diffMinutes === 1) {
        etaText = '1 minute';
      } else if (diffMinutes < 60) {
        etaText = `${diffMinutes} minutes`;
      } else {
        const hours = Math.floor(diffMinutes / 60);
        const minutes = diffMinutes % 60;

        if (minutes === 0) {
          etaText = hours === 1 ? '1 heure' : `${hours} heures`;
        } else {
          etaText = `${hours}h${minutes.toString().padStart(2, '0')}`;
        }
      }

      // Ajouter la distance si demandé
      if (includeDistance && eta.remainingDistance) {
        const distanceKm = (eta.remainingDistance / 1000).toFixed(1);
        etaText += ` (${distanceKm} km)`;
      }

      return etaText;
    },
    [mostRecentEta]
  );

  // Obtenir l'heure d'arrivée au format heure locale
  const getArrivalTime = useCallback((): string => {
    const eta = mostRecentEta();
    if (!eta || !eta.estimatedArrival) return '--:--';

    const estimatedArrival = new Date(eta.estimatedArrival);
    return estimatedArrival.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, [mostRecentEta]);

  return {
    // Données
    eta: mostRecentEta(),
    etaFromRealtime: lastEta
      ? {
          estimatedArrival: lastEta.eta,
          remainingDistance: lastEta.distance,
          timestamp: lastEta.timestamp,
        }
      : null,
    etaFromServer: serverEta,
    lastEtaUpdate,

    // Métriques en temps réel
    remainingTime: metrics.remainingTime, // en secondes
    remainingDistance: metrics.remainingDistance, // en mètres
    estimatedTimeOfArrival: metrics.estimatedTimeOfArrival,
    completionPercentage: metrics.completionPercentage,

    // Actions
    updateEta,
    refetchEta,

    // Fonctions utilitaires
    formatETA,
    getArrivalTime,

    // États
    isLoading,
    isUpdating,
    error,
  };
}
