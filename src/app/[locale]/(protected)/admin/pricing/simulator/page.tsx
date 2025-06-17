"use client";

import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import BillingDashboard from "@/components/admin/financial/billing-dashboard";

export default function PricingSimulatorPage() {
  const t = useTranslations();

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="Simulateur"
        description={t("admin.PricingSimulator.description")}
      />

      <Card className="p-6">
        <BillingDashboard />
      </Card>
    </div>
  );
}
