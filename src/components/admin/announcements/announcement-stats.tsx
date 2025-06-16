"use client";

import { useTranslations } from "next-intl";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  LineChart,
  Line,
  CartesianGrid} from "recharts";
import {
  Package,
  Check,
  AlertTriangle,
  X,
  DollarSign,
  TrendingUp} from "lucide-react";

interface StatsData {
  totalCount: number;
  publishedCount: number;
  assignedCount: number;
  completedCount: number;
  cancelledCount: number;
  averagePrice: number;
  totalRevenue: number;
  typeDistribution?: Record<string, number>;
}

interface AnnouncementStatsProps {
  data: StatsData;
}

export function AnnouncementStats({ data }: AnnouncementStatsProps) {
  const t = useTranslations("admin.announcements");

  const typeDistributionData = data.typeDistribution
    ? Object.entries(data.typeDistribution).map(([key, value]) => ({ name: formatAnnouncementType(key, t),
        value }))
    : [];

  const COLORS = [
    "#6366F1",
    "#8B5CF6",
    "#EC4899",
    "#10B981",
    "#F59E0B",
    "#EF4444",
    "#3B82F6"];

  function formatAnnouncementType(type: string, t: any) {
    switch (type) {
      case "PACKAGE_DELIVERY":
        return t("type.packageDelivery");
      case "GROCERY_SHOPPING":
        return t("type.groceryShopping");
      case "PERSON_TRANSPORT":
        return t("type.personTransport");
      case "AIRPORT_TRANSFER":
        return t("type.airportTransfer");
      case "FOREIGN_PURCHASE":
        return t("type.foreignPurchase");
      case "PET_CARE":
        return t("type.petCare");
      case "HOME_SERVICES":
        return t("type.homeServices");
      default:
        return type;
    }
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {t("stats.totalAnnouncements")}
          </CardTitle>
          <Package className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.totalCount}</div>
          <p className="text-xs text-muted-foreground">
            {t("stats.announcementsRegistered")}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {t("stats.completedAnnouncements")}
          </CardTitle>
          <Check className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.completedCount}</div>
          <p className="text-xs text-muted-foreground">
            {data.totalCount > 0
              ? `${Math.round((data.completedCount / data.totalCount) * 100)}% ${t("stats.completionRate")}`
              : t("stats.noCompletedAnnouncements")}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {t("stats.averagePrice")}
          </CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {data.averagePrice.toFixed(2)} €
          </div>
          <p className="text-xs text-muted-foreground">
            {t("stats.perAnnouncement")}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {t("stats.revenue")}
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {data.totalRevenue.toFixed(2)} €
          </div>
          <p className="text-xs text-muted-foreground">
            {t("stats.totalRevenue")}
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
                <Bar dataKey="value" name={t("stats.announcements")}>
                  {statusDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {data.typeDistribution && (
        <Card className="col-span-full md:col-span-2">
          <CardHeader>
            <CardTitle>{t("stats.typeDistribution")}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-80 w-full py-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={typeDistributionData}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent  }) =>
                      `${name}: ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    {typeDistributionData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
