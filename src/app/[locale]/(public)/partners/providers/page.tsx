"use client";

import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import ProviderRegisterForm from "@/features/auth/components/provider-register-form";

export default function BecomeProviderPage() {
  const t = useTranslations();

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="Devenir prestataire"
        description={t("public.BecomeProvider.description")}
      />

      <Card className="p-6">
        <ProviderRegisterForm />
      </Card>
    </div>
  );
}
