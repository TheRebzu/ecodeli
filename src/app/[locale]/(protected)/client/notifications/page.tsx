import { Metadata } from 'next';
import { NotificationCenter } from '@/components/notifications/notification-center';

export const metadata: Metadata = {
  title: 'Notifications | EcoDeli Client',
  description: 'Gérez vos notifications',
};

interface ClientNotificationsPageProps {
  params: {
    locale: string;
  };
}

export default function ClientNotificationsPage({ params }: ClientNotificationsPageProps) {
  return (
    <div className="container py-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Notifications</h1>
      <NotificationCenter locale={params.locale} />
    </div>
  );
}
