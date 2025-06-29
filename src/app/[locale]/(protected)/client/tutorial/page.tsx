"use client";

import { useAuth } from "@/hooks/use-auth";
import ClientTutorialSystem from "@/features/tutorials/components/client-tutorial-system";
import { PageHeader } from "@/components/layout/page-header";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";

export default function ClientTutorialPage() {
  const { user } = useAuth();
  const t = useTranslations("client.tutorial");

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
        title={t("page.title") || "Tutoriel d'utilisation"}
        description={t("page.description") || "Apprenez à utiliser toutes les fonctionnalités d'EcoDeli"}
      />
      
      <ClientTutorialSystem clientId={user.id} />
    </div>
  );
}