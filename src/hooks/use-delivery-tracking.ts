import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../trpc/react';
import { socket } from '../socket';
import { DeliveryTrackingInfo, DeliveryStatus } from '../types/delivery';

interface UseDeliveryTrackingProps {
  deliveryId: string;
  enableRealtime?: boolean;
}

// Type pour les logs de livraison
interface DeliveryLog {
  status: DeliveryStatus;
  timestamp: Date;
  note?: string;
  latitude?: number;
  longitude?: number;
}

/**
 * Hook personnalisé pour le suivi d'une livraison
 * Permet de suivre l'état d'une livraison en temps réel (via WebSockets si activé)
 * et de récupérer les détails de la livraison
 */
export function useDeliveryTracking({
  deliveryId,
  enableRealtime = true,
}: UseDeliveryTrackingProps) {
  const router = useRouter();

  // État local pour les données en temps réel
  const [realtimeData, setRealtimeData] = useState<{
    currentLat?: number;
    currentLng?: number;
    status?: DeliveryStatus;
    lastUpdate?: Date;
  } | null>(null);

  // Requête tRPC pour obtenir les détails de la livraison
  const {
    data: delivery,
    isLoading,
    error,
    refetch,
  } = api.deliveryTracking.getDeliveryById.useQuery({ deliveryId });

  // Requête pour obtenir l'historique des coordonnées
  const { data: coordinatesHistory, isLoading: isLoadingCoordinates } =
    api.deliveryTracking.getDeliveryCoordinatesHistory.useQuery({ deliveryId });

  // Gestion des WebSockets pour les mises à jour en temps réel
  useEffect(() => {
    if (!enableRealtime || !deliveryId) return;

    // Se connecter au canal de la livraison
    socket.emit('joinDeliveryTracking', { deliveryId });

    // Écouter les mises à jour des coordonnées
    const handleCoordinatesUpdate = (data: {
      latitude: number;
      longitude: number;
      deliveryId: string;
    }) => {
      if (data.deliveryId === deliveryId) {
        setRealtimeData(prev => ({
          ...prev,
          currentLat: data.latitude,
          currentLng: data.longitude,
          lastUpdate: new Date(),
        }));
      }
    };

    // Écouter les mises à jour de statut
    const handleStatusUpdate = (data: { status: DeliveryStatus; deliveryId: string }) => {
      if (data.deliveryId === deliveryId) {
        setRealtimeData(prev => ({
          ...prev,
          status: data.status,
          lastUpdate: new Date(),
        }));

        // Rafraîchir les données complètes
        refetch();
      }
    };

    // Abonnement aux événements
    socket.on('deliveryCoordinatesUpdate', handleCoordinatesUpdate);
    socket.on('deliveryStatusUpdate', handleStatusUpdate);

    // Nettoyage à la fermeture du composant
    return () => {
      socket.emit('leaveDeliveryTracking', { deliveryId });
      socket.off('deliveryCoordinatesUpdate', handleCoordinatesUpdate);
      socket.off('deliveryStatusUpdate', handleStatusUpdate);
    };
  }, [deliveryId, enableRealtime, refetch]);

  // Combiner les données du serveur et les données en temps réel
  const combinedData: DeliveryTrackingInfo | undefined = delivery
    ? {
        deliveryId: delivery.id,
        status: realtimeData?.status || delivery.status,
        currentLocation:
          realtimeData?.currentLat && realtimeData?.currentLng
            ? {
                latitude: realtimeData.currentLat,
                longitude: realtimeData.currentLng,
                timestamp: realtimeData.lastUpdate || new Date(),
              }
            : delivery.currentLat && delivery.currentLng
              ? {
                  latitude: delivery.currentLat,
                  longitude: delivery.currentLng,
                  timestamp: delivery.lastLocationUpdate || new Date(),
                }
              : undefined,
        estimatedArrival: delivery.estimatedArrival,
        logs: delivery.logs.map((log: DeliveryLog) => ({
          status: log.status,
          timestamp: log.timestamp,
          note: log.note || undefined,
          location:
            log.latitude && log.longitude
              ? { latitude: log.latitude, longitude: log.longitude }
              : undefined,
        })),
      }
    : undefined;

  // Vérifier si l'utilisateur est autorisé
  const isAuthorized = !error || !error.message.includes('FORBIDDEN');

  // Si pas autorisé, rediriger vers la liste des livraisons
  useEffect(() => {
    if (error && error.message.includes('FORBIDDEN')) {
      // Utiliser le format de chemin adapté à l'App Router
      router.push('/client/deliveries');
    }
  }, [error, router]);

  return {
    trackingInfo: combinedData,
    delivery,
    coordinatesHistory,
    isLoading,
    isLoadingCoordinates,
    isAuthorized,
    error,
    refetch,
  };
}
