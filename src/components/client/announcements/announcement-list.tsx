"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Loader2, PackageX, Search, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnnouncementCard } from "@/components/shared/announcements/announcement-card";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious
} from "@/components/ui/pagination";
import { useMediaQuery } from "@/hooks/common/use-media-query";
import { 
  type ClientAnnouncement, 
  type AnnouncementCard as AnnouncementCardType,
  convertToAnnouncementCard, 
  addAnnouncementCardHandlers 
} from "@/types/client/announcements";
import { cn } from "@/lib/utils/common";
import { Input } from "@/components/ui/input";

interface AnnouncementListProps {
  announcements: ClientAnnouncement[];
  isLoading?: boolean;
  totalCount?: number;
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  onSearchChange?: (query: string) => void;
  onView?: (id: string) => void;
  onEdit?: (id: string) => void;
  onCancel?: (id: string) => void;
  onTrack?: (id: string) => void;
  onRate?: (id: string) => void;
  onViewProposals?: (id: string) => void;
  emptyStateTitle?: string;
  emptyStateMessage?: string;
  emptyStateAction?: {
    label: string;
    onClick: () => void;
  };
  searchQuery?: string;
  className?: string;
}

export const AnnouncementList: React.FC<AnnouncementListProps> = ({
  announcements,
  isLoading = false,
  totalCount = 0,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  onSearchChange,
  onView,
  onEdit,
  onCancel,
  onTrack,
  onRate,
  onViewProposals,
  emptyStateTitle,
  emptyStateMessage,
  emptyStateAction,
  searchQuery = "",
  className
}) => {
  const t = useTranslations("announcements");
  const [localSearchQuery, setLocalSearchQuery] = React.useState(searchQuery);
  const isMobile = useMediaQuery("(max-width: 640px)");
  const isTablet = useMediaQuery("(max-width: 1024px)");

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
      const i = currentPage - Math.floor((maxVisiblePages - 4) / 2);
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
    setLocalSearchQuery(value);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearchChange?.(localSearchQuery);
  };

  // État vide
  const renderEmptyState = () => {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <PackageX className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-xl font-semibold mb-2">
          {emptyStateTitle || t("emptyState.title")}
        </h3>
        <p className="text-muted-foreground mb-6 max-w-md">
          {emptyStateMessage || t("emptyState.message")}
        </p>
        {emptyStateAction && (
          <Button onClick={emptyStateAction.onClick}>
            {emptyStateAction.label}
          </Button>
        )}
      </div>
    );
  };

  // État de chargement
  const renderLoadingState = () => {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-lg font-medium">{t("loading")}</span>
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
              placeholder={t("search.placeholder")}
              className="pl-9"
              value={localSearchQuery}
              onChange={handleSearchChange}
            />
          </div>
          <Button type="submit">{t("search.button")}</Button>
        </form>
      )}

      {/* Statut de la recherche */}
      {totalCount > 0 && (
        <div className="text-sm text-muted-foreground mb-4">
          {t("totalResults", { count: totalCount })}
        </div>
      )}

      {/* Liste des annonces */}
      {isLoading ? (
        renderLoadingState()
      ) : announcements.length === 0 ? (
        renderEmptyState()
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {announcements.map((announcement) => {
            const cardProps = convertToAnnouncementCard(announcement);
            const propsWithHandlers = addAnnouncementCardHandlers(cardProps, {
              onView: onView || (() => {}),
              onEdit: onEdit || (() => {}),
              onCancel: onCancel || (() => {}),
              onTrack: onTrack || (() => {}),
              onRate: onRate || (() => {}),
              onViewProposals: onViewProposals || (() => {}),
            });

            return (
              <AnnouncementCard
                key={announcement.id}
                {...propsWithHandlers}
              />
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {!isLoading && announcements.length > 0 && totalPages > 1 && (
        <Pagination className="mt-6">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (currentPage > 1) {
                    onPageChange(currentPage - 1);
                  }
                }}
                className={cn(
                  currentPage === 1 && "pointer-events-none opacity-50",
                )}
              />
            </PaginationItem>

            {displayPages().map((page, i) => (
              <PaginationItem key={`page-${page || `ellipsis-${i}`}`}>
                {page === null ? (
                  <PaginationEllipsis />
                ) : (
                  <PaginationLink
                    href="#"
                    onClick={(e) => {
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
                onClick={(e) => {
                  e.preventDefault();
                  if (currentPage < totalPages) {
                    onPageChange(currentPage + 1);
                  }
                }}
                className={cn(
                  currentPage === totalPages &&
                    "pointer-events-none opacity-50",
                )}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
};

export default AnnouncementList;
