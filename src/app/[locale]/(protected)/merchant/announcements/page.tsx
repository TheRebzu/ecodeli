'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { api } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { AnnouncementList } from '@/components/client/announcements/announcement-list';
import { AnnouncementStats as AnnouncementStatsCards } from '@/components/admin/announcements/announcement-stats';
import { AnnouncementFilters } from '@/components/admin/announcements/announcement-filters';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, DownloadIcon, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function MerchantAnnouncementsPage() {
  const t = useTranslations('merchant.announcements');
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('all');
  const [filters, setFilters] = useState({
    status: '',
    searchTerm: '',
    startDate: '',
    endDate: '',
    page: 1,
    limit: 10,
  });

  // Récupérer les annonces du commerçant
  const announcementsQuery = api.merchant.announcements.getAll.useQuery(
    {
      status: filters.status || undefined,
      searchTerm: filters.searchTerm || undefined,
      startDate: filters.startDate ? new Date(filters.startDate) : undefined,
      endDate: filters.endDate ? new Date(filters.endDate) : undefined,
      page: filters.page,
      limit: filters.limit,
    },
    {
      // Désactiver la revalidation automatique pour éviter trop de requêtes
      refetchOnWindowFocus: false,
    }
  );

  // Récupérer les statistiques des annonces
  const statsQuery = api.merchant.announcements.getStats.useQuery();

  const handleCreateNew = () => {
    router.push('/merchant/announcements/create');
  };

  const handleBulkImport = () => {
    // Ajout futur pour l'importation par lot
    toast.info(t('bulkImportComingSoon'));
  };

  const handleExport = () => {
    // Ajout futur pour l'exportation
    toast.info(t('exportComingSoon'));
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);

    // Mettre à jour les filtres en fonction de l'onglet sélectionné
    if (value === 'all') {
      setFilters(prev => ({ ...prev, status: '' }));
    } else if (value === 'draft') {
      setFilters(prev => ({ ...prev, status: 'DRAFT' }));
    } else if (value === 'active') {
      setFilters(prev => ({ ...prev, status: 'ACTIVE' }));
    } else if (value === 'inactive') {
      setFilters(prev => ({ ...prev, status: 'INACTIVE' }));
    } else if (value === 'expired') {
      setFilters(prev => ({ ...prev, status: 'EXPIRED' }));
    }
  };

  const handleFilterChange = (newFilters: Partial<typeof filters>) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageHeader heading={t('title')} description={t('description')} />
        <div className="flex gap-2">
          <Button onClick={handleCreateNew}>
            <Plus className="mr-2 h-4 w-4" />
            {t('createNew')}
          </Button>
          <Button variant="outline" onClick={handleBulkImport}>
            <Upload className="mr-2 h-4 w-4" />
            {t('bulkImport')}
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <DownloadIcon className="mr-2 h-4 w-4" />
            {t('export')}
          </Button>
        </div>
      </div>

      {/* Cartes de statistiques */}
      {statsQuery.data && <AnnouncementStatsCards data={statsQuery.data} />}

      {/* Section des filtres et des onglets */}
      <Card>
        <CardHeader>
          <CardTitle>{t('yourAnnouncements')}</CardTitle>
          <CardDescription>{t('manageYourAnnouncements')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">{t('tabs.all')}</TabsTrigger>
              <TabsTrigger value="draft">{t('tabs.draft')}</TabsTrigger>
              <TabsTrigger value="active">{t('tabs.active')}</TabsTrigger>
              <TabsTrigger value="inactive">{t('tabs.inactive')}</TabsTrigger>
              <TabsTrigger value="expired">{t('tabs.expired')}</TabsTrigger>
            </TabsList>

            <div className="mb-4">
              <AnnouncementFilters filters={filters} onFilterChange={handleFilterChange} />
            </div>

            <TabsContent value="all" className="m-0">
              <AnnouncementList
                announcements={announcementsQuery.data?.items || []}
                isLoading={announcementsQuery.isLoading}
                isError={announcementsQuery.isError}
                totalPages={announcementsQuery.data?.totalPages || 1}
                currentPage={filters.page}
                onPageChange={handlePageChange}
              />
            </TabsContent>

            {['draft', 'active', 'inactive', 'expired'].map(tab => (
              <TabsContent key={tab} value={tab} className="m-0">
                <AnnouncementList
                  announcements={announcementsQuery.data?.items || []}
                  isLoading={announcementsQuery.isLoading}
                  isError={announcementsQuery.isError}
                  totalPages={announcementsQuery.data?.totalPages || 1}
                  currentPage={filters.page}
                  onPageChange={handlePageChange}
                />
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
