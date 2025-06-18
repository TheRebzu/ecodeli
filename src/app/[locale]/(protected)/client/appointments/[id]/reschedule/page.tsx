"use client";

import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import AppointmentCalendar from "@/components/client/appointments/appointment-calendar";

export default function RescheduleAppointmentPage() {
  const t = useTranslations();

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="Reprogrammer"
        description={t("client.RescheduleAppointment.description")}
      />

      <Card className="p-6">
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">Reprogrammer votre rendez-vous</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Sélectionnez une nouvelle date et heure pour votre rendez-vous. 
              Les créneaux disponibles sont mis à jour en temps réel.
            </p>
          </div>
          <AppointmentCalendar />
        </div>
      </Card>
    </div>
  );
}
