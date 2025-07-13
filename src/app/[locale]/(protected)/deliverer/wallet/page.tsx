"use client";

import { useAuth } from "@/hooks/use-auth";
import WalletManager from "@/features/deliverer/components/wallet/wallet-manager";
import { PageHeader } from "@/components/layout/page-header";
import { useTranslations } from "next-intl";

export default function DelivererWalletPage() {
  const { user } = useAuth();
  const t = useTranslations("deliverer.wallet");

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            {t("auth.required_title")}
          </h2>
          <p className="text-gray-600">{t("auth.required_description")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t("page.title")} description={t("page.description")} />

      <WalletManager delivererId={user.id} />
    </div>
  );
}
