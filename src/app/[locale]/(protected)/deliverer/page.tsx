import type { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/server/auth/next-auth';
import { getTranslations } from 'next-intl/server';
import DelivererDashboard from '@/components/dashboard/deliverer/deliverer-dashboard';
import { UserStatus } from '@/server/db/enums';
import { PageProps, MetadataProps } from '@/types/next';

// Interface pour les propriétés de la page
interface Props {
  params: Promise<{ locale: string }>;
}

// Génération des métadonnées pour le dashboard livreur
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'dashboard' });

  return {
    title: t('deliverer.title') || 'Tableau de bord Livreur | EcoDeli',
    description:
      t('deliverer.description') || 'Gérez vos livraisons et suivez votre activité sur EcoDeli',
  };
}

// Composant principal de la page dashboard livreur
export default async function DelivererPage({ params }: Props) {
  const { locale } = await params;
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

  return (
    <div className="container mx-auto px-4 py-6">
      <DelivererDashboard locale={locale} />
    </div>
  );
}
