"use client";

import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import ProviderRegisterForm from "@/components/auth/register/provider-register-form";

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
