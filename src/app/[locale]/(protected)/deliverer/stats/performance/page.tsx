"use client";

import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { DeliveryStatsWidget } from "@/components/deliverer/dashboard/delivery-stats-widget";

export default function PerformancePage() {
  const t = useTranslations();

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="Performance"
        description={t("deliverer.Performance.description")}
      />

      <Card className="p-6">
        <DeliveryStatsWidget />
      </Card>
    </div>
  );
}
