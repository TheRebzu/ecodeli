"use client";

import { useAuth } from "@/hooks/use-auth";
import ClientServicesManager from "@/features/client/components/services/client-services-manager";
import { PageHeader } from "@/components/layout/page-header";
import { useTranslations } from "next-intl";

export default function ClientServicesPage() {
  const { user } = useAuth();
  const t = useTranslations("client.services");

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("page.title")}
        description={t("page.description")}
      />
      
      {user && (
        <ClientServicesManager clientId={user.id} />
      )}
    </div>
  );
}