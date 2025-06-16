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
  Line} from "recharts";
import { Package, Truck, Check, AlertTriangle, Clock } from "lucide-react";

interface StatsData {
  totalCount: number;
  pendingCount: number;
  inTransitCount: number;
  deliveredCount: number;
  problemCount: number;
  averageDeliveryTime: number; // en heures
  onTimeDeliveryRate: number; // pourcentage
  dailyDeliveries?: Array<{ date: string; count: number }>;
}

interface DeliveryStatsProps {
  data: StatsData;
}

export function DeliveryStats({ data }: DeliveryStatsProps) {
  const t = useTranslations("admin.deliveries");

  // Formatage des statistiques
  const formatTime = (hours: number) => {
    if (hours < 1) {
      return `${Math.round(hours * 60)} minutes`;
    }
    if (hours < 24) {
      return `${Math.round(hours)} heures`;
    }
    return `${Math.round(hours / 24)} jours`;
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {t("stats.totalDeliveries")}
          </CardTitle>
          <Package className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.totalCount}</div>
          <p className="text-xs text-muted-foreground">
            {t("stats.activeLivraisons")}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {t("stats.inTransit")}
          </CardTitle>
          <Truck className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.inTransitCount}</div>
          <p className="text-xs text-muted-foreground">
            {t("stats.currentlyInTransit")}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {t("stats.completed")}
          </CardTitle>
          <Check className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.deliveredCount}</div>
          <p className="text-xs text-muted-foreground">
            {data.totalCount > 0
              ? `${Math.round((data.deliveredCount / data.totalCount) * 100)}% ${t("stats.completionRate")}`
              : t("stats.noDeliveries")}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {t("stats.averageTime")}
          </CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatTime(data.averageDeliveryTime)}
          </div>
          <p className="text-xs text-muted-foreground">
            {t("stats.avgDeliveryTime")}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {t("stats.issues")}
          </CardTitle>
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.problemCount}</div>
          <p className="text-xs text-muted-foreground">
            {data.totalCount > 0
              ? `${Math.round((data.problemCount / data.totalCount) * 100)}% ${t("stats.problemRate")}`
              : t("stats.noProblems")}
          </p>
        </CardContent>
      </Card>

      <Card className="col-span-full md:col-span-2">
        <CardHeader>
          <CardTitle>{t("stats.statusDistribution")}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="h-80 w-full py-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={statusDistributionData.filter((item) => item.value > 0)}
                barSize={60}
                margin={{
                  top: 20,
                  right: 30,
                  left: 20,
                  bottom: 30}}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey="value"
                  name={t("stats.deliveries")}
                  fill="#6366F1"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {data.dailyDeliveries && data.dailyDeliveries.length > 0 && (
        <Card className="col-span-full md:col-span-3">
          <CardHeader>
            <CardTitle>{t("stats.dailyActivity")}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-80 w-full py-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={data.dailyDeliveries}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 20,
                    bottom: 30}}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="count"
                    name={t("stats.deliveriesPerDay")}
                    stroke="#8B5CF6"
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
