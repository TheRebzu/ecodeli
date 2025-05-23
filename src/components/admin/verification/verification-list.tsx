'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { api } from '@/trpc/react';
import { UserRole } from '@prisma/client';
import { format } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PendingVerificationsTab } from './pending-verifications-tab';
import { ProcessedVerificationsTab } from './processed-verifications-tab';
import { VerificationFilters } from '@/types/verification';
import { VerificationFilterForm } from './verification-filter-form';

export default function VerificationList() {
  const t = useTranslations('admin.verification');
  const [activeTab, setActiveTab] = useState<'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [filters, setFilters] = useState<VerificationFilters>({
    status: 'PENDING',
    page: 1,
    limit: 10,
    sortBy: 'createdAt',
    sortDirection: 'desc',
  });

  // Utiliser une date statique pour éviter les erreurs d'hydration
  const [lastUpdated, setLastUpdated] = useState('');

  // Données mock pour les statistiques
  const mockStats = {
    pending: 12,
    approved: 48,
    rejected: 5,
    total: 65,
  };

  const [stats, setStats] = useState(mockStats);
  const [statsLoading, setStatsLoading] = useState(false);

  useEffect(() => {
    // Définir la date côté client uniquement pour éviter les erreurs d'hydration
    const now = new Date();
    try {
      const formattedDate = format(now, 'PPpp', { locale: fr });
      setLastUpdated(formattedDate);
    } catch (error) {
      console.error('Error formatting date:', error);
      setLastUpdated('');
    }

    // Simuler le chargement des statistiques
    setStatsLoading(true);
    setTimeout(() => {
      setStats(mockStats);
      setStatsLoading(false);
    }, 1000);
  }, []);

  // Désactivé car la procédure n'existe pas
  // const { data: stats, isLoading: statsLoading } = api.admin.getVerificationStats.useQuery();

  const handleTabChange = (value: string) => {
    setActiveTab(value as 'PENDING' | 'APPROVED' | 'REJECTED');
    setFilters(prev => ({
      ...prev,
      status: value as 'PENDING' | 'APPROVED' | 'REJECTED',
      page: 1,
    }));
  };

  const handleFilterChange = (newFilters: Partial<VerificationFilters>) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters,
      page: 1, // Reset to first page on filter change
    }));
  };

  const handlePageChange = (page: number) => {
    setFilters(prev => ({
      ...prev,
      page,
    }));
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Stats summary */}
        <div className="grid grid-cols-4 gap-4">
          <StatCard
            title={t('stats.pending')}
            value={statsLoading ? '...' : stats?.pending.toString() || '0'}
            variant="warning"
          />
          <StatCard
            title={t('stats.approved')}
            value={statsLoading ? '...' : stats?.approved.toString() || '0'}
            variant="success"
          />
          <StatCard
            title={t('stats.rejected')}
            value={statsLoading ? '...' : stats?.rejected.toString() || '0'}
            variant="destructive"
          />
          <StatCard
            title={t('stats.total')}
            value={statsLoading ? '...' : stats?.total.toString() || '0'}
            variant="default"
          />
        </div>

        {/* Filter Form */}
        <VerificationFilterForm currentFilters={filters} onFilterChange={handleFilterChange} />

        {/* Tabs */}
        <Tabs
          defaultValue="PENDING"
          value={activeTab}
          onValueChange={handleTabChange}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="PENDING">
              {t('tabs.pending')}{' '}
              {!statsLoading && stats?.pending > 0 && (
                <Badge variant="outline" className="ml-2">
                  {stats.pending}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="APPROVED">{t('tabs.approved')}</TabsTrigger>
            <TabsTrigger value="REJECTED">{t('tabs.rejected')}</TabsTrigger>
          </TabsList>

          <TabsContent value="PENDING" className="mt-6">
            <PendingVerificationsTab filters={filters} onPageChange={handlePageChange} />
          </TabsContent>

          <TabsContent value="APPROVED" className="mt-6">
            <ProcessedVerificationsTab filters={filters} onPageChange={handlePageChange} />
          </TabsContent>

          <TabsContent value="REJECTED" className="mt-6">
            <ProcessedVerificationsTab filters={filters} onPageChange={handlePageChange} />
          </TabsContent>
        </Tabs>
      </CardContent>

      <CardFooter className="border-t bg-muted/50 px-6 py-3">
        <p className="text-xs text-muted-foreground">
          {lastUpdated ? t('footer.updatedAt', { date: lastUpdated }) : ''}
        </p>
      </CardFooter>
    </Card>
  );
}

interface StatCardProps {
  title: string;
  value: string;
  variant: 'default' | 'success' | 'destructive' | 'warning';
}

function StatCard({ title, value, variant }: StatCardProps) {
  const bgColors = {
    default: 'bg-primary/10',
    success: 'bg-green-500/10',
    destructive: 'bg-red-500/10',
    warning: 'bg-yellow-500/10',
  };

  const textColors = {
    default: 'text-primary',
    success: 'text-green-500',
    destructive: 'text-red-500',
    warning: 'text-yellow-500',
  };

  return (
    <div className={`${bgColors[variant]} rounded-lg p-4`}>
      <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      <p className={`text-2xl font-bold ${textColors[variant]}`}>{value}</p>
    </div>
  );
}
