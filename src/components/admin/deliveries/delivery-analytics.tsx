'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { 
  Truck, 
  MapPin, 
  Clock, 
  TrendingUp, 
  TrendingDown,
  Package,
  CheckCircle,
  XCircle,
  AlertTriangle,
  BarChart3,
  PieChart,
  Users,
  Route,
  Timer,
  Star,
  DollarSign
} from 'lucide-react';
import { api } from '@/trpc/react';
import { useToast } from "@/components/ui/use-toast";

interface DeliveryMetrics {
  totalDeliveries: number;
  completedDeliveries: number;
  pendingDeliveries: number;
  cancelledDeliveries: number;
  averageDeliveryTime: number; // en minutes
  onTimeDeliveryRate: number; // pourcentage
  averageRating: number;
  totalDistance: number; // en km
  averageDistance: number; // en km
  totalRevenue: number;
  activeDeliverers: number;
  busyDeliverers: number;
}

interface DeliveryPerformance {
  delivererId: string;
  delivererName: string;
  completedDeliveries: number;
  averageTime: number;
  onTimeRate: number;
  rating: number;
  totalDistance: number;
  earnings: number;
  status: 'ACTIVE' | 'BUSY' | 'OFFLINE';
}

interface ZoneStats {
  zone: string;
  deliveries: number;
  averageTime: number;
  successRate: number;
  revenue: number;
}

