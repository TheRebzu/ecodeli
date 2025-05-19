'use client';

import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Activity, Users, Truck, Package2 } from 'lucide-react';

interface StatsData {
  totalAnnouncements: number;
  activeAnnouncements: number;
  totalDeliveries: number;
  pendingDeliveries: number;
  completedDeliveries: number;
  totalViews: number;
  viewsToday: number;
  conversionRate: number;
}

interface AnnouncementStatsCardsProps {
  data: StatsData;
}

export function AnnouncementStatsCards({ data }: AnnouncementStatsCardsProps) {
  const t = useTranslations('merchant.announcements');

  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t('stats.totalAnnouncements')}</CardTitle>
          <Package2 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.totalAnnouncements}</div>
          <p className="text-xs text-muted-foreground">
            {t('stats.active', { count: data.activeAnnouncements })}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t('stats.totalDeliveries')}</CardTitle>
          <Truck className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.totalDeliveries}</div>
          <p className="text-xs text-muted-foreground">
            {t('stats.delivered', { count: data.completedDeliveries })}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t('stats.viewsToday')}</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.viewsToday}</div>
          <p className="text-xs text-muted-foreground">
            {t('stats.totalViews', { count: data.totalViews })}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t('stats.conversionRate')}</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatPercentage(data.conversionRate)}</div>
          <p className="text-xs text-muted-foreground">{t('stats.viewsToDeliveries')}</p>
        </CardContent>
      </Card>
    </div>
  );
}
