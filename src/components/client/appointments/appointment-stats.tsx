"use client";

import React from "react";
import { useTranslations } from "next-intl";

// UI Components
import { Card, CardContent } from "@/components/ui/card";

// Types
interface Appointment {
  status: string;
}

interface AppointmentStatsProps {
  appointments: Appointment[];
}

export function AppointmentStats({ appointments }: AppointmentStatsProps) {
  const t = useTranslations("appointments");

  const stats = {
    total: appointments.length,
    pending: appointments.filter((apt) => apt.status === "PENDING").length,
    confirmed: appointments.filter((apt) => apt.status === "CONFIRMED").length,
    completed: appointments.filter((apt) => apt.status === "COMPLETED").length,
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-4">
          <div className="text-2xl font-bold">{stats.total}</div>
          <p className="text-sm text-muted-foreground">
            {t("totalAppointments")}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="text-2xl font-bold text-yellow-600">
            {stats.pending}
          </div>
          <p className="text-sm text-muted-foreground">
            {t("pendingAppointments")}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="text-2xl font-bold text-blue-600">
            {stats.confirmed}
          </div>
          <p className="text-sm text-muted-foreground">
            {t("confirmedAppointments")}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="text-2xl font-bold text-green-600">
            {stats.completed}
          </div>
          <p className="text-sm text-muted-foreground">
            {t("completedAppointments")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
