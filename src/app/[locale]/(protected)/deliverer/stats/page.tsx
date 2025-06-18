"use client";

import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/ui/page-header";
import { DeliveryStatsWidget } from "@/components/deliverer/dashboard/delivery-stats-widget";
import { EarningsWidget } from "@/components/deliverer/dashboard/earnings-widget";
import { Card } from "@/components/ui/card";

export default function StatsPage() {
  const t = useTranslations();

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="Statistiques"
        description={t("deliverer.Stats.description")}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <DeliveryStatsWidget />
        </Card>
        
        <Card className="p-6">
          <EarningsWidget />
        </Card>
      </div>
    </div>
  );
}
