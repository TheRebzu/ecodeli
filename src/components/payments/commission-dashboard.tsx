'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { startOfMonth, endOfMonth, format, subMonths, isAfter, isBefore, isEqual } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  BarChart,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Percent,
  Package,
  UserCog,
  RefreshCw,
  Download,
  Zap,
  Info,
  ChevronDown,
  Filter,
  PieChart,
  AlertCircle,
  CheckCircle,
  Clock,
  FileBarChart,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DatePicker } from '@/components/ui/date-picker';
import { formatCurrency, formatPercent } from '@/lib/format';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';

// Types pour les données du tableau de bord
export interface CommissionReport {
  period: {
    startDate: Date;
    endDate: Date;
  };
  totalPayments: number;
  totalAmount: number;
  totalCommission: number;
  breakdown: {
    delivery: {
      count: number;
      commission: number;
    };
    service: {
      count: number;
      commission: number;
    };
    subscription: {
      count: number;
      commission: number;
    };
  };
  details?: CommissionDetail[];
}

export interface CommissionDetail {
  id: string;
  date: Date;
  type: 'DELIVERY' | 'SERVICE' | 'SUBSCRIPTION';
  amount: number;
  commission: number;
  rate: number;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  reference?: string;
}

interface CommissionDashboardProps {
  report?: CommissionReport;
  isLoading?: boolean;
  onDateRangeChange: (startDate: Date, endDate: Date) => void;
  onExportCSV?: () => void;
  onRefresh?: () => void;
  isDemo?: boolean;
  userId?: string;
  error?: string;
}

