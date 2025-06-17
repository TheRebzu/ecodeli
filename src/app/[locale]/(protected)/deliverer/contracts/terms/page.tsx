"use client";

import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { ContractsList } from "@/components/admin/contracts/contracts-list";

export default function TermsPage() {
  const t = useTranslations();

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="Conditions"
        description={t("deliverer.Terms.description")}
      />

      <Card className="p-6">
        <ContractsList
          contracts={[]}
          totalPages={1}
          currentPage={1}
          isLoading={false}
          onPageChange={() => {}}
          onEdit={() => {}}
          onDelete={() => {}}
          onActivate={() => {}}
          onSuspend={() => {}}
          onGeneratePdf={() => {}}
        />
      </Card>
    </div>
  );
}
