"use client";

import { useTranslations } from "next-intl";
import { api } from "@/trpc/react";
import {
  DashboardLayout,
  DashboardHeader,
  DashboardSection,
} from "@/components/dashboard/dashboard-layout";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { StatCard } from "@/components/dashboard/stat-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Briefcase,
  Calendar,
  Star,
  AlertTriangle,
  FileText,
  DollarSign,
} from "lucide-react";
import { ProviderSidebar } from "@/components/dashboard/provider/provider-sidebar";
import { ServiceList } from "@/components/dashboard/provider/service-list";
import { BookingList } from "@/components/dashboard/provider/booking-list";
import { DocumentList } from "@/components/dashboard/provider/document-list";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function ProviderDashboardPage() {
  const t = useTranslations("dashboard.provider");

  // Utilisation du hook tRPC pour récupérer les données du tableau de bord
  const { data, isLoading, error } =
    api.dashboard.getProviderDashboard.useQuery();

  if (error) {
    return (
      <DashboardLayout sidebar={<ProviderSidebar />}>
        <DashboardHeader title={t("title")} description={t("description")} />
        <div className="flex items-center justify-center h-[50vh]">
          <div className="text-center">
            <h3 className="text-lg font-medium">{t("error.title")}</h3>
            <p className="text-muted-foreground">{t("error.description")}</p>
            <Button className="mt-4" onClick={() => window.location.reload()}>
              {t("error.retry")}
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout sidebar={<ProviderSidebar />}>
      <DashboardHeader
        title={t("title")}
        description={t("description")}
        actions={
          <Button asChild>
            <a href="/provider/services/new">{t("actions.newService")}</a>
          </Button>
        }
      />

      {/* Alerte de vérification si le compte n'est pas vérifié */}
      {!isLoading && data && !data.isVerified && (
        <Alert variant="warning" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t("verification.required.title")}</AlertTitle>
          <AlertDescription>
            {t("verification.required.description")}
            <Button variant="link" className="p-0 h-auto font-normal" asChild>
              <a href="/documents">{t("verification.required.action")}</a>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Statistiques */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        {isLoading ? (
          <>
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </>
        ) : (
          <>
            <StatCard
              title={t("stats.totalServices")}
              value={data?.stats.totalServices || 0}
              icon={<Briefcase className="h-5 w-5" />}
            />
            <StatCard
              title={t("stats.totalBookings")}
              value={data?.stats.totalBookings || 0}
              icon={<Calendar className="h-5 w-5" />}
            />
            <StatCard
              title={t("stats.averageRating")}
              value={data?.stats.averageRating?.toFixed(1) || "N/A"}
              icon={<Star className="h-5 w-5" />}
            />
            <StatCard
              title={t("stats.revenue")}
              value={`${data?.stats.revenue?.toFixed(2) || 0} €`}
              icon={<DollarSign className="h-5 w-5" />}
            />
          </>
        )}
      </div>

      {/* Liste des services */}
      <DashboardSection
        title={t("services.title")}
        description={t("services.description")}
        className="mb-8"
      >
        <DashboardCard title={t("services.title")}>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
          ) : data?.services && data.services.length > 0 ? (
            <ServiceList services={data.services} />
          ) : (
            <div className="text-center py-8">
              <Briefcase className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
              <h3 className="mt-2 text-lg font-medium">
                {t("services.empty.title")}
              </h3>
              <p className="text-muted-foreground">
                {t("services.empty.description")}
              </p>
              <Button className="mt-4" asChild>
                <a href="/provider/services/new">
                  {t("services.empty.action")}
                </a>
              </Button>
            </div>
          )}
        </DashboardCard>
      </DashboardSection>

      {/* Réservations en cours */}
      <DashboardSection
        title={t("currentBookings.title")}
        description={t("currentBookings.description")}
        className="mb-8"
      >
        <DashboardCard title={t("currentBookings.title")}>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
          ) : data?.currentBookings && data.currentBookings.length > 0 ? (
            <BookingList bookings={data.currentBookings} type="current" />
          ) : (
            <div className="text-center py-8">
              <Calendar className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
              <h3 className="mt-2 text-lg font-medium">
                {t("currentBookings.empty.title")}
              </h3>
              <p className="text-muted-foreground">
                {t("currentBookings.empty.description")}
              </p>
            </div>
          )}
        </DashboardCard>
      </DashboardSection>

      {/* Onglets pour l'historique des réservations et les documents */}
      <Tabs defaultValue="history" className="mb-8">
        <TabsList>
          <TabsTrigger value="history">{t("bookingHistory.title")}</TabsTrigger>
          <TabsTrigger value="documents">{t("documents.title")}</TabsTrigger>
        </TabsList>
        <TabsContent value="history">
          <DashboardCard
            title={t("bookingHistory.title")}
            description={t("bookingHistory.description")}
          >
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
              </div>
            ) : data?.bookingHistory && data.bookingHistory.length > 0 ? (
              <BookingList bookings={data.bookingHistory} type="history" />
            ) : (
              <div className="text-center py-8">
                <Calendar className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
                <h3 className="mt-2 text-lg font-medium">
                  {t("bookingHistory.empty.title")}
                </h3>
                <p className="text-muted-foreground">
                  {t("bookingHistory.empty.description")}
                </p>
              </div>
            )}
          </DashboardCard>
        </TabsContent>
        <TabsContent value="documents">
          <DashboardCard
            title={t("documents.title")}
            description={t("documents.description")}
          >
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
              </div>
            ) : data?.documents && data.documents.length > 0 ? (
              <DocumentList documents={data.documents} />
            ) : (
              <div className="text-center py-8">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
                <h3 className="mt-2 text-lg font-medium">
                  {t("documents.empty.title")}
                </h3>
                <p className="text-muted-foreground">
                  {t("documents.empty.description")}
                </p>
                <Button className="mt-4" asChild>
                  <a href="/documents/upload">{t("documents.empty.action")}</a>
                </Button>
              </div>
            )}
          </DashboardCard>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
