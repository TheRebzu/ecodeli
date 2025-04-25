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
  Store,
  ShoppingBag,
  Package,
  AlertTriangle,
  FileText,
  TrendingUp,
  DollarSign,
} from "lucide-react";
import { MerchantSidebar } from "@/components/dashboard/merchant/merchant-sidebar";
import { OrderList } from "@/components/dashboard/merchant/order-list";
import { StoreList } from "@/components/dashboard/merchant/store-list";
import { ProductList } from "@/components/dashboard/merchant/product-list";
import { DocumentList } from "@/components/dashboard/merchant/document-list";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function MerchantDashboardPage() {
  const t = useTranslations("dashboard.merchant");

  // Utilisation du hook tRPC pour récupérer les données du tableau de bord
  const { data, isLoading, error } =
    api.dashboard.getMerchantDashboard.useQuery();

  if (error) {
    return (
      <DashboardLayout sidebar={<MerchantSidebar />}>
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
    <DashboardLayout sidebar={<MerchantSidebar />}>
      <DashboardHeader
        title={t("title")}
        description={t("description")}
        actions={
          <Button asChild>
            <a href="/merchant/stores/new">{t("actions.newStore")}</a>
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
              title={t("stats.totalStores")}
              value={data?.stats.totalStores || 0}
              icon={<Store className="h-5 w-5" />}
            />
            <StatCard
              title={t("stats.totalProducts")}
              value={data?.stats.totalProducts || 0}
              icon={<Package className="h-5 w-5" />}
            />
            <StatCard
              title={t("stats.totalOrders")}
              value={data?.stats.totalOrders || 0}
              icon={<ShoppingBag className="h-5 w-5" />}
            />
            <StatCard
              title={t("stats.revenue")}
              value={`${data?.stats.revenue?.toFixed(2) || 0} €`}
              icon={<DollarSign className="h-5 w-5" />}
            />
          </>
        )}
      </div>

      {/* Liste des commerces */}
      <DashboardSection
        title={t("stores.title")}
        description={t("stores.description")}
        className="mb-8"
      >
        <DashboardCard title={t("stores.title")}>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
          ) : data?.stores && data.stores.length > 0 ? (
            <StoreList stores={data.stores} />
          ) : (
            <div className="text-center py-8">
              <Store className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
              <h3 className="mt-2 text-lg font-medium">
                {t("stores.empty.title")}
              </h3>
              <p className="text-muted-foreground">
                {t("stores.empty.description")}
              </p>
              <Button className="mt-4" asChild>
                <a href="/merchant/stores/new">{t("stores.empty.action")}</a>
              </Button>
            </div>
          )}
        </DashboardCard>
      </DashboardSection>

      {/* Commandes récentes */}
      <DashboardSection
        title={t("recentOrders.title")}
        description={t("recentOrders.description")}
        className="mb-8"
      >
        <DashboardCard title={t("recentOrders.title")}>
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
      </DashboardSection>

      {/* Onglets pour les produits populaires et les documents */}
      <Tabs defaultValue="products" className="mb-8">
        <TabsList>
          <TabsTrigger value="products">{t("topProducts.title")}</TabsTrigger>
          <TabsTrigger value="documents">{t("documents.title")}</TabsTrigger>
        </TabsList>
        <TabsContent value="products">
          <DashboardCard
            title={t("topProducts.title")}
            description={t("topProducts.description")}
          >
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
              </div>
            ) : data?.topProducts && data.topProducts.length > 0 ? (
              <ProductList products={data.topProducts} />
            ) : (
              <div className="text-center py-8">
                <TrendingUp className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
                <h3 className="mt-2 text-lg font-medium">
                  {t("topProducts.empty.title")}
                </h3>
                <p className="text-muted-foreground">
                  {t("topProducts.empty.description")}
                </p>
                <Button className="mt-4" asChild>
                  <a href="/merchant/products/new">
                    {t("topProducts.empty.action")}
                  </a>
                </Button>
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
