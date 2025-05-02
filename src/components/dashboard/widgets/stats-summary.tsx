'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Package, Truck, Star, Leaf } from 'lucide-react';
import { useTranslations } from 'next-intl';

type StatItemProps = {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: {
    value: number;
    label: string;
  };
  isLoading?: boolean;
};

const StatItem = ({ title, value, icon, trend, isLoading }: StatItemProps) => {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between space-x-4">
            <div className="flex items-center space-x-4">
              <div className="bg-primary/10 p-3 rounded-full">{icon}</div>
              <div>
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-8 w-16" />
              </div>
            </div>
            {trend && <Skeleton className="h-4 w-12" />}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between space-x-4">
          <div className="flex items-center space-x-4">
            <div className="bg-primary/10 p-3 rounded-full">{icon}</div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              <h3 className="text-2xl font-bold tracking-tight">{value}</h3>
            </div>
          </div>
          {trend && (
            <p className={`text-xs ${trend.value >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {trend.value >= 0 ? '+' : ''}
              {trend.value}% {trend.label}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

type StatsSummaryProps = {
  stats?: {
    announcementsCount: number;
    deliveriesCount: number;
    completedDeliveriesCount: number;
    averageRating: number;
    estimatedSavings: number;
  };
  isLoading?: boolean;
};

export function StatsSummary({ stats, isLoading = false }: StatsSummaryProps) {
  const t = useTranslations('dashboard.client');

  return (
    <Card className="col-span-4">
      <CardHeader>
        <CardTitle>{t('statsTitle')}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        <StatItem
          title={t('announcementsCount')}
          value={stats?.announcementsCount || 0}
          icon={<Package className="h-4 w-4 text-primary" />}
          isLoading={isLoading}
        />
        <StatItem
          title={t('deliveriesCount')}
          value={stats?.deliveriesCount || 0}
          icon={<Truck className="h-4 w-4 text-primary" />}
          isLoading={isLoading}
        />
        <StatItem
          title={t('averageRating')}
          value={(stats?.averageRating || 0).toFixed(1)}
          icon={<Star className="h-4 w-4 text-primary" />}
          isLoading={isLoading}
        />
        <StatItem
          title={t('estimatedSavings')}
          value={`${stats?.estimatedSavings || 0}€`}
          icon={<Leaf className="h-4 w-4 text-primary" />}
          isLoading={isLoading}
        />
      </CardContent>
    </Card>
  );
}
