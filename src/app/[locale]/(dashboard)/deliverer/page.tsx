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
  Truck,
  Package,
  CheckCircle,
  AlertTriangle,
  Star,
  FileText,
} from "lucide-react";
import { DelivererSidebar } from "@/components/dashboard/deliverer/deliverer-sidebar";
import { DeliveryList } from "@/components/dashboard/deliverer/delivery-list";
import { DocumentList } from "@/components/dashboard/deliverer/document-list";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function DelivererDashboardPage() {
  const t = useTranslations("dashboard.deliverer");

  // Utilisation du hook tRPC pour récupérer les données du tableau de bord
  const { data, isLoading, error } =
    api.dashboard.getDelivererDashboard.useQuery();

  if (error) {
    return (
      <DashboardLayout sidebar={<DelivererSidebar />}>
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
    <DashboardLayout sidebar={<DelivererSidebar />}>
      <DashboardHeader title={t("title")} description={t("description")} />

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
              title={t("stats.totalDeliveries")}
              value={data?.stats.totalDeliveries || 0}
              icon={<Truck className="h-5 w-5" />}
            />
            <StatCard
              title={t("stats.completedDeliveries")}
              value={data?.stats.completedDeliveries || 0}
              icon={<CheckCircle className="h-5 w-5" />}
            />
            <StatCard
              title={t("stats.failedDeliveries")}
              value={data?.stats.failedDeliveries || 0}
              icon={<AlertTriangle className="h-5 w-5" />}
            />
            <StatCard
              title={t("stats.averageRating")}
              value={data?.stats.averageRating?.toFixed(1) || "N/A"}
              icon={<Star className="h-5 w-5" />}
            />
          </>
        )}
      </div>

      {/* Livraisons en cours */}
      <DashboardSection
        title={t("currentDeliveries.title")}
        description={t("currentDeliveries.description")}
        className="mb-8"
      >
        <DashboardCard title={t("currentDeliveries.title")}>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
          ) : data?.currentDeliveries && data.currentDeliveries.length > 0 ? (
            <DeliveryList deliveries={data.currentDeliveries} type="current" />
          ) : (
            <div className="text-center py-8">
              <Package className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
              <h3 className="mt-2 text-lg font-medium">
                {t("currentDeliveries.empty.title")}
              </h3>
              <p className="text-muted-foreground">
                {t("currentDeliveries.empty.description")}
              </p>
              <Button className="mt-4">
                {t("currentDeliveries.empty.action")}
              </Button>
            </div>
          )}
        </DashboardCard>
      </DashboardSection>

      {/* Onglets pour l'historique des livraisons et les documents */}
      <Tabs defaultValue="history" className="mb-8">
        <TabsList>
          <TabsTrigger value="history">
            {t("deliveryHistory.title")}
          </TabsTrigger>
          <TabsTrigger value="documents">{t("documents.title")}</TabsTrigger>
        </TabsList>
        <TabsContent value="history">
          <DashboardCard
            title={t("deliveryHistory.title")}
            description={t("deliveryHistory.description")}
          >
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
              </div>
            ) : data?.deliveryHistory && data.deliveryHistory.length > 0 ? (
              <DeliveryList deliveries={data.deliveryHistory} type="history" />
            ) : (
              <div className="text-center py-8">
                <Package className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
                <h3 className="mt-2 text-lg font-medium">
                  {t("deliveryHistory.empty.title")}
                </h3>
                <p className="text-muted-foreground">
                  {t("deliveryHistory.empty.description")}
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
