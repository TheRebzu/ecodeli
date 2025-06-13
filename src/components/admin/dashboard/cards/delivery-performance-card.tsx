"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AreaChart, BarChart, PieChart } from "@/components/ui/charts";
import {
  Truck,
  Clock,
  CheckCircle,
  AlertTriangle,
  MapPin,
  TrendingUp,
  Activity,
  Timer,
} from "lucide-react";
import { generateChartColors } from "@/utils/document-utils";

interface DeliveryData {
  period: string;
  total: number;
  onTime: number;
  delayed: number;
  failed: number;
  averageTime: number;
}

interface ZonePerformance {
  zone: string;
  averageTime: number;
  onTimeRate: number;
  deliveryCount: number;
  color?: string;
}

interface IssueBreakdown {
  issueType: string;
  count: number;
  percentage: number;
  color?: string;
}

interface DeliveryPerformanceCardProps {
  title: string;
  description?: string;
  data: DeliveryData[];
  zonePerformance?: ZonePerformance[];
  issueBreakdown?: IssueBreakdown[];
  totalDeliveries?: number;
  onTimePercentage?: number;
  averageDeliveryTime?: number;
  performanceGrowth?: number;
  className?: string;
}

export function DeliveryPerformanceCard({
  title,
  description,
  data,
  zonePerformance,
  issueBreakdown,
  totalDeliveries,
  onTimePercentage,
  averageDeliveryTime,
  performanceGrowth,
  className = "",
}: DeliveryPerformanceCardProps) {
  // Calculs automatiques
  const calculatedTotalDeliveries =
    totalDeliveries ?? data.reduce((sum, item) => sum + item.total, 0);
  const calculatedOnTimeDeliveries = data.reduce(
    (sum, item) => sum + item.onTime,
    0,
  );
  const calculatedOnTimePercentage =
    onTimePercentage ??
    (calculatedTotalDeliveries > 0
      ? (calculatedOnTimeDeliveries / calculatedTotalDeliveries) * 100
      : 0);

  const calculatedAverageTime =
    averageDeliveryTime ??
    (data.length > 0
      ? data.reduce((sum, item) => sum + item.averageTime, 0) / data.length
      : 0);

  const calculatedPerformanceGrowth =
    performanceGrowth ??
    (() => {
      if (data.length < 2) return 0;
      const currentWeek = data.slice(-7);
      const previousWeek = data.slice(-14, -7);

      const currentOnTimeRate =
        (currentWeek.reduce((sum, item) => sum + item.onTime, 0) /
          currentWeek.reduce((sum, item) => sum + item.total, 0)) *
        100;
      const previousOnTimeRate =
        (previousWeek.reduce((sum, item) => sum + item.onTime, 0) /
          previousWeek.reduce((sum, item) => sum + item.total, 0)) *
        100;

      return currentOnTimeRate - previousOnTimeRate;
    })();

  // Données pour les graphiques
  const performanceChartData = data.map((item) => ({
    period: item.period,
    onTimeRate: item.total > 0 ? (item.onTime / item.total) * 100 : 0,
    averageTime: item.averageTime,
    total: item.total,
  }));

  const statusData =
    data.length > 0
      ? [
          {
            status: "À temps",
            count: calculatedOnTimeDeliveries,
            color: "#22c55e",
          },
          {
            status: "En retard",
            count: data.reduce((sum, item) => sum + item.delayed, 0),
            color: "#f59e0b",
          },
          {
            status: "Échec",
            count: data.reduce((sum, item) => sum + item.failed, 0),
            color: "#ef4444",
          },
        ]
      : [];

  const getPerformanceLevel = (percentage: number) => {
    if (percentage >= 95)
      return { label: "Excellent", color: "text-green-600" };
    if (percentage >= 85) return { label: "Bon", color: "text-blue-600" };
    if (percentage >= 70) return { label: "Moyen", color: "text-yellow-600" };
    return { label: "À améliorer", color: "text-red-600" };
  };

  const performanceLevel = getPerformanceLevel(calculatedOnTimePercentage);

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">{title}</CardTitle>
          </div>
          <Badge
            variant={
              calculatedPerformanceGrowth >= 0 ? "default" : "destructive"
            }
          >
            <TrendingUp className="h-3 w-3 mr-1" />
            {calculatedPerformanceGrowth >= 0 ? "+" : ""}
            {calculatedPerformanceGrowth.toFixed(1)}%
          </Badge>
        </div>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Métriques principales */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <p className="text-sm text-muted-foreground">
                  Taux de ponctualité
                </p>
              </div>
              <p className="text-2xl font-bold">
                {calculatedOnTimePercentage.toFixed(1)}%
              </p>
              <p className={`text-xs ${performanceLevel.color}`}>
                {performanceLevel.label}
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Timer className="h-4 w-4 text-blue-500" />
                <p className="text-sm text-muted-foreground">Temps moyen</p>
              </div>
              <p className="text-xl font-semibold">
                {Math.round(calculatedAverageTime)} min
              </p>
              <p className="text-xs text-muted-foreground">
                {calculatedTotalDeliveries.toLocaleString()} livraisons
              </p>
            </div>
          </div>

          {/* Graphique de performance */}
          <div className="h-[180px]">
            <AreaChart
              data={performanceChartData}
              categories={["onTimeRate"]}
              index="period"
              colors={["#22c55e"]}
              valueFormatter={(value) => `${value.toFixed(1)}%`}
              showLegend={false}
              showGridLines={false}
              startEndOnly={true}
            />
          </div>

          {/* Répartition des statuts */}
          {statusData.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Répartition des livraisons
              </h4>
              <div className="grid grid-cols-3 gap-3">
                {statusData.map((status, index) => (
                  <div key={status.status} className="text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: status.color }}
                      />
                      <p className="text-xs text-muted-foreground">
                        {status.status}
                      </p>
                    </div>
                    <p className="text-lg font-semibold">{status.count}</p>
                    <p className="text-xs text-muted-foreground">
                      {calculatedTotalDeliveries > 0
                        ? (
                            (status.count / calculatedTotalDeliveries) *
                            100
                          ).toFixed(1)
                        : 0}
                      %
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Performance par zone */}
          {zonePerformance && zonePerformance.length > 0 && (
            <div className="space-y-3 border-t pt-3">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Performance par zone
              </h4>
              <div className="space-y-2">
                {zonePerformance.slice(0, 4).map((zone, index) => (
                  <div key={zone.zone} className="space-y-1">
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-medium">{zone.zone}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {Math.round(zone.averageTime)} min
                        </span>
                        <Badge
                          variant={
                            zone.onTimeRate >= 90
                              ? "default"
                              : zone.onTimeRate >= 70
                                ? "secondary"
                                : "destructive"
                          }
                          className="text-xs"
                        >
                          {zone.onTimeRate.toFixed(1)}%
                        </Badge>
                      </div>
                    </div>
                    <Progress value={zone.onTimeRate} className="h-1.5" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Problèmes principaux */}
          {issueBreakdown && issueBreakdown.length > 0 && (
            <div className="space-y-3 border-t pt-3">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Problèmes principaux
              </h4>
              <div className="space-y-2">
                {issueBreakdown.slice(0, 3).map((issue, index) => (
                  <div
                    key={issue.issueType}
                    className="flex justify-between items-center text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{
                          backgroundColor:
                            issue.color ||
                            generateChartColors(issueBreakdown.length)[index],
                        }}
                      />
                      <span>{issue.issueType}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {issue.count} cas
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {issue.percentage.toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Indicateur de tendance */}
          <div className="flex justify-between items-center pt-2 border-t">
            <span className="text-sm text-muted-foreground">
              Tendance performance
            </span>
            <div className="flex items-center gap-2">
              <div className="flex items-end gap-px h-6">
                {performanceChartData.slice(-7).map((item, index) => {
                  const maxRate = Math.max(
                    ...performanceChartData.slice(-7).map((d) => d.onTimeRate),
                  );
                  const height =
                    maxRate > 0 ? (item.onTimeRate / maxRate) * 100 : 0;
                  return (
                    <div
                      key={index}
                      className={`w-1 rounded-sm ${
                        calculatedPerformanceGrowth >= 0
                          ? "bg-green-400"
                          : "bg-red-400"
                      }`}
                      style={{ height: `${Math.max(height, 4)}%` }}
                    />
                  );
                })}
              </div>
              <span
                className={`text-sm font-medium ${
                  calculatedPerformanceGrowth >= 0
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {calculatedPerformanceGrowth >= 0 ? "+" : ""}
                {calculatedPerformanceGrowth.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
