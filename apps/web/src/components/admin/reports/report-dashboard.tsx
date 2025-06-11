'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { api } from '@/trpc/react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DownloadIcon, RefreshCw, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { SalesReport } from '@/components/admin/reports/sales-report';
import { UserActivityReport } from '@/components/admin/reports/user-activity-report';
import { DeliveryPerformanceReport } from '@/components/admin/reports/delivery-performance-report';
import { ReportFilters } from '@/components/admin/reports/report-filters';
import { toast } from 'sonner';
import { AreaChart, BarChart, LineChart, PieChart } from '@/components/ui/charts';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatCurrency, generateChartColors } from '@/utils/document-utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { InfoCircle, MapPin } from 'lucide-react';
import {
  DeliveryPerformanceReport as DeliveryPerformanceReportType,
  SalesReport as SalesReportType,
  UserActivityReport as UserActivityReportType,
} from '@/types/administration/reports';

interface ReportDashboardProps {
  salesReport: SalesReportType;
  deliveryPerformance: DeliveryPerformanceReportType;
  userActivity: UserActivityReportType;
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
}

export function ReportDashboard({
  salesReport,
  deliveryPerformance,
  userActivity,
  dateRange,
}: ReportDashboardProps) {
  const t = useTranslations('admin.reports');
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('sales');
  const [granularity, setGranularity] = useState('day');
  const [filters, setFilters] = useState({
    startDate: format(new Date(new Date().setDate(1)), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    comparison: false,
    categoryFilter: '',
    userRoleFilter: '',
  });

  // Méthode pour formater les dates pour affichage
  const formatDateRange = () => {
    const startDate = new Date(filters.startDate);
    const endDate = new Date(filters.endDate);
    return `${format(startDate, 'dd MMM yyyy', { locale: fr })} - ${format(endDate, 'dd MMM yyyy', { locale: fr })}`;
  };

  // Requête pour les données de ventes
  const salesQuery = api.admin.getSalesReport.useQuery(
    {
      startDate: new Date(filters.startDate),
      endDate: new Date(filters.endDate),
      granularity: filters.granularity,
      comparison: filters.comparison,
      categoryFilter: filters.categoryFilter || undefined,
    },
    {
      enabled: activeTab === 'sales',
    }
  );

  // Requête pour les données d'activité utilisateur
  const userActivityQuery = api.admin.getUserActivityReport.useQuery(
    {
      startDate: new Date(filters.startDate),
      endDate: new Date(filters.endDate),
      granularity: filters.granularity,
      comparison: filters.comparison,
      userRoleFilter: filters.userRoleFilter || undefined,
    },
    {
      enabled: activeTab === 'user-activity',
    }
  );

  // Requête pour les données de performance de livraison
  const deliveryPerformanceQuery = api.admin.getDeliveryPerformanceReport.useQuery(
    {
      startDate: new Date(filters.startDate),
      endDate: new Date(filters.endDate),
      granularity: filters.granularity,
      comparison: filters.comparison,
    },
    {
      enabled: activeTab === 'delivery-performance',
    }
  );

  const handleFilterChange = (newFilters: Partial<typeof filters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleRefresh = () => {
    if (activeTab === 'sales') {
      salesQuery.refetch();
    } else if (activeTab === 'user-activity') {
      userActivityQuery.refetch();
    } else if (activeTab === 'delivery-performance') {
      deliveryPerformanceQuery.refetch();
    }
  };

  const handleExport = async () => {
    try {
      // Logique pour l'export selon le rapport actif
      let response;

      if (activeTab === 'sales') {
        response = await fetch('/api/export/sales-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(filters),
        });
      } else if (activeTab === 'user-activity') {
        response = await fetch('/api/export/user-activity-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(filters),
        });
      } else if (activeTab === 'delivery-performance') {
        response = await fetch('/api/export/delivery-performance-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(filters),
        });
      }

      if (response && response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${activeTab}-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success(t('exportSuccess'));
      } else {
        throw new Error('Export failed');
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error(t('exportError'));
    }
  };

  // Préparer les données pour le graphique de ventes
  const salesChartData =
    salesReport?.timeSeriesData?.map(item => ({
      name: item.period,
      value: item.value,
    })) || [];

  const prevSalesChartData =
    salesReport?.comparisonTimeSeriesData?.map(item => ({
      name: item.period,
      value: item.value,
    })) || [];

  // Préparer les données pour le graphique de performance de livraison
  const deliveryRateData =
    deliveryPerformance?.onTimeDeliveryRate?.map(item => ({
      name: item.period,
      rate: item.rate,
    })) || [];

  // Préparer les données pour le graphique d'activité utilisateur
  const userSignupsData =
    userActivity?.signupsTimeSeriesData?.map(item => ({
      name: item.period,
      value: item.value,
    })) || [];

  const userLoginsData =
    userActivity?.loginsTimeSeriesData?.map(item => ({
      name: item.period,
      value: item.value,
    })) || [];

  // Préparer les couleurs pour les graphiques
  const salesByCategory = salesReport?.salesByCategory || [];
  const categoryColors = generateChartColors(salesByCategory.length);

  const pieChartData = salesByCategory.map((category, index) => ({
    name: category.name,
    value: category.value,
    color: categoryColors[index],
  }));

  // Données pour le graphique de temps moyen par zone
  const timesByZone = deliveryPerformance?.deliveryTimesByZone || [];

  return (
    <div className="space-y-6">
      {/* En-tête avec filtres et actions */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex flex-col md:flex-row gap-2 items-start md:items-center">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium">{formatDateRange()}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            {t('refresh')}
          </Button>
          <Button onClick={handleExport} variant="outline" size="sm">
            <DownloadIcon className="mr-2 h-4 w-4" />
            {t('export')}
          </Button>
        </div>
      </div>

      {/* Filtres de rapport */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>{t('filters.title')}</CardTitle>
          <CardDescription>{t('filters.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <ReportFilters filters={filters} onFilterChange={handleFilterChange} />
        </CardContent>
      </Card>

      {/* Onglets de rapports */}
      <Card>
        <CardHeader>
          <CardTitle>{t('reportsTitle')}</CardTitle>
          <CardDescription>{t('reportsDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <div className="flex justify-between items-center">
              <TabsList>
                <TabsTrigger value="sales">Ventes</TabsTrigger>
                <TabsTrigger value="delivery">Performance</TabsTrigger>
                <TabsTrigger value="users">Utilisateurs</TabsTrigger>
              </TabsList>

              <div className="flex gap-2 items-center">
                <Select value={granularity} onValueChange={setGranularity}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Granularité" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Journalier</SelectItem>
                    <SelectItem value="week">Hebdomadaire</SelectItem>
                    <SelectItem value="month">Mensuel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <TabsContent value="sales" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Chiffre d'affaires</CardTitle>
                    <CardDescription>Période actuelle vs précédente</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatCurrency(salesReport.summary.totalSales)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {salesReport.summary.percentChange > 0 ? '+' : ''}
                      {salesReport.summary.percentChange.toFixed(1)}% vs période précédente
                    </p>
                    <div className="h-[200px] mt-4">
                      <LineChart
                        data={salesChartData}
                        comparisonData={prevSalesChartData}
                        categories={['value']}
                        index="name"
                        colors={['#22c55e', '#94a3b8']}
                        valueFormatter={value => formatCurrency(value)}
                        showLegend={true}
                        showGridLines={false}
                        showYAxis={true}
                        showXAxis={true}
                        startEndOnly={true}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Répartition des ventes</CardTitle>
                    <CardDescription>Par catégorie de service</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[200px]">
                      <PieChart
                        data={pieChartData}
                        category="value"
                        index="name"
                        valueFormatter={value => formatCurrency(value)}
                        colors={categoryColors}
                      />
                    </div>
                    <div className="mt-2 max-h-[100px] overflow-auto">
                      {salesByCategory.map((category, index) => (
                        <div
                          key={category.name}
                          className="flex justify-between items-center text-xs mb-1"
                        >
                          <div className="flex items-center">
                            <div
                              className="w-3 h-3 rounded-full mr-2"
                              style={{ backgroundColor: categoryColors[index] }}
                            ></div>
                            <span className="truncate max-w-[150px]">{category.name}</span>
                          </div>
                          <span className="font-medium">{formatCurrency(category.value)}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Indicateurs clés</CardTitle>
                    <CardDescription>Résumé des performances</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Nombre de factures</p>
                          <p className="text-xl font-bold">
                            {salesReport.summary.numberOfInvoices}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Valeur moyenne</p>
                          <p className="text-xl font-bold">
                            {formatCurrency(salesReport.summary.averageOrderValue)}
                          </p>
                        </div>
                      </div>

                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Croissance des ventes</p>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full ${salesReport.summary.percentChange > 0 ? 'bg-green-500' : 'bg-red-500'}`}
                            style={{
                              width: `${Math.min(100, Math.abs(salesReport.summary.percentChange))}%`,
                            }}
                          ></div>
                        </div>
                        <div className="flex justify-between mt-1 text-xs">
                          <span>0%</span>
                          <span>50%</span>
                          <span>100%</span>
                        </div>
                      </div>

                      <div className="pt-2 border-t">
                        <p className="text-sm text-muted-foreground mb-2">Tendance mensuelle</p>
                        <div className="flex justify-between items-end h-16">
                          {salesChartData.slice(-6).map((item, i) => (
                            <div key={i} className="flex flex-col items-center">
                              <div
                                className="w-6 bg-primary rounded-sm"
                                style={{
                                  height: `${(item.value / salesReport.summary.totalSales) * 100}%`,
                                  minHeight: '4px',
                                }}
                              ></div>
                              <span className="text-xs mt-1">{item.name.slice(-2)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="delivery" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Taux de livraison à temps</CardTitle>
                    <CardDescription>Évolution sur la période</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {Math.round(deliveryPerformance.performanceSummary.onTimePercentage)}%
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {deliveryPerformance.performanceSummary.percentChange > 0 ? '+' : ''}
                      {deliveryPerformance.performanceSummary.percentChange.toFixed(1)}% vs période
                      précédente
                    </p>
                    <div className="h-[200px] mt-4">
                      <AreaChart
                        data={deliveryRateData}
                        categories={['rate']}
                        index="name"
                        colors={['#3b82f6']}
                        valueFormatter={value => `${Math.round(value)}%`}
                        showLegend={false}
                        showGridLines={false}
                        startEndOnly={true}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Temps moyen par zone</CardTitle>
                    <CardDescription>En minutes</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[200px]">
                      <BarChart
                        data={timesByZone}
                        categories={['averageTime']}
                        index="zone"
                        colors={timesByZone.map(zone => zone.color)}
                        valueFormatter={value => `${Math.round(value)} min`}
                        layout="vertical"
                        showLegend={false}
                      />
                    </div>
                    <div className="mt-4">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[100px]">Zone</TableHead>
                            <TableHead>Temps moyen</TableHead>
                            <TableHead className="text-right">Performance</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {timesByZone.slice(0, 4).map(zone => (
                            <TableRow key={zone.zone}>
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-3 w-3" />
                                  {zone.zone}
                                </div>
                              </TableCell>
                              <TableCell>{Math.round(zone.averageTime)} min</TableCell>
                              <TableCell className="text-right">
                                <Badge variant={zone.averageTime < 45 ? 'success' : 'destructive'}>
                                  {zone.averageTime < 30
                                    ? 'Excellent'
                                    : zone.averageTime < 45
                                      ? 'Bon'
                                      : zone.averageTime < 60
                                        ? 'Moyen'
                                        : 'Lent'}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Problèmes principaux</CardTitle>
                    <CardDescription>Types d'incidents</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[200px]">
                      {deliveryPerformance.deliveryIssues && (
                        <PieChart
                          data={deliveryPerformance.deliveryIssues}
                          category="percentage"
                          index="issueType"
                          valueFormatter={value => `${Math.round(value)}%`}
                          colors={deliveryPerformance.deliveryIssues.map(issue => issue.color)}
                        />
                      )}
                    </div>
                    <div className="mt-4">
                      {deliveryPerformance.deliveryIssues &&
                        deliveryPerformance.deliveryIssues.map(issue => (
                          <div
                            key={issue.issueType}
                            className="flex justify-between items-center text-sm mb-2"
                          >
                            <div className="flex items-center">
                              <div
                                className="w-3 h-3 rounded-full mr-2"
                                style={{ backgroundColor: issue.color }}
                              ></div>
                              <span>{issue.issueType}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">
                                {issue.count} cas
                              </span>
                              <Badge variant="outline">{Math.round(issue.percentage)}%</Badge>
                            </div>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Livraisons par statut</CardTitle>
                  <CardDescription>Répartition des livraisons sur la période</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    {deliveryPerformance.deliveriesByStatus &&
                      deliveryPerformance.deliveriesByStatus.map(status => (
                        <Card key={status.status} className="bg-muted/40">
                          <CardContent className="p-4">
                            <div
                              className="w-full h-1 mb-2 rounded-full"
                              style={{ backgroundColor: status.color }}
                            ></div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium">{status.status}</span>
                              <Badge variant="outline">{status.count}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {Math.round(
                                (status.count /
                                  deliveryPerformance.performanceSummary.totalDeliveries) *
                                  100
                              )}
                              % du total
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="users" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Nouvelles inscriptions</CardTitle>
                    <CardDescription>Évolution sur la période</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{userActivity.summary.totalSignups}</div>
                    <p className="text-xs text-muted-foreground">
                      {userActivity.summary.signupsPercentChange > 0 ? '+' : ''}
                      {userActivity.summary.signupsPercentChange.toFixed(1)}% vs période précédente
                    </p>
                    <div className="h-[200px] mt-4">
                      <LineChart
                        data={userSignupsData}
                        comparisonData={userActivity.comparisonSignupsData?.map(item => ({
                          name: item.period,
                          value: item.value,
                        }))}
                        categories={['value']}
                        index="name"
                        colors={['#8b5cf6', '#94a3b8']}
                        valueFormatter={value => `${value}`}
                        showLegend={true}
                        showGridLines={false}
                        showYAxis={true}
                        showXAxis={true}
                        startEndOnly={true}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Connexions utilisateurs</CardTitle>
                    <CardDescription>Activité quotidienne</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{userActivity.summary.totalLogins}</div>
                    <p className="text-xs text-muted-foreground">
                      {userActivity.summary.uniqueLogins} utilisateurs uniques actifs
                    </p>
                    <div className="h-[200px] mt-4">
                      <AreaChart
                        data={userLoginsData}
                        categories={['value']}
                        index="name"
                        colors={['#ec4899']}
                        valueFormatter={value => `${value}`}
                        showLegend={false}
                        showGridLines={false}
                        startEndOnly={true}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Répartition par rôle</CardTitle>
                  <CardDescription>Utilisateurs inscrits sur la période</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-5">
                    {userActivity.usersByRole?.map((role, index) => (
                      <Card key={role.role} className="bg-muted/40">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-center mb-2">
                            <h4 className="font-semibold">{role.role}</h4>
                            <Badge className="ml-2">{role.count}</Badge>
                          </div>
                          <div className="h-1 w-full bg-muted-foreground/20 rounded-full overflow-hidden">
                            <div
                              className="bg-primary h-1"
                              style={{
                                width: `${Math.round((role.count / userActivity.summary.totalSignups) * 100)}%`,
                                backgroundColor: generateChartColors(5)[index],
                              }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {Math.round((role.count / userActivity.summary.totalSignups) * 100)}% du
                            total
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
