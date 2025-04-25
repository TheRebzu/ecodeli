"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import { OrderStatus } from "@prisma/client";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { ClientSidebar } from "@/components/dashboard/client/client-sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  Package,
  Search,
  Clock,
  CheckCircle,
  XCircle,
  Truck,
  Filter,
  ShoppingBag,
} from "lucide-react";
import Link from "next/link";

export default function OrdersPage() {
  const t = useTranslations("orders");
  const router = useRouter();

  // États pour le filtrage
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | "">("");

  // Récupérer les commandes
  const { data, isLoading, error, fetchNextPage, hasNextPage, refetch } =
    api.order.getOrders.useInfiniteQuery(
      {
        status: selectedStatus || undefined,
        limit: 10,
      },
      {
        getNextPageParam: (lastPage) => lastPage.nextCursor,
      },
    );

  // Gérer le filtrage
  const handleFilter = (status: OrderStatus | "") => {
    setSelectedStatus(status);
    refetch();
  };

  // Toutes les commandes de toutes les pages
  const orders = data?.pages.flatMap((page) => page.orders) || [];

  // Fonction pour afficher le statut de la commande
  const renderStatus = (status: OrderStatus) => {
    switch (status) {
      case "PENDING":
        return (
          <Badge variant="outline">
            <Clock className="mr-1 h-3 w-3" /> {t("status.pending")}
          </Badge>
        );
      case "CONFIRMED":
        return (
          <Badge variant="secondary">
            <CheckCircle className="mr-1 h-3 w-3" /> {t("status.confirmed")}
          </Badge>
        );
      case "PREPARING":
        return (
          <Badge variant="secondary">
            <Package className="mr-1 h-3 w-3" /> {t("status.preparing")}
          </Badge>
        );
      case "READY_FOR_PICKUP":
        return (
          <Badge variant="warning">
            <Package className="mr-1 h-3 w-3" /> {t("status.readyForPickup")}
          </Badge>
        );
      case "IN_TRANSIT":
        return (
          <Badge variant="warning">
            <Truck className="mr-1 h-3 w-3" /> {t("status.inTransit")}
          </Badge>
        );
      case "DELIVERED":
        return (
          <Badge variant="success">
            <CheckCircle className="mr-1 h-3 w-3" /> {t("status.delivered")}
          </Badge>
        );
      case "CANCELLED":
        return (
          <Badge variant="destructive">
            <XCircle className="mr-1 h-3 w-3" /> {t("status.cancelled")}
          </Badge>
        );
      case "REFUNDED":
        return (
          <Badge variant="destructive">
            <XCircle className="mr-1 h-3 w-3" /> {t("status.refunded")}
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <DashboardLayout sidebar={<ClientSidebar />}>
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">{t("title")}</h1>
          <Button asChild>
            <Link href="/stores">
              <ShoppingBag className="mr-2 h-4 w-4" />
              {t("shopNow")}
            </Link>
          </Button>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{t("filterOrders")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs
              defaultValue="all"
              className="w-full"
              onValueChange={(value) => handleFilter(value as OrderStatus | "")}
            >
              <TabsList className="grid grid-cols-4 md:grid-cols-8">
                <TabsTrigger value="">{t("all")}</TabsTrigger>
                <TabsTrigger value="PENDING">{t("status.pending")}</TabsTrigger>
                <TabsTrigger value="CONFIRMED">
                  {t("status.confirmed")}
                </TabsTrigger>
                <TabsTrigger value="PREPARING">
                  {t("status.preparing")}
                </TabsTrigger>
                <TabsTrigger value="READY_FOR_PICKUP">
                  {t("status.readyForPickup")}
                </TabsTrigger>
                <TabsTrigger value="IN_TRANSIT">
                  {t("status.inTransit")}
                </TabsTrigger>
                <TabsTrigger value="DELIVERED">
                  {t("status.delivered")}
                </TabsTrigger>
                <TabsTrigger value="CANCELLED">
                  {t("status.cancelled")}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("ordersList")}</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : error ? (
              <div className="text-center py-8 text-destructive">
                <p>{t("error")}</p>
                <Button
                  variant="outline"
                  onClick={() => refetch()}
                  className="mt-2"
                >
                  {t("retry")}
                </Button>
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-8">
                <Package className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
                <h3 className="mt-2 text-lg font-medium">{t("noOrders")}</h3>
                <p className="text-muted-foreground">
                  {t("noOrdersDescription")}
                </p>
                <Button className="mt-4" asChild>
                  <Link href="/stores">
                    <ShoppingBag className="mr-2 h-4 w-4" />
                    {t("shopNow")}
                  </Link>
                </Button>
              </div>
            ) : (
              <>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("orderNumber")}</TableHead>
                        <TableHead>{t("date")}</TableHead>
                        <TableHead>{t("store")}</TableHead>
                        <TableHead>{t("total")}</TableHead>
                        <TableHead>{t("status")}</TableHead>
                        <TableHead className="text-right">
                          {t("actions")}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">
                            #{order.orderNumber}
                          </TableCell>
                          <TableCell>
                            {new Date(order.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>{order.store.name}</TableCell>
                          <TableCell>
                            {order.totalAmount.toFixed(2)} €
                          </TableCell>
                          <TableCell>{renderStatus(order.status)}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/orders/${order.id}`}>
                                {t("view")}
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {hasNextPage && (
                  <div className="mt-4 flex justify-center">
                    <Button variant="outline" onClick={() => fetchNextPage()}>
                      {t("loadMore")}
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
