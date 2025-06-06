import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ReportDashboard } from '@/components/admin/reports/report-dashboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CalendarRange,
  Download,
  FileBarChart,
  MapPin,
  PieChart,
  TrendingUp,
  Truck,
  Users,
} from 'lucide-react';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { api } from '@/trpc/server';
import { formatDate, getCurrentDateRange } from '@/utils/document-utils';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('admin.reports');

  return {
    title: t('metadata.title'),
    description: t('metadata.description'),
  };
}

export default async function AdminReportsPage() {
  const t = await getTranslations('admin.reports');

  // Obtenir la plage de dates par défaut (30 derniers jours)
  const { startDate, endDate } = getCurrentDateRange(30);

  // Récupérer les rapports depuis l'API
  const salesReport = await api.adminDashboard.getSalesReport.query({
    startDate,
    endDate,
    granularity: 'day',
    comparison: true,
  });

  const deliveryPerformance = await api.adminDashboard.getDeliveryPerformanceReport.query({
    startDate,
    endDate,
    granularity: 'day',
    comparison: true,
  });

  const userActivity = await api.adminDashboard.getUserActivityReport.query({
    startDate,
    endDate,
    granularity: 'day',
    comparison: true,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Rapports et Statistiques</h1>
          <p className="text-muted-foreground">
            Analysez les données de la plateforme et téléchargez des rapports
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Exporter CSV
          </Button>
          <Button variant="outline" size="sm">
            <FileBarChart className="mr-2 h-4 w-4" />
            Exporter PDF
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <Tabs defaultValue="performance" className="w-full md:w-auto">
          <TabsList>
            <TabsTrigger value="performance" className="flex items-center">
              <TrendingUp className="mr-2 h-4 w-4" />
              Performance
            </TabsTrigger>
            <TabsTrigger value="zones" className="flex items-center">
              <MapPin className="mr-2 h-4 w-4" />
              Zones
            </TabsTrigger>
            <TabsTrigger value="deliverers" className="flex items-center">
              <Truck className="mr-2 h-4 w-4" />
              Livreurs
            </TabsTrigger>
            <TabsTrigger value="clients" className="flex items-center">
              <Users className="mr-2 h-4 w-4" />
              Clients
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
          <CalendarRange className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground mr-2">Période :</span>
          <DateRangePicker
            defaultDateRange={{
              from: startDate,
              to: endDate,
            }}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total des Livraisons</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {deliveryPerformance.performanceSummary.totalDeliveries.toLocaleString('fr-FR')}
            </div>
            <p className="text-xs text-muted-foreground">
              {deliveryPerformance.performanceSummary.percentChange > 0 ? '+' : ''}
              {deliveryPerformance.performanceSummary.percentChange.toFixed(1)}% par rapport à la
              période précédente
            </p>
            <div className="mt-4 h-1 w-full bg-muted-foreground/20 rounded-full overflow-hidden">
              <div
                className="bg-primary h-1"
                style={{
                  width: `${Math.min(100, (deliveryPerformance.performanceSummary.totalDeliveries / 2000) * 100)}%`,
                }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>Cette période</span>
              <span>Objectif: 2,000</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Temps Moyen</CardTitle>
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
            <div className="text-2xl font-bold">
              {Math.round(deliveryPerformance.performanceSummary.averageDeliveryTime)} minutes
            </div>
            <p className="text-xs text-muted-foreground">
              {deliveryPerformance.performanceSummary.previousAverageDeliveryTime &&
              deliveryPerformance.performanceSummary.averageDeliveryTime <
                deliveryPerformance.performanceSummary.previousAverageDeliveryTime
                ? '-'
                : '+'}
              {Math.abs(
                Math.round(
                  deliveryPerformance.performanceSummary.averageDeliveryTime -
                    (deliveryPerformance.performanceSummary.previousAverageDeliveryTime || 0)
                )
              )}
              m par rapport à la période précédente
            </p>
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs">
                <span>Temps total de livraison</span>
                <span className="font-medium">
                  {Math.round(deliveryPerformance.performanceSummary.averageDeliveryTime)}m
                </span>
              </div>
              <div className="flex items-center justify-between text-xs mt-1">
                <span>Taux de livraison à temps</span>
                <span className="font-medium">
                  {Math.round(deliveryPerformance.performanceSummary.onTimePercentage)}%
                </span>
              </div>
              <div className="flex items-center justify-between text-xs mt-1">
                <span>Taux d'annulation</span>
                <span className="font-medium">
                  {Math.round(deliveryPerformance.performanceSummary.cancelRate)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Satisfaction Client</CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4.8/5</div>
            <p className="text-xs text-muted-foreground">
              +0.2 par rapport à la période précédente
            </p>
            <div className="mt-4 grid grid-cols-5 gap-1">
              <div className="h-1.5 bg-primary rounded-full"></div>
              <div className="h-1.5 bg-primary rounded-full"></div>
              <div className="h-1.5 bg-primary rounded-full"></div>
              <div className="h-1.5 bg-primary rounded-full"></div>
              <div className="h-1.5 bg-primary/60 rounded-full"></div>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>Basé sur 836 avis</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('analytics')}</CardTitle>
          <CardDescription>
            Données pour la période du {formatDate(startDate)} au {formatDate(endDate)}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ReportDashboard
            salesReport={salesReport}
            deliveryPerformance={deliveryPerformance}
            userActivity={userActivity}
            dateRange={{ startDate, endDate }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
