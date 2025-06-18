"use client";

import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { TwoFactorAuth } from "@/components/auth/verification/two-factor-auth";

export default function TwoFactorVerifyPage() {
  const t = useTranslations();

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="Vérification 2FA"
        description={t("auth.TwoFactorVerify.description")}
      />

      <Card className="p-6">
        <TwoFactorAuth />
      </Card>
    </div>
  );
}
