"use client";

import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { MerchantOrders } from "@/components/merchant/orders/merchant-orders";

export default function OrderDetailPage() {
  const t = useTranslations();

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="Détail commande"
        description={t("merchant.OrderDetail.description")}
      />

      <Card className="p-6">
        <MerchantOrders />
      </Card>
    </div>
  );
}
