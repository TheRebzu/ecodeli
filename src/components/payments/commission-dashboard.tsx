'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { startOfMonth, endOfMonth, format, subMonths } from 'date-fns';
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
}

interface CommissionDashboardProps {
  report?: CommissionReport;
  isLoading?: boolean;
  onDateRangeChange: (startDate: Date, endDate: Date) => void;
  onExportCSV?: () => void;
  onRefresh?: () => void;
}

export function CommissionDashboard({
  report,
  isLoading = false,
  onDateRangeChange,
  onExportCSV,
  onRefresh,
}: CommissionDashboardProps) {
  const t = useTranslations('commissions');
  const [dateRange, setDateRange] = useState<'current' | 'last' | 'custom'>('current');
  const [startDate, setStartDate] = useState<Date>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date>(endOfMonth(new Date()));

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

  // Calculer les statistiques
  const calculateDeliveryPercentage = () => {
    if (!report || report.totalCommission === 0) return 0;
    return (report.breakdown.delivery.commission / report.totalCommission) * 100;
  };

  const calculateServicePercentage = () => {
    if (!report || report.totalCommission === 0) return 0;
    return (report.breakdown.service.commission / report.totalCommission) * 100;
  };

  const calculateSubscriptionPercentage = () => {
    if (!report || report.totalCommission === 0) return 0;
    return (report.breakdown.subscription.commission / report.totalCommission) * 100;
  };

  const calculateCommissionRate = () => {
    if (!report || report.totalAmount === 0) return 0;
    return (report.totalCommission / report.totalAmount) * 100;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">{t('dashboardTitle')}</h2>
          <p className="text-muted-foreground">{t('dashboardDescription')}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
            className="flex items-center gap-1"
          >
            <RefreshCw className="h-4 w-4" />
            {t('refresh')}
          </Button>
          {onExportCSV && (
            <Button
              variant="outline"
              size="sm"
              onClick={onExportCSV}
              className="flex items-center gap-1"
            >
              <Download className="h-4 w-4" />
              {t('exportCSV')}
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
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
              ) : report ? (
                formatCurrency(report.totalCommission)
              ) : (
                '0,00 €'
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {isLoading ? (
                <div className="h-4 w-24 bg-muted animate-pulse rounded" />
              ) : (
                report && (
                  <span className={report.totalCommission > 0 ? 'text-green-600' : ''}>
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
              ) : report ? (
                formatCurrency(report.breakdown.delivery.commission)
              ) : (
                '0,00 €'
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {isLoading ? (
                <div className="h-4 w-24 bg-muted animate-pulse rounded" />
              ) : (
                report && (
                  <span className="flex items-center gap-1">
                    <span>
                      {report.breakdown.delivery.count} {t('deliveries')}
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
              ) : report ? (
                formatCurrency(report.breakdown.service.commission)
              ) : (
                '0,00 €'
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {isLoading ? (
                <div className="h-4 w-24 bg-muted animate-pulse rounded" />
              ) : (
                report && (
                  <span className="flex items-center gap-1">
                    <span>
                      {report.breakdown.service.count} {t('services')}
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
              ) : report ? (
                report.totalPayments
              ) : (
                0
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {isLoading ? (
                <div className="h-4 w-24 bg-muted animate-pulse rounded" />
              ) : (
                report && (
                  <span>
                    {formatCurrency(report.totalAmount)} {t('totalVolume')}
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
              ) : report ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{t('delivery')}</span>
                      <span className="text-sm">
                        {formatCurrency(report.breakdown.delivery.commission)} (
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
                        {formatCurrency(report.breakdown.service.commission)} (
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
                        {formatCurrency(report.breakdown.subscription.commission)} (
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
