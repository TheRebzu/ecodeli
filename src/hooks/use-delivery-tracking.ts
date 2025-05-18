'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { api } from '@/trpc/react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useSocket } from '@/hooks/use-socket';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { trpc } from '@/trpc/client';
import { DeliveryPosition, DeliveryTracker } from '@/socket/delivery-tracking-client';
import { DeliveryStatus as PrismaDeliveryStatus } from '@prisma/client';
import {
  useDeliveryTrackingStore,
  useDeliveryInfo,
  useCurrentPosition,
} from '@/store/use-delivery-tracking-store';

// Types pour le suivi des livraisons
export type TrackingLocation = {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: Date;
};

export type TrackingEvent = {
  id: string;
  deliveryId: string;
  type: 'PICKUP' | 'DROPOFF' | 'PROBLEM' | 'STATUS_CHANGE' | 'LOCATION_UPDATE';
  data: any;
  location?: TrackingLocation;
  createdAt: Date;
};

// Définir notre propre type DeliveryStatus pour éviter les conflits
export type DeliveryStatus =
  | 'PENDING'
  | 'ASSIGNED'
  | 'EN_ROUTE_TO_PICKUP'
  | 'AT_PICKUP'
  | 'PICKED_UP'
  | 'EN_ROUTE_TO_DROPOFF'
  | 'AT_DROPOFF'
  | 'DELIVERED'
  | 'PROBLEM'
  | 'CANCELLED';

export type TrackingInfo = {
  deliveryId: string;
  announcementId: string;
  status: DeliveryStatus;
  currentLocation?: TrackingLocation;
  estimatedDeliveryTime?: Date;
  events: TrackingEvent[];
  distance?: {
    total: number;
    remaining: number;
  };
  deliverer?: {
    id: string;
    name: string;
    phone?: string;
    image?: string;
    rating?: number;
  };
};

// Options pour le hook de tracking
type UseDeliveryTrackingOptions = {
  enableRealTimeUpdates?: boolean;
  updateInterval?: number;
  announcementId?: string;
  deliveryId?: string;
};

interface UseDeliveryTrackingProps {
  deliveryId: string;
  autoTrack?: boolean;
}

interface DeliveryTrackingState {
  isTracking: boolean;
  position: DeliveryPosition | null;
  status: PrismaDeliveryStatus | null;
  eta: Date | null;
  distanceRemaining: number | null;
  error: Error | null;
}

/**
 * Hook pour suivre une livraison en temps réel avec la nouvelle infrastructure Socket.IO
 * Utilise Socket.IO de manière sécurisée côté client
 */
