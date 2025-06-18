"use client";

import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { AppointmentList } from "@/components/client/appointments/appointment-list";

export default function AppointmentHistoryPage() {
  const t = useTranslations();

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="Historique"
        description={t("client.AppointmentHistory.description")}
      />

      <Card className="p-6">
        <AppointmentList
          appointments={[]}
          isLoading={false}
          onView={(id) => console.log('View:', id)}
          onCancel={(id) => console.log('Cancel:', id)}
          onReschedule={(id) => console.log('Reschedule:', id)}
          onBookNew={() => console.log('Book new')}
        />
      </Card>
    </div>
  );
}
