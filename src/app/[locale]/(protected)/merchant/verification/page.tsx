import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/server/auth/next-auth';
import { redirect } from 'next/navigation';
import { MerchantVerificationForm } from '@/components/verification/merchant-verification-form';
import { VerificationStatus } from '@/types/verification';
import { VerificationStatusBanner } from '@/components/verification/verification-status-banner';
import { db } from '@/server/db';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
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
  const { locale } = await params;
  
  // Vérifier si l'utilisateur est connecté et est un merchant
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect(`/${locale}/login?callbackUrl=/${locale}/merchant/verification`);
  }
  
  if (session.user.role !== 'MERCHANT') {
    redirect(`/${locale}/dashboard`);
  }
  
  const userId = session.user.id;
  
  // Récupérer les documents de l'utilisateur pour déterminer le statut
  const userDocuments = await db.document.findMany({
    where: {
      userId: userId,
      userRole: 'MERCHANT'
    },
    orderBy: {
      uploadedAt: 'desc',
    },
  });
  
  // Déterminer le statut global de vérification basé sur les documents
  let verificationStatus = null;
  if (userDocuments.length > 0) {
    const hasRejected = userDocuments.some(doc => doc.verificationStatus === 'REJECTED');
    const hasApproved = userDocuments.some(doc => doc.verificationStatus === 'APPROVED');
    const hasPending = userDocuments.some(doc => doc.verificationStatus === 'PENDING');
    
    if (hasRejected) {
      verificationStatus = 'REJECTED';
    } else if (hasPending) {
      verificationStatus = 'PENDING';
    } else if (hasApproved) {
      verificationStatus = 'APPROVED';
    }
  }
  
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
            rejectionReason={userDocuments.find(doc => doc.rejectionReason)?.rejectionReason || undefined}
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