"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ComposedChart,
  Scatter,
  Area,
  AreaChart} from "recharts";
import { Clock, TrendingUp, Map, AlertTriangle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

// Types pour les données de performance
interface DeliveryPerformanceData {
  onTimeDeliveryRate: Array<{
    period: string;
    rate: number;
    previousRate?: number;
  }>;
  deliveryTimesByZone: Array<{
    zone: string;
    averageTime: number; // en minutes
    color: string;
  }>;
  deliveryIssues: Array<{
    issueType: string;
    count: number;
    percentage: number;
    color: string;
  }>;
  deliveriesByStatus: Array<{
    status: string;
    count: number;
    color: string;
  }>;
  avgDeliveryTimeByHour: Array<{
    hour: number;
    time: number; // en minutes
  }>;
  performanceSummary: {
    totalDeliveries: number;
    onTimePercentage: number;
    previousOnTimePercentage: number;
    percentChange: number;
    averageDeliveryTime: number; // en minutes
    issueRate: number;
    cancelRate: number;
  };
}

interface DeliveryPerformanceReportProps {
  data: DeliveryPerformanceData | undefined;
  isLoading: boolean;
  isError: boolean;
  dateRange: string;
}

export function DeliveryPerformanceReport({
  data,
  isLoading,
  isError,
  dateRange}: DeliveryPerformanceReportProps) {
  const t = useTranslations("admin.reports");

  // Format pourcentage
  const formatPercentage = (value: number) => {
    return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
  };

  // Format du temps
  const formatTime = (minutes: number) => {
    if (minutes < 60) {
      return `${Math.round(minutes)} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.round(minutes % 60);
    return `${hours}h ${remainingMinutes > 0 ? remainingMinutes + "min" : ""}`;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Placeholders de chargement pour les KPIs */}
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4  }).map((_, index) => (
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
          {Array.from({ length: 2  }).map((_, index) => (
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

  // Couleurs pour les graphiques
  const COLORS = [
    "#8884d8",
    "#82ca9d",
    "#ffc658",
    "#ff8042",
    "#0088FE",
    "#00C49F"];

  // Changement de la ponctualité
  const onTimeChange = data.performanceSummary.percentChange;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("delivery.onTimeRate")}
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {`${data.performanceSummary.onTimePercentage.toFixed(2)}%`}
            </div>
            <p
              className={`text-xs ${onTimeChange >= 0 ? "text-green-500" : "text-red-500"}`}
            >
              {formatPercentage(onTimeChange)} {t("delivery.vsPrevious")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("delivery.avgDeliveryTime")}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatTime(data.performanceSummary.averageDeliveryTime)}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("delivery.fromPickupToDelivery")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("delivery.issueRate")}
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {`${data.performanceSummary.issueRate.toFixed(2)}%`}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("delivery.ofTotalDeliveries")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("delivery.totalDeliveries")}
            </CardTitle>
            <Map className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.performanceSummary.totalDeliveries.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("delivery.duringPeriod")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Graphiques */}
      <Tabs defaultValue="performance">
        <TabsList className="mb-4">
          <TabsTrigger value="performance">
            {t("delivery.tabs.performance")}
          </TabsTrigger>
          <TabsTrigger value="issues">{t("delivery.tabs.issues")}</TabsTrigger>
          <TabsTrigger value="zones">{t("delivery.tabs.zones")}</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("delivery.charts.onTimeRate")}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-80 w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={data.onTimeDeliveryRate}
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
                    <YAxis
                      tickFormatter={(value) => `${value}%`}
                      domain={[0, 100]}
                    />
                    <Tooltip
                      formatter={(value) => [
                        `${value}%`,
                        t("delivery.onTimeRate")]}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="rate"
                      name={t("delivery.onTimeRate")}
                      stroke="#8884d8"
                      activeDot={{ r: 8 }}
                    />
                    {data.onTimeDeliveryRate.some(
                      (d) => d.previousRate !== undefined,
                    ) && (
                      <Line
                        type="monotone"
                        dataKey="previousRate"
                        name={t("delivery.previousPeriod")}
                        stroke="#82ca9d"
                        strokeDasharray="5 5"
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("delivery.charts.timeByHour")}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-80 w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={data.avgDeliveryTimeByHour}
                    margin={{ top: 10, right: 30, left: 30, bottom: 30 }}
                  >
                    <defs>
                      <linearGradient
                        id="colorTime"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#8884d8"
                          stopOpacity={0.8}
                        />
                        <stop
                          offset="95%"
                          stopColor="#8884d8"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="hour"
                      tickFormatter={(hour) => `${hour}h`}
                    />
                    <YAxis tickFormatter={(min) => formatTime(min)} />
                    <Tooltip
                      formatter={(value) => [
                        formatTime(value as number),
                        t("delivery.avgTime")]}
                      labelFormatter={(hour) => `${hour}h00 - ${hour}h59`}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="time"
                      name={t("delivery.avgTime")}
                      stroke="#8884d8"
                      fillOpacity={1}
                      fill="url(#colorTime)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="issues" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t("delivery.charts.issueTypes")}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="h-80 w-full pt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.deliveryIssues}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                        nameKey="issueType"
                        label={({ issueType, percentage  }) =>
                          `${issueType}: ${percentage.toFixed(1)}%`
                        }
                      >
                        {data.deliveryIssues.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.color || COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value, name, props) => [
                          `${value} (${props.payload.percentage.toFixed(1)}%)`,
                          t("delivery.issues")]}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("delivery.charts.deliveryStatus")}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="h-80 w-full pt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={data.deliveriesByStatus}
                      margin={{ top: 10, right: 30, left: 30, bottom: 30 }}
                      layout="vertical"
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="status" width={100} />
                      <Tooltip
                        formatter={(value) => [`${value}`, t("delivery.count")]}
                      />
                      <Legend />
                      <Bar
                        dataKey="count"
                        name={t("delivery.deliveries")}
                        fill="#8884d8"
                      >
                        {data.deliveriesByStatus.map((entry, index) => (
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

        <TabsContent value="zones" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("delivery.charts.timeByZone")}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-80 w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={data.deliveryTimesByZone}
                    margin={{ top: 20, right: 30, left: 30, bottom: 30 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="zone" />
                    <YAxis
                      tickFormatter={(min) => formatTime(min)}
                      label={{
                        value: t("delivery.avgDeliveryTime"),
                        angle: -90,
                        position: "insideLeft",
                        style: { textAnchor: "middle" }}}
                    />
                    <Tooltip
                      formatter={(value) => [
                        formatTime(value as number),
                        t("delivery.avgTime")]}
                    />
                    <Legend />
                    <Bar
                      dataKey="averageTime"
                      name={t("delivery.avgTime")}
                      fill="#8884d8"
                    >
                      {data.deliveryTimesByZone.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.color || COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Bar>
                    <Scatter
                      name={t("delivery.target")}
                      dataKey="targetTime"
                      fill="#ff7300"
                      shape="star"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
