'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { api } from '@/trpc/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  RefreshCw, 
  DownloadIcon, 
  Users, 
  Truck, 
  Package, 
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Clock,
  CheckCircle,
  Activity,
  BarChart3
} from 'lucide-react';
import { AreaChart, BarChart, LineChart, PieChart } from '@/components/ui/charts';
import { formatCurrency, generateChartColors } from '@/lib/utils';
import { AnnouncementStats } from '../announcements/announcement-stats';
import { DeliveryStats } from '../deliveries/delivery-stats';
import { toast } from 'sonner';

interface DashboardOverviewProps {
  className?: string;
}

export function DashboardOverview({ className }: DashboardOverviewProps) {
  const t = useTranslations('admin.dashboard');
  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setDate(new Date().getDate() - 30)),
    endDate: new Date(),
  });

  // Queries pour récupérer les données
  const overviewStatsQuery = api.adminDashboard.getOverviewStats.useQuery({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  });

  const announcementStatsQuery = api.announcement.getStats.useQuery({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  });

  const deliveryStatsQuery = api.delivery.getStats.useQuery({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  });

  const userStatsQuery = api.adminUser.getStats.useQuery({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  });

  const financialStatsQuery = api.financial.getStats.useQuery({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  });

  const handleRefresh = () => {
    overviewStatsQuery.refetch();
    announcementStatsQuery.refetch();
    deliveryStatsQuery.refetch();
    userStatsQuery.refetch();
    financialStatsQuery.refetch();
    toast.success('Données actualisées');
  };

  const handleExport = async () => {
    try {
      const response = await fetch('/api/admin/export/dashboard-overview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          activeTab,
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `dashboard-overview-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('Export réussi');
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Erreur lors de l\'export');
    }
  };

  const isLoading = 
    overviewStatsQuery.isLoading ||
    announcementStatsQuery.isLoading ||
    deliveryStatsQuery.isLoading ||
    userStatsQuery.isLoading ||
    financialStatsQuery.isLoading;

  // Données pour les graphiques
  const overviewData = overviewStatsQuery.data;
  const announcementData = announcementStatsQuery.data;
  const deliveryData = deliveryStatsQuery.data;
  const userData = userStatsQuery.data;
  const financialData = financialStatsQuery.data;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* En-tête avec actions */}
      <div className="flex flex-col md:flex-row md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Vue d'ensemble</h1>
          <p className="text-muted-foreground">
            Tableau de bord administrateur - Aperçu global des performances
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleRefresh} variant="outline" size="sm" disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
          <Button onClick={handleExport} variant="outline" size="sm">
            <DownloadIcon className="mr-2 h-4 w-4" />
            Exporter
          </Button>
        </div>
      </div>

      {/* Cartes de statistiques principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Utilisateurs Total</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {userData?.totalUsers?.toLocaleString() || '0'}
            </div>
            <p className="text-xs text-muted-foreground">
              {userData?.newUsersThisMonth > 0 ? '+' : ''}
              {userData?.newUsersThisMonth || 0} ce mois
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Livraisons Actives</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {deliveryData?.activeDeliveries || '0'}
            </div>
            <p className="text-xs text-muted-foreground">
              {deliveryData?.completedToday || 0} terminées aujourd'hui
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Annonces Publiées</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {announcementData?.totalPublished || '0'}
            </div>
            <p className="text-xs text-muted-foreground">
              {announcementData?.pendingReview || 0} en attente
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenus du Mois</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(financialData?.monthlyRevenue || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {financialData?.revenueGrowth > 0 ? '+' : ''}
              {financialData?.revenueGrowth?.toFixed(1) || 0}% vs mois dernier
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Onglets pour différentes vues */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="users">Utilisateurs</TabsTrigger>
          <TabsTrigger value="deliveries">Livraisons</TabsTrigger>
          <TabsTrigger value="announcements">Annonces</TabsTrigger>
          <TabsTrigger value="finance">Finances</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Activité générale */}
            <Card className="col-span-1 lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Activité Générale
                </CardTitle>
                <CardDescription>
                  Évolution des métriques clés sur les 30 derniers jours
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  {overviewData?.activityChart && (
                    <LineChart
                      data={overviewData.activityChart}
                      categories={['users', 'deliveries', 'announcements']}
                      index="date"
                      colors={['#3b82f6', '#22c55e', '#f59e0b']}
                      valueFormatter={(value) => value.toString()}
                      showLegend={true}
                      showGridLines={true}
                    />
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Statut des livraisons */}
            <Card>
              <CardHeader>
                <CardTitle>Statut des Livraisons</CardTitle>
                <CardDescription>Répartition actuelle</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  {deliveryData?.statusDistribution && (
                    <PieChart
                      data={deliveryData.statusDistribution}
                      category="count"
                      index="status"
                      valueFormatter={(value) => value.toString()}
                      colors={generateChartColors(deliveryData.statusDistribution.length)}
                    />
                  )}
                </div>
                <div className="mt-4 space-y-2">
                  {deliveryData?.statusDistribution?.map((status, index) => (
                    <div key={status.status} className="flex justify-between items-center text-sm">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: generateChartColors(deliveryData.statusDistribution.length)[index] }}
                        />
                        <span>{status.status}</span>
                      </div>
                      <Badge variant="outline">{status.count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Alertes et problèmes */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  Alertes Actives
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {overviewData?.alerts?.map((alert, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${
                          alert.severity === 'high' ? 'bg-red-500' :
                          alert.severity === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
                        }`} />
                        <div>
                          <p className="font-medium text-sm">{alert.title}</p>
                          <p className="text-xs text-muted-foreground">{alert.description}</p>
                        </div>
                      </div>
                      <Badge variant={alert.severity === 'high' ? 'destructive' : 'secondary'}>
                        {alert.severity}
                      </Badge>
                    </div>
                  )) || (
                    <div className="text-center py-6 text-muted-foreground">
                      <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                      <p>Aucune alerte active</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-500" />
                  Activité Récente
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {overviewData?.recentActivity?.map((activity, index) => (
                    <div key={index} className="flex items-start gap-3 p-2">
                      <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{activity.action}</p>
                        <p className="text-xs text-muted-foreground">{activity.timestamp}</p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {activity.type}
                      </Badge>
                    </div>
                  )) || (
                    <div className="text-center py-6 text-muted-foreground">
                      <Activity className="h-8 w-8 mx-auto mb-2" />
                      <p>Aucune activité récente</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Croissance des Utilisateurs</CardTitle>
                <CardDescription>Inscriptions sur 30 jours</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  {userData?.signupTrend && (
                    <AreaChart
                      data={userData.signupTrend}
                      categories={['signups']}
                      index="date"
                      colors={['#3b82f6']}
                      valueFormatter={(value) => value.toString()}
                      showLegend={false}
                      showGridLines={false}
                    />
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Répartition par Rôle</CardTitle>
                <CardDescription>Utilisateurs actifs</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {userData?.usersByRole?.map((role, index) => (
                    <div key={role.role} className="flex justify-between items-center">
                      <span className="text-sm font-medium">{role.role}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary"
                            style={{ 
                              width: `${(role.count / (userData.totalUsers || 1)) * 100}%`,
                              backgroundColor: generateChartColors(userData.usersByRole.length)[index]
                            }}
                          />
                        </div>
                        <Badge variant="outline">{role.count}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Vérifications</CardTitle>
                <CardDescription>Statut des documents</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">En attente</span>
                    <Badge variant="secondary">{userData?.pendingVerifications || 0}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Approuvées</span>
                    <Badge variant="default">{userData?.approvedVerifications || 0}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Rejetées</span>
                    <Badge variant="destructive">{userData?.rejectedVerifications || 0}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="deliveries" className="space-y-4">
          {deliveryData && <DeliveryStats data={deliveryData} />}
        </TabsContent>

        <TabsContent value="announcements" className="space-y-4">
          {announcementData && <AnnouncementStats data={announcementData} />}
        </TabsContent>

        <TabsContent value="finance" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="col-span-1 lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Évolution des Revenus
                </CardTitle>
                <CardDescription>Revenus et commissions sur 30 jours</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  {financialData?.revenueChart && (
                    <AreaChart
                      data={financialData.revenueChart}
                      categories={['revenue', 'commissions']}
                      index="date"
                      colors={['#22c55e', '#f59e0b']}
                      valueFormatter={(value) => formatCurrency(value)}
                      showLegend={true}
                      showGridLines={true}
                    />
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Indicateurs Financiers</CardTitle>
                <CardDescription>Résumé mensuel</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Revenus bruts</p>
                    <p className="text-2xl font-bold">
                      {formatCurrency(financialData?.monthlyRevenue || 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Commissions</p>
                    <p className="text-xl font-semibold">
                      {formatCurrency(financialData?.monthlyCommissions || 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Revenus nets</p>
                    <p className="text-xl font-semibold">
                      {formatCurrency((financialData?.monthlyRevenue || 0) - (financialData?.monthlyCommissions || 0))}
                    </p>
                  </div>
                  <div className="pt-2 border-t">
                    <p className="text-sm text-muted-foreground">Croissance</p>
                    <p className={`text-lg font-semibold ${
                      (financialData?.revenueGrowth || 0) > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {financialData?.revenueGrowth > 0 ? '+' : ''}
                      {financialData?.revenueGrowth?.toFixed(1) || 0}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}