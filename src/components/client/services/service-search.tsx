"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useServiceSearch } from "@/hooks/client/use-client-services";
import { ServiceCard } from "@/components/shared/services/service-card";
import { ServiceSearchForm } from "@/components/client/services/search/service-search-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Pagination, 
  PaginationContent, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious 
} from "@/components/ui/pagination";
import { FilterIcon, Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { type ServiceSearchFilters } from "@/types/client/services";

/**
 * Composant qui affiche une liste de services avec filtres et pagination
 * Utilisé sur la page principale des services pour les clients
 */
export function ServiceList() {
  const t = useTranslations("services");
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const {
    results: services,
    total,
    hasMore,
    availableFilters,
    filters,
    isLoading,
    error,
    search,
    updateFilters,
    clearFilters,
    refetch
  } = useServiceSearch();

  // Fonctions de gestion
  const toggleFilters = () => {
    setShowFilters(!showFilters);
  };

  const handleSearch = (newFilters: ServiceSearchFilters) => {
    setCurrentPage(1);
    search(newFilters);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    updateFilters({ ...filters });
  };

  // Calcul de la pagination
  const totalPages = Math.ceil(total / itemsPerPage);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{t("title")}</h2>
        <Button variant="outline" onClick={toggleFilters} className="md:hidden">
          <FilterIcon className="h-4 w-4 mr-2" />
          {t("search.filters")}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Formulaire de recherche - visible en desktop ou quand le toggle est activé */}
        <div
          className={`md:col-span-4 lg:col-span-3 ${showFilters ? "block" : "hidden md:block"}`}
        >
          <ServiceSearchForm
            onSearch={handleSearch}
            filters={filters}
            availableFilters={availableFilters}
            className="sticky top-24"
          />
        </div>

        {/* Liste des services */}
        <div className="md:col-span-8 lg:col-span-9">
          {/* Résultats et filtres actifs */}
          {total > 0 && (
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-muted-foreground">
                {total} service(s) trouvé(s)
              </div>
              {Object.keys(filters).length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  className="text-xs"
                >
                  Effacer filtres
                </Button>
              )}
            </div>
          )}

          {error && (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-red-600">Erreur: {error}</p>
                <Button variant="outline" onClick={refetch} className="mt-2">
                  Réessayer
                </Button>
              </CardContent>
            </Card>
          )}

          {isLoading ? (
            /* Affichage du loading state */
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <Card key={index}>
                  <CardContent className="p-6 space-y-4">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <div className="flex space-x-4">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                    <Skeleton className="h-10 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : services && services.length > 0 ? (
            /* Affichage des services */
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4">
                {services.map((service) => (
                  <ServiceCard 
                    key={service.id} 
                    service={service}
                    onBook={(serviceId) => {
                      // Naviguer vers la page de réservation
                      window.location.href = `/client/services/${serviceId}/book`;
                    }}
                    onView={(serviceId) => {
                      // Naviguer vers les détails du service
                      window.location.href = `/client/services/${serviceId}`;
                    }}
                    onContact={(providerId) => {
                      // Naviguer vers les messages
                      window.location.href = `/client/messages?provider=${providerId}`;
                    }}
                  />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => currentPage > 1 && handlePageChange(currentPage - 1)}
                        className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                      />
                    </PaginationItem>
                    
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const page = i + 1;
                      return (
                        <PaginationItem key={page}>
                          <PaginationLink
                            onClick={() => handlePageChange(page)}
                            isActive={page === currentPage}
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })}
                    
                    <PaginationItem>
                      <PaginationNext
                        onClick={() => currentPage < totalPages && handlePageChange(currentPage + 1)}
                        className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </div>
          ) : (
            /* Aucun service trouvé */
            <Card>
              <CardContent className="p-6 text-center">
                <Search className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-2">Aucun service trouvé</p>
                <p className="text-sm text-muted-foreground">
                  Essayez de modifier vos critères de recherche
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
