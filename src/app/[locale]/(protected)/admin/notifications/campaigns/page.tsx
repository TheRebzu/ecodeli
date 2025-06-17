"use client";

import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { ReportDashboard } from "@/components/admin/reports/report-dashboard";

export default function NotificationCampaignsPage() {
  const t = useTranslations();

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="Campagnes"
        description={t("admin.NotificationCampaigns.description")}
      />

      <Card className="p-6">
        <ReportDashboard
          salesReport={{} as any}
          deliveryPerformance={{} as any}
          userActivity={{} as any}
          dateRange={{ startDate: new Date(), endDate: new Date() }}
        />
      </Card>
    </div>
  );
}
