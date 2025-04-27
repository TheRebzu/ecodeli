import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { VerificationStatus } from '@prisma/client';
import { api } from '@/trpc/react';
import { DocumentVerificationCard } from './document-verification-card';
import { Pagination } from '@/components/ui/pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ClipboardListIcon } from 'lucide-react';

interface ProcessedVerificationsTabProps {
  locale: 'en' | 'fr';
}

export function ProcessedVerificationsTab({ locale }: ProcessedVerificationsTabProps) {
  const t = useTranslations();
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<VerificationStatus | undefined>(undefined);

  const { data, isLoading, refetch } = api.verification.getProcessedVerifications.useQuery(
    {
      page: currentPage,
      limit: 9,
      status: statusFilter,
    },
    {
      refetchOnWindowFocus: false,
    }
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleStatusChange = (value: string) => {
    if (value === 'all') {
      setStatusFilter(undefined);
    } else {
      setStatusFilter(value as VerificationStatus);
    }
    setCurrentPage(1);
  };

  const handleVerified = () => {
    refetch();
    router.refresh();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!data || !data.data.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 bg-muted/30 rounded-lg border border-dashed">
        <ClipboardListIcon className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">{t('verification.no_processed_documents')}</h3>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-end mb-4">
        <Select value={statusFilter || 'all'} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t('verification.filter_by_status')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              {t('actions.view')} {t('status.all')}
            </SelectItem>
            <SelectItem value={VerificationStatus.APPROVED}>{t('status.approved')}</SelectItem>
            <SelectItem value={VerificationStatus.REJECTED}>{t('status.rejected')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data.data.map(document => (
          <DocumentVerificationCard
            key={document.id}
            document={document}
            locale={locale}
            onVerified={handleVerified}
          />
        ))}
      </div>

      {data.meta.pages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={data.meta.pages}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
}
