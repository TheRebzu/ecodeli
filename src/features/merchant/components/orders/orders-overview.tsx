"use client";

import { useTranslations } from "next-intl";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  Clock,
  CheckCircle,
  XCircle,
  TrendingUp,
  DollarSign,
} from "lucide-react";
import Link from "next/link";
import { useOrders } from "@/features/merchant/hooks/use-orders";

export function OrdersOverview() {
  const t = useTranslations("merchant.orders");
  const { orders, isLoading, stats } = useOrders();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/merchant/orders/new">{t("newOrders")}</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/merchant/orders/active">{t("activeOrders")}</Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("stats.totalOrders")}
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalOrders || 0}</div>
            <p className="text-xs text-muted-foreground">
              {t("stats.allTime")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("stats.pendingOrders")}
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.pendingOrders || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("stats.awaitingAction")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("stats.completedOrders")}
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.completedOrders || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("stats.successfullyDelivered")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("stats.totalRevenue")}
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              €{stats?.totalRevenue?.toFixed(2) || "0.00"}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("stats.allTime")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <CardTitle>{t("recentOrders")}</CardTitle>
          <CardDescription>{t("recentOrdersDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Loading...</div>
            </div>
          ) : orders && orders.length > 0 ? (
            <div className="space-y-4">
              {orders.slice(0, 5).map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                      <Package className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="font-medium">#{order.orderNumber}</h3>
                      <p className="text-sm text-muted-foreground">
                        {order.client?.profile?.firstName}{" "}
                        {order.client?.profile?.lastName}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">
                      €{order.totalAmount.toFixed(2)}
                    </div>
                    <Badge
                      variant={
                        order.status === "PENDING"
                          ? "secondary"
                          : order.status === "IN_PROGRESS"
                            ? "default"
                            : order.status === "COMPLETED"
                              ? "default"
                              : "destructive"
                      }
                    >
                      {order.status}
                    </Badge>
                  </div>
                </div>
              ))}
              {orders.length > 5 && (
                <div className="text-center pt-4">
                  <Button variant="outline" asChild>
                    <Link href="/merchant/orders/list">
                      {t("viewAllOrders")}
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <Package className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-medium">{t("noOrders")}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("noOrdersDescription")}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
