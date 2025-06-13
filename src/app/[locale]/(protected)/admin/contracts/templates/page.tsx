"use client";

import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";

export default function ContractTemplatesPage() {
  const t = useTranslations();

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="Modèles de contrats"
        description={t("admin.ContractTemplates.description")}
      />

      <Card className="p-6">
        <p className="text-muted-foreground">
          Modèles de contrats - En cours de développement
        </p>
      </Card>
    </div>
  );
}
