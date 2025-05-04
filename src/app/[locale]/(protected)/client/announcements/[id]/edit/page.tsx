import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/ui/page-header';
import { AnnouncementForm } from '@/components/announcements/announcement-form';
import { db } from '@/server/db';
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { AnnouncementStatus } from '@/types/announcement';
import { PageProps, MetadataProps } from '@/types/next';

interface EditAnnouncementPageProps {
  params: Promise<{
    id: string;
    locale: string;
  }>;
}

export async function generateMetadata({ params }: EditAnnouncementPageProps): Promise<Metadata> {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: 'announcements' });

  // Récupérer les détails de l'annonce
  try {
    const announcement = await db.announcement.findUnique({
      where: { id },
      select: { title: true },
    });

    if (!announcement) {
      return {
        title: t('announcementNotFound'),
      };
    }

    return {
      title: `${t('editAnnouncement')} - ${announcement.title}`,
      description: t('editAnnouncementDescription'),
    };
  } catch (error) {
    console.error('Error generating metadata:', error);
    return {
      title: t('editAnnouncement'),
      description: t('editAnnouncementDescription'),
    };
  }
}

export default async function EditAnnouncementPage({ params }: EditAnnouncementPageProps) {
  const { locale, id } = await params;
  const t = await getTranslations('announcements');

  // Récupérer les détails de l'annonce
  const announcement = await db.announcement.findUnique({
    where: { id },
  });

  if (!announcement) {
    notFound();
  }

  // Vérifier si l'annonce peut être modifiée
  if (
    announcement.status !== AnnouncementStatus.DRAFT &&
    announcement.status !== AnnouncementStatus.PENDING
  ) {
    // Rediriger vers la page de détail
    return (
      <div className="container py-6 space-y-6">
        <PageHeader
          heading={t('cannotEditAnnouncement')}
          description={t('cannotEditAnnouncementDescription')}
        />

        <div className="flex justify-center">
          <Button asChild>
            <Link href={`/${locale}/client/announcements/${announcement.id}`}>
              <ChevronLeft className="mr-2 h-4 w-4" />
              {t('backToAnnouncement')}
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-6 space-y-6">
      <PageHeader heading={t('editAnnouncement')} description={t('editAnnouncementDescription')}>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/${locale}/client/announcements/${announcement.id}`}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            {t('back')}
          </Link>
        </Button>
      </PageHeader>

      <AnnouncementForm announcement={announcement} isEdit={true} />
    </div>
  );
}
