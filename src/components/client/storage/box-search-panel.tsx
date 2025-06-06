'use client';

import { useState } from 'react';
import { BoxSearchForm } from '@/components/client/storage/box-search';
import { BoxSearchInput } from '@/schemas/storage/storage.schema';
import { useBoxSearch } from '@/hooks/common/use-storage';
import { BoxDetailCard } from '@/components/client/storage/box-detail-card';
import { BoxReservationForm } from '@/components/client/storage/box-reservation-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslations } from 'next-intl';
import { BoxWithWarehouse } from '@/types/warehouses/storage-box';
import { ArrowLeft, Search, AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

export function BoxSearchPanel() {
  const t = useTranslations('storage');
  const [searchParams, setSearchParams] = useState<BoxSearchInput | null>(null);
  const [selectedBox, setSelectedBox] = useState<BoxWithWarehouse | null>(null);
  const { boxes, isLoading } = useBoxSearch();

  const handleSearch = (data: BoxSearchInput) => {
    setSearchParams(data);
    setSelectedBox(null);
  };

  const handleSelectBox = (box: BoxWithWarehouse) => {
    setSelectedBox(box);
  };

  const handleBackToResults = () => {
    setSelectedBox(null);
  };

  // Fonction de rendu conditionnel selon l'état
  const renderContent = () => {
    // Si une box est sélectionnée, afficher le formulaire de réservation
    if (selectedBox && searchParams) {
      return (
        <div className="space-y-4">
          <Button
            variant="ghost"
            className="flex items-center gap-2 mb-4"
            onClick={handleBackToResults}
          >
            <ArrowLeft className="h-4 w-4" />
            {t('search.backToResults')}
          </Button>
          <BoxReservationForm
            box={selectedBox}
            startDate={searchParams.startDate}
            endDate={searchParams.endDate}
            onBack={handleBackToResults}
          />
        </div>
      );
    }

    // Si recherche en cours, afficher les résultats ou message si aucun résultat
    if (searchParams) {
      if (isLoading) {
        return (
          <div className="space-y-4">
            <SearchResultsSkeleton />
          </div>
        );
      }

      if (boxes && boxes.length === 0) {
        return (
          <Alert variant="destructive" className="mt-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{t('search.noResults')}</AlertTitle>
            <AlertDescription>{t('search.tryDifferentCriteria')}</AlertDescription>
          </Alert>
        );
      }

      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">
              {t('search.resultsTitle', { count: boxes?.length || 0 })}
            </h3>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
              onClick={() => setSearchParams(null)}
            >
              <Search className="h-4 w-4" />
              {t('search.newSearch')}
            </Button>
          </div>

          <ScrollArea className="h-[calc(100vh-400px)]">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {boxes?.map((box: BoxWithWarehouse) => (
                <BoxDetailCard
                  key={box.id}
                  box={box}
                  onSelect={handleSelectBox}
                  startDate={searchParams.startDate}
                  endDate={searchParams.endDate}
                  compact
                />
              ))}
            </div>
          </ScrollArea>
        </div>
      );
    }

    // Par défaut, afficher le formulaire de recherche
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('search.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <BoxSearchForm onSearch={handleSearch} />
        </CardContent>
      </Card>
    );
  };

  return <div className="space-y-6">{renderContent()}</div>;
}

function SearchResultsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array(6)
        .fill(0)
        .map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <div className="p-2">
              <Skeleton className="h-40 w-full" />
              <div className="space-y-2 mt-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-10 w-full mt-4" />
              </div>
            </div>
          </Card>
        ))}
    </div>
  );
}
