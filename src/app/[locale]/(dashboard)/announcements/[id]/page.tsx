"use client";

import { useTranslations } from "next-intl";
import { AnnouncementDetail } from "@/components/announcements/announcement-detail";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { api } from "@/trpc/react";

export default function AnnouncementDetailPage() {
  const t = useTranslations("announcements");
  const router = useRouter();
  const params = useParams();

  // Récupérer la session utilisateur pour déterminer le rôle
  const { data: session } = api.auth.getSession.useQuery();

  // Déterminer le composant de barre latérale à utiliser en fonction du rôle
  const getSidebar = () => {
    // Cette fonction sera implémentée pour retourner le bon composant de barre latérale
    // en fonction du rôle de l'utilisateur
    return null;
  };

  return (
    <DashboardLayout
      title={t("announcementDetails")}
      description={t("announcementDetailsDescription")}
      sidebar={getSidebar()}
      action={
        <Button variant="outline" onClick={() => router.push("/announcements")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("backToAnnouncements")}
        </Button>
      }
    >
      <AnnouncementDetail />
    </DashboardLayout>
  );
}
