import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Suspense } from "react";
import {
  Loader2,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  CalendarDays,
  CircleDashed,
} from "lucide-react";
import Link from "next/link";
import { formatDate, formatTime } from "@/lib/i18n/formatters";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/next-auth";
import { api } from "@/trpc/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("services.provider");

  return {
    title: t("appointments.title"),
    description: t("appointments.description"),
  };
}

export default async function ProviderAppointmentsPage() {
  const t = await getTranslations("services.provider");
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return null;
  }

  // Récupérer les rendez-vous du prestataire
  const appointments = await api.service.getMyProviderBookings.query({});

  // Filtrer les rendez-vous par statut
  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);

  const upcomingAppointments = appointments.filter((appointment) => {
    const appointmentDate = new Date(appointment.startTime);
    return (
      appointmentDate >= todayDate &&
      ["PENDING", "CONFIRMED"].includes(appointment.status)
    );
  });

  const pendingAppointments = appointments.filter(
    (appointment) => appointment.status === "PENDING",
  );

  const pastAppointments = appointments.filter(
    (appointment) =>
      appointment.status === "COMPLETED" || appointment.status === "CANCELLED",
  );

  // Trier les rendez-vous par date
  const sortByDate = (a: any, b: any) => {
    return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
  };

  upcomingAppointments.sort(sortByDate);
  pendingAppointments.sort(sortByDate);
  pastAppointments.sort((a, b) => sortByDate(b, a)); // Ordre décroissant pour les passés

  // Fonction pour afficher le badge de statut
  const getStatusBadge = (status: string) => {
    const statusMap: Record<
      string,
      {
        label: string;
        variant: "default" | "secondary" | "destructive" | "outline";
      }
    > = {
      PENDING: {
        label: t("appointments.status.pending"),
        variant: "secondary",
      },
      CONFIRMED: {
        label: t("appointments.status.confirmed"),
        variant: "default",
      },
      COMPLETED: {
        label: t("appointments.status.completed"),
        variant: "outline",
      },
      CANCELLED: {
        label: t("appointments.status.cancelled"),
        variant: "destructive",
      },
      RESCHEDULED: {
        label: t("appointments.status.rescheduled"),
        variant: "secondary",
      },
    };

    const statusInfo = statusMap[status] || {
      label: status,
      variant: "outline",
    };

    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  // Fonction pour afficher une carte de rendez-vous
  const renderAppointmentCard = (appointment: any) => {
    const { id, service, client, startTime, endTime, status } = appointment;

    return (
      <Card key={id} className="mb-4">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-lg">{service.name}</CardTitle>
              <CardDescription>{client.name}</CardDescription>
            </div>
            {getStatusBadge(status)}
          </div>
        </CardHeader>
        <CardContent className="pb-3">
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <span>{formatDate(startTime)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-500" />
              <span>
                {formatTime(startTime)} - {formatTime(endTime)}
              </span>
            </div>
            {appointment.notes && (
              <div className="mt-2 text-gray-600 bg-gray-50 p-2 rounded">
                <p className="text-xs font-medium mb-1">
                  {t("appointments.notes")}
                </p>
                <p className="text-sm">{appointment.notes}</p>
              </div>
            )}
          </div>
        </CardContent>
        <div className="px-6 pb-4 flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" asChild>
            <Link href={`/[locale]/(protected)/provider/appointments/${id}`}>
              {t("appointments.viewDetails")}
            </Link>
          </Button>

          {status === "PENDING" && (
            <>
              <Button
                variant="default"
                size="sm"
                className="flex items-center gap-1"
                asChild
              >
                <Link
                  href={`/[locale]/(protected)/provider/appointments/${id}/confirm`}
                >
                  <CheckCircle className="h-4 w-4" />
                  {t("appointments.confirm")}
                </Link>
              </Button>

              <Button
                variant="destructive"
                size="sm"
                className="flex items-center gap-1"
                asChild
              >
                <Link
                  href={`/[locale]/(protected)/provider/appointments/${id}/reject`}
                >
                  <XCircle className="h-4 w-4" />
                  {t("appointments.reject")}
                </Link>
              </Button>
            </>
          )}

          {status === "CONFIRMED" && (
            <Button
              variant="default"
              size="sm"
              className="flex items-center gap-1"
              asChild
            >
              <Link
                href={`/[locale]/(protected)/provider/appointments/${id}/complete`}
              >
                <CheckCircle className="h-4 w-4" />
                {t("appointments.markComplete")}
              </Link>
            </Button>
          )}
        </div>
      </Card>
    );
  };

  return (
    <div className="container py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t("appointments.title")}
          </h1>
          <p className="text-muted-foreground">{t("appointments.subtitle")}</p>
        </div>

        <div className="flex gap-3">
          <Button asChild>
            <Link href="/[locale]/(protected)/provider/schedule">
              <CalendarDays className="h-4 w-4 mr-2" />
              {t("appointments.viewSchedule")}
            </Link>
          </Button>
        </div>
      </div>

      <Suspense
        fallback={
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
          </div>
        }
      >
        <Tabs defaultValue="upcoming" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="upcoming">
              {t("appointments.upcoming")} ({upcomingAppointments.length})
            </TabsTrigger>
            <TabsTrigger value="pending">
              <div className="flex items-center">
                {t("appointments.pending")} ({pendingAppointments.length})
                {pendingAppointments.length > 0 && (
                  <CircleDashed className="h-3 w-3 ml-1 animate-spin" />
                )}
              </div>
            </TabsTrigger>
            <TabsTrigger value="past">
              {t("appointments.past")} ({pastAppointments.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming">
            {upcomingAppointments.length === 0 ? (
              <div className="text-center py-10">
                <Calendar className="mx-auto h-12 w-12 text-gray-300" />
                <h3 className="mt-2 text-lg font-medium">
                  {t("appointments.noUpcoming")}
                </h3>
                <p className="mt-1 text-muted-foreground">
                  {t("appointments.noUpcomingDesc")}
                </p>
              </div>
            ) : (
              <div>{upcomingAppointments.map(renderAppointmentCard)}</div>
            )}
          </TabsContent>

          <TabsContent value="pending">
            {pendingAppointments.length === 0 ? (
              <div className="text-center py-10">
                <Calendar className="mx-auto h-12 w-12 text-gray-300" />
                <h3 className="mt-2 text-lg font-medium">
                  {t("appointments.noPending")}
                </h3>
                <p className="mt-1 text-muted-foreground">
                  {t("appointments.noPendingDesc")}
                </p>
              </div>
            ) : (
              <div>{pendingAppointments.map(renderAppointmentCard)}</div>
            )}
          </TabsContent>

          <TabsContent value="past">
            {pastAppointments.length === 0 ? (
              <div className="text-center py-10">
                <Calendar className="mx-auto h-12 w-12 text-gray-300" />
                <h3 className="mt-2 text-lg font-medium">
                  {t("appointments.noPast")}
                </h3>
                <p className="mt-1 text-muted-foreground">
                  {t("appointments.noPastDesc")}
                </p>
              </div>
            ) : (
              <div>{pastAppointments.map(renderAppointmentCard)}</div>
            )}
          </TabsContent>
        </Tabs>
      </Suspense>
    </div>
  );
}
