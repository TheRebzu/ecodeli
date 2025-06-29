"use client";

import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/layout/page-header";
import { InterventionManager } from "@/features/provider/components/interventions/intervention-manager";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";

export default function ProviderInterventionsPage() {
  const { user } = useAuth();
  const t = useTranslations("provider.interventions");

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("page.title") || "Gestion des interventions"}
        description={t("page.description") || "Suivez et gérez toutes vos interventions clients"}
      />
      
      <InterventionManager providerId={user.id} />
    </div>
  );
}