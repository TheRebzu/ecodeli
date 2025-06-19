"use client";

import React, { useState, useCallback } from "react";
import { api } from "@/trpc/react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import { useTranslations } from "next-intl";
import {
  type StorageBox,
  type StorageReservation,
  type StorageSearchFilters,
  type StorageSearchResult,
  type StorageStats,
  type WarehouseInfo,
  type CreateReservationData,
  type ExtendReservationData,
} from "@/types/client/storage";

interface UseClientStorageProps {
  initialFilters?: StorageSearchFilters;
}

export function useClientStorage({
  initialFilters = {}
}: UseClientStorageProps = {}) {
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations("storage");

  const [filters, setFilters] = useState<StorageSearchFilters>(initialFilters);
  const [searchResults, setSearchResults] = useState<StorageBox[]>([]);
  const [myReservations, setMyReservations] = useState<StorageReservation[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Recherche de box - Appel API réel
  const {
    data: searchData,
    isLoading: isSearching,
    error: searchError,
    refetch: refetchSearch
  } = api.clientStorage.searchBoxes.useQuery(filters, {
    enabled: Object.keys(filters).length > 0,
    staleTime: 60000, // 1 minute
    refetchOnWindowFocus: false,
  });

  // Mes réservations - Appel API réel
  const {
    data: reservationsData,
    isLoading: isLoadingReservations,
    error: reservationsError,
    refetch: refetchReservations
  } = api.clientStorage.getMyReservations.useQuery(undefined, {
    staleTime: 30000, // 30 secondes
    refetchOnWindowFocus: false,
  });

  // Mes statistiques - Appel API réel
  const {
    data: statsData,
    isLoading: isLoadingStats,
    error: statsError,
    refetch: refetchStats
  } = api.clientStorage.getMyStats.useQuery(undefined, {
    staleTime: 300000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  // Entrepôts disponibles - Appel API réel
  const {
    data: warehousesData,
    isLoading: isLoadingWarehouses,
    error: warehousesError,
    refetch: refetchWarehouses
  } = api.clientStorage.getAvailableWarehouses.useQuery(undefined, {
    staleTime: 600000, // 10 minutes
    refetchOnWindowFocus: false,
  });

  // Mutations - Appels API réels
  const createReservationMutation = api.clientStorage.createReservation.useMutation({
    onSuccess: () => {
      toast({
        title: "Succès",
        description: "Réservation créée avec succès",
      });
      refetchReservations();
      refetchStats();
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
      setError(error.message);
    },
  });

  const cancelReservationMutation = api.clientStorage.cancelReservation.useMutation({
    onSuccess: () => {
      toast({
        title: "Succès",
        description: "Réservation annulée avec succès",
      });
      refetchReservations();
      refetchStats();
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
      setError(error.message);
    },
  });

  const extendReservationMutation = api.clientStorage.extendReservation.useMutation({
    onSuccess: () => {
      toast({
        title: "Succès",
        description: "Réservation prolongée avec succès",
      });
      refetchReservations();
      refetchStats();
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
      setError(error.message);
    },
  });

  const accessBoxMutation = api.clientStorage.accessBox.useMutation({
    onSuccess: () => {
      toast({
        title: "Succès",
        description: "Accès autorisé à la box",
      });
      refetchReservations();
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
      setError(error.message);
    },
  });

  // Actions avec gestion d'erreur unifiée - Appels API réels uniquement
  const searchBoxes = useCallback(
    async (newFilters: StorageSearchFilters) => {
      setError(null);
      setFilters(newFilters);
      await refetchSearch();
    },
    [refetchSearch],
  );

  const createReservation = useCallback(
    async (data: CreateReservationData) => {
      setError(null);
      return await createReservationMutation.mutateAsync(data);
    },
    [createReservationMutation],
  );

  const extendReservation = useCallback(
    async (data: ExtendReservationData) => {
      setError(null);
      return await extendReservationMutation.mutateAsync(data);
    },
    [extendReservationMutation],
  );

  const cancelReservation = useCallback(
    async (reservationId: string, reason?: string) => {
      setError(null);
      return await cancelReservationMutation.mutateAsync({ 
        reservationId, 
        reason 
      });
    },
    [cancelReservationMutation],
  );

  const accessBox = useCallback(
    async (reservationId: string, location?: { lat: number; lng: number }) => {
      setError(null);
      return await accessBoxMutation.mutateAsync({ 
        reservationId, 
        location 
      });
    },
    [accessBoxMutation],
  );

  const updateFilters = useCallback(
    (newFilters: Partial<StorageSearchFilters>) => {
      setError(null);
      setFilters(prev => ({ ...prev, ...newFilters }));
    },
    [],
  );

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  // Navigation helpers
  const navigateToBox = useCallback(
    (boxId: string) => {
      router.push(`/client/storage/${boxId}`);
    },
    [router],
  );

  const navigateToReservation = useCallback(
    (reservationId: string) => {
      router.push(`/client/storage/reservations/${reservationId}`);
    },
    [router],
  );

  const navigateToWarehouse = useCallback(
    (warehouseId: string) => {
      router.push(`/client/storage/warehouses/${warehouseId}`);
    },
    [router],
  );

  // Gestion des erreurs centralisée
  React.useEffect(() => {
    if (searchError) {
      setError(searchError.message);
    }
  }, [searchError]);

  React.useEffect(() => {
    if (reservationsError) {
      setError(reservationsError.message);
    }
  }, [reservationsError]);

  React.useEffect(() => {
    if (statsError) {
      setError(statsError.message);
    }
  }, [statsError]);

  React.useEffect(() => {
    if (warehousesError) {
      setError(warehousesError.message);
    }
  }, [warehousesError]);

  // Mettre à jour les données selon les réponses API
  React.useEffect(() => {
    if (searchData?.boxes) {
      setSearchResults(searchData.boxes);
    }
  }, [searchData]);

  React.useEffect(() => {
    if (reservationsData) {
      setMyReservations(reservationsData);
    }
  }, [reservationsData]);

  return {
    // Données
    boxes: searchResults,
    reservations: myReservations,
    stats: statsData,
    warehouses: warehousesData,
    filters,
    
    // Chargement et erreurs
    isLoading: isSearching || isLoadingReservations || isLoadingStats || isLoadingWarehouses,
    isSearching,
    isLoadingReservations,
    isLoadingStats,
    isLoadingWarehouses,
    error,
    
    // Actions
    searchBoxes,
    createReservation,
    extendReservation,
    cancelReservation,
    accessBox,
    updateFilters,
    resetError,
    
    // Navigation
    navigateToBox,
    navigateToReservation,
    navigateToWarehouse,
    
    // Utilitaires
    refetchSearch,
    refetchReservations,
    refetchStats,
    refetchWarehouses,
    
    // Méta-données de recherche
    searchMeta: searchData ? {
      total: searchData.total,
      page: searchData.page,
      limit: searchData.limit,
      hasMore: searchData.hasMore,
      availableFilters: searchData.filters
    } : null,
    
    // États des mutations
    isCreatingReservation: createReservationMutation.isPending,
    isExtendingReservation: extendReservationMutation.isPending,
    isCancellingReservation: cancelReservationMutation.isPending,
    isAccessingBox: accessBoxMutation.isPending,
  };
}