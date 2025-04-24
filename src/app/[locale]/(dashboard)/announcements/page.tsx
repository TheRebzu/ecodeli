import { useTranslations } from "next-intl";
import { AnnouncementsList } from "@/components/announcements/announcements-list";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";

export default function AnnouncementsPage() {
  const t = useTranslations("announcements");
  const router = useRouter();
  
  // Récupérer la session utilisateur pour déterminer le rôle
  const { data: session } = api.auth.getSession.useQuery();
  
  // Déterminer le composant de barre latérale à utiliser en fonction du rôle
  const getSidebar = () => {
    // Cette fonction sera implémentée pour retourner le bon composant de barre latérale
    // en fonction du rôle de l'utilisateur
    return null;
  };
  
  // Vérifier si l'utilisateur est un client (pour afficher le bouton de création)
  const isClient = session?.user?.role === "CLIENT";
  
  return (
    <DashboardLayout
      title={t("announcements")}
      description={t("announcementsDescription")}
      sidebar={getSidebar()}
      action={
        isClient ? (
          <Button onClick={() => router.push("/announcements/new")}>
            <Plus className="mr-2 h-4 w-4" />
            {t("createAnnouncement")}
          </Button>
        ) : undefined
      }
    >
      <AnnouncementsList />
    </DashboardLayout>
  );
}
