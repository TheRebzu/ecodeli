"use client";

import { useAuth } from "@/hooks/use-auth";
import AnnouncementManager from "@/features/merchant/components/announcements/announcement-manager";
import { PageHeader } from "@/components/layout/page-header";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";

export default function MerchantAnnouncementsPage() {
  const { user } = useAuth();
  const t = useTranslations("merchant.announcements");

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
        title={t("page.title") || "Gestion des annonces"}
        description={t("page.description") || "Gérez vos annonces commerciales"}
      />
      
      <AnnouncementManager merchantId={user.id} />
    </div>
  );
}