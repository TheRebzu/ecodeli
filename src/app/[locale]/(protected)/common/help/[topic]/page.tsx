"use client";

import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";

export default function HelpArticlePage() {
  const t = useTranslations();

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="Article"
        description={t("common.HelpArticle.description")}
      />

      <Card className="p-6">
        <article className="prose max-w-none">
          <h1 className="text-2xl font-bold mb-6">Comment utiliser EcoDeli ?</h1>
          
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Premières étapes</h2>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Créez votre compte sur la plateforme EcoDeli</li>
              <li>Complétez votre profil avec vos informations personnelles</li>
              <li>Vérifiez votre adresse email</li>
              <li>Ajoutez vos moyens de paiement</li>
            </ol>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Passer une commande</h2>
            <div className="space-y-3 text-sm">
              <p>Pour commander une livraison :</p>
              <ol className="list-decimal list-inside space-y-1 ml-4">
                <li>Cliquez sur "Nouvelle annonce" dans votre tableau de bord</li>
                <li>Remplissez les détails de votre livraison (adresses, type d'objet, créneau)</li>
                <li>Validez les informations et confirmez le paiement</li>
                <li>Suivez votre livraison en temps réel</li>
              </ol>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Réserver un service</h2>
            <div className="space-y-3 text-sm">
              <p>Pour réserver un service à domicile :</p>
              <ol className="list-decimal list-inside space-y-1 ml-4">
                <li>Parcourez les services disponibles dans votre zone</li>
                <li>Sélectionnez le prestataire qui vous convient</li>
                <li>Choisissez un créneau disponible</li>
                <li>Confirmez votre réservation</li>
              </ol>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Stockage temporaire</h2>
            <p className="text-sm mb-3">
              Nos solutions de stockage vous permettent de déposer temporairement 
              vos colis dans des points sécurisés.
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm ml-4">
              <li>Recherchez un point de stockage proche de chez vous</li>
              <li>Réservez votre emplacement</li>
              <li>Déposez votre colis avec le code d'accès</li>
              <li>Récupérez-le quand vous le souhaitez</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">Besoin d'aide ?</h2>
            <p className="text-sm">
              Notre équipe support est disponible 7j/7 pour répondre à vos questions. 
              Contactez-nous via le chat en ligne ou par email à support@ecodeli.com
            </p>
          </section>
        </article>
      </Card>
    </div>
  );
}
