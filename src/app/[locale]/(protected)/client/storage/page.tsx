"use client";

import { useAuth } from "@/hooks/use-auth";
import AdvancedStorageManager from "@/features/client/components/storage/advanced-storage-manager";
import { PageHeader } from "@/components/layout/page-header";
import { useTranslations } from "next-intl";

export default function ClientStoragePage() {
  const { user } = useAuth();
  const t = useTranslations("client.storage");

  return (
    <div className="space-y-6">
      <PageHeader title={t("page.title")} description={t("page.description")} />

      {user && <AdvancedStorageManager clientId={user.id} />}
    </div>
  );
}
