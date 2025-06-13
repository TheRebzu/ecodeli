"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AreaChart, BarChart, PieChart } from "@/components/ui/charts";
import {
  DollarSign,
  CreditCard,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Info,
} from "lucide-react";
import { formatCurrency, generateChartColors } from "@/utils/document-utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TransactionData {
  period: string;
  revenue: number;
  commissions: number;
  transactions: number;
  fees?: number;
}

interface CategoryData {
  name: string;
  value: number;
  percentage: number;
  color?: string;
}

interface TransactionStatsCardProps {
  title: string;
  description?: string;
  data: TransactionData[];
  categoryBreakdown?: CategoryData[];
  type?: "revenue" | "commissions" | "transactions" | "combined";
  showComparison?: boolean;
  comparisonPeriod?: string;
  totalRevenue?: number;
  totalCommissions?: number;
  totalTransactions?: number;
  revenueGrowth?: number;
  commissionRate?: number;
  averageTransactionValue?: number;
  className?: string;
}

export function TransactionStatsCard({
  title,
  description,
  data,
  categoryBreakdown,
  type = "combined",
  showComparison = true,
  comparisonPeriod = "mois précédent",
  totalRevenue,
  totalCommissions,
  totalTransactions,
  revenueGrowth,
  commissionRate,
  averageTransactionValue,
  className = "",
}: TransactionStatsCardProps) {
  // Calculs automatiques si les valeurs ne sont pas fournies
  const calculatedTotalRevenue =
    totalRevenue ?? data.reduce((sum, item) => sum + item.revenue, 0);
  const calculatedTotalCommissions =
    totalCommissions ?? data.reduce((sum, item) => sum + item.commissions, 0);
  const calculatedTotalTransactions =
    totalTransactions ?? data.reduce((sum, item) => sum + item.transactions, 0);

  const calculatedRevenueGrowth =
    revenueGrowth ??
    (() => {
      if (data.length < 2) return 0;
      const currentPeriodRevenue = data
        .slice(-Math.ceil(data.length / 2))
        .reduce((sum, item) => sum + item.revenue, 0);
      const previousPeriodRevenue = data
        .slice(0, Math.floor(data.length / 2))
        .reduce((sum, item) => sum + item.revenue, 0);
      if (previousPeriodRevenue === 0) return 0;
      return (
        ((currentPeriodRevenue - previousPeriodRevenue) /
          previousPeriodRevenue) *
        100
      );
    })();

  const calculatedCommissionRate =
    commissionRate ??
    (calculatedTotalRevenue > 0
      ? (calculatedTotalCommissions / calculatedTotalRevenue) * 100
      : 0);

  const calculatedAverageTransactionValue =
    averageTransactionValue ??
    (calculatedTotalTransactions > 0
      ? calculatedTotalRevenue / calculatedTotalTransactions
      : 0);

  // Préparation des données pour les graphiques
  const chartData = data.map((item) => ({
    period: item.period,
    revenue: item.revenue,
    commissions: item.commissions,
    transactions: item.transactions,
    netRevenue: item.revenue - item.commissions,
    fees: item.fees || 0,
  }));

  const getChartCategories = () => {
    switch (type) {
      case "revenue":
        return ["revenue", "netRevenue"];
      case "commissions":
        return ["commissions"];
      case "transactions":
        return ["transactions"];
      default:
        return ["revenue", "commissions", "netRevenue"];
    }
  };

  const getChartColors = () => {
    switch (type) {
      case "revenue":
        return ["#22c55e", "#16a34a"];
      case "commissions":
        return ["#f59e0b"];
      case "transactions":
        return ["#3b82f6"];
      default:
        return ["#22c55e", "#f59e0b", "#16a34a"];
    }
  };

  const renderMainChart = () => (
    <div className="h-[200px]">
      <AreaChart
        data={chartData}
        categories={getChartCategories()}
        index="period"
        colors={getChartColors()}
        valueFormatter={(value) =>
          type === "transactions"
            ? value.toLocaleString()
            : formatCurrency(value)
        }
        showLegend={type === "combined"}
        showGridLines={false}
        startEndOnly={true}
      />
    </div>
  );

  const renderCategoryBreakdown = () => {
    if (!categoryBreakdown || categoryBreakdown.length === 0) return null;

    const colors =
      categoryBreakdown.map((cat) => cat.color) ||
      generateChartColors(categoryBreakdown.length);

    return (
      <div className="space-y-3">
        <div className="h-[150px]">
          <PieChart
            data={categoryBreakdown}
            category="value"
            index="name"
            valueFormatter={(value) => formatCurrency(value)}
            colors={colors}
          />
        </div>
        <div className="space-y-2">
          {categoryBreakdown.slice(0, 4).map((category, index) => (
            <div
              key={category.name}
              className="flex justify-between items-center text-sm"
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: colors[index] }}
                />
                <span className="truncate max-w-[100px]">{category.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">
                  {formatCurrency(category.value)}
                </span>
                <Badge variant="outline" className="text-xs">
                  {category.percentage.toFixed(1)}%
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">{title}</CardTitle>
          </div>
          {showComparison && (
            <Badge
              variant={calculatedRevenueGrowth >= 0 ? "default" : "destructive"}
            >
              {calculatedRevenueGrowth >= 0 ? (
                <TrendingUp className="h-3 w-3 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-1" />
              )}
              {calculatedRevenueGrowth >= 0 ? "+" : ""}
              {calculatedRevenueGrowth.toFixed(1)}%
            </Badge>
          )}
        </div>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Métriques principales */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Revenus totaux</p>
              <p className="text-2xl font-bold">
                {formatCurrency(calculatedTotalRevenue)}
              </p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                {calculatedRevenueGrowth >= 0 ? (
                  <ArrowUpRight className="h-3 w-3 text-green-500" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 text-red-500" />
                )}
                vs {comparisonPeriod}
              </p>
            </div>
            <div>
              <div className="flex items-center gap-1">
                <p className="text-sm text-muted-foreground">Commissions</p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-3 w-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        Taux de commission:{" "}
                        {calculatedCommissionRate.toFixed(1)}%
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-xl font-semibold">
                {formatCurrency(calculatedTotalCommissions)}
              </p>
              <p className="text-xs text-muted-foreground">
                {calculatedCommissionRate.toFixed(1)}% du CA
              </p>
            </div>
          </div>

          {/* Graphique principal */}
          {renderMainChart()}

          {/* Métriques secondaires */}
          <div className="grid grid-cols-2 gap-4 pt-2 border-t">
            <div>
              <p className="text-sm text-muted-foreground">Transactions</p>
              <p className="text-lg font-semibold">
                {calculatedTotalTransactions.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Valeur moyenne</p>
              <p className="text-lg font-semibold">
                {formatCurrency(calculatedAverageTransactionValue)}
              </p>
            </div>
          </div>

          {/* Indicateur de performance */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span>Performance vs objectif</span>
              <span className="font-medium">
                {calculatedRevenueGrowth > 10
                  ? "Excellent"
                  : calculatedRevenueGrowth > 0
                    ? "Bon"
                    : "À améliorer"}
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full ${
                  calculatedRevenueGrowth > 10
                    ? "bg-green-500"
                    : calculatedRevenueGrowth > 0
                      ? "bg-yellow-500"
                      : "bg-red-500"
                }`}
                style={{
                  width: `${Math.min(100, Math.max(0, calculatedRevenueGrowth + 50))}%`,
                }}
              />
            </div>
          </div>
        </div>
      </CardContent>

      {/* Section de répartition par catégorie */}
      {categoryBreakdown && categoryBreakdown.length > 0 && (
        <CardContent className="pt-0">
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Répartition par catégorie
            </h4>
            {renderCategoryBreakdown()}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
