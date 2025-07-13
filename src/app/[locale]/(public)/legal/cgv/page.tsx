import { useTranslations } from "next-intl";

export default function CGVPage() {
  const t = useTranslations("public.legal.cgv");

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader title={t("title") || "CGV"} description={t("description")} />

      <Card className="p-6">
        <div className="space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-3">
              {t("article1.title", "Article 1 - Champ d'application")}
            </h2>
            <p className="text-sm">
              {t(
                "article1.content",
                "Les présentes conditions générales de vente (CGV) s'appliquent à tous les services proposés par EcoDeli entre l'entreprise et ses clients professionnels ou particuliers.",
              )}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">
              {t("article2.title") || "Article 2 - Prix et tarification"}
            </h2>
            <div className="space-y-2 text-sm">
              <p>
                {t("article2.intro") ||
                  "Les prix sont indiqués en euros TTC et comprennent :"}
              </p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>
                  {t("article2.item1") ||
                    "Les frais de livraison calculés selon la distance"}
                </li>
                <li>{t("article2.item2") || "La commission de plateforme"}</li>
                <li>{t("article2.item3") || "La TVA applicable"}</li>
              </ul>
              <p>
                {t(
                  "article2.note",
                  "Les prix peuvent être modifiés à tout moment mais ne s'appliquent qu'aux nouvelles commandes.",
                )}
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">
              {t("article3.title") || "Article 3 - Modalités de paiement"}
            </h2>
            <div className="space-y-2 text-sm">
              <p>
                {t("article3.intro") ||
                  "Les moyens de paiement acceptés sont :"}
              </p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>
                  {t("article3.item1") || "Carte bancaire (Visa, Mastercard)"}
                </li>
                <li>{t("article3.item2") || "Virement bancaire"}</li>
                <li>
                  {t("article3.item3") || "Portefeuille électronique EcoDeli"}
                </li>
              </ul>
              <p>
                {t(
                  "article3.note",
                  "Le paiement s'effectue au moment de la validation de la commande.",
                )}
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">
              {t("article4.title") || "Article 4 - Livraison"}
            </h2>
            <p className="text-sm">
              {t(
                "article4.content",
                "Les délais de livraison sont communiqués à titre indicatif. EcoDeli s'engage à respecter les créneaux convenus avec le client. En cas de retard, le client sera informé dans les meilleurs délais.",
              )}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">
              {t("article5.title") || "Article 5 - Annulation et remboursement"}
            </h2>
            <p className="text-sm">
              {t(
                "article5.content",
                "L'annulation d'une commande est possible jusqu'à 2 heures avant l'heure de livraison prévue. Les remboursements sont effectués sous 7 jours ouvrés sur le moyen de paiement utilisé.",
              )}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">
              {t("article6.title") || "Article 6 - Réclamations"}
            </h2>
            <p className="text-sm">
              {t("article6.content") ||
                "Toute réclamation doit être adressée au service client EcoDeli dans les 48 heures suivant la livraison. Nous nous engageons à traiter votre demande dans les meilleurs délais."}
            </p>
          </section>
        </div>
      </Card>
    </div>
  );
}
