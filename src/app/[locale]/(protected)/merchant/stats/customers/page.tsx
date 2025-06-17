"use client";

import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import SalesWidget from "@/components/merchant/dashboard/sales-widget";

export default function CustomerStatsPage() {
  const t = useTranslations();

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="Clients"
        description={t("merchant.CustomerStats.description")}
      />

      <Card className="p-6">
        <SalesWidget />
      </Card>
    </div>
  );
}
