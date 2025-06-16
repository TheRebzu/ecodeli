import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Package, Search, Bell } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DynamicBoxReservations,
  DynamicBoxSearchPanel,
  DynamicBoxNotificationsPanel} from "@/components/client/storage/client-wrapper";
import { Button } from "@/components/ui/button";
import { redirect, notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/next-auth";

export async function generateMetadata({
  params}: {
  params: Promise<{ locale?: string }>;
}): Promise<Metadata> {
  // Attendre et extraire le paramètre locale
  const p = await params;
  const locale = p.locale || "fr";

  const t = await getTranslations({ locale, namespace: "storage"  });

  return {
    title: t("dashboardPage.metaTitle"),
    description: t("dashboardPage.metaDescription")};
}

export default async function StorageDashboardPage({
  params}: {
  params: Promise<{ locale?: string }>;
}) {
  // Attendre et extraire le paramètre locale
  const p = await params;
  const locale = p.locale || "fr";

  const t = await getTranslations({ locale, namespace: "storage"  });

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">
          {t("dashboardPage.title")}
        </h1>
        <p className="text-muted-foreground">
          {t("dashboardPage.description")}
        </p>
      </div>

      <Tabs defaultValue="reservations" className="w-full">
        <TabsList className="w-full md:w-auto mb-6">
          <TabsTrigger value="reservations" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            {t("tabs.myReservations")}
          </TabsTrigger>
          <TabsTrigger value="search" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            {t("tabs.findBox")}
          </TabsTrigger>
          <TabsTrigger
            value="notifications"
            className="flex items-center gap-2"
          >
            <Bell className="h-4 w-4" />
            {t("tabs.notifications")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="reservations" className="space-y-6">
          <DynamicBoxReservations />
        </TabsContent>

        <TabsContent value="search" className="space-y-6">
          <DynamicBoxSearchPanel />
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <DynamicBoxNotificationsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
