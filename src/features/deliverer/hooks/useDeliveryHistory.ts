import { useState, useEffect, useCallback } from "react";

export interface DeliveryHistory {
  id: string;
  trackingNumber: string;
  status: string;
  announcement: {
    id: string;
    title: string;
    description: string;
    type: string;
    pickupAddress: string;
    deliveryAddress: string;
  };
  client: {
    id: string;
    name: string;
  };
  price: number;
  delivererFee: number;
  pickupDate: string | null;
  deliveryDate: string | null;
  actualDeliveryDate: string | null;
  isPartial: boolean;
  currentLocation: any;
  validationCode: string | null;
  lastTracking: any;
  payment: {
    id: string;
    amount: number;
    status: string;
    paidAt: string | null;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryHistoryResponse {
  deliveries: DeliveryHistory[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface UseDeliveryHistoryParams {
  initialPage?: number;
  limit?: number;
  status?: string;
}

export interface UseDeliveryHistoryReturn {
  deliveries: DeliveryHistory[];
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  fetchDeliveries: (page?: number, status?: string) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useDeliveryHistory(
  params: UseDeliveryHistoryParams = {},
): UseDeliveryHistoryReturn {
  const { initialPage = 1, limit = 10, status: initialStatus } = params;

  const [deliveries, setDeliveries] = useState<DeliveryHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: initialPage,
    limit,
    total: 0,
    totalPages: 0,
  });

  const fetchDeliveries = useCallback(
    async (page?: number, status?: string) => {
      try {
        setLoading(true);
        setError(null);

        const currentPage = page ?? pagination.page;
        const params = new URLSearchParams({
          page: currentPage.toString(),
          limit: limit.toString(),
        });

        if (status) {
          params.append("status", status);
        }

        const response = await fetch(
          `/api/deliverer/deliveries/history?${params}`,
        );

        if (!response.ok) {
          throw new Error("Erreur lors du chargement de l'historique");
        }

        const data: DeliveryHistoryResponse = await response.json();

        setDeliveries(data.deliveries);
        setPagination(data.pagination);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Une erreur est survenue";
        setError(errorMessage);
        console.error("Error fetching delivery history:", err);
      } finally {
        setLoading(false);
      }
    },
    [pagination.page, limit],
  );

  const refetch = useCallback(() => {
    return fetchDeliveries(pagination.page, initialStatus);
  }, [fetchDeliveries, pagination.page, initialStatus]);

  useEffect(() => {
    fetchDeliveries(initialPage, initialStatus);
  }, []); // Intentionally empty dependency array for initial load

  return {
    deliveries,
    loading,
    error,
    pagination,
    fetchDeliveries,
    refetch,
  };
}