export default function DeliveryAnalytics() {
  const t = useTranslations('admin.deliveries');
  const _toast = useToast();
  const [selectedTab, setSelectedTab] = useState('overview');
  const [timeRange, setTimeRange] = useState('24_HOURS');
  const [selectedZone, setSelectedZone] = useState('ALL');

  // Requêtes tRPC pour récupérer les données d'analytiques
  const { data: deliveryMetrics, isLoading: _metricsLoading } = api.admin.getDeliveryMetrics.useQuery({
    period: timeRange,
    zone: selectedZone === 'ALL' ? undefined : selectedZone,
  });

  const { data: delivererPerformance } = api.admin.getDelivererPerformance.useQuery({
    period: timeRange,
    limit: 20,
    sortBy: 'COMPLETED_DELIVERIES'
  });

  const { data: zoneStatistics } = api.admin.getZoneStatistics.useQuery({
    period: timeRange
  });

  const { data: _deliveryTrends } = api.admin.getDeliveryTrends.useQuery({
    period: timeRange,
    groupBy: 'HOUR'
  });

  // Données réelles via tRPC (fini les mocks)
  const validMetrics: DeliveryMetrics = deliveryMetrics || {
    totalDeliveries: 0,
    completedDeliveries: 0,
    pendingDeliveries: 0,
    cancelledDeliveries: 0,
    averageDeliveryTime: 0,
    onTimeDeliveryRate: 0,
    averageRating: 0,
    totalDistance: 0,
    averageDistance: 0,
    totalRevenue: 0,
    activeDeliverers: 0,
    busyDeliverers: 0
  };

  const validPerformance: DeliveryPerformance[] = delivererPerformance || [];

  const validZoneStats: ZoneStats[] = zoneStatistics || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800';
      case 'BUSY': return 'bg-orange-100 text-orange-800';
      case 'OFFLINE': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'BUSY': return <Clock className="h-4 w-4 text-orange-600" />;
      case 'OFFLINE': return <XCircle className="h-4 w-4 text-gray-600" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return hours > 0 ? `${hours}h ${mins}min` : `${mins}min`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const formatDistance = (km: number) => {
    return `${km.toFixed(1)} km`;
  };

  const getPerformanceColor = (rate: number, threshold: number = 90) => {
    if (rate >= threshold) {
      return 'text-green-600';
    }
    if (rate >= threshold - 10) {
      return 'text-orange-600';
    }
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* En-tête avec contrôles */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">{t('analytics.deliveryAnalytics')}</h2>
          <p className="text-muted-foreground">{t('analytics.subtitle')}</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1_HOUR">{t('common.lastHour')}</SelectItem>
              <SelectItem value="24_HOURS">{t('common.last24Hours')}</SelectItem>
              <SelectItem value="7_DAYS">{t('common.last7Days')}</SelectItem>
              <SelectItem value="30_DAYS">{t('common.last30Days')}</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={selectedZone} onValueChange={setSelectedZone}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t('analytics.allZones')}</SelectItem>
              <SelectItem value="CENTRE">{t('analytics.centerZone')}</SelectItem>
              <SelectItem value="NORTH">{t('analytics.northZone')}</SelectItem>
              <SelectItem value="SOUTH">{t('analytics.southZone')}</SelectItem>
              <SelectItem value="EAST">{t('analytics.eastZone')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Métriques principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t('analytics.totalDeliveries')}
                </p>
                <p className="text-2xl font-bold">{validMetrics.totalDeliveries.toLocaleString()}</p>
                <div className="flex items-center gap-1 mt-1">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-600">
                    {validMetrics.completedDeliveries} {t('analytics.completed')}
                  </span>
                </div>
              </div>
              <Package className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t('analytics.averageDeliveryTime')}
                </p>
                <p className="text-2xl font-bold">{formatTime(validMetrics.averageDeliveryTime)}</p>
                <p className="text-sm text-muted-foreground">
                  {validMetrics.onTimeDeliveryRate}% {t('analytics.onTime')}
                </p>
              </div>
              <Timer className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t('analytics.averageRating')}
                </p>
                <p className="text-2xl font-bold">{validMetrics.averageRating}</p>
                <div className="flex items-center gap-1 mt-1">
                  <Star className="h-4 w-4 text-yellow-500 fill-current" />
                  <span className="text-sm text-muted-foreground">
                    {t('analytics.customerSatisfaction')}
                  </span>
                </div>
              </div>
              <Star className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t('analytics.activeDeliverers')}
                </p>
                <p className="text-2xl font-bold">{validMetrics.activeDeliverers}</p>
                <p className="text-sm text-muted-foreground">
                  {validMetrics.busyDeliverers} {t('analytics.busy')}
                </p>
              </div>
              <Users className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Onglets d'analytiques */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">{t('analytics.overview')}</TabsTrigger>
          <TabsTrigger value="performance">{t('analytics.performance')}</TabsTrigger>
          <TabsTrigger value="zones">{t('analytics.zones')}</TabsTrigger>
          <TabsTrigger value="trends">{t('analytics.trends')}</TabsTrigger>
        </TabsList>

        {/* Vue d'ensemble */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Statut des livraisons */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  {t('analytics.deliveryStatus')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                      <span>{t('analytics.completed')}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{validMetrics.completedDeliveries}</p>
                      <p className="text-sm text-muted-foreground">
                        {((validMetrics.completedDeliveries / validMetrics.totalDeliveries) * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-orange-500" />
                      <span>{t('analytics.pending')}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{validMetrics.pendingDeliveries}</p>
                      <p className="text-sm text-muted-foreground">
                        {((validMetrics.pendingDeliveries / validMetrics.totalDeliveries) * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-red-500" />
                      <span>{t('analytics.cancelled')}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{validMetrics.cancelledDeliveries}</p>
                      <p className="text-sm text-muted-foreground">
                        {((validMetrics.cancelledDeliveries / validMetrics.totalDeliveries) * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Métriques de distance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Route className="h-5 w-5" />
                  {t('analytics.distanceMetrics')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{t('analytics.totalDistance')}</span>
                    <span className="font-bold">{formatDistance(validMetrics.totalDistance)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{t('analytics.averageDistance')}</span>
                    <span className="font-bold">{formatDistance(validMetrics.averageDistance)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{t('analytics.totalRevenue')}</span>
                    <span className="font-bold">{formatCurrency(validMetrics.totalRevenue)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{t('analytics.avgRevenuePerKm')}</span>
                    <span className="font-bold">
                      {formatCurrency(validMetrics.totalRevenue / validMetrics.totalDistance)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Indicateurs de performance */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <Clock className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                  <p className="text-sm font-medium text-muted-foreground">
                    {t('analytics.onTimeRate')}
                  </p>
                  <p className="text-2xl font-bold">{validMetrics.onTimeDeliveryRate}%</p>
                  <Progress value={validMetrics.onTimeDeliveryRate} className="mt-2" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <DollarSign className="h-8 w-8 mx-auto mb-2 text-green-500" />
                  <p className="text-sm font-medium text-muted-foreground">
                    {t('analytics.avgRevenuePerDelivery')}
                  </p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(validMetrics.totalRevenue / validMetrics.completedDeliveries)}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <Truck className="h-8 w-8 mx-auto mb-2 text-purple-500" />
                  <p className="text-sm font-medium text-muted-foreground">
                    {t('analytics.deliveriesPerDeliverer')}
                  </p>
                  <p className="text-2xl font-bold">
                    {Math.round(validMetrics.completedDeliveries / validMetrics.activeDeliverers)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Performance des livreurs */}
        <TabsContent value="performance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('analytics.delivererPerformance')}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('analytics.deliverer')}</TableHead>
                    <TableHead>{t('analytics.status')}</TableHead>
                    <TableHead>{t('analytics.deliveries')}</TableHead>
                    <TableHead>{t('analytics.avgTime')}</TableHead>
                    <TableHead>{t('analytics.onTimeRate')}</TableHead>
                    <TableHead>{t('analytics.rating')}</TableHead>
                    <TableHead>{t('analytics.distance')}</TableHead>
                    <TableHead>{t('analytics.earnings')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {validPerformance.map((deliverer) => (
                    <TableRow key={deliverer.delivererId}>
                      <TableCell className="font-medium">{deliverer.delivererName}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(deliverer.status)}
                          <Badge className={getStatusColor(deliverer.status)}>
                            {t(`analytics.${deliverer.status.toLowerCase()}`)}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>{deliverer.completedDeliveries}</TableCell>
                      <TableCell>{formatTime(deliverer.averageTime)}</TableCell>
                      <TableCell>
                        <span className={getPerformanceColor(deliverer.onTimeRate)}>
                          {deliverer.onTimeRate}%
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-yellow-500 fill-current" />
                          <span>{deliverer.rating}</span>
                        </div>
                      </TableCell>
                      <TableCell>{formatDistance(deliverer.totalDistance)}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(deliverer.earnings)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Statistiques par zone */}
        <TabsContent value="zones" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('analytics.zoneStatistics')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {validZoneStats.map((zone) => (
                  <div key={zone.zone} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <MapPin className="h-8 w-8 text-blue-500" />
                      <div>
                        <h3 className="font-medium">{zone.zone}</h3>
                        <p className="text-sm text-muted-foreground">
                          {zone.deliveries} {t('analytics.deliveries')}
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-8 text-center">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          {t('analytics.avgTime')}
                        </p>
                        <p className="font-bold">{formatTime(zone.averageTime)}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          {t('analytics.successRate')}
                        </p>
                        <p className={`font-bold ${getPerformanceColor(zone.successRate)}`}>
                          {zone.successRate}%
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          {t('analytics.revenue')}
                        </p>
                        <p className="font-bold">{formatCurrency(zone.revenue)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tendances */}
        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                {t('analytics.deliveryTrends')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 mx-auto mb-2" />
                  <p>{t('analytics.chartPlaceholder')}</p>
                  <p className="text-sm">{t('analytics.chartDescription')}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Alertes et recommandations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                {t('analytics.alertsAndRecommendations')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-3 border rounded-lg bg-orange-50">
                  <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-orange-800">
                      {t('analytics.highCancellationRate')}
                    </p>
                    <p className="text-sm text-orange-700">
                      {t('analytics.highCancellationDescription')}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-3 border rounded-lg bg-blue-50">
                  <TrendingUp className="h-5 w-5 text-blue-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-800">
                      {t('analytics.peakHourOptimization')}
                    </p>
                    <p className="text-sm text-blue-700">
                      {t('analytics.peakHourDescription')}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
