"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, TrendingDown, TrendingUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";

type DataPoint = {
  month: string;
  amount: number;
};

// Composant pour représenter le graphique
function SparkLine({
  data,
  height = 60,
  width = "100%",
  className = "",
}: {
  data: DataPoint[];
  height?: number;
  width?: string | number;
  className?: string;
}) {
  if (!data || data.length === 0) return null;

  const values = data.map((item) => item.amount);
  const max = Math.max(...values, 0);
  const min = Math.min(...values, 0);
  const range = max - min === 0 ? 1 : max - min;

  const points = data.map((item, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = 100 - ((item.amount - min) / range) * 100;
    return `${x},${y}`;
  });

  const polylinePoints = points.join(" ");

  return (
    <div className={`w-full ${className}`} style={{ height: `${height}px` }}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 100 100`}
        preserveAspectRatio="none"
      >
        <polyline
          points={polylinePoints}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-primary"
        />
        {/* Points sur la ligne */}
        {points.map((point, index) => {
          const [x, y] = point.split(",");
          return (
            <circle
              key={index}
              cx={x}
              cy={y}
              r="1.5"
              className={
                index === data.length - 1 ? "fill-primary" : "fill-primary/50"
              }
            />
          );
        })}
      </svg>
    </div>
  );
}

type FinancialSummaryProps = {
  financials?: {
    currentMonthExpenses: number;
    previousMonthExpenses: number;
    expenseEvolution: DataPoint[];
    estimatedSavings: number;
  };
  isLoading?: boolean;
};

export function FinancialSummary({
  financials,
  isLoading = false,
}: FinancialSummaryProps) {
  const t = useTranslations("dashboard.client");

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            <Skeleton className="h-6 w-40" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Skeleton className="h-4 w-40 mb-2" />
              <Skeleton className="h-10 w-32" />
            </div>
            <div>
              <Skeleton className="h-4 w-40 mb-2" />
              <Skeleton className="h-10 w-32" />
            </div>
          </div>
          <Skeleton className="h-60 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Calcul de la tendance (en pourcentage)
  const previousExpenses = financials?.previousMonthExpenses || 0;
  const currentExpenses = financials?.currentMonthExpenses || 0;

  let trend = 0;
  if (previousExpenses > 0) {
    trend = ((currentExpenses - previousExpenses) / previousExpenses) * 100;
  }

  // Arrondi à deux décimales
  const roundedTrend = Math.round(trend * 100) / 100;
  const isPositive = roundedTrend >= 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          {t("financialSummary")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              {t("currentMonthExpenses")}
            </p>
            <h3 className="text-3xl font-bold tracking-tight">
              {currentExpenses.toFixed(2)}€
            </h3>
            <div className="flex items-center mt-1">
              {isPositive ? (
                <TrendingUp className="h-4 w-4 text-red-500 mr-1" />
              ) : (
                <TrendingDown className="h-4 w-4 text-green-500 mr-1" />
              )}
              <span
                className={`text-xs ${isPositive ? "text-red-500" : "text-green-500"}`}
              >
                {isPositive ? "+" : ""}
                {roundedTrend}% {t("comparedToPrevious")}
              </span>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              {t("estimatedSavings")}
            </p>
            <h3 className="text-3xl font-bold tracking-tight text-green-600">
              {(financials?.estimatedSavings || 0).toFixed(2)}€
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              {t("withEcoDeli")}
            </p>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium mb-2">{t("expenseEvolution")}</h4>
          <SparkLine data={financials?.expenseEvolution || []} height={80} />
          <div className="flex justify-between mt-1 text-xs text-muted-foreground">
            {financials?.expenseEvolution?.map((item, index) => (
              <span key={index}>{item.month.split("-")[1]}</span>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
