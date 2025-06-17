"use client";

import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";

export default function PartnersPage() {
  const t = useTranslations();

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="Partenaires"
        description={t("public.Partners.description")}
      />

      <Card className="p-6">
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6 text-center">
              <h3 className="font-semibold text-lg mb-2">Commerçants</h3>
              <p className="text-muted-foreground mb-4">Rejoignez notre réseau de partenaires commerciaux</p>
              <button className="bg-primary text-white px-4 py-2 rounded">En savoir plus</button>
            </Card>
            <Card className="p-6 text-center">
              <h3 className="font-semibold text-lg mb-2">Prestataires</h3>
              <p className="text-muted-foreground mb-4">Proposez vos services sur notre plateforme</p>
              <button className="bg-primary text-white px-4 py-2 rounded">En savoir plus</button>
            </Card>
            <Card className="p-6 text-center">
              <h3 className="font-semibold text-lg mb-2">Livreurs</h3>
              <p className="text-muted-foreground mb-4">Devenez livreur indépendant</p>
              <button className="bg-primary text-white px-4 py-2 rounded">En savoir plus</button>
            </Card>
          </div>
        </div>
      </Card>
    </div>
  );
}
