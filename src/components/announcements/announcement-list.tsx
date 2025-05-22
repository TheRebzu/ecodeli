'use client';

import { useAnnouncement } from '@/hooks/use-announcement';
import { AnnouncementCard } from './announcement-card';
import { AnnouncementFilter } from './announcement-filter';
import { useTranslations } from 'next-intl';
import { Announcement, AnnouncementStatus } from '@/types/announcement';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, RefreshCw } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Pagination } from '@/components/ui/pagination';

type AnnouncementListProps = {
  title?: string;
  description?: string;
  announcementList?: Announcement[];
  isClientView?: boolean;
  isLoading?: boolean;
  showFilters?: boolean;
  emptyMessage?: string;
  pageSize?: number;
};

export function AnnouncementList({
  title,
  description,
  announcementList,
  isClientView = true,
  isLoading = false,
  showFilters = true,
  emptyMessage,
  pageSize = 10,
}: AnnouncementListProps) {
  const t = useTranslations('announcements');
  const router = useRouter();
  const {
    myAnnouncements,
    allAnnouncements,
    isLoading: isLoadingAnnouncements,
    filters,
    updateFilters,
    nextPage,
    prevPage,
  } = useAnnouncement();

  // État local pour l'actualisation
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Utiliser les annonces fournies en props ou celles du hook
  const announcements =
    announcementList ||
    (isClientView ? myAnnouncements?.announcements : allAnnouncements?.announcements);
  const totalCount = announcementList
    ? announcementList.length
    : (isClientView ? myAnnouncements?.totalCount : allAnnouncements?.totalCount) || 0;
  const loading = isLoading || isLoadingAnnouncements || isRefreshing;
  const hasMore = announcementList
    ? announcementList.length > pageSize
    : (isClientView
        ? myAnnouncements?.pagination?.hasMore
        : allAnnouncements?.pagination?.hasMore) || false;

  // Fonction pour actualiser la liste
  const refreshList = () => {
    setIsRefreshing(true);
    router.refresh();
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1000);
  };

  // Fonction pour créer une nouvelle annonce
  const createNewAnnouncement = () => {
    router.push('/client/announcements/create');
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <CardTitle>{title || t('myAnnouncements')}</CardTitle>
            <CardDescription>{description || t('myAnnouncementsDescription')}</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={refreshList} disabled={loading}>
              {isRefreshing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              {t('refresh')}
            </Button>
            {isClientView && (
              <Button size="sm" onClick={createNewAnnouncement}>
                <Plus className="mr-2 h-4 w-4" />
                {t('newAnnouncement')}
              </Button>
            )}
          </div>
        </div>

        {/* Statistiques rapides */}
        {isClientView && myAnnouncements && (
          <div className="flex flex-wrap gap-2 mt-4">
            <Badge variant="outline" className="px-3 py-1">
              {t('total')}: {totalCount}
            </Badge>
            <Badge variant="outline" className="px-3 py-1">
              {t('pending')}:{' '}
              {myAnnouncements.announcements?.filter(a => a.status === AnnouncementStatus.PENDING)
                .length || 0}
            </Badge>
            <Badge variant="outline" className="px-3 py-1">
              {t('published')}:{' '}
              {myAnnouncements.announcements?.filter(a => a.status === AnnouncementStatus.PUBLISHED)
                .length || 0}
            </Badge>
            <Badge variant="outline" className="px-3 py-1">
              {t('assigned')}:{' '}
              {myAnnouncements.announcements?.filter(a => a.status === AnnouncementStatus.ASSIGNED)
                .length || 0}
            </Badge>
            <Badge variant="outline" className="px-3 py-1">
              {t('completed')}:{' '}
              {myAnnouncements.announcements?.filter(a => a.status === AnnouncementStatus.COMPLETED)
                .length || 0}
            </Badge>
          </div>
        )}
      </CardHeader>

      {/* Filtres */}
      {showFilters && (
        <div className="px-6">
          <AnnouncementFilter />
        </div>
      )}

      <CardContent className="py-4">
        {loading ? (
          // Squelettes de chargement
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex flex-col space-y-3">
                <Skeleton className="h-8 w-1/3" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        ) : announcements && announcements.length > 0 ? (
          // Liste des annonces
          <div className="space-y-4">
            {announcements.map(announcement => (
              <AnnouncementCard
                key={announcement.id}
                announcement={announcement}
                isClientView={isClientView}
              />
            ))}
          </div>
        ) : (
          // Message quand il n'y a pas d'annonces
          <div className="text-center py-8">
            <p className="text-muted-foreground">{emptyMessage || t('noAnnouncementsFound')}</p>
            {isClientView && (
              <Button variant="outline" className="mt-4" onClick={createNewAnnouncement}>
                <Plus className="mr-2 h-4 w-4" />
                {t('createFirstAnnouncement')}
              </Button>
            )}
          </div>
        )}
      </CardContent>

      {/* Pagination */}
      {announcements && announcements.length > 0 && (
        <CardFooter className="flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            {t('showingResults', {
              from: (filters.offset || 0) + 1,
              to: Math.min((filters.offset || 0) + announcements.length, totalCount),
              total: totalCount,
            })}
          </div>
          <Pagination>
            <Button
              variant="outline"
              size="sm"
              onClick={prevPage}
              disabled={(filters.offset || 0) === 0}
            >
              {t('previous')}
            </Button>
            <Button variant="outline" size="sm" onClick={nextPage} disabled={!hasMore}>
              {t('next')}
            </Button>
          </Pagination>
        </CardFooter>
      )}
    </Card>
  );
}
