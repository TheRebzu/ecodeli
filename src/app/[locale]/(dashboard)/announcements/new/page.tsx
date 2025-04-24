import { useTranslations } from "next-intl";
import { CreateAnnouncementForm } from "@/components/announcements/create-announcement-form";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { ClientSidebar } from "@/components/dashboard/client/client-sidebar";

export default function CreateAnnouncementPage() {
  const t = useTranslations("announcements");

  return (
    <DashboardLayout
      title={t("createAnnouncement")}
      description={t("createAnnouncementDescription")}
      sidebar={<ClientSidebar />}
    >
      <CreateAnnouncementForm />
    </DashboardLayout>
  );
}
