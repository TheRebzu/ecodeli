'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar,
  Wallet,
  Target,
  Clock
} from 'lucide-react';
import { useTranslations } from 'next-intl';

type EarningsPeriod = 'day' | 'week' | 'month';

type EarningsData = {
  current: number;
  previous: number;
  change: number;
  changePercentage: number;
  deliveriesCount: number;
  hoursWorked: number;
  averagePerDelivery: number;
};

type DelivererEarningsSummaryProps = {
  earnings?: {
    day: EarningsData;
    week: EarningsData;
    month: EarningsData;
  };
  isLoading?: boolean;
  currency?: string;
};

export function DelivererEarningsSummary({ 
  earnings, 
  isLoading = false, 
  currency = '€' 
}: DelivererEarningsSummaryProps) {
  const t = useTranslations('dashboard.deliverer');

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            <Skeleton className="h-6 w-32" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency === '€' ? 'EUR' : 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatHours = (hours: number) => {
    return `${hours.toFixed(1)}h`;
  };

  const renderPeriodCard = (period: EarningsPeriod, data: EarningsData) => {
    const isPositiveChange = data.changePercentage >= 0;
    
    return (
      <div className="space-y-6">
        {/* Earnings principales */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{t('earnings.total')}</span>
            </div>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(data.current)}
            </p>
            <div className="flex items-center gap-1">
              {isPositiveChange ? (
                <TrendingUp className="h-3 w-3 text-green-500" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500" />
              )}
              <span className={`text-xs ${isPositiveChange ? 'text-green-500' : 'text-red-500'}`}>
                {isPositiveChange ? '+' : ''}{data.changePercentage.toFixed(1)}%
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{t('earnings.deliveries')}</span>
            </div>
            <p className="text-2xl font-bold">
              {data.deliveriesCount}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(data.averagePerDelivery)} / {t('earnings.delivery')}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{t('earnings.hoursWorked')}</span>
            </div>
            <p className="text-2xl font-bold">
              {formatHours(data.hoursWorked)}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(data.current / data.hoursWorked)} / h
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{t('earnings.change')}</span>
            </div>
            <p className={`text-2xl font-bold ${isPositiveChange ? 'text-green-600' : 'text-red-600'}`}>
              {isPositiveChange ? '+' : ''}{formatCurrency(data.change)}
            </p>
            <p className="text-xs text-muted-foreground">
              {t('earnings.previousPeriod')}: {formatCurrency(data.previous)}
            </p>
          </div>
        </div>

        {/* Badge de performance */}
        <div className="flex justify-center">
          <Badge 
            variant={isPositiveChange ? "default" : "secondary"}
            className={`${isPositiveChange ? 'bg-green-100 text-green-800 border-green-300' : 'bg-gray-100 text-gray-800 border-gray-300'}`}
          >
            {isPositiveChange ? (
              <>
                <TrendingUp className="h-3 w-3 mr-1" />
                {t('earnings.performance.improving')}
              </>
            ) : (
              <>
                <TrendingDown className="h-3 w-3 mr-1" />
                {t('earnings.performance.declining')}
              </>
            )}
          </Badge>
        </div>
      </div>
    );
  };

  // Données par défaut si aucune donnée n'est fournie
  const defaultEarnings = {
    day: {
      current: 45.50,
      previous: 38.20,
      change: 7.30,
      changePercentage: 19.1,
      deliveriesCount: 6,
      hoursWorked: 4.5,
      averagePerDelivery: 7.58
    },
    week: {
      current: 287.40,
      previous: 245.80,
      change: 41.60,
      changePercentage: 16.9,
      deliveriesCount: 38,
      hoursWorked: 28.5,
      averagePerDelivery: 7.56
    },
    month: {
      current: 1156.80,
      previous: 1089.30,
      change: 67.50,
      changePercentage: 6.2,
      deliveriesCount: 152,
      hoursWorked: 118.2,
      averagePerDelivery: 7.61
    }
  };

  const earningsData = earnings || defaultEarnings;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          {t('earnings.title')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="day" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="day" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {t('earnings.periods.day')}
            </TabsTrigger>
            <TabsTrigger value="week" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {t('earnings.periods.week')}
            </TabsTrigger>
            <TabsTrigger value="month" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {t('earnings.periods.month')}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="day" className="space-y-4 mt-6">
            {renderPeriodCard('day', earningsData.day)}
          </TabsContent>
          
          <TabsContent value="week" className="space-y-4 mt-6">
            {renderPeriodCard('week', earningsData.week)}
          </TabsContent>
          
          <TabsContent value="month" className="space-y-4 mt-6">
            {renderPeriodCard('month', earningsData.month)}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}