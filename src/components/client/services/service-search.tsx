'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useSearchServices } from '@/hooks/use-search-services';
import { ServiceCard } from '@/components/shared/services/service-card';
import { ServiceSearchForm } from './search/service-search-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Pagination } from '@/components/ui/pagination';
import { FilterIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

// Interface complète pour le service
interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: number;
  category: {
    name: string;
  };
  provider: {
    name: string;
    rating?: number;
    providerAddress?: string;
  };
}

/**
 * Composant qui affiche une liste de services avec filtres et pagination
 * Utilisé sur la page principale des services pour les clients
 */
export function ServiceList() {
  const t = useTranslations('services');
  const [showFilters, setShowFilters] = useState(false);
  const {
    services,
    isLoading,
    pagination,
    handlePageChange,
    handleSearch,
    handleSortChange,
    updateFilters,
  } = useSearchServices();

  // Fonction pour basculer l'affichage des filtres
  const toggleFilters = () => {
    setShowFilters(!showFilters);
  };

  // Items par page basés sur le hook useSearchServices
  const itemsPerPage = 10;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{t('title')}</h2>
        <Button variant="outline" onClick={toggleFilters} className="md:hidden">
          <FilterIcon className="h-4 w-4 mr-2" />
          {t('search.filters')}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Formulaire de recherche - visible en desktop ou quand le toggle est activé */}
        <div className={`md:col-span-4 lg:col-span-3 ${showFilters ? 'block' : 'hidden md:block'}`}>
          <ServiceSearchForm onSearch={values => handleSearch(values)} className="sticky top-24" />
        </div>

        {/* Liste des services */}
        <div className="md:col-span-8 lg:col-span-9">
          {isLoading ? (
            /* Affichage du loading state */
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <Card key={index}>
                  <CardContent className="p-0">
                    <div className="p-6 space-y-4">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                      <div className="flex space-x-4">
                        <Skeleton className="h-3 w-24" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                      <Skeleton className="h-10 w-full" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : services && services.length > 0 ? (
            /* Affichage des services */
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4">
                {services.map((service: Service) => (
                  <ServiceCard key={service.id} service={service} />
                ))}
              </div>

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex justify-center mt-8">
                  <Pagination
                    currentPage={pagination.currentPage}
                    totalItems={pagination.totalCount}
                    itemsPerPage={itemsPerPage}
                    onPageChange={handlePageChange}
                  />
                </div>
              )}
            </div>
          ) : (
            /* Aucun service trouvé */
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">{t('search.noResults')}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
