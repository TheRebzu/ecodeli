"use client";

import { useState, useEffect } from "react";
import { api } from "@/trpc/react";

// Types
interface Service {
  id: string;
  title: string;
  description?: string;
  category: {
    id: string;
    name: string;
    icon?: string;
    color?: string;
  };
  price: number;
  priceType: "FIXED" | "HOURLY" | "DAILY" | "CUSTOM";
  duration: number;
  location: "AT_CUSTOMER" | "AT_PROVIDER" | "REMOTE" | "FLEXIBLE";
  status: "ACTIVE" | "INACTIVE" | "DRAFT" | "SUSPENDED";
  images?: string[];
  rating: number;
  totalReviews: number;
  totalBookings: number;
  monthlyRevenue: number;
  isEmergencyService: boolean;
  requiresEquipment: boolean;
  maxClients: number;
  createdAt: Date;
  updatedAt: Date;
}

interface ServiceCategory {
  id: string;
  name: string;
  icon?: string;
  color?: string;
}

interface UseProviderServicesOptions {
  status?: string;
  category?: string;
  location?: string;
  priceType?: string;
  search?: string;
  emergencyOnly?: boolean;
  equipmentOnly?: boolean;
}

interface UseProviderServicesResult {
  services: Service[];
  categories: ServiceCategory[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  updateServiceStatus: (id: string, status: string) => Promise<void>;
  deleteService: (id: string) => Promise<void>;
  duplicateService: (id: string) => Promise<Service>;
}

export function useProviderServices(
  options: UseProviderServicesOptions = {},
): UseProviderServicesResult {
  const [error, setError] = useState<string | null>(null);

  // Appels tRPC réels pour récupérer les données
  const {
    data: servicesData,
    isLoading: servicesLoading,
    refetch: refetchServices,
  } = api.provider.services.getProviderServices.useQuery(
    {
      status: options.status !== "all" ? options.status : undefined,
      category: options.category !== "all" ? options.category : undefined,
      location: options.location !== "all" ? options.location : undefined,
      priceType: options.priceType !== "all" ? options.priceType : undefined,
      search: options.search || undefined,
      emergencyOnly: options.emergencyOnly,
      equipmentOnly: options.equipmentOnly,
    },
    {
      onError: (error) => {
        setError(error.message);
      },
    },
  );

  const {
    data: categoriesData,
    isLoading: categoriesLoading,
  } = api.provider.services.getServiceCategories.useQuery();

  const updateServiceStatusMutation = api.provider.services.updateServiceStatus.useMutation({
    onSuccess: () => {
      refetchServices();
    },
    onError: (error) => {
      setError(error.message);
    },
  });

  const deleteServiceMutation = api.provider.services.deleteService.useMutation({
    onSuccess: () => {
      refetchServices();
    },
    onError: (error) => {
      setError(error.message);
    },
  });

  const duplicateServiceMutation = api.provider.services.duplicateService.useMutation({
    onSuccess: () => {
      refetchServices();
    },
    onError: (error) => {
      setError(error.message);
    },
  });

  const updateServiceStatus = async (id: string, status: string) => {
    await updateServiceStatusMutation.mutateAsync({ id, status  });
  };

  const deleteService = async (id: string) => {
    await deleteServiceMutation.mutateAsync({ id  });
  };

  const duplicateService = async (id: string): Promise<Service> => {
    return await duplicateServiceMutation.mutateAsync({ id  });
  };

  const refetch = () => {
    setError(null);
    refetchServices();
  };

  return {
    services: servicesData?.services || [],
    categories: categoriesData?.categories || [],
    isLoading: servicesLoading || categoriesLoading,
    error,
    refetch,
    updateServiceStatus,
    deleteService,
    duplicateService,
  };
}
