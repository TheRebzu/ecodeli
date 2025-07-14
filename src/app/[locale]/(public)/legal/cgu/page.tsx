import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";

export default function CGUPage() {
  const t = useTranslations("public.legal.cgu");

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader title={t("title") || "CGU"} description={t("description")} />

      <Card className="p-6">
        <div className="space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-3">
              {t("article1.title") || "Article 1 - Objet"}
            </h2>
            <p className="text-sm">
              {t("article1.content") ||
                "Les présentes conditions générales d'utilisation (CGU) régissent l'utilisation de la plateforme EcoDeli, service de livraison écologique et de mise en relation entre clients, livreurs, commerçants et prestataires de services."}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">
              {t("article2.title") || "Article 2 - Acceptation"}
            </h2>
            <p className="text-sm">
              {t("article2.content") ||
                "L'utilisation de la plateforme EcoDeli implique l'acceptation pleine et entière des présentes CGU. Si vous n'acceptez pas ces conditions, vous ne devez pas utiliser nos services."}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">
              {t("article3.title") || "Article 3 - Services proposés"}
            </h2>
            <div className="space-y-2 text-sm">
              <p>
                {t("article3.intro") ||
                  "EcoDeli propose les services suivants :"}
              </p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>
                  {t("article3.service1") ||
                    "Livraison écologique de colis et marchandises"}
                </li>
                <li>
                  {t("article3.service2") ||
                    "Transport de personnes respectueux de l'environnement"}
                </li>
                <li>
                  {t("article3.service3") ||
                    "Services à la personne (ménage, jardinage, etc.)"}
                </li>
                <li>
                  {t("article3.service4") ||
                    "Mise en relation avec des commerçants locaux"}
                </li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">
              {t("article4.title") || "Article 4 - Responsabilité"}
            </h2>
            <p className="text-sm">
              {t("article4.content") ||
                "EcoDeli agit en qualité d'intermédiaire technique et ne peut être tenu responsable des dommages résultant de l'utilisation de ses services par les utilisateurs."}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">
              {t("article5.title") || "Article 5 - Données personnelles"}
            </h2>
            <p className="text-sm">
              {t("article5.content") ||
                "EcoDeli s'engage à protéger les données personnelles de ses utilisateurs conformément à sa politique de confidentialité et aux réglementations en vigueur."}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">
              {t("article6.title") || "Article 6 - Modification des CGU"}
            </h2>
            <p className="text-sm">
              {t("article6.content") ||
                "EcoDeli se réserve le droit de modifier les présentes CGU à tout moment. Les utilisateurs seront informés des modifications par email ou via la plateforme."}
            </p>
          </section>
        </div>
      </Card>
    </div>
  );
}
