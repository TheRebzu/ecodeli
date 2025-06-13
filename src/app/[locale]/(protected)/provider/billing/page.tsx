"use client";

import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";

export default function BillingPage() {
  const t = useTranslations();

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="Facturation"
        description={t("provider.Billing.description")}
      />

      <Card className="p-6">
        <p className="text-muted-foreground">
          Facturation - En cours de développement
        </p>
      </Card>
    </div>
  );
}
