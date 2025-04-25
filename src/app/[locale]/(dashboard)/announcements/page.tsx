"use client";

import { useTranslations } from "next-intl";
import { AnnouncementsList } from "@/components/announcements/announcements-list";
import { DashboardLayout, DashboardHeader } from "@/components/dashboard/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ClientSidebar } from "@/components/dashboard/client/client-sidebar";
import { DelivererSidebar } from "@/components/dashboard/deliverer/deliverer-sidebar";
import { MerchantSidebar } from "@/components/dashboard/merchant/merchant-sidebar";
import { AdminSidebar } from "@/components/dashboard/admin/admin-sidebar";
import { ProviderSidebar } from "@/components/dashboard/provider/provider-sidebar";

export default function AnnouncementsPage() {
  const t = useTranslations("announcements");
  const router = useRouter();
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

  // Vérifier si l'utilisateur est un client (pour afficher le bouton de création)
  const isClient = session?.user?.role === "CLIENT";

  return (
    <DashboardLayout
      sidebar={getSidebar()}
      header={
        <DashboardHeader
          title={t("announcements")}
          description={t("announcementsDescription")}
          actions={
            isClient ? (
              <Button onClick={() => router.push("/announcements/new")}>
                <Plus className="mr-2 h-4 w-4" />
                {t("createAnnouncement")}
              </Button>
            ) : undefined
          }
        />
      }
    >
      <AnnouncementsList />
    </DashboardLayout>
  );
}
