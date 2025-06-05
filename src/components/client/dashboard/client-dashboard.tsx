'use client';

import { Suspense } from 'react';
import { useClientDashboard } from '@/hooks/use-client-dashboard';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useTranslations } from 'next-intl';

// Import des widgets
import { StatsSummary } from '@/components/shared/dashboard/widgets/stats-summary';
import { ActiveDeliveries } from '@/components/shared/dashboard/widgets/active-deliveries';
import { ActiveAnnouncements } from '@/components/shared/dashboard/widgets/active-announcements';
import { FinancialSummary } from '@/components/shared/dashboard/widgets/financial-summary';
import { ActivityTimeline } from '@/components/shared/dashboard/widgets/activity-timeline';
import { QuickActions } from '@/components/shared/dashboard/widgets/quick-actions';

// Composants de loading pour les widgets
const WidgetSkeleton = () => (
  <div className="w-full h-64 bg-card border rounded-lg flex items-center justify-center p-6">
    <div className="w-full space-y-4">
      <Skeleton className="h-8 w-4/5" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-8 w-3/5" />
    </div>
  </div>
);

// Type pour les statuts d'annonce acceptés par le composant
type AnnouncementStatusType = 'PENDING' | 'PUBLISHED' | 'ASSIGNED' | 'COMPLETED' | 'CANCELLED';

export function ClientDashboardWidgets() {
  const t = useTranslations('dashboard.client');
  const {
    stats,
    recentActivity,
    financialMetrics,
    activeItems,
    isLoading,
    isRefreshing,
    hasError,
    refreshDashboard,
  } = useClientDashboard();

  if (hasError) {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{t('errorTitle')}</AlertTitle>
        <AlertDescription>
          {t('errorDescription')}
          <Button
            variant="outline"
            size="sm"
            className="ml-2"
            onClick={refreshDashboard}
            disabled={isRefreshing}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {t('retry')}
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-8">
      {/* En-tête avec action de rafraîchissement */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">{t('welcomeMessage')}</h2>
        <Button variant="outline" size="sm" onClick={refreshDashboard} disabled={isRefreshing}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {t('refreshDashboard')}
        </Button>
      </div>

      {/* Statistiques générales */}
      <Suspense fallback={<WidgetSkeleton />}>
        <StatsSummary stats={stats} isLoading={isLoading} />
      </Suspense>

      {/* Actions rapides */}
      <Suspense fallback={<WidgetSkeleton />}>
        <QuickActions />
      </Suspense>

      {/* Grille principale */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Colonne gauche */}
        <div className="space-y-8">
          <Suspense fallback={<WidgetSkeleton />}>
            <ActiveDeliveries
              deliveries={Array.isArray(activeItems?.activeDeliveries) ? activeItems.activeDeliveries.map(delivery => ({
                id: delivery.id,
                status: delivery.status,
                originAddress: delivery.pickupAddress || '',
                destinationAddress: delivery.deliveryAddress || '',
                createdAt: delivery.createdAt.toISOString(),
                updatedAt: delivery.updatedAt.toISOString(),
                deliverer: delivery.delivererId
                  ? {
                      user: {
                        name: delivery.deliverer?.name || '',
                        image: delivery.deliverer?.image || '',
                      },
                    }
                  : undefined,
              })) : []}
              isLoading={isLoading}
            />
          </Suspense>

          <Suspense fallback={<WidgetSkeleton />}>
            <FinancialSummary
              financials={
                financialMetrics
                  ? {
                      currentMonthExpenses: Number(financialMetrics.currentMonthExpenses),
                      previousMonthExpenses: Number(financialMetrics.previousMonthExpenses),
                      expenseEvolution:
                        Array.isArray(financialMetrics.expenseEvolution) ? financialMetrics.expenseEvolution.map(item => ({
                          month: item.month,
                          amount: Number(item.amount),
                        })) : [],
                      estimatedSavings: financialMetrics.estimatedSavings,
                    }
                  : undefined
              }
              isLoading={isLoading}
            />
          </Suspense>
        </div>

        {/* Colonne droite */}
        <div className="space-y-8">
          <Suspense fallback={<WidgetSkeleton />}>
            <ActiveAnnouncements
              announcements={Array.isArray(activeItems?.activeAnnouncements) ? activeItems.activeAnnouncements.map(announcement => ({
                id: announcement.id,
                title: announcement.title || '',
                status: announcement.status as AnnouncementStatusType,
                createdAt: announcement.createdAt.toISOString(),
                updatedAt: announcement.updatedAt.toISOString(),
                delivererCount: typeof announcement.length === 'number' ? announcement.length : 0,
              })) : []}
              isLoading={isLoading}
            />
          </Suspense>

          <Suspense fallback={<WidgetSkeleton />}>
            <ActivityTimeline
              activities={Array.isArray(recentActivity) ? recentActivity.map(activity => ({
                type: activity.type as 'delivery' | 'announcement' | 'payment' | 'box_reservation',
                date: activity.date.toISOString(),
                data: activity.data as Record<string, unknown>,
              })) : []}
              isLoading={isLoading}
            />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
