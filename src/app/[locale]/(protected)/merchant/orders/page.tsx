import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { MerchantOrders } from "@/components/merchant/orders/merchant-orders";
import { PageHeader } from "@/components/ui/page-header";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("merchant.orders");

  return {
    title: t("title") || "Commandes | EcoDeli Marchand",
    description: t("description") || "Gérez vos commandes et suivez leur statut",
  };
}

export default async function MerchantOrdersPage() {
  const t = await getTranslations("merchant.orders");

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="Gestion des Commandes"
        description="Gérez vos commandes et suivez leur statut de traitement"
      />

      <MerchantOrders />
    </div>
  );
}