export function CommissionDashboard({
  report,
  isLoading = false,
  onDateRangeChange,
  onExportCSV,
  onRefresh,
  isDemo = false,
  userId,
  error,
}: CommissionDashboardProps) {
  const t = useTranslations('commissions');
  const [dateRange, setDateRange] = useState<'current' | 'last' | 'custom'>('current');
  const [startDate, setStartDate] = useState<Date>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date>(endOfMonth(new Date()));
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filterType, setFilterType] = useState<'ALL' | 'DELIVERY' | 'SERVICE' | 'SUBSCRIPTION'>('ALL');
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Générer des données de démonstration si nécessaire
  const generateDemoData = (): CommissionReport => {
    const demoDetails: CommissionDetail[] = [];
    const today = new Date();
    
    // Génération de détails pour les 30 derniers jours
    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(today.getDate() - i);
      
      // Livraisons
      if (i % 2 === 0) {
        demoDetails.push({
          id: `del_${i}`,
          date,
          type: 'DELIVERY',
          amount: 25 + Math.random() * 75,
          commission: 5 + Math.random() * 15,
          rate: 0.15,
          status: Math.random() > 0.1 ? 'COMPLETED' : 'PENDING',
          reference: `REF-D-${i}`,
        });
      }
      
      // Services
      if (i % 3 === 0) {
        demoDetails.push({
          id: `ser_${i}`,
          date,
          type: 'SERVICE',
          amount: 50 + Math.random() * 100,
          commission: 10 + Math.random() * 20,
          rate: 0.2,
          status: Math.random() > 0.1 ? 'COMPLETED' : 'PENDING',
          reference: `REF-S-${i}`,
        });
      }
      
      // Abonnements (moins fréquents)
      if (i % 7 === 0) {
        demoDetails.push({
          id: `sub_${i}`,
          date,
          type: 'SUBSCRIPTION',
          amount: 99 + Math.random() * 50,
          commission: 0,
          rate: 0,
          status: 'COMPLETED',
          reference: `REF-A-${i}`,
        });
      }
    }
    
    // Filtrer les détails en fonction de la plage de dates
    const filteredDetails = demoDetails.filter(
      detail => 
        (isAfter(detail.date, startDate) || isEqual(detail.date, startDate)) && 
        (isBefore(detail.date, endDate) || isEqual(detail.date, endDate))
    );
    
    // Calculer les totaux
    const deliveryDetails = filteredDetails.filter(d => d.type === 'DELIVERY');
    const serviceDetails = filteredDetails.filter(d => d.type === 'SERVICE');
    const subscriptionDetails = filteredDetails.filter(d => d.type === 'SUBSCRIPTION');
    
    const totalDeliveryCommission = deliveryDetails.reduce((sum, d) => sum + d.commission, 0);
    const totalServiceCommission = serviceDetails.reduce((sum, d) => sum + d.commission, 0);
    const totalSubscriptionCommission = subscriptionDetails.reduce((sum, d) => sum + d.commission, 0);
    
    return {
      period: {
        startDate,
        endDate,
      },
      totalPayments: filteredDetails.length,
      totalAmount: filteredDetails.reduce((sum, d) => sum + d.amount, 0),
      totalCommission: totalDeliveryCommission + totalServiceCommission + totalSubscriptionCommission,
      breakdown: {
        delivery: {
          count: deliveryDetails.length,
          commission: totalDeliveryCommission,
        },
        service: {
          count: serviceDetails.length,
          commission: totalServiceCommission,
        },
        subscription: {
          count: subscriptionDetails.length,
          commission: totalSubscriptionCommission,
        },
      },
      details: filteredDetails,
    };
  };

  // Utiliser les données démo si nécessaire
  const displayData = isDemo ? generateDemoData() : report;

  // Gérer le changement de plage de dates
  const handleDateRangeChange = (range: 'current' | 'last' | 'custom') => {
    setDateRange(range);

    let newStartDate: Date;
    let newEndDate: Date;

    switch (range) {
      case 'current':
        newStartDate = startOfMonth(new Date());
        newEndDate = endOfMonth(new Date());
        break;
      case 'last':
        newStartDate = startOfMonth(subMonths(new Date(), 1));
        newEndDate = endOfMonth(subMonths(new Date(), 1));
        break;
      case 'custom':
        newStartDate = startDate;
        newEndDate = endDate;
        break;
      default:
        return;
    }

    setStartDate(newStartDate);
    setEndDate(newEndDate);
    onDateRangeChange(newStartDate, newEndDate);
  };

  // Lorsque les dates personnalisées changent
  const handleCustomDateChange = (type: 'start' | 'end', date: Date | undefined) => {
    if (!date) return;

    if (type === 'start') {
      setStartDate(date);
      if (dateRange === 'custom') {
        onDateRangeChange(date, endDate);
      }
    } else {
      setEndDate(date);
      if (dateRange === 'custom') {
        onDateRangeChange(startDate, date);
      }
    }
  };

  // Gérer le rafraîchissement des données
  const handleRefresh = async () => {
    setIsRefreshing(true);
    if (onRefresh) {
      await onRefresh();
    }
    setIsRefreshing(false);
  };

  // Calculer les statistiques
  const calculateDeliveryPercentage = () => {
    if (!displayData || displayData.totalCommission === 0) return 0;
    return (displayData.breakdown.delivery.commission / displayData.totalCommission) * 100;
  };

  const calculateServicePercentage = () => {
    if (!displayData || displayData.totalCommission === 0) return 0;
    return (displayData.breakdown.service.commission / displayData.totalCommission) * 100;
  };

  const calculateSubscriptionPercentage = () => {
    if (!displayData || displayData.totalCommission === 0) return 0;
    return (displayData.breakdown.subscription.commission / displayData.totalCommission) * 100;
  };

  const calculateCommissionRate = () => {
    if (!displayData || displayData.totalAmount === 0) return 0;
    return (displayData.totalCommission / displayData.totalAmount) * 100;
  };

  // Obtenir la couleur de statut
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'text-green-600';
      case 'PENDING':
        return 'text-amber-600';
      case 'CANCELLED':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  // Obtenir l'icône de statut
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'PENDING':
        return <Clock className="h-4 w-4 text-amber-500" />;
      case 'CANCELLED':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  // Filtrer les détails selon le type sélectionné
  const filteredDetails = displayData?.details?.filter(
    detail => filterType === 'ALL' || detail.type === filterType
  ) || [];

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t('error')}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight">{t('dashboardTitle')}</h2>
            {isDemo && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 flex items-center gap-1">
                      <Zap className="h-3 w-3" />
                      {t('demoMode')}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t('demoModeDescription')}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          <p className="text-muted-foreground">{t('dashboardDescription')}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading || isRefreshing}
            className="flex items-center gap-1"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {t('refresh')}
          </Button>
          {onExportCSV && (
            <Button
              variant="outline"
              size="sm"
              onClick={onExportCSV}
              className="flex items-center gap-1"
              disabled={isLoading || !displayData}
            >
              <Download className="h-4 w-4" />
              {t('exportCSV')}
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <Select
            value={dateRange}
            onValueChange={value => handleDateRangeChange(value as 'current' | 'last' | 'custom')}
          >
            <SelectTrigger className="w-full">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue placeholder={t('selectDateRange')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current">{t('currentMonth')}</SelectItem>
              <SelectItem value="last">{t('lastMonth')}</SelectItem>
              <SelectItem value="custom">{t('customRange')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {dateRange === 'custom' && (
          <div className="flex flex-col sm:flex-row gap-2">
            <DatePicker
              selected={startDate}
              onSelect={date => handleCustomDateChange('start', date)}
              placeholder={t('startDate')}
            />
            <DatePicker
              selected={endDate}
              onSelect={date => handleCustomDateChange('end', date)}
              placeholder={t('endDate')}
              disabled={d => d < startDate}
            />
          </div>
        )}

        <Collapsible
          open={showAdvancedFilters}
          onOpenChange={setShowAdvancedFilters}
          className="w-full md:w-auto"
        >
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="w-full md:w-auto flex items-center gap-1">
              <Filter className="h-4 w-4" />
              {t('advancedFilters')}
              <ChevronDown className={`h-4 w-4 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 space-y-2 p-2 border rounded-md">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">{t('filterByType')}</label>
              <Select value={filterType} onValueChange={(value) => setFilterType(value as any)}>
                <SelectTrigger>
                  <SelectValue placeholder={t('selectType')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{t('allTypes')}</SelectItem>
                  <SelectItem value="DELIVERY">{t('delivery')}</SelectItem>
                  <SelectItem value="SERVICE">{t('service')}</SelectItem>
                  <SelectItem value="SUBSCRIPTION">{t('subscription')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">{t('viewMode')}</label>
              <div className="flex gap-2">
                <Button 
                  variant={viewMode === 'chart' ? 'default' : 'outline'} 
                  size="sm"
                  onClick={() => setViewMode('chart')}
                  className="flex items-center gap-1 flex-1"
                >
                  <PieChart className="h-4 w-4" />
                  {t('chartView')}
                </Button>
                <Button 
                  variant={viewMode === 'table' ? 'default' : 'outline'} 
                  size="sm"
                  onClick={() => setViewMode('table')}
                  className="flex items-center gap-1 flex-1"
                >
                  <FileBarChart className="h-4 w-4" />
                  {t('tableView')}
                </Button>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Cartes de statistiques principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('totalCommissions')}</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? (
                <div className="h-8 w-32 bg-muted animate-pulse rounded" />
              ) : displayData ? (
                formatCurrency(displayData.totalCommission)
              ) : (
                '0,00 €'
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {isLoading ? (
                <div className="h-4 w-24 bg-muted animate-pulse rounded" />
              ) : (
                displayData && (
                  <span className={displayData.totalCommission > 0 ? 'text-green-600' : ''}>
                    {formatPercent(calculateCommissionRate() / 100)} {t('ofTotalVolume')}
                  </span>
                )
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('deliveryCommissions')}</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? (
                <div className="h-8 w-32 bg-muted animate-pulse rounded" />
              ) : displayData ? (
                formatCurrency(displayData.breakdown.delivery.commission)
              ) : (
                '0,00 €'
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {isLoading ? (
                <div className="h-4 w-24 bg-muted animate-pulse rounded" />
              ) : (
                displayData && (
                  <span className="flex items-center gap-1">
                    <span>
                      {displayData.breakdown.delivery.count} {t('deliveries')}
                    </span>
                    <span>•</span>
                    <span>{formatPercent(calculateDeliveryPercentage() / 100)}</span>
                  </span>
                )
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('serviceCommissions')}</CardTitle>
            <UserCog className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? (
                <div className="h-8 w-32 bg-muted animate-pulse rounded" />
              ) : displayData ? (
                formatCurrency(displayData.breakdown.service.commission)
              ) : (
                '0,00 €'
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {isLoading ? (
                <div className="h-4 w-24 bg-muted animate-pulse rounded" />
              ) : (
                displayData && (
                  <span className="flex items-center gap-1">
                    <span>
                      {displayData.breakdown.service.count} {t('services')}
                    </span>
                    <span>•</span>
                    <span>{formatPercent(calculateServicePercentage() / 100)}</span>
                  </span>
                )
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('totalTransactions')}</CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? (
                <div className="h-8 w-32 bg-muted animate-pulse rounded" />
              ) : displayData ? (
                displayData.totalPayments
              ) : (
                0
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {isLoading ? (
                <div className="h-4 w-24 bg-muted animate-pulse rounded" />
              ) : (
                displayData && (
                  <span>
                    {formatCurrency(displayData.totalAmount)} {t('totalVolume')}
                  </span>
                )
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Onglets pour différentes visualisations */}
      <Tabs defaultValue="breakdown" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="breakdown">{t('commissionBreakdown')}</TabsTrigger>
          <TabsTrigger value="rates">{t('commissionRates')}</TabsTrigger>
        </TabsList>

        <TabsContent value="breakdown" className="space-y-4">
          {viewMode === 'chart' ? (
            <Card>
              <CardHeader>
                <CardTitle>{t('commissionBreakdown')}</CardTitle>
                <CardDescription>{t('breakdownDescription')}</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-2">
                    <div className="h-8 w-full bg-muted animate-pulse rounded" />
                    <div className="h-8 w-full bg-muted animate-pulse rounded" />
                    <div className="h-8 w-full bg-muted animate-pulse rounded" />
                  </div>
                ) : displayData ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{t('delivery')}</span>
                        <span className="text-sm">
                          {formatCurrency(displayData.breakdown.delivery.commission)} (
                          {formatPercent(calculateDeliveryPercentage() / 100)})
                        </span>
                      </div>
                      <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full bg-blue-500 transition-all"
                          style={{ width: `${calculateDeliveryPercentage()}%` }}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{t('service')}</span>
                        <span className="text-sm">
                          {formatCurrency(displayData.breakdown.service.commission)} (
                          {formatPercent(calculateServicePercentage() / 100)})
                        </span>
                      </div>
                      <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full bg-green-500 transition-all"
                          style={{ width: `${calculateServicePercentage()}%` }}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{t('subscription')}</span>
                        <span className="text-sm">
                          {formatCurrency(displayData.breakdown.subscription.commission)} (
                          {formatPercent(calculateSubscriptionPercentage() / 100)})
                        </span>
                      </div>
                      <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full bg-purple-500 transition-all"
                          style={{ width: `${calculateSubscriptionPercentage()}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-center text-muted-foreground">{t('noData')}</div>
                )}
              </CardContent>
              <CardFooter className="border-t pt-4">
                <p className="text-xs text-muted-foreground">
                  {t('lastUpdated')}: {format(new Date(), 'dd/MM/yyyy HH:mm', { locale: fr })}
                </p>
              </CardFooter>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>{t('detailedCommissions')}</CardTitle>
                <CardDescription>{t('detailedDescription')}</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-2">
                    {Array(5).fill(0).map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : filteredDetails.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableCaption>{t('commissionTableCaption')}</TableCaption>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('date')}</TableHead>
                          <TableHead>{t('type')}</TableHead>
                          <TableHead>{t('amount')}</TableHead>
                          <TableHead>{t('commission')}</TableHead>
                          <TableHead>{t('rate')}</TableHead>
                          <TableHead>{t('status')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredDetails.map((detail) => (
                          <TableRow key={detail.id}>
                            <TableCell>
                              {format(detail.date, 'dd/MM/yyyy')}
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant="outline" 
                                className={
                                  detail.type === 'DELIVERY' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                  detail.type === 'SERVICE' ? 'bg-green-50 text-green-700 border-green-200' :
                                  'bg-purple-50 text-purple-700 border-purple-200'
                                }
                              >
                                {t(detail.type.toLowerCase())}
                              </Badge>
                            </TableCell>
                            <TableCell>{formatCurrency(detail.amount)}</TableCell>
                            <TableCell>{formatCurrency(detail.commission)}</TableCell>
                            <TableCell>{formatPercent(detail.rate)}</TableCell>
                            <TableCell>
                              <div className={`flex items-center gap-1 ${getStatusColor(detail.status)}`}>
                                {getStatusIcon(detail.status)}
                                <span>{t(detail.status.toLowerCase())}</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="py-8 text-center text-muted-foreground">
                    <AlertCircle className="mx-auto h-8 w-8 mb-2 text-muted-foreground/60" />
                    <p>{t('noFilteredData')}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="rates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('currentCommissionRates')}</CardTitle>
              <CardDescription>{t('ratesDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded-md">
                  <div className="flex items-center">
                    <Package className="h-5 w-5 mr-2 text-blue-500" />
                    <span className="font-medium">{t('deliveryCommission')}</span>
                  </div>
                  <div className="flex items-center">
                    <Percent className="h-4 w-4 mr-1 text-muted-foreground" />
                    <span className="text-xl font-bold">15%</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-md">
                  <div className="flex items-center">
                    <UserCog className="h-5 w-5 mr-2 text-green-500" />
                    <span className="font-medium">{t('serviceCommission')}</span>
                  </div>
                  <div className="flex items-center">
                    <Percent className="h-4 w-4 mr-1 text-muted-foreground" />
                    <span className="text-xl font-bold">20%</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-md">
                  <div className="flex items-center">
                    <TrendingUp className="h-5 w-5 mr-2 text-purple-500" />
                    <span className="font-medium">{t('subscriptionCommission')}</span>
                  </div>
                  <div className="flex items-center">
                    <Percent className="h-4 w-4 mr-1 text-muted-foreground" />
                    <span className="text-xl font-bold">0%</span>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t pt-4 flex flex-col items-start">
              <p className="text-sm">{t('commissionNote')}</p>
              <Button variant="link" className="p-0 h-auto mt-2">
                {t('viewCommissionPolicy')}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
