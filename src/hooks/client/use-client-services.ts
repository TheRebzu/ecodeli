"use client";

import React, { useState, useCallback } from "react";
import { api } from "@/trpc/react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import { useTranslations } from "next-intl";
import {
  type ClientService,
  type ServiceSearchFilters,
  type ServiceSearchResult,
  type ServiceBooking,
  type CreateBookingData,
  type UpdateBookingData,
  type AvailableTimeSlot,
} from "@/types/client/services";

interface UseClientServicesProps {
  initialFilters?: ServiceSearchFilters;
}

export function useClientServices({
  initialFilters = {}
}: UseClientServicesProps = {}) {
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations("services");

  const [filters, setFilters] = useState<ServiceSearchFilters>(initialFilters);
  const [searchResults, setSearchResults] = useState<ServiceSearchResult[]>([]);
  const [myBookings, setMyBookings] = useState<ServiceBooking[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Recherche de services
  const {
    data: searchData,
    isLoading: isSearching,
    error: searchError,
    refetch: refetchSearch
  } = api.clientServices.searchServices.useQuery(filters, {
    enabled: Object.keys(filters).length > 0,
    staleTime: 60000, // 1 minute
    refetchOnWindowFocus: false,
  });

  // Récupération de mes réservations
  const {
    data: bookingsData,
    isLoading: isLoadingBookings,
    error: bookingsError,
    refetch: refetchBookings
  } = api.client.getMyClientBookings.useQuery(undefined, {
    staleTime: 30000, // 30 secondes
    refetchOnWindowFocus: false,
  });

  // Récupération des disponibilités pour un service
  const getAvailabilityQuery = useCallback((serviceId: string, date?: Date) => {
    return api.clientServices.getAvailableTimeSlots.useQuery({
      serviceId,
      date: date || new Date(),
    }, {
      enabled: !!serviceId,
      staleTime: 30000,
    });
  }, []);

  // Mutations pour les actions utilisateur
  const createBookingMutation = api.client.bookService.useMutation({
    onSuccess: () => {
      toast({
        title: "Succès",
        description: "Réservation créée avec succès",
      });
      refetchBookings();
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

  const updateBookingMutation = api.clientServices.updateBookingStatus.useMutation({
    onSuccess: () => {
      toast({
        title: "Succès",
        description: "Réservation mise à jour avec succès",
      });
      refetchBookings();
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

  const cancelBookingMutation = api.client.cancelServiceBooking.useMutation({
    onSuccess: () => {
      toast({
        title: "Succès",
        description: "Réservation annulée avec succès",
      });
      refetchBookings();
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

  const rescheduleBookingMutation = api.clientServices.rescheduleBooking.useMutation({
    onSuccess: () => {
      toast({
        title: "Succès",
        description: "Réservation reprogrammée avec succès",
      });
      refetchBookings();
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

  const createReviewMutation = api.clientServices.createReview.useMutation({
    onSuccess: () => {
      toast({
        title: "Succès",
        description: "Avis créé avec succès",
      });
      refetchBookings();
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

  // Actions avec gestion d'erreur unifiée
  const searchServices = useCallback(
    async (newFilters: ServiceSearchFilters) => {
      setError(null);
      setFilters(newFilters);
      await refetchSearch();
    },
    [refetchSearch],
  );

  const createBooking = useCallback(
    async (data: CreateBookingData) => {
      setError(null);
      return await createBookingMutation.mutateAsync(data);
    },
    [createBookingMutation],
  );

  const updateBooking = useCallback(
    async (bookingId: string, status: ServiceBooking["status"]) => {
      setError(null);
      return await updateBookingMutation.mutateAsync({ bookingId, status });
    },
    [updateBookingMutation],
  );

  const cancelBooking = useCallback(
    async (bookingId: string, reason?: string) => {
      setError(null);
      return await cancelBookingMutation.mutateAsync({ bookingId, reason });
    },
    [cancelBookingMutation],
  );

  const rescheduleBooking = useCallback(
    async (bookingId: string, newDate: Date, newStartTime: string, newEndTime: string) => {
      setError(null);
      return await rescheduleBookingMutation.mutateAsync({
        bookingId,
        newDate,
        newStartTime,
        newEndTime,
      });
    },
    [rescheduleBookingMutation],
  );

  const createReview = useCallback(
    async (bookingId: string, rating: number, comment?: string) => {
      setError(null);
      return await createReviewMutation.mutateAsync({
        bookingId,
        rating,
        comment,
      });
    },
    [createReviewMutation],
  );

  const updateFilters = useCallback(
    (newFilters: Partial<ServiceSearchFilters>) => {
      setError(null);
      setFilters(prev => ({ ...prev, ...newFilters }));
    },
    [],
  );

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  // Navigation helpers
  const navigateToService = useCallback(
    (serviceId: string) => {
      router.push(`/client/services/${serviceId}`);
    },
    [router],
  );

  const navigateToBooking = useCallback(
    (bookingId: string) => {
      router.push(`/client/services/bookings/${bookingId}`);
    },
    [router],
  );

  const navigateToProvider = useCallback(
    (providerId: string) => {
      router.push(`/client/services/providers/${providerId}`);
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
    if (bookingsError) {
      setError(bookingsError.message);
    }
  }, [bookingsError]);

  // Mettre à jour les données selon les réponses API
  React.useEffect(() => {
    if (searchData?.results) {
      setSearchResults(searchData.results);
    }
  }, [searchData]);

  React.useEffect(() => {
    if (bookingsData) {
      setMyBookings(bookingsData);
    }
  }, [bookingsData]);

  return {
    // Données
    services: searchResults,
    bookings: myBookings,
    filters,
    
    // Chargement et erreurs
    isLoading: isSearching || isLoadingBookings,
    isSearching,
    isLoadingBookings,
    error,
    
    // Actions
    searchServices,
    createBooking,
    updateBooking,
    cancelBooking,
    rescheduleBooking,
    createReview,
    updateFilters,
    resetError,
    
    // Navigation
    navigateToService,
    navigateToBooking,
    navigateToProvider,
    
    // Utilitaires
    getAvailabilityQuery,
    refetchSearch,
    refetchBookings,
    
    // Méta-données de recherche
    searchMeta: searchData ? {
      total: searchData.total,
      page: searchData.page,
      limit: searchData.limit,
      hasMore: searchData.hasMore,
      availableFilters: searchData.filters
    } : null,
    
    // États des mutations
    isCreatingBooking: createBookingMutation.isPending,
    isUpdatingBooking: updateBookingMutation.isPending,
    isCancellingBooking: cancelBookingMutation.isPending,
    isReschedulingBooking: rescheduleBookingMutation.isPending,
    isCreatingReview: createReviewMutation.isPending,
  };
}

export function useServiceSearch(initialFilters: ServiceSearchFilters = {}) {
  const { toast } = useToast();
  const t = useTranslations("services");

  const [filters, setFilters] = useState<ServiceSearchFilters>(initialFilters);
  const [results, setResults] = useState<ServiceSearchResult[]>([]);
  const [availableFilters, setAvailableFilters] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Recherche de services
  const { 
    data: searchData, 
    isLoading, 
    error: apiError, 
    refetch 
  } = api.clientServices.searchServices.useQuery(filters, {
    enabled: Object.keys(filters).length > 0,
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  // Actions
  const search = useCallback(async (newFilters: ServiceSearchFilters) => {
    setError(null);
    setFilters(newFilters);
    await refetch();
  }, [refetch]);

  const updateFilters = useCallback((newFilters: Partial<ServiceSearchFilters>) => {
    setError(null);
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const clearFilters = useCallback(() => {
    setError(null);
    setFilters({});
    setResults([]);
  }, []);

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  // Gestion des erreurs
  React.useEffect(() => {
    if (apiError) {
      setError(apiError.message);
    }
  }, [apiError]);

  // Mise à jour des résultats
  React.useEffect(() => {
    if (searchData) {
      setResults(searchData.results || []);
      setAvailableFilters(searchData.filters || null);
    }
  }, [searchData]);

  return {
    // Données de recherche
    results,
    availableFilters,
    filters,
    
    // Méta-données
    total: searchData?.total || 0,
    hasMore: searchData?.hasMore || false,
    
    // États
    isLoading,
    error,
    
    // Actions
    search,
    updateFilters,
    clearFilters,
    refetch,
    resetError,
  };
}