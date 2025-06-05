import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/server/auth/next-auth';
import { redirect } from 'next/navigation';
import { ProviderVerificationForm } from '@/components/verification/provider-verification-form';
import { VerificationStatus } from '@/types/verification';
import { VerificationStatusBanner } from '@/components/verification/verification-status-banner';
import { db } from '@/server/db';

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'verification' });

  return {
    title: t('provider.title'),
    description: t('provider.description'),
  };
}

export default async function ProviderVerificationPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  // Vérifier si l'utilisateur est connecté et est un provider
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect(`/${locale}/login?callbackUrl=/${locale}/provider/verification`);
  }

  if (session.user.role !== 'PROVIDER') {
    redirect(`/${locale}/dashboard`);
  }

  const userId = session.user.id;

  // Récupérer le statut de vérification actuel
  const providerVerification = await db.providerVerification.findFirst({
    where: {
      provider: {
        userId,
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  const verificationStatus = providerVerification?.status || null;

  // Traduire les textes
  const t = await getTranslations({ locale, namespace: 'verification' });

  return (
    <div className="container max-w-4xl py-8">
      {verificationStatus && (
        <div className="mb-8">
          <VerificationStatusBanner
            status={verificationStatus as VerificationStatus}
            title={
              verificationStatus === 'APPROVED'
                ? t('statusBanner.approved.title')
                : verificationStatus === 'REJECTED'
                  ? t('statusBanner.rejected.title')
                  : t('statusBanner.pending.title')
            }
            description={
              verificationStatus === 'APPROVED'
                ? t('statusBanner.approved.description')
                : verificationStatus === 'REJECTED'
                  ? t('statusBanner.rejected.description')
                  : t('statusBanner.pending.description')
            }
            rejectionReason={providerVerification?.rejectionReason || undefined}
          />
        </div>
      )}

      {!verificationStatus || verificationStatus === 'REJECTED' ? (
        <ProviderVerificationForm />
      ) : (
        <div className="border rounded-lg p-6 text-center">
          <h2 className="text-xl font-semibold mb-2">{t('alreadySubmitted.title')}</h2>
          <p className="text-muted-foreground">
            {verificationStatus === 'PENDING'
              ? t('alreadySubmitted.pending')
              : t('alreadySubmitted.approved')}
          </p>
        </div>
      )}
    </div>
  );
}
