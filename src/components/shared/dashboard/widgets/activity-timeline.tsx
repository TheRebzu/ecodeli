'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslations } from 'next-intl';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import { useLocale } from 'next-intl';
import { Package, Truck, CreditCard, Box, Clock } from 'lucide-react';

type ActivityData = {
  originAddress?: string;
  destinationAddress?: string;
  title?: string;
  amount?: number;
  box?: {
    name?: string;
  };
  [key: string]: any;
};

type Activity = {
  type: 'delivery' | 'announcement' | 'payment' | 'box_reservation';
  date: string;
  data: ActivityData;
};

type ActivityTimelineProps = {
  activities?: Activity[];
  isLoading?: boolean;
};

export function ActivityTimeline({ activities = [], isLoading = false }: ActivityTimelineProps) {
  const t = useTranslations('dashboard.client');
  const locale = useLocale();
  const dateLocale = locale === 'fr' ? fr : enUS;

  // Icône et couleur par type d'activité
  const activityIcons: Record<string, { icon: React.ReactNode; color: string }> = {
    delivery: {
      icon: <Truck className="h-4 w-4" />,
      color: 'bg-blue-100 text-blue-800',
    },
    announcement: {
      icon: <Package className="h-4 w-4" />,
      color: 'bg-purple-100 text-purple-800',
    },
    payment: {
      icon: <CreditCard className="h-4 w-4" />,
      color: 'bg-green-100 text-green-800',
    },
    box_reservation: {
      icon: <Box className="h-4 w-4" />,
      color: 'bg-amber-100 text-amber-800',
    },
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            <Skeleton className="h-6 w-40" />
          </CardTitle>
        </CardHeader>
        <CardContent className="pl-0">
          <div className="relative pl-8 border-l-2 border-border ml-6 space-y-8">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="relative pb-4">
                <div className="absolute -left-[23px] p-1 rounded-full bg-background border-2 border-border">
                  <Skeleton className="h-5 w-5 rounded-full" />
                </div>
                <div className="pl-6 space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-60" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Fonction pour obtenir le titre de l'activité
  const getActivityTitle = (activity: Activity) => {
    switch (activity.type) {
      case 'delivery':
        return t('activityTitles.delivery');
      case 'announcement':
        return t('activityTitles.announcement');
      case 'payment':
        return t('activityTitles.payment');
      case 'box_reservation':
        return t('activityTitles.boxReservation');
      default:
        return t('activityTitles.default');
    }
  };

  // Fonction pour obtenir la description de l'activité
  const getActivityDescription = (activity: Activity) => {
    const { type, data } = activity;

    switch (type) {
      case 'delivery':
        return `${data.originAddress?.split(',')[0] || ''} → ${data.destinationAddress?.split(',')[0] || ''}`;
      case 'announcement':
        return data.title || '';
      case 'payment':
        return `${typeof data.amount === 'number' ? data.amount.toFixed(2) : '0.00'}€`;
      case 'box_reservation':
        return data.box?.name || t('activityDescriptions.boxReservation');
      default:
        return '';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          {t('recentActivity')}
        </CardTitle>
      </CardHeader>
      <CardContent className="pl-0">
        {activities.length > 0 ? (
          <div className="relative pl-8 border-l-2 border-border ml-6 space-y-8">
            {activities.map((activity, index) => {
              const { icon, color } = activityIcons[activity.type] || activityIcons.announcement;
              const activityDate = parseISO(activity.date);
              const formattedDate = formatDistanceToNow(activityDate, {
                addSuffix: true,
                locale: dateLocale,
              });

              return (
                <div key={index} className="relative pb-4">
                  <div
                    className={`absolute -left-[23px] p-1 rounded-full bg-background border-2 border-border ${color}`}
                  >
                    {icon}
                  </div>
                  <div className="pl-6">
                    <h4 className="text-sm font-medium">{getActivityTitle(activity)}</h4>
                    <p className="text-sm text-muted-foreground">
                      {getActivityDescription(activity)}
                    </p>
                    <p className="text-xs text-muted-foreground">{formattedDate}</p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-10">
            <Clock className="h-12 w-12 mx-auto text-muted-foreground opacity-25 mb-2" />
            <p className="text-muted-foreground">{t('noRecentActivity')}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
