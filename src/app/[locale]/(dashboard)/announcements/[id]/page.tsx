"use client";

import { useTranslations } from "next-intl";
import { AnnouncementDetail } from "@/components/announcements/announcement-detail";
import { DashboardLayout, DashboardHeader } from "@/components/dashboard/dashboard-layout";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { ClientSidebar } from "@/components/dashboard/client/client-sidebar";
import { DelivererSidebar } from "@/components/dashboard/deliverer/deliverer-sidebar";
import { MerchantSidebar } from "@/components/dashboard/merchant/merchant-sidebar";
import { AdminSidebar } from "@/components/dashboard/admin/admin-sidebar";
import { ProviderSidebar } from "@/components/dashboard/provider/provider-sidebar";

export default function AnnouncementDetailPage() {
  const t = useTranslations("announcements");
  const router = useRouter();
  const params = useParams();
  const { data: session } = useSession();

  // Déterminer le composant de barre latérale à utiliser en fonction du rôle
  const getSidebar = () => {
    if (!session?.user) return null;
    
    switch (session.user.role) {
      case "CLIENT":
        return <ClientSidebar />;
      case "DELIVERER":
        return <DelivererSidebar />;
      case "MERCHANT":
        return <MerchantSidebar />;
      case "PROVIDER":
        return <ProviderSidebar />;
      case "ADMIN":
        return <AdminSidebar />;
      default:
        return null;
    }
  };

  return (
    <DashboardLayout 
      sidebar={getSidebar()}
      header={
        <DashboardHeader
          title={t("announcementDetails")}
          description={t("announcementDetailsDescription")}
          actions={
            <Button variant="outline" onClick={() => router.push("/announcements")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t("backToAnnouncements")}
            </Button>
          }
        />
      }
    >
      <AnnouncementDetail />
    </DashboardLayout>
  );
}
