"use client";

import { useAuth } from "@/hooks/use-auth";
import { CreateAnnouncementForm } from "@/features/announcements/components/client/create-announcement-form";
import { PageHeader } from "@/components/layout/page-header";
import { useTranslations } from "next-intl";

export default function CreateAnnouncementPage() {
  const { user } = useAuth();
  const t = useTranslations("client.announcements.create");

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("page.title")}
        description={t("page.description")}
      >
        <div></div>
      </PageHeader>
      
      {user && (
        <CreateAnnouncementForm />
      )}
    </div>
  );
}