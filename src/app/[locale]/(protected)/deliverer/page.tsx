import { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/server/auth/next-auth';
import { getTranslations } from 'next-intl/server';
import DelivererDashboard from '@/components/dashboard/deliverer/deliverer-dashboard';
import { UserStatus } from '@/server/db/enums';

type Props = {
  params: { locale: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: 'dashboard' });

  return {
    title: t('deliverer.title') || 'Tableau de bord Livreur | EcoDeli',
    description:
      t('deliverer.description') || 'Gérez vos livraisons et suivez votre activité sur EcoDeli',
  };
}

export default async function DelivererDashboardPage({ params }: Props) {
  const locale = params.locale;
  const session = await getServerSession(authOptions);

  // Rediriger vers la page de connexion si l'utilisateur n'est pas connecté
  if (!session || !session.user) {
    redirect(`/${locale}/login`);
  }

  // Vérifier que l'utilisateur est bien un livreur
  if (session.user.role !== 'DELIVERER') {
    redirect(`/${locale}/dashboard`);
  }

  // Rediriger vers la page des documents si le livreur est en statut PENDING_VERIFICATION
  if (session.user.status === UserStatus.PENDING_VERIFICATION) {
    redirect(`/${locale}/deliverer/documents?verification_required=true`);
  }

  return <DelivererDashboard locale={locale} />;
}
