import { useState } from 'react';
import { api } from '../trpc/react';
import { DeliveryFilterInput } from '@/schemas/delivery-tracking.schema';
import { DeliveryStatus } from '@prisma/client';

interface UseDeliveryHistoryProps {
  initialFilters?: Partial<DeliveryFilterInput>;
}

// Interface représentant une livraison retournée par l'API
interface Delivery {
  id: string;
  status: DeliveryStatus;
  // Autres propriétés communes dans l'objet de livraison
  [key: string]: any;
}

/**
 * Hook personnalisé pour gérer l'historique des livraisons
 * Permet de filtrer et rechercher parmi les livraisons passées
 */
export function useDeliveryHistory({ initialFilters = {} }: UseDeliveryHistoryProps = {}) {
  // État local pour les filtres
  const [filters, setFilters] = useState<DeliveryFilterInput>({
    status: undefined,
    startDate: undefined,
    endDate: undefined,
    search: undefined,
    ...initialFilters,
  });

  // Requête tRPC avec filtres
  const {
    data: deliveries,
    isLoading,
    error,
    refetch,
  } = api.deliveryTracking.getDeliveries.useQuery(filters);

  // Fonction pour mettre à jour les filtres
  const updateFilters = (newFilters: Partial<DeliveryFilterInput>) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters,
    }));
  };

  // Fonctions utilitaires pour les filtres courants
  const filterByStatus = (status?: DeliveryStatus) => {
    updateFilters({ status });
  };

  const filterByDateRange = (startDate?: Date, endDate?: Date) => {
    updateFilters({ startDate, endDate });
  };

  const searchDeliveries = (search?: string) => {
    updateFilters({ search });
  };

  const clearFilters = () => {
    setFilters({});
  };

  // Statistiques de base
  const stats = deliveries
    ? {
        total: deliveries.length,
        completed: deliveries.filter((d: Delivery) => d.status === DeliveryStatus.CONFIRMED).length,
        pending: deliveries.filter(
          (d: Delivery) =>
            d.status === DeliveryStatus.PENDING || d.status === DeliveryStatus.ACCEPTED
        ).length,
        inProgress: deliveries.filter(
          (d: Delivery) =>
            d.status === DeliveryStatus.PICKED_UP || d.status === DeliveryStatus.IN_TRANSIT
        ).length,
        cancelled: deliveries.filter((d: Delivery) => d.status === DeliveryStatus.CANCELLED).length,
        disputed: deliveries.filter((d: Delivery) => d.status === DeliveryStatus.DISPUTED).length,
      }
    : undefined;

  return {
    deliveries,
    filters,
    isLoading,
    error,
    refetch,
    updateFilters,
    filterByStatus,
    filterByDateRange,
    searchDeliveries,
    clearFilters,
    stats,
  };
}
