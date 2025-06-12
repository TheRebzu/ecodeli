import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/server/auth/next-auth';
import { redirect } from 'next/navigation';
import { MerchantVerificationForm } from '@/components/ui/form';
import { VerificationStatus } from '@/types/documents/verification';
import { VerificationStatusBanner } from '@/components/admin/verification/verification-list';
import { db } from '@/server/db';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  const { locale } = resolvedParams;
  const t = await getTranslations({ locale, namespace: 'verification' });

  return {
    title: t('merchant.title'),
    description: t('merchant.description'),
  };
}

export default async function MerchantVerificationPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  // Vérifier si l'utilisateur est connecté et est un merchant
  const session = await getServerSession(authOptions);
  const resolvedParams = await params;
  const { locale } = resolvedParams;

  if (!session) {
    redirect(`/${locale}/login?callbackUrl=/${locale}/merchant/verification`);
  }

  if (session.user.role !== 'MERCHANT') {
    redirect(`/${locale}/dashboard`);
  }

  const userId = session.user.id;

  // Récupérer le merchant pour cet utilisateur
  const merchant = await db.merchant.findUnique({
    where: {
      userId: userId,
    },
  });

  if (!merchant) {
    redirect(`/${locale}/dashboard`);
  }

  // Récupérer le statut de vérification actuel
  const merchantVerification = await db.verification.findFirst({
    where: {
      submitterId: userId,
      type: 'MERCHANT',
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  const verificationStatus = merchantVerification?.status || null;

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
            rejectionReason={merchantVerification?.rejectionReason || undefined}
          />
        </div>
      )}

      {!verificationStatus || verificationStatus === 'REJECTED' ? (
        <MerchantVerificationForm />
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
