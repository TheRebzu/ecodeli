"use client";

import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import MerchantRegisterForm from "@/components/auth/register/merchant-register-form";

export default function BecomeMerchantPage() {
  const t = useTranslations();

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="Devenir commerçant"
        description={t("public.BecomeMerchant.description")}
      />

      <Card className="p-6">
        <MerchantRegisterForm />
      </Card>
    </div>
  );
}
