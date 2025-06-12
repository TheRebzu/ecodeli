import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/server/auth/next-auth';
import ProviderDashboard from '@/components/providers/provider-dashboard';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function ProviderDashboardPage({ params }: Props) {
  // Attendre la résolution des paramètres
  const resolvedParams = await params;
  const locale = resolvedParams.locale;
  const session = await getServerSession(authOptions);

  // Rediriger vers la page de connexion si l'utilisateur n'est pas connecté
  if (!session || !session.user) {
    redirect(`/${locale}/login`);
  }

  // Vérifier que l'utilisateur est bien un prestataire
  if (session.user.role !== 'PROVIDER') {
    redirect(`/${locale}/dashboard`);
  }

  // Rediriger vers la page des documents si le prestataire n'est pas vérifié
  if (!session.user.isVerified) {
    redirect(`/${locale}/provider/documents?verification_required=true`);
  }

  return <ProviderDashboard locale={locale} />;
}
