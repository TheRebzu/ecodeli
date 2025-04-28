'use client';

import { useState } from 'react';
import { api } from '@/trpc/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import UserStatsCard from './cards/UserStatsCard';
import DocumentStatsCard from './cards/DocumentStatsCard';
import TransactionStatsCard from './cards/TransactionStatsCard';
import WarehouseStatsCard from './cards/WarehouseStatsCard';
import DeliveryStatsCard from './cards/DeliveryStatsCard';
import RecentActivitiesCard from './cards/RecentActivitiesCard';
import ActionItemsCard from './cards/ActionItemsCard';
import ActivityChartCard from './cards/ActivityChartCard';

const DashboardOverview = () => {
  const [activeTab, setActiveTab] = useState<string>('overview');

  // Utiliser le hook tRPC pour récupérer les données du dashboard
  const { data, isLoading, error } = api.adminDashboard.getDashboardData.useQuery(undefined, {
    refetchOnWindowFocus: false,
    refetchInterval: 5 * 60 * 1000, // Rafraîchir toutes les 5 minutes
  });

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <Card className="p-6">
        <CardHeader>
          <CardTitle className="text-red-500">Erreur</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Impossible de charger les données du tableau de bord: {error.message}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Tableau de bord administrateur</h1>

      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full md:w-auto grid-cols-2 md:grid-cols-4">
          <TabsTrigger value="overview">Vue d&apos;ensemble</TabsTrigger>
          <TabsTrigger value="users">Utilisateurs</TabsTrigger>
          <TabsTrigger value="operations">Opérations</TabsTrigger>
          <TabsTrigger value="finances">Finances</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <UserStatsCard data={data?.userStats} />
            <DocumentStatsCard data={data?.documentStats} />
            <ActionItemsCard data={data?.actionItems} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ActivityChartCard data={data?.activityChartData} />
            <RecentActivitiesCard data={data?.recentActivities} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <TransactionStatsCard data={data?.transactionStats} />
            <DeliveryStatsCard data={data?.deliveryStats} />
            <WarehouseStatsCard data={data?.warehouseStats} />
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 gap-6">
            <UserStatsCard data={data?.userStats} expanded />
            <DocumentStatsCard data={data?.documentStats} expanded />
          </div>
        </TabsContent>

        <TabsContent value="operations" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <DeliveryStatsCard data={data?.deliveryStats} expanded />
            <WarehouseStatsCard data={data?.warehouseStats} expanded />
          </div>
          <ActivityChartCard data={data?.activityChartData} expanded />
        </TabsContent>

        <TabsContent value="finances" className="space-y-6 mt-6">
          <TransactionStatsCard data={data?.transactionStats} expanded />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Composant de chargement
const DashboardSkeleton = () => (
  <div className="space-y-6">
    <h1 className="text-3xl font-bold">Tableau de bord administrateur</h1>

    <Tabs defaultValue="overview">
      <TabsList className="grid w-full md:w-auto grid-cols-2 md:grid-cols-4">
        <TabsTrigger value="overview">Vue d&apos;ensemble</TabsTrigger>
        <TabsTrigger value="users">Utilisateurs</TabsTrigger>
        <TabsTrigger value="operations">Opérations</TabsTrigger>
        <TabsTrigger value="finances">Finances</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-6 mt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2].map(i => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-64 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </TabsContent>
    </Tabs>
  </div>
);

export default DashboardOverview;
