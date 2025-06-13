import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ProviderSchedule } from "@/components/provider/schedule/provider-schedule";
import { PageHeader } from "@/components/ui/page-header";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("provider.schedule");

  return {
    title: t("title") || "Planning de Disponibilités | EcoDeli Prestataire",
    description: t("description") || "Gérez vos créneaux de disponibilité pour les services EcoDeli",
  };
}

export default async function ProviderSchedulePage() {
  const t = await getTranslations("provider.schedule");

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="Planning de Disponibilités"
        description="Gérez vos créneaux de disponibilité pour les services EcoDeli"
      />

      <ProviderSchedule />
    </div>
  );
}