export function useDeliveryTrackingRealtime({ deliveryId, autoTrack = true }: UseDeliveryTrackingProps) {
  const { socket } = useSocket();
  const [tracker, setTracker] = useState<DeliveryTracker | null>(null);
  const [state, setState] = useState<DeliveryTrackingState>({
    isTracking: false,
    position: null,
    status: null,
    eta: null,
    distanceRemaining: null,
    error: null,
  });

  // Créer le tracker quand le socket est disponible
  useEffect(() => {
    if (!socket) return;
    const deliveryTracker = new DeliveryTracker(socket);
    setTracker(deliveryTracker);

    return () => {
      // Arrêter le suivi lors du démontage
      if (state.isTracking) {
        deliveryTracker.untrackDelivery(deliveryId).catch(console.error);
      }
    };
  }, [socket, deliveryId, state.isTracking]);

  // Commencer à suivre automatiquement si demandé
  useEffect(() => {
    if (!tracker || !autoTrack) return;

    const startTracking = async () => {
      try {
        await tracker.trackDelivery(deliveryId);
        setState(prev => ({ ...prev, isTracking: true, error: null }));
      } catch (error) {
        console.error('Erreur de suivi:', error);
        setState(prev => ({ 
          ...prev, 
          isTracking: false, 
          error: error instanceof Error ? error : new Error('Erreur de suivi de livraison') 
        }));
      }
    };

    startTracking();

    return () => {
      tracker.untrackDelivery(deliveryId).catch(console.error);
    };
  }, [tracker, deliveryId, autoTrack]);

  // S'abonner aux événements une fois le suivi activé
  useEffect(() => {
    if (!tracker || !state.isTracking) return;

    // S'abonner aux mises à jour de position
    const unsubPosition = tracker.onLocationUpdate(deliveryId, (position) => {
      setState(prev => ({ 
        ...prev, 
        position: {
          ...position,
          // Convertir le timestamp de nombre à Date si nécessaire
          timestamp: typeof position.timestamp === 'number' 
            ? position.timestamp 
            : (position.timestamp instanceof Date 
                ? position.timestamp.getTime() 
                : Date.now())
        }
      }));
    });

    // S'abonner aux mises à jour de statut
    const unsubStatus = tracker.onStatusUpdate(deliveryId, ({ status }) => {
      setState(prev => ({ ...prev, status }));
    });

    // S'abonner aux mises à jour d'ETA
    const unsubETA = tracker.onETAUpdate(deliveryId, ({ estimatedTime, distanceRemaining }) => {
      setState(prev => ({ 
        ...prev, 
        eta: estimatedTime,
        distanceRemaining: distanceRemaining ?? prev.distanceRemaining,
      }));
    });

    return () => {
      unsubPosition();
      unsubStatus();
      unsubETA();
    };
  }, [tracker, deliveryId, state.isTracking]);

  // Fonction pour commencer le suivi manuellement
  const startTracking = async () => {
    if (!tracker) {
      setState(prev => ({ 
        ...prev, 
        error: new Error('Socket non disponible') 
      }));
      return;
    }

    try {
      await tracker.trackDelivery(deliveryId);
      setState(prev => ({ ...prev, isTracking: true, error: null }));
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error : new Error('Erreur de suivi de livraison') 
      }));
    }
  };

  // Fonction pour arrêter le suivi manuellement
  const stopTracking = async () => {
    if (!tracker) return;

    try {
      await tracker.untrackDelivery(deliveryId);
      setState(prev => ({ ...prev, isTracking: false }));
    } catch (error) {
      console.error('Erreur lors de l\'arrêt du suivi:', error);
    }
  };

  // Fonctions pour les livreurs
  const updatePosition = async (position: DeliveryPosition) => {
    if (!tracker) return;
    
    try {
      // Assurer que le timestamp est un nombre comme attendu par le tracker
      const positionWithNumberTimestamp: DeliveryPosition = {
        ...position,
        timestamp: position.timestamp instanceof Date 
          ? position.timestamp.getTime() 
          : (typeof position.timestamp === 'number' 
              ? position.timestamp 
              : Date.now())
      };
      
      await tracker.updateDeliveryPosition(deliveryId, positionWithNumberTimestamp);
    } catch (error) {
      console.error('Erreur lors de la mise à jour de position:', error);
      throw error;
    }
  };

  const updateStatus = async (status: PrismaDeliveryStatus, notes?: string) => {
    if (!tracker) return;
    
    try {
      await tracker.updateDeliveryStatus(deliveryId, status, notes);
    } catch (error) {
      console.error('Erreur lors de la mise à jour de statut:', error);
      throw error;
    }
  };

  return {
    ...state,
    startTracking,
    stopTracking,
    updatePosition,
    updateStatus,
  };
}

/**
 * Hook pour suivre une livraison en temps réel
 */
