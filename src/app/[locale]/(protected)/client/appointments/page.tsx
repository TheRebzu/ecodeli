"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue} from "@/components/ui/select";

// Icons
import { Plus } from "lucide-react";

// Components
import { AppointmentList } from "@/components/client/appointments/appointment-list";
import { AppointmentCalendar } from "@/components/client/appointments/appointment-calendar";
import { AppointmentStats } from "@/components/client/appointments/appointment-stats";

// Hooks
import { useClientAppointments } from "@/hooks/client/use-client-appointments";

export default function AppointmentsPage() {
  const t = useTranslations("appointments");
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  // Hook personnalisé pour gérer les rendez-vous
  const {
    appointments,
    isLoading,
    error,
    refetch,
    cancelAppointment,
    rescheduleAppointment} = useClientAppointments({ startDate: selectedDate,
    status: statusFilter !== "all" ? statusFilter : undefined,
    type: typeFilter !== "all" ? typeFilter : undefined });

  // Filtrer les rendez-vous par statut
  const getFilteredAppointments = (status: string) => {
    if (status === "all") return appointments;
    return appointments.filter((apt) => apt.status === status);
  };

  // Actions
  const handleViewAppointment = (id: string) => {
    router.push(`/client/appointments/${id}`);
  };

  const handleCancelAppointment = async (id: string) => {
    try {
      await cancelAppointment(id);
      refetch();
    } catch (error) {
      console.error("Erreur lors de l'annulation:", error);
    }
  };

  const handleRescheduleAppointment = (id: string) => {
    router.push(`/client/appointments/${id}/reschedule`);
  };

  const handleBookNewAppointment = () => {
    router.push("/client/services");
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button onClick={handleBookNewAppointment}>
          <Plus className="h-4 w-4 mr-2" />
          {t("bookNew")}
        </Button>
      </div>

      {/* Statistiques */}
      <AppointmentStats appointments={appointments} />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Calendrier */}
        <div className="lg:col-span-1">
          <AppointmentCalendar
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
            appointments={appointments}
          />
        </div>

        {/* Liste des rendez-vous */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <CardTitle>{t("myAppointments")}</CardTitle>

                <div className="flex gap-2">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("allStatuses")}</SelectItem>
                      <SelectItem value="PENDING">
                        {t("status.pending")}
                      </SelectItem>
                      <SelectItem value="CONFIRMED">
                        {t("status.confirmed")}
                      </SelectItem>
                      <SelectItem value="COMPLETED">
                        {t("status.completed")}
                      </SelectItem>
                      <SelectItem value="CANCELLED">
                        {t("status.cancelled")}
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("allTypes")}</SelectItem>
                      <SelectItem value="SERVICE">
                        {t("type.service")}
                      </SelectItem>
                      <SelectItem value="DELIVERY">
                        {t("type.delivery")}
                      </SelectItem>
                      <SelectItem value="CONSULTATION">
                        {t("type.consultation")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <AppointmentList
                appointments={getFilteredAppointments(statusFilter)}
                isLoading={isLoading}
                error={error}
                onView={handleViewAppointment}
                onCancel={handleCancelAppointment}
                onReschedule={handleRescheduleAppointment}
                onBookNew={handleBookNewAppointment}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
