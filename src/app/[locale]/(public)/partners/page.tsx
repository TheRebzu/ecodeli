import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function PartnersPage() {
  const t = useTranslations("public.partners");

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title={t("title") || "Partenaires"}
        description={t("description")}
      />

      <Card className="p-6">
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6 text-center">
              <h3 className="font-semibold text-lg mb-2">
                {t("merchants.title") || "Commerçants"}
              </h3>
              <p className="text-muted-foreground mb-4">
                {t("merchants.description") ||
                  "Rejoignez notre réseau de partenaires commerciaux"}
              </p>
              <button className="bg-primary text-white px-4 py-2 rounded">
                {t("merchants.button") || "En savoir plus"}
              </button>
            </Card>
            <Card className="p-6 text-center">
              <h3 className="font-semibold text-lg mb-2">
                {t("providers.title") || "Prestataires"}
              </h3>
              <p className="text-muted-foreground mb-4">
                {t("providers.description") ||
                  "Proposez vos services sur notre plateforme"}
              </p>
              <button className="bg-primary text-white px-4 py-2 rounded">
                {t("providers.button") || "En savoir plus"}
              </button>
            </Card>
            <Card className="p-6 text-center">
              <h3 className="font-semibold text-lg mb-2">
                {t("deliverers.title") || "Livreurs"}
              </h3>
              <p className="text-muted-foreground mb-4">
                {t("deliverers.description") || "Devenez livreur indépendant"}
              </p>
              <button className="bg-primary text-white px-4 py-2 rounded">
                {t("deliverers.button") || "En savoir plus"}
              </button>
            </Card>
          </div>
        </div>
      </Card>
    </div>
  );
}
