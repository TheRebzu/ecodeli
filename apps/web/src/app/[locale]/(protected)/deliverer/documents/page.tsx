import { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { redirect, notFound } from 'next/navigation';
import { authOptions } from '@/server/auth/next-auth';
import { getTranslations } from 'next-intl/server';
import DelivererDocumentUpload from '@/components/deliverer/documents/deliverer-document-verification';
import { UserStatus } from '@prisma/client';
import { createCaller } from '@/trpc/server';
import ForceVerifyDelivererButton from '@/components/deliverer/documents/force-verify-deliverer-button';
import { headers } from 'next/headers';

type Props = {
  params: { locale: string };
  searchParams: { [key: string]: string | string[] | undefined };
};

// Définir l'interface MetadataProps correctement pour Next.js
interface MetadataProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata(props: MetadataProps): Promise<Metadata> {
  // Attendre la résolution des params
  const { params } = props;
  const resolvedParams = await params;
  const locale = resolvedParams.locale;

  const t = await getTranslations({
    locale,
    namespace: 'documents',
  });

  return {
    title: t('deliverer.pageTitle') || 'Documents Livreur | EcoDeli',
    description: t('deliverer.pageDescription') || 'Téléchargez vos documents pour vérification',
  };
}

export default async function DelivererDocumentsPage({ params, searchParams }: Props) {
  // Résoudre params.locale et searchParams en tant que Promise
  const [resolvedParams, resolvedSearchParams] = await Promise.all([params, searchParams]);

  const locale = resolvedParams.locale;
  const verification_required = resolvedSearchParams.verification_required !== undefined;
  const auto_check = resolvedSearchParams.auto_check !== undefined;

  const session = await getServerSession(authOptions);

  // Rediriger vers la page de connexion si l'utilisateur n'est pas connecté
  if (!session || !session.user) {
    return redirect(`/${locale}/login`);
  }

  // Vérifier que l'utilisateur est bien un livreur
  if (session.user.role !== 'DELIVERER') {
    return redirect(`/${locale}/login`);
  }

  // Si l'utilisateur est déjà vérifié et qu'on n'est pas dans une redirection client
  // (pas de verification_required), on peut rediriger vers le dashboard
  if (session.user.isVerified && !verification_required) {
    // Obtenir les headers (next/headers retourne directement l'objet, pas une promesse)
    const headersList = headers();
    const referer = headersList.get('referer') || '';

    // Ne rediriger que si on ne vient pas d'une autre page du module deliverer
    if (!referer || !referer.includes('deliverer')) {
      // Utiliser redirection client avec JavaScript pour éviter NEXT_REDIRECT
      return (
        <div className="container mx-auto py-8 max-w-4xl">
          <div className="bg-green-100 dark:bg-green-900 border-l-4 border-green-500 text-green-700 dark:text-green-300 p-4 my-4 rounded">
            <p className="font-bold">Compte déjà vérifié</p>
            <p>
              Votre compte est déjà vérifié. Vous allez être redirigé vers votre tableau de bord.
            </p>
          </div>
          <script
            dangerouslySetInnerHTML={{
              __html: `
            setTimeout(() => {
              window.location.href = '/${locale}/deliverer/dashboard';
            }, 2000);
          `,
            }}
          />
        </div>
      );
    }
  }

  // Vérifier automatiquement le statut des documents pour tout livreur non vérifié
  let verificationStatus = null;
  if (!session.user.isVerified) {
    try {
      const caller = await createCaller();
      verificationStatus = await caller.verification.checkAndUpdateDelivererVerification();
      console.log('Vérification automatique effectuée:', verificationStatus);

      // Si la vérification a réussi mais que la session n'est pas mise à jour, forcer un rafraîchissement
      if (
        verificationStatus?.success &&
        verificationStatus?.isVerified &&
        !session.user.isVerified
      ) {
        console.log(
          'Documents vérifiés mais session non mise à jour. Forçage du rafraîchissement...'
        );
      }
    } catch (error) {
      console.error('Erreur lors de la vérification automatique:', error);
    }
  }

  // Redirection client uniquement en cas de succès de vérification
  const shouldRedirectToDashboard = verificationStatus?.success && verificationStatus?.isVerified;

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      {shouldRedirectToDashboard ? (
        <>
          <div className="bg-green-100 dark:bg-green-900 border-l-4 border-green-500 text-green-700 dark:text-green-300 p-4 my-4 rounded">
            <p className="font-bold">Vérification réussie</p>
            <p>
              Tous vos documents ont été vérifiés. Vous allez être redirigé vers votre tableau de
              bord.
            </p>
          </div>
          <script
            dangerouslySetInnerHTML={{
              __html: `
            // Forcer une actualisation complète pour mettre à jour la session
            setTimeout(() => {
              window.location.href = '/${locale}/deliverer/dashboard';
            }, 3000);
          `,
            }}
          />
        </>
      ) : (
        <>
          {verification_required && !session.user.isVerified ? (
            <div className="bg-amber-100 dark:bg-amber-900 border-l-4 border-amber-500 text-amber-700 dark:text-amber-300 p-4 my-4 rounded">
              <p className="font-bold">Vérification requise</p>
              <p>Veuillez soumettre tous les documents requis pour activer votre compte.</p>

              {verificationStatus && verificationStatus.success === false && (
                <div className="mt-2">
                  <p className="text-sm font-medium">Documents manquants ou non vérifiés:</p>
                  <ul className="list-disc list-inside text-sm mt-1">
                    {verificationStatus.missingDocuments?.map((doc: string) => (
                      <li key={doc}>{doc}</li>
                    ))}
                  </ul>
                </div>
              )}

              {verificationStatus && verificationStatus.success === true && (
                <div className="mt-2 text-sm">
                  <p>
                    Tous vos documents sont vérifiés. Cliquez sur le bouton ci-dessous pour activer
                    votre compte.
                  </p>
                </div>
              )}

              <div className="mt-4">
                <ForceVerifyDelivererButton />
              </div>
            </div>
          ) : null}

          <DelivererDocumentUpload userId={session.user.id} locale={locale} />

          {/* Ajout du bouton de vérification manuelle si les documents sont présents mais que le compte n'est pas encore vérifié */}
          {!session.user.isVerified && (
            <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium mb-2">Vérification manuelle</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                Si vous avez déjà soumis tous les documents requis mais que votre compte n'est
                toujours pas vérifié, vous pouvez tenter une vérification manuelle.
              </p>
              <ForceVerifyDelivererButton />
            </div>
          )}
        </>
      )}
    </div>
  );
}
