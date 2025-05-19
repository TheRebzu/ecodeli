import { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { authOptions } from '@/server/auth';
import DelivererDocumentUpload from '@/components/documents/deliverer-document-upload';
import { UserStatus } from '@prisma/client';
import ForceVerificationUpdate from '@/components/deliverer/force-verification-update';
import { db } from '@/server/db';
import ForceVerifyDelivererButton from '@/components/deliverer/documents/force-verify-deliverer-button';

type Props = {
  params: {
    locale: string;
  };
  searchParams: {
    verification_required?: string;
  };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = params.locale;
  const t = await getTranslations({ locale, namespace: 'documents' });

  return {
    title: t('deliverer.pageTitle') || 'Vérification de Documents | EcoDeli',
    description: t('deliverer.pageDescription') || 'Uploadez vos documents pour vérification',
  };
}

export default async function DelivererDocumentsPage({ params, searchParams }: Props) {
  const locale = params.locale;
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

  // Récupérer le statut de vérification depuis les paramètres de recherche
  const verificationRequired = searchParams.verification_required === 'true';

  // Récupérer les documents du livreur directement depuis la base de données
  const documents = await db.document.findMany({
    where: {
      userId: session.user.id,
    },
  });

  // Types de documents requis pour la vérification livreur
  const requiredTypes = ['ID_CARD', 'DRIVING_LICENSE', 'VEHICLE_REGISTRATION'];

  // Filtrer les documents vérifiés ET de type requis
  const verifiedDocuments = documents.filter(
    doc =>
      (requiredTypes.includes(doc.type) || doc.type === 'SELFIE') &&
      doc.verificationStatus === 'APPROVED'
  );

  // TEMPORAIRE: Vérifier si au moins 3 documents sont vérifiés
  const hasVerifiedDocuments = verifiedDocuments.length >= 3 || session.user.isVerified;
  const userIsNotVerified = !session.user.isVerified;
  const shouldShowForceUpdate = hasVerifiedDocuments && userIsNotVerified;

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

        {/* Message d'information si moins de 3 documents vérifiés ET l'utilisateur n'est pas vérifié */}
        {!hasVerifiedDocuments && (
          <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 my-4 rounded">
            <p className="font-bold">Documents manquants</p>
            <p>
              Vous devez avoir 3 documents vérifiés pour activer votre compte. Veuillez soumettre et
              faire valider tous les documents requis.
            </p>
          </div>
        )}

        {/* Message si tous les documents sont soumis mais pas encore approuvés */}
        {documents.length >= 3 && !hasVerifiedDocuments && (
          <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 my-4 rounded">
            <p className="font-bold">Tous les documents soumis</p>
            <p>
              Tous vos documents ont été soumis pour vérification. Nous vous informerons lorsqu'ils
              seront approuvés.
            </p>
          </div>
        )}

        {/* Bouton de mise à jour du statut uniquement si 3/3 */}
        {shouldShowForceUpdate && <ForceVerificationUpdate />}

        {documents.length >= 3 && session.user.status !== 'ACTIVE' && (
          <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <h3 className="text-lg font-semibold mb-2">Activation du compte</h3>
            <p className="mb-4">
              Tous vos documents ont été soumis. Si tous vos documents sont approuvés mais que votre
              compte n'est pas encore actif, vous pouvez forcer la vérification manuellement.
            </p>
            <ForceVerifyDelivererButton />
          </div>
        )}
      </div>

      <DelivererDocumentUpload userId={session.user.id} locale={locale} />
    </div>
  );
}
