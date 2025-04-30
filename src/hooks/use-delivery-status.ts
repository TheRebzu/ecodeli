import { useState } from 'react';
import { api } from '../trpc/react';
import {
  DeliveryStatusUpdateInput,
  DeliveryCoordinatesUpdateInput,
} from '../schemas/delivery-tracking.schema';
import { DeliveryStatus } from '../types/delivery';
import { TRPCClientError } from '@trpc/client';

/**
 * Hook personnalisé pour gérer les mises à jour de statut d'une livraison
 * Utilisé principalement par les livreurs pour mettre à jour l'avancement
 */
export function useDeliveryStatus(deliveryId: string) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mutations tRPC
  const statusMutation = api.deliveryTracking.updateStatus.useMutation({
    onSuccess: () => {
      setIsUpdating(false);
      setError(null);
    },
    onError: (err: TRPCClientError<any>) => {
      setIsUpdating(false);
      setError(err.message);
    },
  });

  const coordinatesMutation = api.deliveryTracking.updateCoordinates.useMutation({
    onSuccess: () => {
      setError(null);
    },
    onError: (err: TRPCClientError<any>) => {
      setError(err.message);
    },
  });

  const confirmationCodeMutation = api.deliveryTracking.generateConfirmationCode.useMutation({
    onError: (err: TRPCClientError<any>) => {
      setError(err.message);
    },
  });

  // Fonction pour mettre à jour le statut
  const updateStatus = async (
    status: DeliveryStatus,
    note?: string,
    coordinates?: { latitude: number; longitude: number }
  ) => {
    setIsUpdating(true);
    setError(null);

    try {
      const data: DeliveryStatusUpdateInput = {
        deliveryId,
        status,
        note,
        ...(coordinates && {
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
        }),
      };

      await statusMutation.mutateAsync(data);

      return true;
    } catch {
      // L'erreur est gérée dans onError du useMutation
      return false;
    }
  };

  // Fonction pour mettre à jour les coordonnées uniquement
  const updateCoordinates = async (coordinates: { latitude: number; longitude: number }) => {
    try {
      const data: DeliveryCoordinatesUpdateInput = {
        deliveryId,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
      };

      await coordinatesMutation.mutateAsync(data);

      return true;
    } catch {
      // L'erreur est gérée dans onError du useMutation
      return false;
    }
  };

  // Fonction pour générer un nouveau code de confirmation
  const generateConfirmationCode = async () => {
    try {
      const result = await confirmationCodeMutation.mutateAsync({ deliveryId });
      return result.confirmationCode;
    } catch {
      // L'erreur est gérée dans onError du useMutation
      return null;
    }
  };

  // Actions prédéfinies pour les transitions d'état courantes
  const actions = {
    acceptDelivery: () =>
      updateStatus(DeliveryStatus.ACCEPTED, 'Livraison acceptée par le livreur'),
    startPickup: () => updateStatus(DeliveryStatus.PICKED_UP, 'Ramassage en cours'),
    confirmPickup: (coordinates?: { latitude: number; longitude: number }) =>
      updateStatus(
        DeliveryStatus.IN_TRANSIT,
        'Colis récupéré, en route pour la livraison',
        coordinates
      ),
    markAsDelivered: (coordinates?: { latitude: number; longitude: number }) =>
      updateStatus(
        DeliveryStatus.DELIVERED,
        'Colis livré, en attente de confirmation',
        coordinates
      ),
    cancelDelivery: (reason: string) =>
      updateStatus(DeliveryStatus.CANCELLED, `Livraison annulée: ${reason}`),
  };

  return {
    updateStatus,
    updateCoordinates,
    generateConfirmationCode,
    actions,
    isUpdating,
    statusMutation,
    coordinatesMutation,
    confirmationCodeMutation,
    error,
  };
}
