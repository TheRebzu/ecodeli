"use client";

import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";

export default function CGUPage() {
  const t = useTranslations();

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader title="CGU" description={t("public.CGU.description")} />

      <Card className="p-6">
        <div className="space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-3">Article 1 - Objet</h2>
            <p className="text-sm">
              Les présentes conditions générales d'utilisation (CGU) régissent l'utilisation 
              de la plateforme EcoDeli, service de livraison écologique et de mise en relation 
              entre clients, livreurs, commerçants et prestataires de services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Article 2 - Acceptation</h2>
            <p className="text-sm">
              L'utilisation de la plateforme EcoDeli implique l'acceptation pleine et entière 
              des présentes CGU. Si vous n'acceptez pas ces conditions, vous ne devez pas 
              utiliser nos services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Article 3 - Services proposés</h2>
            <div className="space-y-2 text-sm">
              <p>EcoDeli propose les services suivants :</p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Livraison écologique de colis et marchandises</li>
                <li>Services à domicile par des prestataires qualifiés</li>
                <li>Solutions de stockage temporaire</li>
                <li>Mise en relation entre utilisateurs</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Article 4 - Inscription</h2>
            <p className="text-sm">
              L'inscription sur EcoDeli est gratuite et ouverte à toute personne physique 
              ou morale. Les informations fournies lors de l'inscription doivent être 
              exactes et à jour.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Article 5 - Responsabilité</h2>
            <p className="text-sm">
              EcoDeli agit en qualité d'intermédiaire et ne peut être tenu responsable 
              des dommages résultant de l'utilisation des services par les utilisateurs.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Article 6 - Modification des CGU</h2>
            <p className="text-sm">
              EcoDeli se réserve le droit de modifier les présentes CGU à tout moment. 
              Les utilisateurs seront informés des modifications par email ou notification 
              sur la plateforme.
            </p>
          </section>
        </div>
      </Card>
    </div>
  );
}
