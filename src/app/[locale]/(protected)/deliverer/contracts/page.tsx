"use client";

import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import DelivererDashboard from "@/components/deliverer/dashboard/deliverer-dashboard";

export default function ContractPage() {
  const t = useTranslations();

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="Mon contrat"
        description={t("deliverer.Contract.description")}
      />

      <Card className="p-6">
        <DelivererDashboard locale="fr" />
      </Card>
    </div>
  );
}
