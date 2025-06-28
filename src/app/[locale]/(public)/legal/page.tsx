"use client";

import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";

export default function LegalPage() {
  const t = useTranslations();

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="Mentions légales"
        description={t("public.Legal.description")}
      />

      <Card className="p-6">
        <div className="space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-3">Informations légales</h2>
            <div className="space-y-2 text-sm">
              <p><strong>Dénomination sociale :</strong> EcoDeli SAS</p>
              <p><strong>Siège social :</strong> 123 Avenue de la République, 75011 Paris</p>
              <p><strong>SIRET :</strong> 123 456 789 00012</p>
              <p><strong>Capital social :</strong> 100 000 €</p>
              <p><strong>Directeur de publication :</strong> Jean Dupont</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Hébergement</h2>
            <div className="space-y-2 text-sm">
              <p><strong>Hébergeur :</strong> Vercel Inc.</p>
              <p><strong>Adresse :</strong> 340 S Lemon Ave #4133, Walnut, CA 91789</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Protection des données</h2>
            <p className="text-sm">
              Conformément au RGPD, vous disposez d'un droit d'accès, de rectification, 
              de suppression et d'opposition aux données vous concernant. 
              Pour exercer ces droits, contactez-nous à dpo@ecodeli.com
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Propriété intellectuelle</h2>
            <p className="text-sm">
              Tous les éléments du site EcoDeli (textes, images, vidéos, etc.) sont protégés 
              par le droit de la propriété intellectuelle. Toute reproduction est interdite 
              sans autorisation préalable.
            </p>
          </section>
        </div>
      </Card>
    </div>
  );
}
