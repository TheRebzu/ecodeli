import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { ServiceRequest } from "@/features/services/types/service.types";

interface ServiceRequestsResponse {
  serviceRequests: ServiceRequest[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export function useProviderServiceRequests() {
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
  const [pagination, setPagination] = useState<
    ServiceRequestsResponse["pagination"] | null
  >(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchServiceRequests = async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    type?: string;
    budgetMin?: string;
    budgetMax?: string;
    city?: string;
    dateFrom?: string;
    dateTo?: string;
    urgency?: string;
    isRecurring?: string;
    sortBy?: string;
    sortOrder?: string;
  }) => {
    if (!user || user.role !== "PROVIDER") {
      setError("Accès non autorisé");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const searchParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined) searchParams.append(key, value.toString());
        });
      }

      const response = await fetch(
        `/api/provider/service-requests?${searchParams.toString()}`,
      );

      if (!response.ok) {
        throw new Error("Erreur lors du chargement des demandes de services");
      }

      const data: ServiceRequestsResponse = await response.json();
      setServiceRequests(data.serviceRequests || []);
      setPagination(data.pagination);
    } catch (error) {
      console.error("Error fetching service requests:", error);
      setError("Erreur lors du chargement des demandes de services");
    } finally {
      setIsLoading(false);
    }
  };

  const applyToServiceRequest = async (
    serviceRequestId: string,
    proposal: {
      price: number;
      estimatedDuration: number;
      message: string;
      availableDates: string[];
    },
  ) => {
    try {
      const response = await fetch(
        `/api/provider/service-requests/${serviceRequestId}/apply`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(proposal),
        },
      );

      if (!response.ok) {
        throw new Error("Erreur lors de la candidature");
      }

      // Recharger les demandes pour mettre à jour les statuts
      await fetchServiceRequests();
      return true;
    } catch (error) {
      console.error("Error applying to service request:", error);
      setError("Erreur lors de la candidature");
      return false;
    }
  };

  useEffect(() => {
    if (user && user.role === "PROVIDER") {
      fetchServiceRequests();
    }
  }, [user]);

  return {
    serviceRequests,
    pagination,
    isLoading,
    error,
    fetchServiceRequests,
    applyToServiceRequest,
    refetch: () => fetchServiceRequests(),
  };
}
