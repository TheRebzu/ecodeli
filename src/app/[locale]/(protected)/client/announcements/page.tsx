'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus, Filter, RefreshCw, AlertCircle } from 'lucide-react';
import { Link } from '@/navigation';
import { useClientAnnouncements } from '@/hooks/use-announcement';
import AnnouncementList from '@/components/announcements/announcement-list';
import { AnnouncementFilter } from '@/components/announcements/announcement-filter';
import { ClientStatusDashboard } from '@/components/announcements/client-status-dashboard';
import { DeliveryStatus, UserRole } from '@prisma/client';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDescription, AlertTitle, Alert } from '@/components/ui/alert';
import { useRoleProtection } from '@/hooks/use-role-protection';
import { Separator } from '@/components/ui/separator';
import { type Announcement } from '@/types/announcement';

export default function ClientAnnouncementsPage() {
  useRoleProtection(['CLIENT']);
  const t = useTranslations('announcements');
  const [activeTab, setActiveTab] = useState('active');
  const [showFilters, setShowFilters] = useState(false);

  const {
    myAnnouncements,
    isLoading,
    error,
    fetchMyAnnouncements,
    fetchActiveAnnouncements,
    fetchAnnouncementHistory,
    resetError,
  } = useClientAnnouncements({
    initialFilter: {
      limit: 10,
      page: 1,
      status: ['PUBLISHED', 'IN_APPLICATION', 'ASSIGNED', 'IN_PROGRESS'],
    },
  });

  // Charger les annonces actives ou historiques selon l'onglet, mais en évitant la boucle infinie
  useEffect(() => {
    const loadAnnouncements = async () => {
      if (activeTab === 'active') {
        await fetchActiveAnnouncements();
      } else {
        await fetchAnnouncementHistory();
      }
    };
    
    loadAnnouncements();
    // Ne pas inclure fetchActiveAnnouncements et fetchAnnouncementHistory dans les dépendances
    // car ces fonctions peuvent changer à chaque rendu, créant une boucle infinie
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  const refreshAnnouncements = () => {
    if (activeTab === 'active') {
      fetchActiveAnnouncements();
    } else {
      fetchAnnouncementHistory();
    }
  };

  // Adapter les données pour les composants
  // Conversion du type AnnouncementWithDetails vers Announcement pour ClientStatusDashboard
  const announcementsForDashboard = myAnnouncements.map(announcement => {
    return {
      id: announcement.id,
      title: announcement.title,
      description: announcement.description,
      type: announcement.type,
      status: announcement.status,
      priority: announcement.priority || 'MEDIUM',
      pickupAddress: announcement.pickupAddress,
      deliveryAddress: announcement.deliveryAddress,
      isFragile: announcement.isFragile || false,
      needsCooling: announcement.needsCooling || false,
      isFlexible: announcement.isFlexible || false,
      isNegotiable: announcement.isNegotiable || false,
      clientId: announcement.clientId,
      client: announcement.client,
      delivererId: announcement.delivererId,
      deliverer: announcement.deliverer,
      createdAt: announcement.createdAt,
      updatedAt: announcement.updatedAt,
      viewCount: announcement.viewCount || 0,
      applicationsCount: announcement.applications?.length || 0,
      tags: announcement.tags || [],
      photos: announcement.photos || [],
      requiresSignature: announcement.requiresSignature || false,
      requiresId: announcement.requiresId || false,
      isFavorite: announcement.isFavorite || false,
      applications: announcement.applications
    } as Announcement;
  });

  return (
    <div className="container py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('myAnnouncements')}</h1>
          <p className="text-muted-foreground mt-1">{t('manageYourAnnouncements')}</p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="h-4 w-4 mr-2" />
            {t('filter')}
          </Button>

          <Button variant="outline" size="sm" onClick={refreshAnnouncements} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            {t('refresh')}
          </Button>

          <Button asChild>
            <Link href="/client/announcements/create">
              <Plus className="h-4 w-4 mr-2" />
              {t('createNew')}
            </Link>
          </Button>
        </div>
      </div>

      {/* Dashboard de statistiques - adapté aux types attendus */}
      <ClientStatusDashboard announcements={announcementsForDashboard} />

      <Separator className="my-6" />

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t('error')}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Filtres conditionnels avec props corrects */}
      {showFilters && (
        <div className="mb-6">
          <AnnouncementFilter
            onFilterChange={() => {
              // Appliquer le filtre (ajuster selon les props attendus)
              if (activeTab === 'active') {
                fetchActiveAnnouncements();
              } else {
                fetchAnnouncementHistory();
              }
            }}
            onReset={() => {
              if (activeTab === 'active') {
                fetchActiveAnnouncements();
              } else {
                fetchAnnouncementHistory();
              }
            }}
          />
        </div>
      )}

      <Tabs defaultValue="active" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="active">{t('activeAnnouncements')}</TabsTrigger>
          <TabsTrigger value="history">{t('announcementHistory')}</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {isLoading ? (
            // Placeholder de chargement
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-[200px] w-full rounded-lg" />
              ))}
            </div>
          ) : myAnnouncements.length === 0 ? (
            // Message quand il n'y a pas d'annonces
            <div className="text-center py-12 bg-muted/50 rounded-lg">
              <h3 className="text-lg font-medium">{t('noActiveAnnouncements')}</h3>
              <p className="text-muted-foreground mt-2">{t('createAnnouncementPrompt')}</p>
              <Button asChild className="mt-4">
                <Link href="/client/announcements/create">{t('createAnnouncement')}</Link>
              </Button>
            </div>
          ) : (
            // Liste des annonces avec props corrects
            <AnnouncementList
              announcements={myAnnouncements}
              isLoading={isLoading}
              userRole={"CLIENT" as UserRole}
              totalCount={myAnnouncements.length}
              currentPage={1}
              totalPages={1}
              onPageChange={page => fetchMyAnnouncements(page)}
              emptyStateTitle={t('noActiveAnnouncements')}
              emptyStateMessage={t('createAnnouncementPrompt')}
            />
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {isLoading ? (
            // Placeholder de chargement
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-[200px] w-full rounded-lg" />
              ))}
            </div>
          ) : myAnnouncements.length === 0 ? (
            // Message quand il n'y a pas d'annonces
            <div className="text-center py-12 bg-muted/50 rounded-lg">
              <h3 className="text-lg font-medium">{t('noAnnouncementHistory')}</h3>
              <p className="text-muted-foreground mt-2">
                {t('completedAnnouncementsWillAppearHere')}
              </p>
            </div>
          ) : (
            // Liste des annonces avec props corrects
            <AnnouncementList
              announcements={myAnnouncements}
              isLoading={isLoading}
              userRole={"CLIENT" as UserRole}
              totalCount={myAnnouncements.length}
              currentPage={1}
              totalPages={1}
              onPageChange={page => fetchMyAnnouncements(page)}
              emptyStateTitle={t('noAnnouncementHistory')}
              emptyStateMessage={t('completedAnnouncementsWillAppearHere')}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
