import { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { redirect, notFound } from 'next/navigation';
import { authOptions } from '@/server/auth/next-auth';
import { getTranslations } from 'next-intl/server';
import DelivererDocumentUpload from '@/components/documents/deliverer-document-upload';
import { UserStatus } from '@prisma/client';
import { PageProps, MetadataProps } from '@/types/next';

type Props = {
  params: { locale: string };
  searchParams: { [key: string]: string | string[] | undefined };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  // Accès asynchrone à params.locale
  const locale = await Promise.resolve(params.locale);
  const t = await getTranslations({ locale, namespace: 'documents' });

  return {
    title: t('deliverer.pageTitle') || 'Vérification de Documents | EcoDeli',
    description: t('deliverer.pageDescription') || 'Uploadez vos documents pour vérification',
  };
}

export default async function DelivererDocumentsPage({ params, searchParams }: Props) {
  // Accès asynchrone à params.locale
  const locale = await Promise.resolve(params.locale);
  const t = await getTranslations({ locale, namespace: 'documents' });

  // Récupérer la session utilisateur
  const session = await getServerSession(authOptions);

  // Rediriger vers la page de connexion si aucune session
  if (!session || !session.user) {
    redirect(`/${locale}/login`);
  }

  // Vérifier si l'utilisateur est un livreur
  if (session.user.role !== 'DELIVERER') {
    redirect(`/${locale}/dashboard`);
  }

  // Accès asynchrone aux searchParams
  const verification_required = await Promise.resolve(searchParams.verification_required);
  const verificationRequired = verification_required === 'true';

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{t('deliverer.title')}</h1>
        <p className="text-muted-foreground mt-2">{t('deliverer.subtitle')}</p>

        {verificationRequired && (
          <div className="bg-yellow-100 dark:bg-yellow-900 border-l-4 border-yellow-500 text-yellow-700 dark:text-yellow-300 p-4 my-4 rounded">
            <p className="font-bold">{t('verificationRequired.title')}</p>
            <p>{t('verificationRequired.message')}</p>
          </div>
        )}

        {session.user.status === UserStatus.PENDING_VERIFICATION && (
          <div className="bg-blue-100 dark:bg-blue-900 border-l-4 border-blue-500 text-blue-700 dark:text-blue-300 p-4 my-4 rounded">
            <p className="font-bold">{t('pendingVerification.title')}</p>
            <p>{t('pendingVerification.message')}</p>
          </div>
        )}
      </div>

      <DelivererDocumentUpload userId={session.user.id} locale={locale} />
    </div>
  );
}
