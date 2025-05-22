import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/ui/page-header';
import { AnnouncementForm } from '@/components/announcements/announcement-form';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'announcements' });

  return {
    title: t('createAnnouncement'),
    description: t('createAnnouncementDescription'),
  };
}

export default async function CreateAnnouncementPage() {
  const t = await getTranslations('announcements');

  return (
    <div className="container py-6 space-y-6">
      <PageHeader
        heading={t('createAnnouncement')}
        description={t('createAnnouncementDescription')}
      />

      <AnnouncementForm />
    </div>
  );
}
