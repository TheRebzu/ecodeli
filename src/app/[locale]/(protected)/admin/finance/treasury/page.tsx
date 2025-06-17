"use client";

import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import RevenueDashboard from "@/components/admin/financial/revenue-dashboard";

export default function TreasuryPage() {
  const t = useTranslations();

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="Trésorerie"
        description={t("admin.Treasury.description")}
      />

      <Card className="p-6">
        <RevenueDashboard />
      </Card>
    </div>
  );
}
