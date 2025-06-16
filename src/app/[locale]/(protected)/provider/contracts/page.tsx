import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ProviderContracts } from "@/components/provider/contracts/provider-contracts";
import { PageHeader } from "@/components/ui/page-header";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("provider.contracts");

  return {
    title: t("title") || "Mes Contrats | EcoDeli Prestataire",
    description: t("description") || "Gérez vos contrats de prestation de services"};
}

export default async function ProviderContractsPage() {
  const t = await getTranslations("provider.contracts");

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="Mes Contrats"
        description="Gérez vos contrats de prestation de services EcoDeli"
      />

      <ProviderContracts />
    </div>
  );
}
