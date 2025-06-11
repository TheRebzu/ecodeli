import { Metadata } from 'next';
import { NotificationCenter } from '@/components/shared/messaging/notification-center';

export const metadata: Metadata = {
  title: 'Notifications | EcoDeli Livreur',
  description: 'Gérez vos notifications',
};

interface DelivererNotificationsPageProps {
  params: {
    locale: string;
  };
}

export default function DelivererNotificationsPage({ params }: DelivererNotificationsPageProps) {
  return (
    <div className="container py-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Notifications</h1>
      <NotificationCenter locale={params.locale} />
    </div>
  );
}
