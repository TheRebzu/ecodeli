"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from "recharts";
import { formatDate, formatCurrency } from "@/utils/document-utils";
import {
  ChevronDown,
  ChevronUp,
  Eye,
  Calendar,
  Clock,
  Users,
} from "lucide-react";

interface AnalyticsData {
  views?: {
    total: number;
    history: { date: string; count: number }[];
  };
  applications?: {
    total: number;
    history: { date: string; count: number }[];
    statuses: { status: string; count: number }[];
  };
  deliveryPerformance?: {
    onTimeRate: number;
    averageDeliveryTime: number;
    completionRate: number;
  };
  pricing?: {
    averageBid: number;
    lowestBid: number;
    highestBid: number;
  };
}

interface AnnouncementAnalyticsProps {
  data?: AnalyticsData;
  isLoading?: boolean;
}

export function AnnouncementAnalytics({
  data,
  isLoading = false,
}: AnnouncementAnalyticsProps) {
  const t = useTranslations("announcements.analytics");
  const [activeTab, setActiveTab] = useState("views");

  const COLORS = [
    "#0088FE",
    "#00C49F",
    "#FFBB28",
    "#FF8042",
    "#A569BD",
    "#5DADE2",
  ];

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-10 bg-muted rounded-md w-3/4"></div>
        <div className="h-60 bg-muted rounded-md"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-20 bg-muted rounded-md"></div>
          <div className="h-20 bg-muted rounded-md"></div>
          <div className="h-20 bg-muted rounded-md"></div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="py-12 text-center">
        <p className="text-lg text-muted-foreground">{t("noData")}</p>
        <p className="text-sm text-muted-foreground mt-2">
          {t("noDataDescription")}
        </p>
      </div>
    );
  }

  return (
    <>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="views">
            <Eye className="mr-2 h-4 w-4" />
            {t("views")}
          </TabsTrigger>
          <TabsTrigger value="applications">
            <Users className="mr-2 h-4 w-4" />
            {t("applications")}
          </TabsTrigger>
          <TabsTrigger value="performance">
            <Clock className="mr-2 h-4 w-4" />
            {t("performance")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="views" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  {t("totalViews")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {data.views?.total || 0}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("viewsOverTime")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={data.views?.history || []}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(value) => {
                        try {
                          return new Date(value).toLocaleDateString();
                        } catch (e) {
                          return value;
                        }
                      }}
                    />
                    <YAxis />
                    <Tooltip
                      formatter={(value: any) => [value, t("views")]}
                      labelFormatter={(value) => {
                        try {
                          return new Date(value).toLocaleDateString();
                        } catch (e) {
                          return value;
                        }
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#8884d8"
                      name={t("views")}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="applications" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  {t("totalApplications")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {data.applications?.total || 0}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {t("applicationsOverTime")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={data.applications?.history || []}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(value) => {
                          try {
                            return new Date(value).toLocaleDateString();
                          } catch (e) {
                            return value;
                          }
                        }}
                      />
                      <YAxis />
                      <Tooltip
                        formatter={(value: any) => [value, t("applications")]}
                        labelFormatter={(value) => {
                          try {
                            return new Date(value).toLocaleDateString();
                          } catch (e) {
                            return value;
                          }
                        }}
                      />
                      <Bar
                        dataKey="count"
                        fill="#82ca9d"
                        name={t("applications")}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {t("applicationStatus")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.applications?.statuses || []}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                        nameKey="status"
                        label={({ name, percent }) =>
                          `${name}: ${(percent * 100).toFixed(0)}%`
                        }
                      >
                        {(data.applications?.statuses || []).map(
                          (entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          ),
                        )}
                      </Pie>
                      <Tooltip
                        formatter={(value: any, name: any) => [
                          value,
                          t(`status.${name.toLowerCase()}`),
                        ]}
                      />
                      <Legend
                        formatter={(value) =>
                          t(`status.${value.toLowerCase()}`)
                        }
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  {t("onTimeRate")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <div className="text-2xl font-bold">
                    {data.deliveryPerformance?.onTimeRate
                      ? `${(data.deliveryPerformance.onTimeRate * 100).toFixed(1)}%`
                      : "N/A"}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  {t("avgDeliveryTime")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {data.deliveryPerformance?.averageDeliveryTime
                    ? `${data.deliveryPerformance.averageDeliveryTime.toFixed(1)} h`
                    : "N/A"}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  {t("completionRate")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {data.deliveryPerformance?.completionRate
                    ? `${(data.deliveryPerformance.completionRate * 100).toFixed(1)}%`
                    : "N/A"}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("pricingAnalysis")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col">
                  <span className="text-sm text-muted-foreground">
                    {t("avgBid")}
                  </span>
                  <span className="text-lg font-semibold">
                    {data.pricing?.averageBid
                      ? formatCurrency(data.pricing.averageBid)
                      : "N/A"}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm text-muted-foreground">
                    {t("lowestBid")}
                  </span>
                  <span className="text-lg font-semibold">
                    {data.pricing?.lowestBid
                      ? formatCurrency(data.pricing.lowestBid)
                      : "N/A"}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm text-muted-foreground">
                    {t("highestBid")}
                  </span>
                  <span className="text-lg font-semibold">
                    {data.pricing?.highestBid
                      ? formatCurrency(data.pricing.highestBid)
                      : "N/A"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
