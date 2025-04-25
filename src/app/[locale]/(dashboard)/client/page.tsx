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
  ShoppingBag,
  Package,
  Clock,
  CheckCircle,
  Home,
  CreditCard,
} from "lucide-react";
import { ClientSidebar } from "@/components/dashboard/client/client-sidebar";
import { OrderList } from "@/components/dashboard/client/order-list";
import { AddressCard } from "@/components/dashboard/client/address-card";
import { PaymentMethodCard } from "@/components/dashboard/client/payment-method-card";

// Définition d'interfaces pour le typage
interface Address {
  id: string;
  street: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}

interface PaymentMethod {
  id: string;
  type: string;
  last4: string;
  expiryMonth: number;
  expiryYear: number;
  brand: string;
  isDefault: boolean;
  name: string;
}

interface Order {
  id: string;
  createdAt: string;
  status: string;
  total: number;
  items: number;
}

export default function ClientDashboardPage() {
  const t = useTranslations("dashboard");

  // Utilisation du hook tRPC pour récupérer les données du tableau de bord
  const { data, isLoading, error } =
    api.dashboard.getClientDashboard.useQuery();

  if (error) {
    return (
      <DashboardLayout sidebar={<ClientSidebar />}>
        <DashboardHeader 
          title={t("client.title")} 
          description={t("client.description")} 
        />
        <div className="flex items-center justify-center h-[50vh]">
          <div className="text-center">
            <h3 className="text-lg font-medium">{t("client.error.title")}</h3>
            <p className="text-muted-foreground">{t("client.error.description")}</p>
            <Button className="mt-4" onClick={() => window.location.reload()}>
              {t("client.error.retry")}
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout sidebar={<ClientSidebar />}>
      <DashboardHeader 
        title={t("client.title")} 
        description={t("client.description")} 
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
              title={t("client.stats.totalOrders")}
              value={data?.stats.totalOrders || 0}
              icon={<ShoppingBag className="h-5 w-5" />}
            />
            <StatCard
              title={t("client.stats.pendingOrders")}
              value={data?.stats.pendingOrders || 0}
              icon={<Clock className="h-5 w-5" />}
            />
            <StatCard
              title={t("client.stats.completedOrders")}
              value={data?.stats.completedOrders || 0}
              icon={<CheckCircle className="h-5 w-5" />}
            />
          </>
        )}
      </div>

      {/* Commandes récentes */}
      <DashboardSection
        title={t("client.recentOrders.title")}
        description={t("client.recentOrders.description")}
        className="mb-8"
      >
        <DashboardCard title={t("client.recentOrders.title")}>
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
              <h3 className="mt-2 text-lg font-medium">
                {t("client.recentOrders.empty.title")}
              </h3>
              <p className="text-muted-foreground">
                {t("client.recentOrders.empty.description")}
              </p>
              <Button className="mt-4">{t("client.recentOrders.empty.action")}</Button>
            </div>
          )}
        </DashboardCard>
      </DashboardSection>

      {/* Adresses et méthodes de paiement */}
      <Tabs defaultValue="addresses" className="mb-8">
        <TabsList>
          <TabsTrigger value="addresses">{t("client.addresses.title")}</TabsTrigger>
          <TabsTrigger value="payment">{t("client.payment.title")}</TabsTrigger>
        </TabsList>
        <TabsContent value="addresses">
          <DashboardCard
            title={t("client.addresses.title")}
            description={t("client.addresses.description")}
          >
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
              </div>
            ) : data?.deliveryAddresses && data.deliveryAddresses.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {data.deliveryAddresses.map((address: Address) => (
                  <AddressCard key={address.id} address={address} />
                ))}
                <Button
                  variant="outline"
                  className="h-full min-h-[100px] border-dashed"
                >
                  <Home className="mr-2 h-4 w-4" />
                  {t("client.addresses.add")}
                </Button>
              </div>
            ) : (
              <div className="text-center py-8">
                <Home className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
                <h3 className="mt-2 text-lg font-medium">
                  {t("client.addresses.empty.title")}
                </h3>
                <p className="text-muted-foreground">
                  {t("client.addresses.empty.description")}
                </p>
                <Button className="mt-4">{t("client.addresses.empty.action")}</Button>
              </div>
            )}
          </DashboardCard>
        </TabsContent>
        <TabsContent value="payment">
          <DashboardCard
            title={t("client.payment.title")}
            description={t("client.payment.description")}
          >
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
              </div>
            ) : data?.paymentMethods && data.paymentMethods.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {data.paymentMethods.map((method: PaymentMethod) => (
                  <PaymentMethodCard key={method.id} method={method} />
                ))}
                <Button
                  variant="outline"
                  className="h-full min-h-[100px] border-dashed"
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  {t("client.payment.add")}
                </Button>
              </div>
            ) : (
              <div className="text-center py-8">
                <CreditCard className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
                <h3 className="mt-2 text-lg font-medium">
                  {t("client.payment.empty.title")}
                </h3>
                <p className="text-muted-foreground">
                  {t("client.payment.empty.description")}
                </p>
                <Button className="mt-4">{t("client.payment.empty.action")}</Button>
              </div>
            )}
          </DashboardCard>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
