"use client";

import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { ServiceForm } from "@/components/provider/profile/service-types";

export default function AddSkillPage() {
  const t = useTranslations();

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="Ajouter"
        description={t("provider.AddSkill.description")}
      />

      <Card className="p-6">
        <ServiceForm />
      </Card>
    </div>
  );
}
