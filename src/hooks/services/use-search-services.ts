"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { type searchServicesSchema } from "@/schemas/service/service.schema";
import { z } from "zod";

// Type inféré à partir du schéma searchServicesSchema
type SearchServicesInput = z.infer<typeof searchServicesSchema>;

/**
 * Hook pour la recherche de services avec gestion d'état
 */
export function useSearchServices() {
  const t = useTranslations("services.search");
  const router = useRouter();
  const [searchParams, setSearchParams] = useState<SearchServicesInput | null>(
    null,
  );

  // Récupérer les catégories de services
  const categoriesQuery = api.service.getCategories.useQuery();

  // Rechercher des services avec les paramètres de recherche
  const searchQuery = api.clientServices.searchServices.useQuery(
    searchParams || {
      page: 1,
      limit: 10,
    }
  );

  // Fonction pour effectuer une recherche avec les valeurs du formulaire
  const handleSearch = (values: Record<string, any>) => {
    // Filtrer pour ne garder que les propriétés compatibles avec SearchServicesInput
    const filteredValues: SearchServicesInput = {
      page: values.page || 1,
      limit: values.limit || 10,
      categoryId: values.categoryId,
      query: values.keywords,
      maxPrice: values.priceRange?.max,
      location: values.location
        ? {
            lat: values.location.lat,
            lng: values.location.lng}
        : undefined,
      maxDistance: values.location?.radius,
      date: values.dateRange?.from};

    setSearchParams(filteredValues);
  };

  // Fonction pour réinitialiser la recherche
  const resetSearch = () => {
    setSearchParams(null);
  };

  // Fonction pour naviguer vers la page de détail d'un service
  const goToServiceDetails = (serviceId: string) => {
    router.push(`/[locale]/(protected)/client/services/${serviceId}`);
  };

  // Fonction pour gérer la pagination
  const handlePageChange = (page: number) => {
    if (searchParams) {
      setSearchParams({ ...searchParams, page  });
    } else {
      setSearchParams({ page, limit: 10  });
    }
  };

  // Fonction pour filtrer par catégorie
  const filterByCategory = (categoryId: string) => {
    const newParams: SearchServicesInput = {
      ...(searchParams || { limit: 10 }),
      categoryId,
      page: 1, // Reset page to 1 when filtering
    };

    setSearchParams(newParams);
  };

  // Fonction pour gérer le changement de tri (ajoutée pour éviter l'erreur)
  const handleSortChange = (sortBy: string) => {
    if (searchParams) {
      setSearchParams({ ...searchParams,
        page: 1 });
    }
  };

  // Fonction pour mettre à jour les filtres (ajoutée pour éviter l'erreur)
  const updateFilters = (filters: Partial<SearchServicesInput>) => {
    if (searchParams) {
      setSearchParams({ ...searchParams,
        ...filters,
        page: 1, // Reset page to 1 when changing filters
       });
    } else {
      setSearchParams({
        ...filters,
        page: 1,
        limit: 10} as SearchServicesInput);
    }
  };

  // Gérer les erreurs de recherche
  if (searchQuery.error) {
    toast.error(searchQuery.error.message || t("errors.searchFailed"));
  }

  // Préparer les informations de pagination
  const pagination = searchQuery.data
    ? {
        currentPage: searchParams?.page || 1,
        totalPages: Math.ceil(
          (searchQuery.data.pagination?.total || 0) /
            (searchParams?.limit || 10),
        ),
        totalCount: searchQuery.data.pagination?.total || 0}
    : null;

  return {
    // Données
    serviceCategories: categoriesQuery.data || [],
    services: searchQuery.data?.services || [],
    pagination,
    searchParams,

    // États de chargement
    isLoading: searchQuery.isLoading || categoriesQuery.isLoading,
    isLoadingCategories: categoriesQuery.isLoading,

    // Fonctions
    handleSearch,
    resetSearch,
    goToServiceDetails,
    handlePageChange,
    handleSortChange,
    filterByCategory,
    updateFilters};
}
