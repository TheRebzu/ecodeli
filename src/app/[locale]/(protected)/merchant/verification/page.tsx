import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/server/auth/next-auth';
import { redirect } from 'next/navigation';
import { MerchantVerificationForm } from '@/components/verification/merchant-verification-form';
import { VerificationStatus } from '@/types/verification';
import { VerificationStatusBanner } from '@/components/verification/verification-status-banner';
import { db } from '@/server/db';
<<<<<<< HEAD
import { DocumentType } from '@prisma/client';
=======
>>>>>>> amine

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'verification' });

  return {
    title: t('merchant.title'),
    description: t('merchant.description'),
  };
}

export default async function MerchantVerificationPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  // Vérifier si l'utilisateur est connecté et est un merchant
  const session = await getServerSession(authOptions);
  
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
    }
  });

  if (!merchant) {
    redirect(`/${locale}/dashboard`);
  }
  
  // Récupérer le statut de vérification actuel
<<<<<<< HEAD
<<<<<<< HEAD
  // Recherche des documents liés au MERCHANT via la relation avec Document
  const merchantDocument = await db.document.findFirst({
=======
  const merchantVerification = await db.verification.findFirst({
>>>>>>> 39899a500fab5a80507b97804da7f3197dfdc4cb
    where: {
      submitterId: userId,
      type: 'MERCHANT'
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
  
<<<<<<< HEAD
  const verificationStatus = merchantDocument?.verifications[0]?.status || null;
  const merchantVerification = merchantDocument?.verifications[0] || null;
=======
  const merchantVerification = await db.verification.findFirst({
    where: {
      submitterId: userId,
      type: 'MERCHANT'
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
  
  const verificationStatus = merchantVerification?.status || null;
>>>>>>> amine
=======
  const verificationStatus = merchantVerification?.status || null;

>>>>>>> 39899a500fab5a80507b97804da7f3197dfdc4cb
  
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
          <h2 className="text-xl font-semibold mb-2">
            {t('alreadySubmitted.title')}
          </h2>
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