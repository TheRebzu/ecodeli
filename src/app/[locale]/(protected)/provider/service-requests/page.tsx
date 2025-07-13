"use client";

import { useAuth } from "@/hooks/use-auth";
import { ServiceRequestsBrowser } from "@/features/provider/components/service-requests-browser";
import { PageHeader } from "@/components/layout/page-header";
import { useTranslations } from "next-intl";

export default function ProviderServiceRequestsPage() {
  const { user } = useAuth();
  const t = useTranslations("provider.serviceRequests");

  if (!user || user.role !== "PROVIDER") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            Accès non autorisé
          </h2>
          <p className="text-gray-600">
            Cette page est réservée aux prestataires de services.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Demandes de Services"
        description="Consultez les demandes de services des clients et candidater aux missions qui vous intéressent"
      />

      <ServiceRequestsBrowser />
    </div>
  );
}
