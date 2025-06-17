"use client";

import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { ContractFormModal } from "@/components/admin/contracts/contract-form-modal";

export default function EditTemplatePage() {
  const t = useTranslations();

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="Modifier le modèle"
        description={t("admin.EditTemplate.description")}
      />

      <Card className="p-6">
        <ContractFormModal />
      </Card>
    </div>
  );
}
