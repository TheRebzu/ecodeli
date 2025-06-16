"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AreaChart, BarChart, LineChart } from "@/components/ui/charts";
import { Activity, TrendingUp, TrendingDown } from "lucide-react";
import { formatCurrency } from "@/utils/document-utils";

interface ActivityData {
  period: string;
  value: number;
  comparison?: number;
}

interface ActivityChartCardProps {
  title: string;
  description?: string;
  data: ActivityData[];
  comparisonData?: ActivityData[];
  type?: "line" | "area" | "bar";
  categories: string[];
  colors?: string[];
  valueFormatter?: (value: number) => string;
  showComparison?: boolean;
  showTrend?: boolean;
  totalValue?: number;
  percentChange?: number;
  className?: string;
}

export function ActivityChartCard({
  title,
  description,
  data,
  comparisonData,
  type = "line",
  categories,
  colors = ["#3b82f6", "#22c55e"],
  valueFormatter = (value) => value.toString(),
  showComparison = false,
  showTrend = true,
  totalValue,
  percentChange,
  className = ""}: ActivityChartCardProps) {
  // Calcul automatique du pourcentage de changement si pas fourni
  const calculatedPercentChange =
    percentChange ??
    (() => {
      if (!data || data.length < 2) return 0;
      const currentValue = data[data.length - 1]?.value || 0;
      const previousValue = data[data.length - 2]?.value || 0;
      if (previousValue === 0) return 0;
      return ((currentValue - previousValue) / previousValue) * 100;
    })();

  // Calcul automatique de la valeur totale si pas fournie
  const calculatedTotalValue =
    totalValue ?? data.reduce((sum, item) => sum + item.value, 0);

  const renderChart = () => {
    const chartProps = {
      data,
      categories,
      index: "period",
      colors,
      valueFormatter,
      showLegend: showComparison,
      showGridLines: false,
      startEndOnly: true};

    switch (type) {
      case "area":
        return (
          <AreaChart
            {...chartProps}
            comparisonData={showComparison ? comparisonData : undefined}
          />
        );
      case "bar":
        return (
          <BarChart
            {...chartProps}
            comparisonData={showComparison ? comparisonData : undefined}
          />
        );
      default:
        return (
          <LineChart
            {...chartProps}
            comparisonData={showComparison ? comparisonData : undefined}
          />
        );
    }
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">{title}</CardTitle>
          </div>
          {showTrend && (
            <Badge
              variant={calculatedPercentChange >= 0 ? "default" : "destructive"}
            >
              {calculatedPercentChange >= 0 ? (
                <TrendingUp className="h-3 w-3 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-1" />
              )}
              {calculatedPercentChange >= 0 ? "+" : ""}
              {calculatedPercentChange.toFixed(1)}%
            </Badge>
          )}
        </div>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Valeur totale */}
          {totalValue !== undefined && (
            <div>
              <p className="text-2xl font-bold">
                {valueFormatter(calculatedTotalValue)}
              </p>
              <p className="text-xs text-muted-foreground">
                {showComparison
                  ? "Période actuelle vs précédente"
                  : "Total sur la période"}
              </p>
            </div>
          )}

          {/* Graphique */}
          <div className="h-[200px]">{renderChart()}</div>

          {/* Informations supplémentaires */}
          {data && data.length > 0 && (
            <div className="flex justify-between items-center text-sm text-muted-foreground border-t pt-2">
              <span>Début: {valueFormatter(data[0]?.value || 0)}</span>
              <span>
                Fin: {valueFormatter(data[data.length - 1]?.value || 0)}
              </span>
            </div>
          )}

          {/* Mini tendance */}
          {showTrend && data && data.length >= 5 && (
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">Tendance:</span>
              <div className="flex items-end gap-px h-6 flex-1 max-w-[100px]">
                {data.slice(-5).map((item, index) => {
                  const maxValue = Math.max(
                    ...data.slice(-5).map((d) => d.value),
                  );
                  const height =
                    maxValue > 0 ? (item.value / maxValue) * 100 : 0;
                  return (
                    <div
                      key={index}
                      className={`flex-1 rounded-sm ${
                        calculatedPercentChange >= 0
                          ? "bg-green-400"
                          : "bg-red-400"
                      }`}
                      style={{ height: `${Math.max(height, 4)}%` }}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
