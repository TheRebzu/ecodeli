import { Metadata } from 'next';
import { NotificationCenter } from '@/components/notifications/notification-center';
import { PageProps, MetadataProps } from '@/types/next';

export const metadata: Metadata = {
  title: 'Notifications | EcoDeli Client',
  description: 'Gérez vos notifications',
};

interface ClientNotificationsPageProps {
  params: Promise<{
    locale: string;
  }>;
}

export default async function ClientNotificationsPage({ params }: ClientNotificationsPageProps) {
  const { locale } = await params;

  return (
    <div className="container py-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Notifications</h1>
      <NotificationCenter locale={locale} />
    </div>
  );
}
