"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  ShoppingCart, 
  TrendingUp, 
  TrendingDown,
  Euro, 
  Users,
  Package,
  Calendar,
  Target,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  RefreshCw
} from "lucide-react";
import { api } from "@/trpc/react";
import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function SalesWidget() {
  const t = useTranslations("dashboard.merchant.sales");
  const [selectedPeriod, setSelectedPeriod] = useState("month");
  
  // Récupération des données de ventes
  const { data: salesData, isLoading, refetch } = api.merchant.getSalesStats.useQuery({
    period: selectedPeriod
  });
  const { data: topProducts } = api.merchant.getTopProducts.useQuery({ limit: 5 });
  const { data: recentOrders } = api.merchant.getRecentOrders.useQuery({ limit: 3 });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-16" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-2 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const salesCards = [
    {
      title: t("totalRevenue"),
      value: `${salesData?.totalRevenue?.toFixed(2) || "0.00"}€`,
      icon: Euro,
      description: t("thisMonth"),
      trend: salesData?.revenueTrend || 0,
      color: "text-green-600"
    },
    {
      title: t("totalOrders"),
      value: salesData?.totalOrders || 0,
      icon: ShoppingCart,
      description: t("ordersCount"),
      trend: salesData?.ordersTrend || 0,
      color: "text-blue-600"
    },
    {
      title: t("averageOrderValue"),
      value: `${salesData?.averageOrderValue?.toFixed(2) || "0.00"}€`,
      icon: Target,
      description: t("perOrder"),
      trend: salesData?.avgOrderTrend || 0,
      color: "text-purple-600"
    },
    {
      title: t("activeCustomers"),
      value: salesData?.activeCustomers || 0,
      icon: Users,
      description: t("customersCount"),
      trend: salesData?.customersTrend || 0,
      color: "text-orange-600"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header avec sélection de période */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{t("title")}</h2>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>
        <div className="flex items-center space-x-2">
          <Tabs value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <TabsList>
              <TabsTrigger value="week">{t("periods.week")}</TabsTrigger>
              <TabsTrigger value="month">{t("periods.month")}</TabsTrigger>
              <TabsTrigger value="year">{t("periods.year")}</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Cartes de statistiques principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {salesCards.map((card, index) => {
          const Icon = card.icon;
          const isPositiveTrend = card.trend >= 0;
          
          return (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                <Icon className={`h-4 w-4 ${card.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
                <div className="flex items-center space-x-2 text-xs">
                  <span className="text-muted-foreground">{card.description}</span>
                  {card.trend !== 0 && (
                    <div className={`flex items-center space-x-1 ${isPositiveTrend ? 'text-green-600' : 'text-red-600'}`}>
                      {isPositiveTrend ? (
                        <ArrowUpRight className="h-3 w-3" />
                      ) : (
                        <ArrowDownRight className="h-3 w-3" />
                      )}
                      <span className="font-medium">{Math.abs(card.trend)}%</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Détails des ventes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Produits les plus vendus */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              {t("topProducts")}
            </CardTitle>
            <CardDescription>{t("topProductsDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topProducts && topProducts.length > 0 ? (
                topProducts.map((product: any, index: number) => (
                  <div key={product.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Package className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{product.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {product.salesCount} {t("sold")}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{product.revenue?.toFixed(2)}€</p>
                      <div className="flex items-center space-x-1">
                        <Badge variant="outline" className="text-xs">
                          #{index + 1}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Package className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">{t("noProductsData")}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Commandes récentes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              {t("recentOrders")}
            </CardTitle>
            <CardDescription>{t("recentOrdersDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentOrders && recentOrders.length > 0 ? (
                recentOrders.map((order: any) => (
                  <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        order.status === "DELIVERED" ? "bg-green-500" :
                        order.status === "IN_PROGRESS" ? "bg-blue-500" :
                        order.status === "PENDING" ? "bg-yellow-500" : "bg-gray-500"
                      }`}></div>
                      <div>
                        <p className="text-sm font-medium">
                          {t("orderNumber", { number: order.id.slice(-6).toUpperCase() })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {order.customerName} • {format(new Date(order.createdAt), "dd MMM HH:mm", { locale: fr })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{order.total?.toFixed(2)}€</p>
                      <Badge variant="outline" className="text-xs">
                        {t(`orderStatus.${order.status.toLowerCase()}`)}
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <ShoppingCart className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">{t("noOrdersData")}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Objectifs de vente */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            {t("salesGoal")}
          </CardTitle>
          <CardDescription>{t("salesGoalDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm">{t("monthlyTarget")}</span>
              <span className="text-2xl font-bold">
                {salesData?.totalRevenue?.toFixed(2) || "0.00"}€ / {salesData?.monthlyGoal?.toFixed(2) || "5000.00"}€
              </span>
            </div>
            <Progress 
              value={salesData?.goalProgress || 0} 
              className="h-3"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{salesData?.goalProgress || 0}% {t("achieved")}</span>
              <span>
                {salesData?.daysLeftInMonth || 0} {t("daysLeft")}
              </span>
            </div>

            {/* Prédiction basée sur les tendances */}
            {salesData?.projectedRevenue && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-blue-800">{t("projection")}</span>
                  <span className="font-medium text-blue-900">
                    {salesData.projectedRevenue.toFixed(2)}€
                  </span>
                </div>
                <p className="text-xs text-blue-700 mt-1">
                  {salesData.projectedRevenue >= (salesData.monthlyGoal || 0) 
                    ? t("onTrackToMeetGoal") 
                    : t("behindGoal")
                  }
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Performance indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t("conversionRate")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {salesData?.conversionRate?.toFixed(1) || "0.0"}%
            </div>
            <p className="text-xs text-muted-foreground">{t("visitorsToCustomers")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t("customerRetention")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {salesData?.retentionRate?.toFixed(1) || "0.0"}%
            </div>
            <p className="text-xs text-muted-foreground">{t("returningCustomers")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t("averageOrderTime")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {salesData?.avgFulfillmentTime || "0"} {t("hours")}
            </div>
            <p className="text-xs text-muted-foreground">{t("orderToDelivery")}</p>
          </CardContent>
        </Card>
      </div>

      {/* Actions rapides */}
      <div className="flex flex-wrap gap-3">
        <Button variant="outline" size="sm">
          <Eye className="h-4 w-4 mr-2" />
          {t("actions.viewAnalytics")}
        </Button>
        <Button variant="outline" size="sm">
          <BarChart3 className="h-4 w-4 mr-2" />
          {t("actions.exportReport")}
        </Button>
        <Button variant="outline" size="sm">
          <Target className="h-4 w-4 mr-2" />
          {t("actions.setGoals")}
        </Button>
      </div>
    </div>
  );
}