export const useDeliveryTracking = (options: UseDeliveryTrackingOptions = {}) => {
  const {
    enableRealTimeUpdates = true,
    updateInterval = 10000, // 10 secondes par défaut
    announcementId,
    deliveryId,
  } = options;

  const [trackingInfo, setTrackingInfo] = useState<TrackingInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<TrackingEvent[]>([]);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();

  // Connexion au socket pour les mises à jour en temps réel
  const { socket, isConnected } = useSocket('tracking');

  /**
   * Initialise le suivi d'une livraison
   */
  const initTracking = useCallback(
    async (targetDeliveryId?: string, targetAnnouncementId?: string) => {
      try {
        setIsLoading(true);
        setError(null);

        const deliveryToTrack = targetDeliveryId || deliveryId;
        const announcementToTrack = targetAnnouncementId || announcementId;

        if (!deliveryToTrack && !announcementToTrack) {
          throw new Error("Veuillez fournir un ID de livraison ou d'annonce");
        }

        // Démarrer le tracking avec l'API tRPC
        let trackingData;

        if (deliveryToTrack) {
          trackingData = await api.deliveryTracking.getDeliveryById.query({
            deliveryId: deliveryToTrack,
          });
        } else if (announcementToTrack) {
          // Pour l'instant, récupérer toutes les livraisons et filtrer
          const deliveries = await api.deliveryTracking.getDeliveries.query({
            announcementId: announcementToTrack,
          });

          if (deliveries && deliveries.length > 0) {
            trackingData = await api.deliveryTracking.getDeliveryById.query({
              deliveryId: deliveries[0].id,
            });
          } else {
            throw new Error('Aucune livraison associée à cette annonce');
          }
        }

        if (!trackingData) {
          throw new Error('Impossible de suivre cette livraison');
        }

        setTrackingInfo(trackingData);

        // Récupérer également l'historique des coordonnées
        const coordinatesHistory = await api.deliveryTracking.getDeliveryCoordinatesHistory.query({
          deliveryId: trackingData.deliveryId,
        });

        // Transformer l'historique en événements
        const coordinateEvents = coordinatesHistory.map(coord => ({
          id: coord.id,
          deliveryId: trackingData.deliveryId,
          type: 'LOCATION_UPDATE' as const,
          data: {},
          location: {
            latitude: coord.latitude,
            longitude: coord.longitude,
            timestamp: coord.createdAt,
          },
          createdAt: coord.createdAt,
        }));

        setEvents(coordinateEvents);
        setIsTracking(true);

        // Souscrire aux mises à jour via socket si activé
        if (enableRealTimeUpdates && socket && isConnected) {
          socket.emit('joinDeliveryTracking', {
            deliveryId: trackingData.deliveryId,
          });

          // Écouter les événements de tracking
          socket.on('deliveryCoordinatesUpdate', (data: any) => {
            if (data.deliveryId === trackingData.deliveryId) {
              handleCoordinatesUpdate(data);
            }
          });

          socket.on('deliveryStatusUpdate', (data: any) => {
            if (data.deliveryId === trackingData.deliveryId) {
              handleStatusUpdate(data);
            }
          });
        }

        return trackingData;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Erreur lors de l'initialisation du suivi";
        setError(message);
        toast.error(message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [deliveryId, announcementId, enableRealTimeUpdates, socket, isConnected]
  );

  /**
   * Gère les mises à jour de coordonnées reçues via socket
   */
  const handleCoordinatesUpdate = useCallback(
    (data: { latitude: number; longitude: number; deliveryId: string }) => {
      const newEvent: TrackingEvent = {
        id: `loc-${Date.now()}`,
        deliveryId: data.deliveryId,
        type: 'LOCATION_UPDATE',
        data: {},
        location: {
          latitude: data.latitude,
          longitude: data.longitude,
          timestamp: new Date(),
        },
        createdAt: new Date(),
      };

      setEvents(prev => [newEvent, ...prev]);

      setTrackingInfo(prev => {
        if (!prev) return prev;

        return {
          ...prev,
          currentLocation: {
            latitude: data.latitude,
            longitude: data.longitude,
            timestamp: new Date(),
          },
        };
      });
    },
    []
  );

  /**
   * Gère les mises à jour de statut reçues via socket
   */
  const handleStatusUpdate = useCallback((data: { status: DeliveryStatus; deliveryId: string }) => {
    const newEvent: TrackingEvent = {
      id: `status-${Date.now()}`,
      deliveryId: data.deliveryId,
      type: 'STATUS_CHANGE',
      data: {
        status: data.status,
      },
      createdAt: new Date(),
    };

    setEvents(prev => [newEvent, ...prev]);

    setTrackingInfo(prev => {
      if (!prev) return prev;

      return {
        ...prev,
        status: data.status,
      };
    });

    // Rafraîchir les données complètes
    refreshTracking();
  }, []);

  /**
   * Rafraîchit les données de tracking
   */
  const refreshTracking = useCallback(async () => {
    if (!trackingInfo) return null;

    try {
      const updatedData = await api.deliveryTracking.getDeliveryById.query({
        deliveryId: trackingInfo.deliveryId,
      });

      setTrackingInfo(updatedData);

      const coordinatesHistory = await api.deliveryTracking.getDeliveryCoordinatesHistory.query({
        deliveryId: trackingInfo.deliveryId,
      });

      // Transformer l'historique en événements
      const coordinateEvents = coordinatesHistory.map(coord => ({
        id: coord.id,
        deliveryId: trackingInfo.deliveryId,
        type: 'LOCATION_UPDATE' as const,
        data: {},
        location: {
          latitude: coord.latitude,
          longitude: coord.longitude,
          timestamp: coord.createdAt,
        },
        createdAt: coord.createdAt,
      }));

      setEvents(coordinateEvents);

      return updatedData;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la mise à jour du suivi';
      setError(message);
      return null;
    }
  }, [trackingInfo]);

  /**
   * Signale un problème dans la livraison
   */
  const reportProblem = useCallback(
    async (problem: {
      type: string;
      description: string;
      location?: { latitude: number; longitude: number };
    }) => {
      if (!trackingInfo) return false;

      try {
        setIsLoading(true);

        // Mettre à jour le statut de la livraison vers PROBLEM
        const result = await api.deliveryTracking.updateStatus.mutate({
          deliveryId: trackingInfo.deliveryId,
          status: 'PROBLEM',
          notes: problem.description,
          location: problem.location,
        });

        toast.success('Problème signalé avec succès');

        // Rafraîchir les données de tracking
        await refreshTracking();

        return true;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Erreur lors du signalement du problème';
        setError(message);
        toast.error(message);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [trackingInfo, refreshTracking]
  );

  /**
   * Confirme la réception d'une livraison (pour le client)
   */
  const confirmDelivery = useCallback(
    async (signature?: string, rating?: number, comment?: string) => {
      if (!trackingInfo) return false;

      try {
        setIsLoading(true);

        // Confirmer la livraison
        const result = await api.deliveryTracking.confirmDelivery.mutate({
          deliveryId: trackingInfo.deliveryId,
          signature,
          code: '', // Le code peut être vide s'il y a une signature
        });

        // Ajouter une évaluation si disponible
        if (rating) {
          await api.deliveryTracking.rateDelivery.mutate({
            deliveryId: trackingInfo.deliveryId,
            rating,
            comment: comment || '',
          });
        }

        toast.success('Livraison confirmée avec succès');

        // Mettre à jour le statut en local
        setTrackingInfo(prev =>
          prev
            ? {
                ...prev,
                status: 'DELIVERED' as DeliveryStatus,
              }
            : null
        );

        return true;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Erreur lors de la confirmation de la livraison';
        setError(message);
        toast.error(message);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [trackingInfo]
  );

  /**
   * Livreur: Met à jour sa position actuelle
   */
  const updateDelivererLocation = useCallback(
    async (location: { latitude: number; longitude: number; accuracy?: number }) => {
      if (!trackingInfo) return false;

      try {
        const result = await api.deliveryTracking.updateCoordinates.mutate({
          deliveryId: trackingInfo.deliveryId,
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
        });

        return true;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Erreur lors de la mise à jour de la position';
        console.error(message);
        return false;
      }
    },
    [trackingInfo]
  );

  /**
   * Livreur: Mettre à jour le statut de la livraison
   */
  const updateDeliveryStatus = useCallback(
    async (
      status: DeliveryStatus,
      additionalData?: {
        notes?: string;
        location?: { latitude: number; longitude: number };
      }
    ) => {
      if (!trackingInfo) return false;

      try {
        setIsLoading(true);

        const result = await api.deliveryTracking.updateStatus.mutate({
          deliveryId: trackingInfo.deliveryId,
          status,
          notes: additionalData?.notes,
          location: additionalData?.location,
        });

        // Mettre à jour le statut en local
        setTrackingInfo(prev =>
          prev
            ? {
                ...prev,
                status,
              }
            : null
        );

        const statusMessages: Record<DeliveryStatus, string> = {
          PENDING: 'Livraison en attente',
          ASSIGNED: 'Livraison assignée',
          EN_ROUTE_TO_PICKUP: 'En route vers le point de ramassage',
          AT_PICKUP: 'Arrivé au point de ramassage',
          PICKED_UP: 'Colis pris en charge',
          EN_ROUTE_TO_DROPOFF: 'En route vers la destination',
          AT_DROPOFF: 'Arrivé à destination',
          DELIVERED: 'Livraison effectuée',
          PROBLEM: 'Problème signalé',
          CANCELLED: 'Livraison annulée',
        };

        toast.success(`Statut mis à jour: ${statusMessages[status]}`);

        return true;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Erreur lors de la mise à jour du statut';
        setError(message);
        toast.error(message);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [trackingInfo]
  );

  /**
   * Générer un code de confirmation pour le client
   */
  const generateConfirmationCode = useCallback(async () => {
    if (!trackingInfo) return null;

    try {
      setIsLoading(true);

      const result = await api.deliveryTracking.generateConfirmationCode.mutate({
        deliveryId: trackingInfo.deliveryId,
      });

      return result.code;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la génération du code';
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [trackingInfo]);

  /**
   * Arrête le suivi de la livraison
   */
  const stopTracking = useCallback(() => {
    setIsTracking(false);

    // Nettoyer l'intervalle s'il existe
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Se désabonner des événements socket
    if (socket && trackingInfo) {
      socket.emit('leaveDeliveryTracking', {
        deliveryId: trackingInfo.deliveryId,
      });
      socket.off('deliveryCoordinatesUpdate');
      socket.off('deliveryStatusUpdate');
    }
  }, [socket, trackingInfo]);

  // Mettre en place un intervalle pour rafraîchir périodiquement les données
  useEffect(() => {
    if (isTracking && !enableRealTimeUpdates) {
      intervalRef.current = setInterval(() => {
        refreshTracking();
      }, updateInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isTracking, refreshTracking, enableRealTimeUpdates, updateInterval]);

  // Initialiser le tracking au montage si un ID est fourni
  useEffect(() => {
    if ((deliveryId || announcementId) && !isTracking && !isLoading) {
      initTracking();
    }

    return () => {
      // Nettoyage lors du démontage
      stopTracking();
    };
  }, [deliveryId, announcementId, isTracking, isLoading, initTracking, stopTracking]);

  return {
    // États
    trackingInfo,
    events,
    isLoading,
    isTracking,
    error,

    // Actions client
    initTracking,
    refreshTracking,
    reportProblem,
    confirmDelivery,

    // Actions livreur
    updateDelivererLocation,
    updateDeliveryStatus,
    generateConfirmationCode,

    // Gestion
    stopTracking,
    resetError: () => setError(null),
  };
};

export default useDeliveryTracking;

/**
 * Hook pour suivre une livraison en temps réel
 * @param deliveryId - ID de la livraison à suivre
 */
export function useDeliveryLiveTracking(deliveryId?: string) {
  const queryClient = useQueryClient();
  const [isReady, setIsReady] = useState(false);

  // État du store global
  const {
    startTracking,
    stopTracking,
    refreshDeliveryState,
    currentDeliveryId,
    connectionState,
    connectionError,
  } = useDeliveryTrackingStore(state => ({
    startTracking: state.startTracking,
    stopTracking: state.stopTracking,
    refreshDeliveryState: state.refreshDeliveryState,
    currentDeliveryId: state.currentDeliveryId,
    connectionState: state.connectionState,
    connectionError: state.connectionError,
  }));

  // Informations sur la livraison depuis le store
  const deliveryInfo = useDeliveryInfo();
  const { position } = useCurrentPosition();

  // Requête pour obtenir les détails de la livraison
  const {
    data: delivery,
    isLoading: isLoadingDelivery,
    error: deliveryError,
    refetch: refetchDelivery,
  } = useQuery({
    queryKey: ['delivery', deliveryId],
    queryFn: async () => {
      if (!deliveryId) return null;
      const result = await trpc.delivery.getById.query({ id: deliveryId });
      return result;
    },
    enabled: !!deliveryId && !isReady,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Démarrer le suivi en temps réel
  const startRealTimeTracking = useCallback(async () => {
    if (!deliveryId) return false;

    try {
      // Si déjà en train de suivre cette livraison
      if (currentDeliveryId === deliveryId && connectionState === 'connected') {
        setIsReady(true);
        return true;
      }

      // Démarrer le suivi via le store
      const success = await startTracking(deliveryId);

      if (success) {
        setIsReady(true);
        return true;
      } else {
        toast.error('Impossible de suivre cette livraison');
        return false;
      }
    } catch (error) {
      console.error('Erreur lors du suivi en temps réel:', error);
      toast.error('Une erreur est survenue lors du suivi');
      return false;
    }
  }, [deliveryId, currentDeliveryId, connectionState, startTracking]);

  // Arrêter le suivi en temps réel
  const stopRealTimeTracking = useCallback(() => {
    stopTracking();
    setIsReady(false);
  }, [stopTracking]);

  // Rafraîchir les données
  const refresh = useCallback(async () => {
    try {
      // Rafraîchir les données via l'API
      await refetchDelivery();

      // Rafraîchir les données en temps réel
      if (isReady && deliveryId) {
        await refreshDeliveryState();
      }

      return true;
    } catch (error) {
      console.error('Erreur lors du rafraîchissement des données:', error);
      return false;
    }
  }, [deliveryId, isReady, refetchDelivery, refreshDeliveryState]);

  // Démarrer le suivi automatiquement si un ID est fourni
  useEffect(() => {
    if (deliveryId && !isReady) {
      startRealTimeTracking();
    }

    // Nettoyage lors du démontage du composant
    return () => {
      if (isReady) {
        stopRealTimeTracking();
      }
    };
  }, [deliveryId, isReady, startRealTimeTracking, stopRealTimeTracking]);

  return {
    // Données de la livraison
    delivery, // Données complètes de l'API
    deliveryInfo, // Données en temps réel du store
    currentPosition: position, // Position actuelle

    // États
    isLoading: isLoadingDelivery || connectionState === 'connecting',
    isReady,
    connectionState,
    error: deliveryError || connectionError,

    // Actions
    startTracking: startRealTimeTracking,
    stopTracking: stopRealTimeTracking,
    refresh,
  };
}

/**
 * Hook pour accéder à l'historique complet d'une livraison
 * @param deliveryId - ID de la livraison
 */
export function useDeliveryHistory(deliveryId?: string) {
  // Requête pour obtenir l'historique complet de la livraison
  const {
    data: history,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['delivery-history', deliveryId],
    queryFn: async () => {
      if (!deliveryId) return null;
      return await trpc.delivery.getHistory.query({ id: deliveryId });
    },
    enabled: !!deliveryId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Filtrer l'historique par type d'événement
  const getEventsByType = useCallback(
    (type: string) => {
      if (!history?.events) return [];

      return history.events.filter(event => event.type === type);
    },
    [history]
  );

  // Obtenir les positions pour afficher sur une carte
  const getPositionsForMap = useCallback(() => {
    if (!history?.positions) return [];

    return history.positions.map(pos => ({
      lat: pos.latitude,
      lng: pos.longitude,
      timestamp: pos.timestamp,
    }));
  }, [history]);

  // Obtenir le temps total de livraison
  const getTotalDeliveryTime = useCallback(() => {
    if (!history?.startTime || !history?.endTime) return null;

    const start = new Date(history.startTime).getTime();
    const end = new Date(history.endTime).getTime();

    // Retourner la durée en millisecondes
    return end - start;
  }, [history]);

  return {
    history,

    // Données filtrées
    statusEvents: history?.statusHistory || [],
    positionHistory: history?.positions || [],
    checkpoints: history?.checkpoints || [],
    issues: history?.issues || [],

    // Fonctions utilitaires
    getEventsByType,
    getPositionsForMap,
    getTotalDeliveryTime,

    // États
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook pour trouver les livraisons à proximité (pour livreurs/admin)
 * @param options - Options de recherche
 */
export function useNearbyDeliveries(
  options: {
    latitude?: number;
    longitude?: number;
    radius?: number; // en mètres
    maxResults?: number;
    includeAssigned?: boolean;
    onlyUnassigned?: boolean;
    statusFilter?: DeliveryStatus[];
  } = {}
) {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Valeurs par défaut
  const {
    radius = 5000, // 5km par défaut
    maxResults = 10,
    includeAssigned = true,
    onlyUnassigned = false,
    statusFilter = [],
  } = options;

  // Utiliser la position fournie ou tenter de récupérer la position de l'utilisateur
  useEffect(() => {
    if (options.latitude && options.longitude) {
      setUserLocation({
        lat: options.latitude,
        lng: options.longitude,
      });
    } else {
      // Essayer de récupérer la position de l'utilisateur
      navigator.geolocation.getCurrentPosition(
        position => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        error => {
          console.error('Erreur de géolocalisation:', error);
        },
        { enableHighAccuracy: true }
      );
    }
  }, [options.latitude, options.longitude]);

  // Requête pour obtenir les livraisons à proximité
  const {
    data: nearbyDeliveries,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [
      'nearby-deliveries',
      userLocation,
      radius,
      maxResults,
      includeAssigned,
      onlyUnassigned,
      statusFilter,
    ],
    queryFn: async () => {
      if (!userLocation) return [];

      return await trpc.delivery.findNearby.query({
        latitude: userLocation.lat,
        longitude: userLocation.lng,
        radius,
        limit: maxResults,
        includeAssigned,
        onlyUnassigned,
        statusFilter: statusFilter.length > 0 ? statusFilter : undefined,
      });
    },
    enabled: !!userLocation,
    staleTime: 1000 * 60, // 1 minute
    refetchInterval: 1000 * 60 * 2, // Rafraîchir toutes les 2 minutes
  });

  // Mutation pour qu'un livreur accepte une livraison
  const queryClient = useQueryClient();
  const { mutate: acceptDelivery, isPending: isAccepting } = useMutation({
    mutationFn: async (deliveryId: string) => {
      return await trpc.delivery.acceptDelivery.mutate({ id: deliveryId });
    },
    onSuccess: () => {
      toast.success('Livraison acceptée avec succès');
      queryClient.invalidateQueries({ queryKey: ['nearby-deliveries'] });
      queryClient.invalidateQueries({ queryKey: ['my-deliveries'] });
    },
    onError: error => {
      toast.error(`Erreur lors de l'acceptation de la livraison: ${error.message}`);
    },
  });

  // Mettre à jour l'emplacement de l'utilisateur manuellement
  const updateUserLocation = useCallback((latitude: number, longitude: number) => {
    setUserLocation({ lat: latitude, lng: longitude });
  }, []);

  return {
    nearbyDeliveries: nearbyDeliveries || [],
    userLocation,

    // Actions
    acceptDelivery,
    updateUserLocation,
    refetch,

    // États
    isLoading,
    isAccepting,
    error,
  };
}
