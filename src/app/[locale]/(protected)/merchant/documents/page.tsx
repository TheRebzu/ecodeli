import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import { authOptions } from "@/server/auth/next-auth";
import { getTranslations } from "next-intl/server";
import { DocumentUpload } from "@/components/deliverer/documents/document-upload";
import DocumentList from "@/components/deliverer/documents/document-list";
import { UserStatus } from "@prisma/client";
import { createCaller } from "@/trpc/server";
import { headers } from "next/headers";

export const metadata: Metadata = {
  title: "Mes documents | EcoDeli Marchand",
  description:
    "Téléchargez et gérez les documents nécessaires à la vérification de votre compte"};

type Props = {
  params: Promise<{ locale }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function MerchantDocumentsPage({
  params,
  searchParams}: Props) {
  // Résoudre params.locale et searchParams en tant que Promise
  const [resolvedParams, resolvedSearchParams] = await Promise.all([
    params,
    searchParams]);

  const locale = resolvedParams.locale;
  const verification_required =
    resolvedSearchParams.verification_required !== undefined;
  const auto_check = resolvedSearchParams.auto_check !== undefined;

  const session = await getServerSession(authOptions);

  // Rediriger vers la page de connexion si l'utilisateur n'est pas connecté
  if (!session || !session.user) {
    return redirect(`/${locale}/login`);
  }

  // Vérifier que l'utilisateur est bien un marchand
  if (session.user.role !== "MERCHANT") {
    return redirect(`/${locale}/login`);
  }

  // Si l'utilisateur est déjà vérifié et qu'on n'est pas dans une redirection client
  // (pas de verificationrequired), on peut rediriger vers le dashboard
  if (session.user.isVerified && !verificationrequired) {
    // Obtenir les headers
    const headersList = headers();
    const referer = headersList.get("referer") || "";

    // Ne rediriger que si on ne vient pas d'une autre page du module merchant
    if (!referer || !referer.includes("merchant")) {
      // Utiliser redirection client avec JavaScript pour éviter NEXT_REDIRECT
      return (
        <div className="container mx-auto py-8 max-w-4xl">
          <div className="bg-green-100 dark:bg-green-900 border-l-4 border-green-500 text-green-700 dark:text-green-300 p-4 my-4 rounded">
            <p className="font-bold">Compte déjà vérifié</p>
            <p>
              Votre compte est déjà vérifié. Vous allez être redirigé vers votre
              tableau de bord.
            </p>
          </div>
          <script
            dangerouslySetInnerHTML={{
              html: `
            // Appel API réel via tRPC
          `}}
          />
        </div>
      );
    }
  }

  // Vérifier automatiquement le statut des documents pour tout marchand non vérifié
  const verificationStatus = null;
  if (!session.user.isVerified) {
    try {
      const caller = await createCaller();
      verificationStatus =
        await caller.verification.checkAndUpdateMerchantVerification();
      // Vérification automatique effectuée avec succès

      // Si la vérification a réussi mais que la session n'est pas mise à jour, forcer un rafraîchissement
      if (
        verificationStatus?.success &&
        verificationStatus?.isVerified &&
        !session.user.isVerified
      ) {
        // Documents vérifiés mais session non mise à jour - rafraîchissement nécessaire
      }
    } catch (error) {
      // Erreur lors de la vérification automatique - continuer sans bloquer
    }
  }

  // Redirection client uniquement en cas de succès de vérification
  const shouldRedirectToDashboard =
    verificationStatus?.success && verificationStatus?.isVerified;

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      {shouldRedirectToDashboard ? (
        <>
          <div className="bg-green-100 dark:bg-green-900 border-l-4 border-green-500 text-green-700 dark:text-green-300 p-4 my-4 rounded">
            <p className="font-bold">Vérification réussie</p>
            <p>
              Tous vos documents ont été vérifiés. Vous allez être redirigé vers
              votre tableau de bord.
            </p>
          </div>
          <script
            dangerouslySetInnerHTML={{
              html: `
            // Forcer une actualisation complète pour mettre à jour la session
            // Appel API réel via tRPC
          `}}
          />
        </>
      ) : (
        <>
          {verificationrequired && !session.user.isVerified ? (
            <div className="bg-amber-100 dark:bg-amber-900 border-l-4 border-amber-500 text-amber-700 dark:text-amber-300 p-4 my-4 rounded">
              <p className="font-bold">Vérification requise</p>
              <p>
                Vous devez télécharger et faire vérifier tous vos documents
                avant de pouvoir accéder à toutes les fonctionnalités de votre
                compte marchand.
              </p>
            </div>
          ) : null}

          <h1 className="text-3xl font-bold mb-6">
            Documents requis pour la vérification
          </h1>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <div>
              <DocumentUpload userRole="MERCHANT" />
            </div>
            <div>
              <DocumentList />
            </div>
          </div>

          <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
            <h2 className="text-xl font-medium mb-2">Documents nécessaires</h2>
            <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">
              Pour vérifier votre compte marchand, veuillez télécharger les
              documents suivants :
            </p>
            <ul className="list-disc pl-5 mb-4 space-y-2 text-sm text-gray-600 dark:text-gray-300">
              <li>Document d'identité valide (carte d'identité, passeport)</li>
              <li>Extrait Kbis ou équivalent (moins de 3 mois)</li>
              <li>Attestation URSSAF ou équivalent (moins de 3 mois)</li>
              <li>Justificatif d'adresse professionnelle (moins de 3 mois)</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
