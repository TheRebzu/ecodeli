import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { MerchantStats } from "@/components/merchant/stats/merchant-stats";
import { PageHeader } from "@/components/ui/page-header";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("merchant.stats");

  return {
    title: t("title") || "Statistiques | EcoDeli Marchand",
    description: t("description") || "Analysez les performances de votre boutique",
  };
}

export default async function MerchantStatsPage() {
  const t = await getTranslations("merchant.stats");

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="Statistiques de Performance"
        description="Analysez les performances de votre boutique et suivez vos ventes"
      />

      <MerchantStats />
    </div>
  );
}
