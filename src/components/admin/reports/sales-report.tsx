"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart,
} from "recharts";
import {
  DollarSign,
  TrendingUp,
  PackageIcon,
  ShoppingCart,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

// Types pour les données de vente
interface SalesData {
  revenueOverTime: Array<{
    period: string;
    revenue: number;
    previousRevenue?: number;
  }>;
  topCategories: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  salesByDeliveryType: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  revenueSummary: {
    total: number;
    previousPeriodTotal: number;
    percentChange: number;
    averageOrderValue: number;
    previousAverageOrderValue: number;
    orderCount: number;
    previousOrderCount: number;
  };
}

interface SalesReportProps {
  data: SalesData | undefined;
  isLoading: boolean;
  isError: boolean;
  dateRange: string;
}

export function SalesReport({
  data,
  isLoading,
  isError,
  dateRange,
}: SalesReportProps) {
  const t = useTranslations("admin.reports");

  // Format monétaire pour l'affichage des valeurs
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
    }).format(value);
  };

  // Format de pourcentage pour l'affichage des changements
  const formatPercentage = (value: number) => {
    return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Placeholders de chargement pour les KPIs */}
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index}>
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-4 rounded-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-7 w-24 mb-1" />
                <Skeleton className="h-4 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Placeholder pour le graphique principal */}
        <Card>
          <CardHeader className="pb-2">
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>

        {/* Placeholders pour les graphiques secondaires */}
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, index) => (
            <Card key={index}>
              <CardHeader className="pb-2">
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-40 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-medium text-destructive mb-2">
            {t("errors.loadFailed")}
          </h3>
          <p className="text-muted-foreground">{t("errors.tryAgain")}</p>
        </div>
      </div>
    );
  }

  // Calcul de l'évolution des ventes pour affichage
  const revenueChange = data.revenueSummary.percentChange;
  const orderCountChange =
    ((data.revenueSummary.orderCount - data.revenueSummary.previousOrderCount) /
      data.revenueSummary.previousOrderCount) *
    100;
  const aovChange =
    ((data.revenueSummary.averageOrderValue -
      data.revenueSummary.previousAverageOrderValue) /
      data.revenueSummary.previousAverageOrderValue) *
    100;

  // Couleurs pour les graphiques
  const COLORS = [
    "#8884d8",
    "#82ca9d",
    "#ffc658",
    "#ff8042",
    "#0088FE",
    "#00C49F",
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("sales.totalRevenue")}
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(data.revenueSummary.total)}
            </div>
            <p
              className={`text-xs ${revenueChange >= 0 ? "text-green-500" : "text-red-500"}`}
            >
              {formatPercentage(revenueChange)} {t("sales.vsPrevious")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("sales.orderCount")}
            </CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.revenueSummary.orderCount}
            </div>
            <p
              className={`text-xs ${orderCountChange >= 0 ? "text-green-500" : "text-red-500"}`}
            >
              {formatPercentage(orderCountChange)} {t("sales.vsPrevious")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("sales.averageOrderValue")}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(data.revenueSummary.averageOrderValue)}
            </div>
            <p
              className={`text-xs ${aovChange >= 0 ? "text-green-500" : "text-red-500"}`}
            >
              {formatPercentage(aovChange)} {t("sales.vsPrevious")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("sales.topCategory")}
            </CardTitle>
            <PackageIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.topCategories && data.topCategories.length > 0
                ? data.topCategories[0].name
                : t("sales.noData")}
            </div>
            <p className="text-xs text-muted-foreground">
              {data.topCategories && data.topCategories.length > 0
                ? `${Math.round((data.topCategories[0].value / data.revenueSummary.total) * 100)}% ${t("sales.ofTotalRevenue")}`
                : ""}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Graphiques */}
      <Tabs defaultValue="revenue">
        <TabsList className="mb-4">
          <TabsTrigger value="revenue">{t("sales.charts.revenue")}</TabsTrigger>
          <TabsTrigger value="comparison">
            {t("sales.charts.comparison")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="revenue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("sales.charts.revenueOverTime")}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-80 w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={data.revenueOverTime}
                    margin={{ top: 10, right: 30, left: 30, bottom: 30 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="period"
                      angle={-45}
                      textAnchor="end"
                      height={70}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis tickFormatter={(value) => `${value}€`} />
                    <Tooltip
                      formatter={(value) => [
                        `${formatCurrency(value as number)}`,
                        t("sales.revenue"),
                      ]}
                      labelFormatter={(label) => `${label}`}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      name={t("sales.revenue")}
                      stroke="#8884d8"
                      fill="#8884d8"
                      activeDot={{ r: 8 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t("sales.charts.topCategories")}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="h-64 w-full pt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.topCategories}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }) =>
                          `${name}: ${(percent * 100).toFixed(0)}%`
                        }
                      >
                        {data.topCategories.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.color || COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => [
                          formatCurrency(value as number),
                          t("sales.value"),
                        ]}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("sales.charts.deliveryTypes")}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="h-64 w-full pt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={data.salesByDeliveryType}
                      margin={{ top: 20, right: 30, left: 20, bottom: 30 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tickFormatter={(value) => `${value}€`} />
                      <Tooltip
                        formatter={(value) => [
                          formatCurrency(value as number),
                          t("sales.revenue"),
                        ]}
                      />
                      <Bar dataKey="value" name={t("sales.revenue")}>
                        {data.salesByDeliveryType.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.color || COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="comparison" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("sales.charts.periodComparison")}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-80 w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={data.revenueOverTime.filter(
                      (d) => d.previousRevenue !== undefined,
                    )}
                    margin={{ top: 10, right: 30, left: 30, bottom: 30 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="period"
                      angle={-45}
                      textAnchor="end"
                      height={70}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis tickFormatter={(value) => `${value}€`} />
                    <Tooltip
                      formatter={(value) => [
                        `${formatCurrency(value as number)}`,
                        "",
                      ]}
                      labelFormatter={(label) => `${label}`}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      name={t("sales.currentPeriod")}
                      stroke="#8884d8"
                      activeDot={{ r: 8 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="previousRevenue"
                      name={t("sales.previousPeriod")}
                      stroke="#82ca9d"
                      activeDot={{ r: 8 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
