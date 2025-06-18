"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { api } from "@/trpc/react";
import { toast } from "sonner";

type FilterStatus = "all" | "active" | "completed" | "upcoming";

// Utiliser uniquement les statuts acceptés par l'API tRPC
type DeliveryStatusType =
  | "PENDING"
  | "ACCEPTED"
  | "PICKED_UP"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "CANCELLED";

interface UseClientDeliveriesOptions {
  status?: FilterStatus;
  searchQuery?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}

/**
 * Hook pour gérer les livraisons pour un client
 */
export function useClientDeliveries({
  status = "active",
  searchQuery = "",
  sortOrder = "desc",
  page = 1,
  limit = 10
}: UseClientDeliveriesOptions) {
  const { data: session } = useSession();
  const [hasActiveDeliveries, setHasActiveDeliveries] = useState(false);

  // Convertir le status en tableau de chaînes
  const getStatusFilter = (
    filterStatus: FilterStatus,
  ): DeliveryStatusType[] | undefined => {
    switch (filterStatus) {
      case "active":
        return ["IN_TRANSIT", "PICKED_UP", "ACCEPTED"];
      case "completed":
        return ["DELIVERED"];
      case "upcoming":
        return ["PENDING"];
      default:
        return undefined; // Pour 'all', on ne spécifie pas de filtre
    }
  };

  // Récupérer les livraisons
  const { data: deliveriesData, isLoading, error, refetch } = api.deliveryTracking.getDeliveries.useQuery(
    {
      status: getStatusFilter(status),
      page,
      limit,
      sortBy: "updatedAt",
      sortOrder
    },
    {
      enabled: !!session,
      onSuccess: (data: any) => {
        // Vérifier s'il y a au moins une livraison active avec ETA
        const hasActive = data?.deliveries.some(
          (delivery: any) =>
            delivery.status === "IN_TRANSIT" && delivery.estimatedArrival,
        );
        setHasActiveDeliveries(hasActive || false);
      },
      onError: (err: any) => {
        toast.error(
          `Erreur lors du chargement des livraisons: ${
            err.message || "Veuillez réessayer plus tard"
          }`,
        );
      }
    },
  );

  // Requête pour obtenir les livraisons actives
  const activeDeliveriesQuery =
    api.deliveryTracking.getActiveDeliveries.useQuery(undefined, {
      enabled: !!session
    });

  // Vérifier s'il y a des livraisons actives
  if (
    activeDeliveriesQuery.data &&
    activeDeliveriesQuery.data.length > 0 &&
    !hasActiveDeliveries
  ) {
    setHasActiveDeliveries(true);
  }

  return {
    deliveries: deliveriesData?.deliveries || [],
    pagination: deliveriesData?.pagination,
    isLoading,
    error: error ? error.message : null,
    refetch,
    hasActiveDeliveries
  };
}
