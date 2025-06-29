"use client";

import { useAuth } from "@/hooks/use-auth";
import DelivererAnnouncementsManager from "@/features/deliverer/components/announcements/deliverer-announcements-manager";
import { PageHeader } from "@/components/layout/page-header";
import { useTranslations } from "next-intl";

export default function DelivererAnnouncementsPage() {
  const { user } = useAuth();
  const t = useTranslations("deliverer.announcements");

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("page.title")}
        description={t("page.description")}
      />
      
      {user && (
        <DelivererAnnouncementsManager delivererId={user.id} />
      )}
    </div>
  );
}