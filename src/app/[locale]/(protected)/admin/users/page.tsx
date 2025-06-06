'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { api } from '@/trpc/react';
import { UserFilters } from '@/types/actors/admin';
import UserStatsAdvanced from '@/components/admin/users/user-stats-advanced';
import UserBulkActions from '@/components/admin/users/user-bulk-actions';
import UserTable from '@/components/admin/users/user-table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { AlertCircleIcon, DownloadIcon, PlusIcon, UsersIcon } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function AdminUsersPage() {
  const t = useTranslations('Admin.verification.users');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<string>('list');
  const [filters, setFilters] = useState<UserFilters>({});

  // Statistiques globales des utilisateurs
  const statsQuery = api.adminUser.getUserStats.useQuery();

  // Récupération des utilisateurs avec filtres
  const usersQuery = api.adminUser.getUsers.useQuery({
    page: 1,
    limit: 10,
    ...filters,
  });

  // Gérer la sélection des utilisateurs
  const handleUserSelection = (userIds: string[]) => {
    setSelectedUserIds(userIds);
  };

  // Fonction appelée après une action en masse réussie
  const handleBulkActionComplete = () => {
    setSelectedUserIds([]);
    statsQuery.refetch();
    usersQuery.refetch();
  };

  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="flex flex-col space-y-2 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground">{t('subtitle')}</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <DownloadIcon className="mr-2 h-4 w-4" />
            {t('actions.export') || 'Exporter'}
          </Button>
          <Button size="sm">
            <PlusIcon className="mr-2 h-4 w-4" />
            {t('actions.addUser') || 'Ajouter un utilisateur'}
          </Button>
          <UserBulkActions
            selectedUserIds={selectedUserIds}
            onActionComplete={handleBulkActionComplete}
            disabled={selectedUserIds.length === 0}
          />
        </div>
      </div>

      <Separator />

      <Tabs
        defaultValue="list"
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="list" className="flex items-center">
              <UsersIcon className="mr-2 h-4 w-4" />
              {t('tabs.all')}
            </TabsTrigger>
            <TabsTrigger value="stats">{t('stats.title')}</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="list" className="space-y-4">
          {statsQuery.isLoading ? (
            <Card>
              <CardHeader>
                <CardTitle>{t('title')}</CardTitle>
                <CardDescription>{t('subtitle')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex h-[400px] items-center justify-center">
                  <p className="text-sm text-muted-foreground">Chargement des utilisateurs...</p>
                </div>
              </CardContent>
            </Card>
          ) : statsQuery.isError ? (
            <Alert variant="destructive">
              <AlertCircleIcon className="h-4 w-4" />
              <AlertTitle>Erreur</AlertTitle>
              <AlertDescription>
                Impossible de charger les utilisateurs. Veuillez réessayer ultérieurement.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              <Card>
                <CardHeader className="p-4">
                  <CardTitle className="text-xl">{t('quickStats')}</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <div className="flex flex-col space-y-1">
                      <span className="text-sm text-muted-foreground">{t('totalUsers')}</span>
                      <span className="text-2xl font-bold">{statsQuery.data?.totalUsers}</span>
                    </div>
                    <div className="flex flex-col space-y-1">
                      <span className="text-sm text-muted-foreground">{t('activeUsers')}</span>
                      <span className="text-2xl font-bold">{statsQuery.data?.activeUsers}</span>
                    </div>
                    <div className="flex flex-col space-y-1">
                      <span className="text-sm text-muted-foreground">{t('newToday')}</span>
                      <span className="text-2xl font-bold">{statsQuery.data?.newUsersToday}</span>
                    </div>
                    <div className="flex flex-col space-y-1">
                      <span className="text-sm text-muted-foreground">
                        {t('pendingVerification')}
                      </span>
                      <span className="text-2xl font-bold">
                        {statsQuery.data?.usersByVerification?.unverified || 0}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Table des utilisateurs */}
              <UserTable
                users={usersQuery.data?.users || []}
                selectedUserIds={selectedUserIds}
                onSelectionChange={handleUserSelection}
                isLoading={usersQuery.isLoading}
              />
            </div>
          )}
        </TabsContent>

        <TabsContent value="stats">
          <UserStatsAdvanced
            initialFilters={{
              period: 'MONTH',
              compareWithPrevious: true,
              breakdownByRole: true,
              breakdownByStatus: true,
              breakdownByCountry: true,
              includeRetentionRate: true,
              includeChurnRate: true,
              includeGrowthRate: true,
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
