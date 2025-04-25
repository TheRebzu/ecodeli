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
  Users,
  ShoppingBag,
  Store,
  Briefcase,
  FileText,
  DollarSign,
  Bell,
} from "lucide-react";
import { AdminSidebar } from "@/components/dashboard/admin/admin-sidebar";
import { UserList } from "@/components/dashboard/admin/user-list";
import { OrderList } from "@/components/dashboard/admin/order-list";
import { DocumentVerificationList } from "@/components/dashboard/admin/document-verification-list";

export default function AdminDashboardPage() {
  const t = useTranslations("dashboard.admin");

  // Utilisation du hook tRPC pour récupérer les données du tableau de bord
  const { data, isLoading, error } = api.dashboard.getAdminDashboard.useQuery();

  if (error) {
    return (
      <DashboardLayout sidebar={<AdminSidebar />}>
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
    <DashboardLayout sidebar={<AdminSidebar />}>
      <DashboardHeader
        title={t("title")}
        description={t("description")}
        actions={
          <Button variant="outline" asChild>
            <a href="/admin/notifications/create">
              <Bell className="mr-2 h-4 w-4" />
              {t("actions.sendNotification")}
            </a>
          </Button>
        }
      />

      {/* Statistiques des utilisateurs */}
      <DashboardSection
        title={t("userStats.title")}
        description={t("userStats.description")}
        className="mb-8"
      >
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
          {isLoading ? (
            <>
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </>
          ) : (
            <>
              <StatCard
                title={t("userStats.totalUsers")}
                value={data?.userStats.totalUsers || 0}
                icon={<Users className="h-5 w-5" />}
              />
              <StatCard
                title={t("userStats.clients")}
                value={data?.userStats.clients || 0}
                icon={<Users className="h-5 w-5" />}
              />
              <StatCard
                title={t("userStats.deliverers")}
                value={data?.userStats.deliverers || 0}
                icon={<Users className="h-5 w-5" />}
              />
              <StatCard
                title={t("userStats.merchants")}
                value={data?.userStats.merchants || 0}
                icon={<Users className="h-5 w-5" />}
              />
              <StatCard
                title={t("userStats.providers")}
                value={data?.userStats.providers || 0}
                icon={<Users className="h-5 w-5" />}
              />
              <StatCard
                title={t("userStats.admins")}
                value={data?.userStats.admins || 0}
                icon={<Users className="h-5 w-5" />}
              />
            </>
          )}
        </div>
      </DashboardSection>

      {/* Statistiques des commandes et services */}
      <div className="grid gap-8 md:grid-cols-2 mb-8">
        {/* Statistiques des commandes */}
        <DashboardSection
          title={t("orderStats.title")}
          description={t("orderStats.description")}
        >
          <div className="grid gap-4 md:grid-cols-2">
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
                  title={t("orderStats.totalOrders")}
                  value={data?.orderStats.totalOrders || 0}
                  icon={<ShoppingBag className="h-5 w-5" />}
                />
                <StatCard
                  title={t("orderStats.pendingOrders")}
                  value={data?.orderStats.pendingOrders || 0}
                  icon={<ShoppingBag className="h-5 w-5" />}
                />
                <StatCard
                  title={t("orderStats.deliveredOrders")}
                  value={data?.orderStats.deliveredOrders || 0}
                  icon={<ShoppingBag className="h-5 w-5" />}
                />
                <StatCard
                  title={t("orderStats.revenue")}
                  value={`${data?.revenue?.toFixed(2) || 0} €`}
                  icon={<DollarSign className="h-5 w-5" />}
                />
              </>
            )}
          </div>
        </DashboardSection>

        {/* Statistiques des commerces et services */}
        <DashboardSection
          title={t("businessStats.title")}
          description={t("businessStats.description")}
        >
          <div className="grid gap-4 md:grid-cols-2">
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
                  title={t("businessStats.totalStores")}
                  value={data?.storeStats.totalStores || 0}
                  icon={<Store className="h-5 w-5" />}
                />
                <StatCard
                  title={t("businessStats.verifiedStores")}
                  value={data?.storeStats.verifiedStores || 0}
                  icon={<Store className="h-5 w-5" />}
                />
                <StatCard
                  title={t("businessStats.totalServices")}
                  value={data?.serviceStats.totalServices || 0}
                  icon={<Briefcase className="h-5 w-5" />}
                />
                <StatCard
                  title={t("businessStats.totalBookings")}
                  value={data?.serviceStats.totalBookings || 0}
                  icon={<Briefcase className="h-5 w-5" />}
                />
              </>
            )}
          </div>
        </DashboardSection>
      </div>

      {/* Documents en attente de vérification */}
      <DashboardSection
        title={t("pendingDocuments.title")}
        description={t("pendingDocuments.description")}
        className="mb-8"
      >
        <DashboardCard title={t("pendingDocuments.title")}>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
          ) : data?.pendingDocuments && data.pendingDocuments > 0 ? (
            <div className="flex flex-col items-center justify-center py-6">
              <FileText className="h-12 w-12 text-primary opacity-80" />
              <h3 className="mt-2 text-xl font-medium">
                {data.pendingDocuments}
              </h3>
              <p className="text-muted-foreground">
                {t("pendingDocuments.waiting")}
              </p>
              <Button className="mt-4" asChild>
                <a href="/admin/documents/verification">
                  {t("pendingDocuments.action")}
                </a>
              </Button>
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
              <h3 className="mt-2 text-lg font-medium">
                {t("pendingDocuments.empty.title")}
              </h3>
              <p className="text-muted-foreground">
                {t("pendingDocuments.empty.description")}
              </p>
            </div>
          )}
        </DashboardCard>
      </DashboardSection>

      {/* Onglets pour les utilisateurs récents et les commandes récentes */}
      <Tabs defaultValue="users" className="mb-8">
        <TabsList>
          <TabsTrigger value="users">{t("recentUsers.title")}</TabsTrigger>
          <TabsTrigger value="orders">{t("recentOrders.title")}</TabsTrigger>
        </TabsList>
        <TabsContent value="users">
          <DashboardCard
            title={t("recentUsers.title")}
            description={t("recentUsers.description")}
          >
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
              </div>
            ) : data?.recentUsers && data.recentUsers.length > 0 ? (
              <UserList users={data.recentUsers} />
            ) : (
              <div className="text-center py-8">
                <Users className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
                <h3 className="mt-2 text-lg font-medium">
                  {t("recentUsers.empty.title")}
                </h3>
                <p className="text-muted-foreground">
                  {t("recentUsers.empty.description")}
                </p>
              </div>
            )}
          </DashboardCard>
        </TabsContent>
        <TabsContent value="orders">
          <DashboardCard
            title={t("recentOrders.title")}
            description={t("recentOrders.description")}
          >
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
              </div>
            ) : data?.recentOrders && data.recentOrders.length > 0 ? (
              <OrderList orders={data.recentOrders} />
            ) : (
              <div className="text-center py-8">
                <ShoppingBag className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
                <h3 className="mt-2 text-lg font-medium">
                  {t("recentOrders.empty.title")}
                </h3>
                <p className="text-muted-foreground">
                  {t("recentOrders.empty.description")}
                </p>
              </div>
            )}
          </DashboardCard>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
