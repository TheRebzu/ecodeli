import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Document, User, VerificationStatus } from '@prisma/client';
import { api } from '@/trpc/react';
import { DocumentVerificationCard } from './document-verification-card';
import { Pagination } from '@/components/ui/pagination';
import { DocumentPlusIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PendingVerificationsTabProps {
  initialData: {
    data: Array<Document & { user: Pick<User, 'id' | 'name' | 'email' | 'role'> }>;
    meta: {
      total: number;
      page: number;
      limit: number;
      pages: number;
      hasMore: boolean;
    };
  };
  locale: 'en' | 'fr';
}

export function PendingVerificationsTab({ initialData, locale }: PendingVerificationsTabProps) {
  const t = useTranslations();
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(initialData.meta.page);

  const { data, isLoading, refetch } = api.verification.getPendingVerifications.useQuery(
    {
      page: currentPage,
      limit: 10,
    },
    {
      initialData,
      refetchOnWindowFocus: false,
    }
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
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

  if (!data.data.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 bg-muted/30 rounded-lg border border-dashed">
        <DocumentPlusIcon className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">{t('verification.no_pending_documents')}</h3>
        <p className="text-sm text-muted-foreground mt-1 text-center max-w-md">
          {t('notifications.verification_required')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
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
