'use client';

import { useState } from 'react';
import { api } from '@/trpc/react';
import { useTranslations } from 'next-intl';
import { AuditLogTable } from '@/components/admin/audit/audit-log-table';
import { DashboardHeader } from '@/components/layout/dashboard-header';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Journal d'audit",
  description:
    "Journal d'audit système montrant toutes les modifications effectuées sur les entités",
};

const PAGE_SIZE = 20;

export default function AuditPage() {
  const t = useTranslations('admin.audit');
  const [currentPage, setCurrentPage] = useState(1);

  // Requête pour récupérer les logs d'audit
  const { data, isLoading, error } = api.admin.audit.getAuditLogs.useQuery(
    {
      limit: PAGE_SIZE,
      offset: (currentPage - 1) * PAGE_SIZE,
    },
    {
      refetchOnWindowFocus: false,
    }
  );

  // Gérer le changement de page
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <>
      <DashboardHeader heading={t('title')} text={t('subtitle')} />

      <DashboardShell>
        {error ? (
          <div className="flex h-96 items-center justify-center">
            <div className="text-center">
              <h3 className="text-lg font-semibold">{t('error.title')}</h3>
              <p className="text-muted-foreground">{t('error.message')}</p>
            </div>
          </div>
        ) : isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-1/3" />
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </div>
        ) : (
          <AuditLogTable
            logs={data?.logs || []}
            totalCount={data?.totalCount || 0}
            currentPage={currentPage}
            pageSize={PAGE_SIZE}
            isLoading={isLoading}
            onPageChange={handlePageChange}
          />
        )}
      </DashboardShell>
    </>
  );
}
