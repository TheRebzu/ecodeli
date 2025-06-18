"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface UseClientStorageOptions {
  onReservationSuccess?: (reservation: any) => void;
  onReservationError?: (error: any) => void;
}

interface CreateReservationData {
  boxId: string;
  startDate: Date;
  endDate: Date;
  notes?: string;
  paymentMethodId?: string;
}

export function useClientStorage(options: UseClientStorageOptions = {}) {
  const router = useRouter();
  const [isCreatingReservation, setIsCreatingReservation] = useState(false);

  // Mutation pour créer une réservation
  const createReservationMutation = api.clientStorageBoxes.createReservation.useMutation({
    onMutate: () => {
      setIsCreatingReservation(true);
    },
    onSuccess: (data) => {
      setIsCreatingReservation(false);
      toast.success("Réservation créée avec succès !");
      options.onReservationSuccess?.(data);
      
      // Rediriger vers la page de confirmation
      router.push(`/client/storage/${data.id}`);
    },
    onError: (error) => {
      setIsCreatingReservation(false);
      toast.error(error.message || "Erreur lors de la création de la réservation");
      options.onReservationError?.(error);
    },
  });

  // Mutation pour annuler une réservation
  const cancelReservationMutation = api.clientStorageBoxes.cancelReservation.useMutation({
    onSuccess: (data) => {
      toast.success("Réservation annulée avec succès");
      if (data.cancellationFee > 0) {
        toast.info(`Frais d'annulation: ${data.cancellationFee.toFixed(2)}€`);
      }
    },
    onError: (error) => {
      toast.error(error.message || "Erreur lors de l'annulation");
    },
  });

  // Mutation pour prolonger une réservation
  const extendReservationMutation = api.clientStorageBoxes.extendReservation.useMutation({
    onSuccess: (data) => {
      toast.success("Réservation prolongée avec succès");
      toast.info(`Coût additionnel: ${data.additionalCost.toFixed(2)}€`);
    },
    onError: (error) => {
      toast.error(error.message || "Erreur lors de la prolongation");
    },
  });

  // Fonction pour créer une réservation
  const createReservation = async (data: CreateReservationData) => {
    try {
      const result = await createReservationMutation.mutateAsync(data);
      return result;
    } catch (error) {
      throw error;
    }
  };

  // Fonction pour annuler une réservation
  const cancelReservation = async (reservationId: string, reason?: string) => {
    try {
      const result = await cancelReservationMutation.mutateAsync({
        reservationId,
        reason,
      });
      return result;
    } catch (error) {
      throw error;
    }
  };

  // Fonction pour prolonger une réservation
  const extendReservation = async (reservationId: string, newEndDate: Date) => {
    try {
      const result = await extendReservationMutation.mutateAsync({
        reservationId,
        newEndDate,
      });
      return result;
    } catch (error) {
      throw error;
    }
  };

  // Fonction pour créer une notification de disponibilité
  const createAvailabilityNotification = api.clientStorageBoxes.createAvailabilityNotification.useMutation({
    onSuccess: () => {
      toast.success("Notification de disponibilité créée");
    },
    onError: (error) => {
      toast.error(error.message || "Erreur lors de la création de la notification");
    },
  });

  const notifyWhenAvailable = async (data: {
    boxId: string;
    startDate: Date;
    endDate: Date;
    email?: string;
    phone?: string;
  }) => {
    try {
      const result = await createAvailabilityNotification.mutateAsync(data);
      return result;
    } catch (error) {
      throw error;
    }
  };

  return {
    // États
    isCreatingReservation,
    isCancellingReservation: cancelReservationMutation.isLoading,
    isExtendingReservation: extendReservationMutation.isLoading,
    isCreatingNotification: createAvailabilityNotification.isLoading,

    // Actions
    createReservation,
    cancelReservation,
    extendReservation,
    notifyWhenAvailable,

    // Erreurs
    reservationError: createReservationMutation.error,
    cancellationError: cancelReservationMutation.error,
    extensionError: extendReservationMutation.error,
    notificationError: createAvailabilityNotification.error,
  };
}