import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PendingVerificationsTab } from '@/components/admin/verification/pending-verifications-tab';
import { ProcessedVerificationsTab } from '@/components/admin/verification/processed-verifications-tab';

export const metadata: Metadata = {
  title: 'Document Verifications',
  description: 'Manage document verifications for deliverers',
};

export default async function DelivererVerificationsPage() {
  const t = await getTranslations('admin.verification');

  return (
    <div className="container py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('deliverer.title')}</h1>
        <p className="text-muted-foreground">{t('description')}</p>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full md:w-auto grid-cols-2">
          <TabsTrigger value="pending">{t('tabs.pending')}</TabsTrigger>
          <TabsTrigger value="processed">{t('tabs.approved')}</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-6">
          <PendingVerificationsTab
            filters={{
              status: 'PENDING',
              page: 1,
              limit: 10,
              sortBy: 'createdAt',
              sortDirection: 'desc',
            }}
            onPageChange={() => {}}
          />
        </TabsContent>

        <TabsContent value="processed" className="mt-6">
          <ProcessedVerificationsTab
            filters={{
              status: 'APPROVED',
              page: 1,
              limit: 10,
              sortBy: 'createdAt',
              sortDirection: 'desc',
            }}
            onPageChange={() => {}}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
