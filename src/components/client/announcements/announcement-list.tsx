'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Loader2, PackageX, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AnnouncementCard } from '@/components/shared/announcements/announcement-card';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { useMediaQuery } from '@/hooks/use-media-query';
import { AnnouncementStatus, UserRole, type Announcement } from '@prisma/client';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

// Type étendu pour inclure des champs de recherche
interface AnnouncementFilterInput {
  limit?: number;
  page?: number;
  search?: string;
  type?: string | string[];
  status?: string | string[];
  // Autres champs possibles...
}

type AnnouncementWithDetails = Announcement & {
  client?: {
    id: string;
    name: string;
    image?: string | null;
    rating?: number;
  };
  deliverer?: {
    id: string;
    userId: string;
    name: string;
    image?: string | null;
    rating?: number;
  };
  applications?: Array<{
    id: string;
    delivererId: string;
    status: string;
    proposedPrice: number;
    createdAt: Date;
  }>;
  isFavorite?: boolean;
  distance?: number;
};

interface AnnouncementListProps {
  announcements: AnnouncementWithDetails[];
  isLoading: boolean;
  userRole?: UserRole;
  totalCount: number;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onSearchChange?: (query: string) => void;
  onFavoriteToggle?: (id: string) => void;
  onApply?: (id: string) => void;
  onCancel?: (id: string) => void;
  onPayNow?: (id: string) => void;
  onViewDetails?: (id: string) => void;
  emptyStateTitle?: string;
  emptyStateMessage?: string;
  emptyStateAction?: {
    label: string;
    onClick: () => void;
  };
  filters?: Partial<AnnouncementFilterInput>;
  className?: string;
}

export const AnnouncementList: React.FC<AnnouncementListProps> = ({
  announcements,
  isLoading,
  userRole,
  totalCount,
  currentPage,
  totalPages,
  onPageChange,
  onSearchChange,
  onFavoriteToggle,
  onApply,
  onCancel,
  onPayNow,
  onViewDetails,
  emptyStateTitle,
  emptyStateMessage,
  emptyStateAction,
  filters,
  className,
}) => {
  const t = useTranslations('Announcements');
  const [searchQuery, setSearchQuery] = React.useState(filters?.search || '');
  const isMobile = useMediaQuery('(max-width: 640px)');
  const isTablet = useMediaQuery('(max-width: 1024px)');

  // Gérer la pagination pour l'affichage
  const displayPages = () => {
    const maxVisiblePages = isMobile ? 3 : isTablet ? 5 : 7;
    const pages = [];

    // Si peu de pages, afficher toutes les pages
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
      return pages;
    }

    // Sinon, utiliser un algorithme pour afficher les pages pertinentes
    const halfVisiblePages = Math.floor(maxVisiblePages / 2);

    // Cas 1: Près du début
    if (currentPage <= halfVisiblePages + 1) {
      for (let i = 1; i <= maxVisiblePages - 1; i++) {
        pages.push(i);
      }
      pages.push(null); // Ellipsis
      pages.push(totalPages);
      return pages;
    }

    // Cas 2: Près de la fin
    if (currentPage >= totalPages - halfVisiblePages) {
      pages.push(1);
      pages.push(null); // Ellipsis
      for (let i = totalPages - (maxVisiblePages - 2); i <= totalPages; i++) {
        pages.push(i);
      }
      return pages;
    }

    // Cas 3: Au milieu
    pages.push(1);
    pages.push(null); // Ellipsis
    for (
      let i = currentPage - Math.floor((maxVisiblePages - 4) / 2);
      i <= currentPage + Math.ceil((maxVisiblePages - 4) / 2);
      i++
    ) {
      pages.push(i);
    }
    pages.push(null); // Ellipsis
    pages.push(totalPages);
    return pages;
  };

  // Gérer le changement de recherche
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearchChange?.(searchQuery);
  };

  // État vide
  const renderEmptyState = () => {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <PackageX className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-xl font-semibold mb-2">{emptyStateTitle || t('emptyState.title')}</h3>
        <p className="text-muted-foreground mb-6 max-w-md">
          {emptyStateMessage || t('emptyState.message')}
        </p>
        {emptyStateAction && (
          <Button onClick={emptyStateAction.onClick}>{emptyStateAction.label}</Button>
        )}
      </div>
    );
  };

  // État de chargement
  const renderLoadingState = () => {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-lg font-medium">{t('loading')}</span>
      </div>
    );
  };

  return (
    <div className={className}>
      {/* Barre de recherche */}
      {onSearchChange && (
        <form onSubmit={handleSearchSubmit} className="mb-6 flex space-x-2">
          <div className="relative flex-grow">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder={t('search.placeholder')}
              className="pl-9"
              value={searchQuery}
              onChange={handleSearchChange}
            />
          </div>
          <Button type="submit">{t('search.button')}</Button>
        </form>
      )}

      {/* Statut de la recherche */}
      {totalCount > 0 && (
        <div className="text-sm text-muted-foreground mb-4">
          {t('totalResults', { count: totalCount })}
        </div>
      )}

      {/* Liste des annonces */}
      {isLoading ? (
        renderLoadingState()
      ) : announcements.length === 0 ? (
        renderEmptyState()
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {announcements.map(announcement => (
            <AnnouncementCard
              key={announcement.id}
              id={announcement.id}
              title={announcement.title}
              description={announcement.description}
              type={announcement.type}
              status={announcement.status as AnnouncementStatus}
              price={announcement.suggestedPrice || announcement.finalPrice || 0}
              distance={announcement.distance}
              pickupAddress={announcement.pickupAddress}
              deliveryAddress={announcement.deliveryAddress}
              pickupDate={announcement.pickupDate}
              deliveryDate={announcement.deliveryDate}
              createdAt={announcement.createdAt}
              isFavorite={announcement.isFavorite}
              userRole={userRole}
              clientName={announcement.client?.name}
              clientImage={announcement.client?.image || undefined}
              clientRating={announcement.client?.rating}
              delivererName={announcement.deliverer?.name}
              delivererImage={announcement.deliverer?.image || undefined}
              delivererRating={announcement.deliverer?.rating}
              onFavoriteToggle={onFavoriteToggle}
              onApply={onApply}
              onCancel={onCancel}
              onPayNow={onPayNow}
              onViewDetails={onViewDetails}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {!isLoading && announcements.length > 0 && totalPages > 1 && (
        <Pagination className="mt-6">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={e => {
                  e.preventDefault();
                  if (currentPage > 1) {
                    onPageChange(currentPage - 1);
                  }
                }}
                className={cn(currentPage === 1 && 'pointer-events-none opacity-50')}
              />
            </PaginationItem>

            {displayPages().map((page, i) => (
              <PaginationItem key={`page-${page || `ellipsis-${i}`}`}>
                {page === null ? (
                  <PaginationEllipsis />
                ) : (
                  <PaginationLink
                    href="#"
                    onClick={e => {
                      e.preventDefault();
                      onPageChange(page);
                    }}
                    isActive={page === currentPage}
                  >
                    {page}
                  </PaginationLink>
                )}
              </PaginationItem>
            ))}

            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={e => {
                  e.preventDefault();
                  if (currentPage < totalPages) {
                    onPageChange(currentPage + 1);
                  }
                }}
                className={cn(currentPage === totalPages && 'pointer-events-none opacity-50')}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
};

export default AnnouncementList;
