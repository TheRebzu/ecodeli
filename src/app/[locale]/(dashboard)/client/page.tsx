"use client";

import { useTranslations } from "next-intl";
import { api } from "@/trpc/react";
import { DashboardLayout, DashboardHeader, DashboardSection } from "@/components/dashboard/dashboard-layout";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { StatCard } from "@/components/dashboard/stat-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ShoppingBag, Package, Clock, CheckCircle, Home, CreditCard } from "lucide-react";
import { ClientSidebar } from "@/components/dashboard/client/client-sidebar";
import { OrderList } from "@/components/dashboard/client/order-list";
import { AddressCard } from "@/components/dashboard/client/address-card";
import { PaymentMethodCard } from "@/components/dashboard/client/payment-method-card";

export default function ClientDashboardPage() {
  const t = useTranslations("dashboard.client");
  
  // Utilisation du hook tRPC pour récupérer les données du tableau de bord
  const { data, isLoading, error } = api.dashboard.getClientDashboard.useQuery();
  
  if (error) {
    return (
      <DashboardLayout sidebar={<ClientSidebar />}>
        <DashboardHeader 
          title={t("title")} 
          description={t("description")} 
        />
        <div className="flex items-center justify-center h-[50vh]">
          <div className="text-center">
            <h3 className="text-lg font-medium">{t("error.title")}</h3>
            <p className="text-muted-foreground">{t("error.description")}</p>
            <Button 
              className="mt-4" 
              onClick={() => window.location.reload()}
            >
              {t("error.retry")}
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }
  
  return (
    <DashboardLayout sidebar={<ClientSidebar />}>
      <DashboardHeader 
        title={t("title")} 
        description={t("description")} 
      />
      
      {/* Statistiques */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
        {isLoading ? (
          <>
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </>
        ) : (
          <>
            <StatCard 
              title={t("stats.totalOrders")} 
              value={data?.stats.totalOrders || 0} 
              icon={<ShoppingBag className="h-5 w-5" />} 
            />
            <StatCard 
              title={t("stats.pendingOrders")} 
              value={data?.stats.pendingOrders || 0} 
              icon={<Clock className="h-5 w-5" />} 
            />
            <StatCard 
              title={t("stats.completedOrders")} 
              value={data?.stats.completedOrders || 0} 
              icon={<CheckCircle className="h-5 w-5" />} 
            />
          </>
        )}
      </div>
      
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
              <Package className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
              <h3 className="mt-2 text-lg font-medium">{t("recentOrders.empty.title")}</h3>
              <p className="text-muted-foreground">{t("recentOrders.empty.description")}</p>
              <Button className="mt-4">{t("recentOrders.empty.action")}</Button>
            </div>
          )}
        </DashboardCard>
      </DashboardSection>
      
      {/* Adresses et méthodes de paiement */}
      <Tabs defaultValue="addresses" className="mb-8">
        <TabsList>
          <TabsTrigger value="addresses">{t("addresses.title")}</TabsTrigger>
          <TabsTrigger value="payment">{t("payment.title")}</TabsTrigger>
        </TabsList>
        <TabsContent value="addresses">
          <DashboardCard title={t("addresses.title")} description={t("addresses.description")}>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
              </div>
            ) : data?.deliveryAddresses && data.deliveryAddresses.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {data.deliveryAddresses.map((address) => (
                  <AddressCard key={address.id} address={address} />
                ))}
                <Button variant="outline" className="h-full min-h-[100px] border-dashed">
                  <Home className="mr-2 h-4 w-4" />
                  {t("addresses.add")}
                </Button>
              </div>
            ) : (
              <div className="text-center py-8">
                <Home className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
                <h3 className="mt-2 text-lg font-medium">{t("addresses.empty.title")}</h3>
                <p className="text-muted-foreground">{t("addresses.empty.description")}</p>
                <Button className="mt-4">{t("addresses.empty.action")}</Button>
              </div>
            )}
          </DashboardCard>
        </TabsContent>
        <TabsContent value="payment">
          <DashboardCard title={t("payment.title")} description={t("payment.description")}>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
              </div>
            ) : data?.paymentMethods && data.paymentMethods.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {data.paymentMethods.map((method) => (
                  <PaymentMethodCard key={method.id} method={method} />
                ))}
                <Button variant="outline" className="h-full min-h-[100px] border-dashed">
                  <CreditCard className="mr-2 h-4 w-4" />
                  {t("payment.add")}
                </Button>
              </div>
            ) : (
              <div className="text-center py-8">
                <CreditCard className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
                <h3 className="mt-2 text-lg font-medium">{t("payment.empty.title")}</h3>
                <p className="text-muted-foreground">{t("payment.empty.description")}</p>
                <Button className="mt-4">{t("payment.empty.action")}</Button>
              </div>
            )}
          </DashboardCard>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
