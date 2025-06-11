'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { AnnouncementTable } from '@/components/admin/announcements/announcement-table';
import { AnnouncementStats } from '@/components/admin/announcements/announcement-stats';
import { AnnouncementFilters } from '@/components/admin/announcements/announcement-filters';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, DownloadIcon, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { api } from '@/trpc/react';

// Traductions temporaires en dur pour résoudre le problème de cache
const hardcodedTranslations = {
  refresh: 'Actualiser',
  export: 'Exporter',
  allAnnouncements: 'Toutes les annonces',
  manageAllAnnouncements: 'Gérez et modérez toutes les annonces',
  tabs: {
    all: 'Toutes',
    pending: 'En attente',
    assigned: 'Assignées',
    completed: 'Terminées',
    problems: 'Problèmes'
  }
};

export function AnnouncementDashboard() {
  const t = useTranslations('admin.announcements');
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('all');
  const [filters, setFilters] = useState({
    status: '',
    type: '',
    searchTerm: '',
    startDate: '',
    endDate: '',
    page: 1,
    limit: 10,
  });

  const announcementsQuery = api.announcement.getAll.useQuery({
    status: filters.status || undefined,
    type: filters.type || undefined,
    searchTerm: filters.searchTerm || undefined,
    startDate: filters.startDate ? new Date(filters.startDate) : undefined,
    endDate: filters.endDate ? new Date(filters.endDate) : undefined,
    page: filters.page,
    limit: filters.limit,
  });

  const statsQuery = api.announcement.getStats.useQuery({
    startDate: filters.startDate ? new Date(filters.startDate) : undefined,
    endDate: filters.endDate ? new Date(filters.endDate) : undefined,
  });

  const handleTabChange = (value: string) => {
    setActiveTab(value);

    // Mettre à jour les filtres en fonction de l'onglet sélectionné
    if (value === 'all') {
      setFilters(prev => ({ ...prev, status: '' }));
    } else if (value === 'pending') {
      setFilters(prev => ({ ...prev, status: 'PUBLISHED' }));
    } else if (value === 'assigned') {
      setFilters(prev => ({ ...prev, status: 'ASSIGNED' }));
    } else if (value === 'completed') {
      setFilters(prev => ({ ...prev, status: 'COMPLETED' }));
    } else if (value === 'problems') {
      setFilters(prev => ({ ...prev, status: 'PROBLEM' }));
    }
  };

  const handleFilterChange = (newFilters: Partial<typeof filters>) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
  };

  const handleRefresh = () => {
    announcementsQuery.refetch();
    statsQuery.refetch();
  };

  const handleExport = async () => {
    // TODO: Implémenter l'export des données
    console.log('Export des données');
  };

  // Fonction helper pour obtenir les traductions avec fallback DIRECT
  const getTranslation = (key: string): string => {
    // Utiliser directement les traductions en dur pour éviter les erreurs
    const keys = key.split('.');
    let value: any = hardcodedTranslations;
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return key; // Retourner la clé si pas trouvée
      }
    }
    return value || key;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between gap-4">
        <div className="flex gap-2">
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            {getTranslation('refresh')}
          </Button>
          <Button onClick={handleExport} variant="outline" size="sm">
            <DownloadIcon className="mr-2 h-4 w-4" />
            {getTranslation('export')}
          </Button>
        </div>
      </div>

      {statsQuery.data && <AnnouncementStats data={statsQuery.data} />}

      <Card>
        <CardHeader>
          <CardTitle>{getTranslation('allAnnouncements')}</CardTitle>
          <CardDescription>{getTranslation('manageAllAnnouncements')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">{getTranslation('tabs.all')}</TabsTrigger>
              <TabsTrigger value="pending">{getTranslation('tabs.pending')}</TabsTrigger>
              <TabsTrigger value="assigned">{getTranslation('tabs.assigned')}</TabsTrigger>
              <TabsTrigger value="completed">{getTranslation('tabs.completed')}</TabsTrigger>
              <TabsTrigger value="problems">{getTranslation('tabs.problems')}</TabsTrigger>
            </TabsList>

            <div className="mb-4">
              <AnnouncementFilters filters={filters} onFilterChange={handleFilterChange} />
            </div>

            <TabsContent value="all" className="m-0">
              <AnnouncementTable
                announcements={announcementsQuery.data?.announcements || []}
                isLoading={announcementsQuery.isLoading}
                totalPages={announcementsQuery.data?.totalPages || 1}
                currentPage={filters.page}
                onPageChange={handlePageChange}
              />
            </TabsContent>
            <TabsContent value="pending" className="m-0">
              <AnnouncementTable
                announcements={announcementsQuery.data?.announcements || []}
                isLoading={announcementsQuery.isLoading}
                totalPages={announcementsQuery.data?.totalPages || 1}
                currentPage={filters.page}
                onPageChange={handlePageChange}
              />
            </TabsContent>
            <TabsContent value="assigned" className="m-0">
              <AnnouncementTable
                announcements={announcementsQuery.data?.announcements || []}
                isLoading={announcementsQuery.isLoading}
                totalPages={announcementsQuery.data?.totalPages || 1}
                currentPage={filters.page}
                onPageChange={handlePageChange}
              />
            </TabsContent>
            <TabsContent value="completed" className="m-0">
              <AnnouncementTable
                announcements={announcementsQuery.data?.announcements || []}
                isLoading={announcementsQuery.isLoading}
                totalPages={announcementsQuery.data?.totalPages || 1}
                currentPage={filters.page}
                onPageChange={handlePageChange}
              />
            </TabsContent>
            <TabsContent value="problems" className="m-0">
              <AnnouncementTable
                announcements={announcementsQuery.data?.announcements || []}
                isLoading={announcementsQuery.isLoading}
                totalPages={announcementsQuery.data?.totalPages || 1}
                currentPage={filters.page}
                onPageChange={handlePageChange}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
