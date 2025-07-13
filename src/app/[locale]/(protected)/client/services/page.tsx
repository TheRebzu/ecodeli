"use client";

import { useAuth } from "@/hooks/use-auth";
import ServicesBrowser from "@/features/client/components/services/services-browser";
import { PageHeader } from "@/components/layout/page-header";
import { useTranslations } from "next-intl";

export default function ClientServicesPage() {
  const { user } = useAuth();
  const t = useTranslations("client.services");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Services Disponibles"
        description="Découvrez tous les services proposés par nos prestataires qualifiés"
      />

      {user && <ServicesBrowser clientId={user.id} />}
    </div>
  );
}
