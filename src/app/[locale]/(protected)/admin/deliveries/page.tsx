import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { DeliveryDashboard } from '@/components/admin/deliveries/delivery-dashboard';
import { DeliveryIssues } from '@/components/admin/deliveries/delivery-issues';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, Download, FileBarChart, MapPin, RefreshCw, Truck } from 'lucide-react';
import { api } from '@/trpc/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('admin.deliveries');

  return {
    title: t('metadata.title'),
    description: t('metadata.description'),
  };
}

export default async function AdminDeliveriesPage() {
  const t = await getTranslations('admin.deliveries');

  // Récupérer les statistiques des livraisons depuis l'API
  const deliveryStats = await api.adminDashboard.getDeliveryStats.query();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Suivi des Livraisons</h1>
          <p className="text-muted-foreground">
            Suivez en temps réel toutes les livraisons sur la plateforme
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Actualiser
          </Button>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Exporter
          </Button>
          <Button variant="outline" size="sm">
            <FileBarChart className="mr-2 h-4 w-4" />
            Rapports
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Livraisons En Cours</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{deliveryStats.inProgressDeliveries}</div>
            <p className="text-xs text-muted-foreground">
              {deliveryStats.deliveriesToday} nouvelles livraisons aujourd'hui
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taux de Livraison à Temps</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(deliveryStats.onTimeDeliveryRate * 100)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {deliveryStats.completedToday} livraisons terminées aujourd'hui
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Temps Moyen de Livraison</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4 text-muted-foreground"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{deliveryStats.averageDeliveryTime}m</div>
            <p className="text-xs text-muted-foreground">
              {deliveryStats.averageDeliveryTime < deliveryStats.previousAverageDeliveryTime
                ? `-${Math.round(deliveryStats.previousAverageDeliveryTime - deliveryStats.averageDeliveryTime)}m`
                : `+${Math.round(deliveryStats.averageDeliveryTime - deliveryStats.previousAverageDeliveryTime)}m`}
              par rapport au mois dernier
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Incidents Signalés</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{deliveryStats.pendingIssues}</div>
            <p className="text-xs text-muted-foreground">
              {deliveryStats.todayIssues} nouveaux incidents aujourd'hui
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="map" className="space-y-4">
        <TabsList>
          <TabsTrigger value="map" className="flex items-center">
            <MapPin className="mr-2 h-4 w-4" />
            Carte en temps réel
          </TabsTrigger>
          <TabsTrigger value="list" className="flex items-center">
            <Truck className="mr-2 h-4 w-4" />
            Liste des livraisons
          </TabsTrigger>
          <TabsTrigger value="issues" className="flex items-center">
            <AlertTriangle className="mr-2 h-4 w-4" />
            Incidents
          </TabsTrigger>
        </TabsList>

        <TabsContent value="map" className="m-0">
          <Card>
            <CardHeader>
              <CardTitle>{t('liveTracking')}</CardTitle>
              <CardDescription>{t('liveTrackingDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <DeliveryDashboard />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="list" className="m-0">
          <Card>
            <CardHeader>
              <CardTitle>Liste des Livraisons</CardTitle>
              <CardDescription>Consultez et gérez toutes les livraisons actives</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {/* La liste des livraisons sera ajoutée ultérieurement */}
              <div className="p-6 text-center text-muted-foreground">
                La liste des livraisons apparaîtra ici
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="issues" className="m-0">
          <DeliveryIssues />
        </TabsContent>
      </Tabs>
    </div>
  );
}
