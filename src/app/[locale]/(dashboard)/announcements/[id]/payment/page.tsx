"use client";

import { useTranslations } from "next-intl";
import { AnnouncementPayment } from "@/components/announcements/announcement-payment";
import { DashboardLayout, DashboardHeader } from "@/components/dashboard/dashboard-layout";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { ClientSidebar } from "@/components/dashboard/client/client-sidebar";

export default function AnnouncementPaymentPage() {
  const t = useTranslations("payments");
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { data: session } = useSession();

  return (
    <DashboardLayout
      sidebar={<ClientSidebar />}
      header={
        <DashboardHeader
          title={t("paymentTitle")}
          description={t("paymentDescription")}
          actions={
            <Button
              variant="outline"
              onClick={() => router.push(`/announcements/${id}`)}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t("backToAnnouncement")}
            </Button>
          }
        />
      }
    >
      <AnnouncementPayment />
    </DashboardLayout>
  );
}
