"use client";

import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { ContractList } from "@/components/client/contracts/contract-list";

export default function ContractDetailPage() {
  const t = useTranslations();

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="Détail contrat"
        description={t("client.ContractDetail.description")}
      />

      <Card className="p-6">
        <ContractList
          contracts={[]}
          isLoading={false}
          onView={(id) => console.log('View contract:', id)}
          onDownload={(id) => console.log('Download contract:', id)}
        />
      </Card>
    </div>
  );
}
