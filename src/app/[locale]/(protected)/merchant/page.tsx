import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/server/auth/next-auth';
import MerchantDashboard from '@/components/merchant/dashboard/merchant-dashboard';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function MerchantDashboardPage({ params }: Props) {
  // Attendre la résolution des paramètres
  const resolvedParams = await params;
  const locale = resolvedParams.locale;
  const session = await getServerSession(authOptions);

  // Rediriger vers la page de connexion si l'utilisateur n'est pas connecté
  if (!session || !session.user) {
    redirect(`/${locale}/login`);
  }

  // Vérifier que l'utilisateur est bien un marchand
  if (session.user.role !== 'MERCHANT') {
    redirect(`/${locale}/dashboard`);
  }

  // Rediriger vers la page des documents si le marchand n'est pas vérifié
  if (!session.user.isVerified) {
    redirect(`/${locale}/merchant/documents?verification_required=true`);
  }

  return <MerchantDashboard locale={locale} />;
}
