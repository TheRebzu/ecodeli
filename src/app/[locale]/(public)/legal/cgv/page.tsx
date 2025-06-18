"use client";

import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";

export default function CGVPage() {
  const t = useTranslations();

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader title="CGV" description={t("public.CGV.description")} />

      <Card className="p-6">
        <div className="space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-3">Article 1 - Champ d'application</h2>
            <p className="text-sm">
              Les présentes conditions générales de vente (CGV) s'appliquent à tous 
              les services proposés par EcoDeli entre l'entreprise et ses clients professionnels 
              ou particuliers.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Article 2 - Prix et tarification</h2>
            <div className="space-y-2 text-sm">
              <p>Les prix sont indiqués en euros TTC et comprennent :</p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Les frais de livraison calculés selon la distance</li>
                <li>La commission de plateforme</li>
                <li>La TVA applicable</li>
              </ul>
              <p>Les prix peuvent être modifiés à tout moment mais ne s'appliquent qu'aux nouvelles commandes.</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Article 3 - Modalités de paiement</h2>
            <div className="space-y-2 text-sm">
              <p>Les moyens de paiement acceptés sont :</p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Carte bancaire (Visa, Mastercard)</li>
                <li>Virement bancaire</li>
                <li>Portefeuille électronique EcoDeli</li>
              </ul>
              <p>Le paiement s'effectue au moment de la validation de la commande.</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Article 4 - Livraison</h2>
            <p className="text-sm">
              Les délais de livraison sont communiqués à titre indicatif. EcoDeli s'engage 
              à respecter les créneaux convenus avec le client. En cas de retard, 
              le client sera informé dans les meilleurs délais.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Article 5 - Annulation et remboursement</h2>
            <p className="text-sm">
              L'annulation d'une commande est possible jusqu'à 2 heures avant 
              l'heure de livraison prévue. Les remboursements sont effectués 
              sous 7 jours ouvrés sur le moyen de paiement utilisé.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Article 6 - Réclamations</h2>
            <p className="text-sm">
              Toute réclamation doit être adressée au service client EcoDeli 
              dans les 48 heures suivant la livraison. Nous nous engageons 
              à traiter votre demande dans les meilleurs délais.
            </p>
          </section>
        </div>
      </Card>
    </div>
  );
}
