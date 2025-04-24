import { useTranslations } from "next-intl";
import { AnnouncementPayment } from "@/components/announcements/announcement-payment";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { api } from "@/trpc/react";

export default function AnnouncementPaymentPage() {
  const t = useTranslations("payments");
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  
  // Récupérer la session utilisateur pour déterminer le rôle
  const { data: session } = api.auth.getSession.useQuery();
  
  return (
    <DashboardLayout
      title={t("paymentTitle")}
      description={t("paymentDescription")}
      action={
        <Button variant="outline" onClick={() => router.push(`/announcements/${id}`)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("backToAnnouncement")}
        </Button>
      }
    >
      <AnnouncementPayment />
    </DashboardLayout>
  );
}
