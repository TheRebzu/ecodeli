import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useSocket } from './use-socket';
import { trpc } from '@/trpc/client';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { DeliveryETAData } from '@/types/delivery-tracking';

interface ETAData {
  estimatedArrival: string | null;
  distance: number | null;
  trafficCondition?: string | null;
  confidence?: number;
  updatedAt?: Date | null;
}

interface ETAUpdateEvent {
  deliveryId: string;
  eta: Date | string;
  distance: number;
}

/**
 * Hook pour gérer les notifications d'arrivée de livraison
 */
export function useDeliveryArrival(deliveryId: string) {
  const { data: session } = useSession();
  const socket = useSocket();
  const router = useRouter();

  // États
  const [isArriving, setIsArriving] = useState(false);
  const [arrivalTime, setArrivalTime] = useState<Date | null>(null);
  const [distance, setDistance] = useState<number | null>(null);

  // Requête pour obtenir l'ETA actuelle
  const { data: etaData, isLoading: etaLoading } = trpc.deliveryTracking.getDeliveryById.useQuery(
    { deliveryId },
    {
      enabled: !!deliveryId && !!session,
      refetchInterval: 30000, // Rafraîchir toutes les 30 secondes
    }
  );

  // Mettre à jour les états lorsque les données changent
  useEffect(() => {
    if (etaData && etaData.eta) {
      setArrivalTime(etaData.eta.estimatedTime ? new Date(etaData.eta.estimatedTime) : null);
      setDistance(etaData.eta.distanceRemaining || null);

      // Considérer comme "arrivant" si moins de 5 minutes ou moins de 500m
      const arrivalThresholdMinutes = 5;
      const arrivalThresholdDistance = 500; // mètres

      if (etaData.eta.estimatedTime) {
        const etaTime = new Date(etaData.eta.estimatedTime);
        const timeUntilArrival = (etaTime.getTime() - new Date().getTime()) / (1000 * 60);

        setIsArriving(
          timeUntilArrival <= arrivalThresholdMinutes ||
            (etaData.eta.distanceRemaining !== null && 
             etaData.eta.distanceRemaining <= arrivalThresholdDistance / 1000)
        );
      }
    }
  }, [etaData]);

  // Écouter les mises à jour d'ETA via socket
  useEffect(() => {
    if (!socket || !deliveryId) return;

    const handleEtaUpdate = (data: ETAUpdateEvent) => {
      if (data.deliveryId === deliveryId) {
        setArrivalTime(data.eta ? new Date(data.eta) : null);
        setDistance(data.distance || null);

        // Notification si le livreur est proche
        if (data.distance < 500) {
          toast.info('Le livreur est à moins de 500m', {
            duration: 5000,
          });
          setIsArriving(true);
        }
      }
    };

    socket.on('delivery:eta_update', handleEtaUpdate);

    return () => {
      socket.off('delivery:eta_update', handleEtaUpdate);
    };
  }, [socket, deliveryId]);

  return {
    isArriving,
    arrivalTime,
    distance,
    isLoading: etaLoading,
  };
}
