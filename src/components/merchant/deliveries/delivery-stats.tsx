"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/utils/document-utils";
import { cn } from "@/lib/utils/common";
import {
  TrendingUp,
  TrendingDown,
  Clock,
  Truck,
  CheckCircle,
  AlertTriangle} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface DeliveryStatsProps {
  stats: {
    total: number;
    completed: number;
    inProgress: number;
    pending: number;
    cancelled: number;
    revenue: number;
    onTimeRate: number;
    problemRate: number;
    avgDeliveryTime?: number;
  };
  isLoading?: boolean;
  className?: string;
}

export function DeliveryStats({
  stats,
  isLoading = false,
  className}: DeliveryStatsProps) {
  const t = useTranslations("merchant.deliveries.stats");

  if (isLoading) {
    return (
      <div
        className={cn("grid gap-4 md:grid-cols-2 lg:grid-cols-4", className)}
      >
        {Array.from({ length: 4  }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">
                <Skeleton className="h-5 w-24" />
              </CardTitle>
              <Skeleton className="h-8 w-8 rounded-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-7 w-28" />
              <Skeleton className="h-4 w-36 mt-1" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("grid gap-4 md:grid-cols-2 lg:grid-cols-4", className)}>
      <StatsCard
        title={t("totalDeliveries")}
        value={stats.total}
        description={t("totalDescription")}
        icon={<Truck className="h-5 w-5" />}
      />

      <StatsCard
        title={t("activeDeliveries")}
        value={stats.inProgress}
        description={`${((stats.inProgress / stats.total) * 100).toFixed(1)}% ${t("ofTotal")}`}
        icon={<Clock className="h-5 w-5" />}
        iconColor="text-blue-500"
        iconBackground="bg-blue-100"
      />

      <StatsCard
        title={t("completionRate")}
        value={`${((stats.completed / stats.total) * 100).toFixed(1)}%`}
        description={`${stats.completed} ${t("deliveriesCompleted")}`}
        icon={<CheckCircle className="h-5 w-5" />}
        iconColor="text-green-500"
        iconBackground="bg-green-100"
      />

      <StatsCard
        title={t("totalRevenue")}
        value={formatCurrency(stats.revenue)}
        description={t("revenueDescription")}
        icon={<TrendingUp className="h-5 w-5" />}
        iconColor="text-green-500"
        iconBackground="bg-green-100"
      />

      <StatsCard
        title={t("onTimeRate")}
        value={`${(stats.onTimeRate * 100).toFixed(1)}%`}
        description={t("onTimeDescription")}
        trend={
          stats.onTimeRate >= 0.9
            ? "positive"
            : stats.onTimeRate >= 0.7
              ? "neutral"
              : "negative"
        }
        icon={<Clock className="h-5 w-5" />}
        iconColor="text-blue-500"
        iconBackground="bg-blue-100"
      />

      <StatsCard
        title={t("problemRate")}
        value={`${(stats.problemRate * 100).toFixed(1)}%`}
        description={t("problemDescription")}
        trend={
          stats.problemRate <= 0.05
            ? "positive"
            : stats.problemRate <= 0.1
              ? "neutral"
              : "negative"
        }
        trendReversed
        icon={<AlertTriangle className="h-5 w-5" />}
        iconColor="text-amber-500"
        iconBackground="bg-amber-100"
      />

      <StatsCard
        title={t("avgDeliveryTime")}
        value={
          stats.avgDeliveryTime
            ? `${stats.avgDeliveryTime} ${t("minutes")}`
            : t("notAvailable")
        }
        description={t("avgTimeDescription")}
        icon={<Clock className="h-5 w-5" />}
        iconColor="text-purple-500"
        iconBackground="bg-purple-100"
      />

      <StatsCard
        title={t("pendingDeliveries")}
        value={stats.pending}
        description={`${((stats.pending / stats.total) * 100).toFixed(1)}% ${t("ofTotal")}`}
        icon={<Clock className="h-5 w-5" />}
        iconColor="text-amber-500"
        iconBackground="bg-amber-100"
      />
    </div>
  );
}

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  trend?: "positive" | "negative" | "neutral";
  trendReversed?: boolean;
  icon?: React.ReactNode;
  iconColor?: string;
  iconBackground?: string;
}

function StatsCard({
  title,
  value,
  description,
  trend,
  trendReversed = false,
  icon,
  iconColor,
  iconBackground}: StatsCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon && (
          <div
            className={cn("p-2 rounded-full", iconBackground || "bg-gray-100")}
          >
            <div className={cn(iconColor || "text-gray-500")}>{icon}</div>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground mt-1 flex items-center">
          {trend && !trendReversed && (
            <>
              {trend === "positive" ? (
                <TrendingUp className="mr-1 h-3 w-3 text-green-500" />
              ) : trend === "negative" ? (
                <TrendingDown className="mr-1 h-3 w-3 text-red-500" />
              ) : null}
            </>
          )}

          {trend && trendReversed && (
            <>
              {trend === "negative" ? (
                <TrendingUp className="mr-1 h-3 w-3 text-green-500" />
              ) : trend === "positive" ? (
                <TrendingDown className="mr-1 h-3 w-3 text-red-500" />
              ) : null}
            </>
          )}

          {description}
        </p>
      </CardContent>
    </Card>
  );
}
