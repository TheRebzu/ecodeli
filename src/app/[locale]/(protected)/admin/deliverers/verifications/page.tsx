import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { api } from '@/trpc/server';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PendingVerificationsTab } from '@/components/admin/verification/pending-verifications-tab';
import { ProcessedVerificationsTab } from '@/components/admin/verification/processed-verifications-tab';

export const metadata: Metadata = {
  title: 'Document Verifications',
  description: 'Manage document verifications for deliverers',
};

export default async function DelivererVerificationsPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const t = await getTranslations();

  // Fetch initial data for both tabs
  const pendingVerificationsData = await api.verification.getPendingVerifications({
    page: 1,
    limit: 10,
  });

  return (
    <div className="container py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('verification.title')}</h1>
        <p className="text-muted-foreground">{t('documents.verification.title')}</p>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full md:w-auto grid-cols-2">
          <TabsTrigger value="pending">{t('verification.pending_documents')}</TabsTrigger>
          <TabsTrigger value="processed">{t('verification.processed_documents')}</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-6">
          <PendingVerificationsTab
            initialData={pendingVerificationsData}
            locale={locale as 'en' | 'fr'}
          />
        </TabsContent>

        <TabsContent value="processed" className="mt-6">
          <ProcessedVerificationsTab locale={locale as 'en' | 'fr'} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
