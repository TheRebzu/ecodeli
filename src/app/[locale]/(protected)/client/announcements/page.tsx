import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { AnnouncementList } from '@/components/announcements/announcement-list';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AnnouncementMap } from '@/components/announcements/announcement-map';

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'announcements' });

  return {
    title: t('myAnnouncements'),
    description: t('myAnnouncementsDescription'),
  };
}

export default async function ClientAnnouncementsPage() {
  const t = await getTranslations('announcements');

  return (
    <div className="container py-6 space-y-6">
      <PageHeader heading={t('myAnnouncements')} description={t('myAnnouncementsDescription')} />

      <Tabs defaultValue="list" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="list">{t('listView')}</TabsTrigger>
          <TabsTrigger value="map">{t('mapView')}</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          <AnnouncementList
            title={t('myAnnouncements')}
            description={t('myAnnouncementsDescription')}
            isClientView={true}
            showFilters={true}
            emptyMessage={t('noAnnouncementsFound')}
          />
        </TabsContent>

        <TabsContent value="map">
          <AnnouncementMap height="600px" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
