"use client";

import { useAuth } from "@/hooks/use-auth";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import AnnouncementList from "@/features/client/components/announcements/announcement-list";
import Link from "next/link";
import { Plus } from "lucide-react";

export default function ClientAnnouncementsPage() {
  const { user } = useAuth();
  const t = useTranslations("client.announcements");

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            {t("auth.required_title")}
          </h2>
          <p className="text-gray-600">
            {t("auth.required_description")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("page.title")}
        description={t("page.description")}
        action={
          <Link href="/client/announcements/create">
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              {t("page.create_announcement")}
            </Button>
          </Link>
        }
      />
      
      <AnnouncementList clientId={user.id} />
    </div>
  );
}