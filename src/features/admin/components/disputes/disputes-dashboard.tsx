"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

interface DisputeStats {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
  avgResolutionTime: number;
  trend: "up" | "down" | "stable";
}

export function DisputesDashboard() {
  const t = useTranslations("admin.disputes");
  const [stats, setStats] = useState<DisputeStats>({
    total: 0,
    open: 0,
    inProgress: 0,
    resolved: 0,
    closed: 0,
    avgResolutionTime: 0,
    trend: "stable",
  });

  useEffect(() => {
    // TODO: Fetch dispute statistics
    setStats({
      total: 24,
      open: 8,
      inProgress: 6,
      resolved: 7,
      closed: 3,
      avgResolutionTime: 2.5,
      trend: "up",
    });
  }, []);

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up":
        return <TrendingUp className="h-4 w-4 text-red-500" />;
      case "down":
        return <TrendingDown className="h-4 w-4 text-green-500" />;
      default:
        return <TrendingUp className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Disputes */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {t("totalDisputes")}
          </CardTitle>
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total}</div>
          <p className="text-xs text-muted-foreground">{t("allTime")}</p>
        </CardContent>
      </Card>

      {/* Open Disputes */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {t("openDisputes")}
          </CardTitle>
          <Clock className="h-4 w-4 text-orange-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-600">{stats.open}</div>
          <p className="text-xs text-muted-foreground">
            {t("requiresAttention")}
          </p>
        </CardContent>
      </Card>

      {/* In Progress */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {t("inProgress")}
          </CardTitle>
          <AlertTriangle className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">
            {stats.inProgress}
          </div>
          <p className="text-xs text-muted-foreground">{t("beingHandled")}</p>
        </CardContent>
      </Card>

      {/* Resolved */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t("resolved")}</CardTitle>
          <CheckCircle className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {stats.resolved}
          </div>
          <p className="text-xs text-muted-foreground">
            {t("successfullyResolved")}
          </p>
        </CardContent>
      </Card>

      {/* Average Resolution Time */}
      <Card className="md:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {t("avgResolutionTime")}
          </CardTitle>
          {getTrendIcon(stats.trend)}
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {stats.avgResolutionTime} {t("days")}
          </div>
          <p className="text-xs text-muted-foreground">{t("last30Days")}</p>
        </CardContent>
      </Card>

      {/* Resolution Rate */}
      <Card className="md:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {t("resolutionRate")}
          </CardTitle>
          <CheckCircle className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {stats.total > 0
              ? Math.round((stats.resolved / stats.total) * 100)
              : 0}
            %
          </div>
          <p className="text-xs text-muted-foreground">
            {t("successfulResolutions")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
