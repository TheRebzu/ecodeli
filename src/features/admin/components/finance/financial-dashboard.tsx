"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import {
  TrendingUp,
  TrendingDown,
  Euro,
  Users,
  Package,
  Calendar,
  Download,
  BarChart3,
  PieChart,
  Activity,
  DollarSign,
  CreditCard,
  Wallet,
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";

interface FinancialStats {
  revenue: {
    total: number;
    monthly: number;
    growth: number;
    commission: number;
  };
  transactions: {
    total: number;
    monthly: number;
    completed: number;
    pending: number;
    failed: number;
  };
  users: {
    total: number;
    activeProviders: number;
    activeClients: number;
    newThisMonth: number;
  };
  commissions: {
    total: number;
    monthly: number;
    averageRate: number;
    topProviders: Array<{
      id: string;
      name: string;
      commission: number;
      revenue: number;
    }>;
  };
}

interface MonthlyData {
  month: string;
  revenue: number;
  commission: number;
  transactions: number;
  users: number;
}

export default function FinancialDashboard() {
  const t = useTranslations("admin.finance");
  const [stats, setStats] = useState<FinancialStats | null>(null);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState("last12months");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFinancialData();
  }, [selectedPeriod]);

  const fetchFinancialData = async () => {
    setLoading(true);
    try {
      const [statsResponse, trendsResponse] = await Promise.all([
        fetch(`/api/admin/finance/stats?period=${selectedPeriod}`),
        fetch(`/api/admin/finance/trends?period=${selectedPeriod}`),
      ]);

      if (statsResponse.ok && trendsResponse.ok) {
        const statsData = await statsResponse.json();
        const trendsData = await trendsResponse.json();

        setStats(statsData.stats);
        setMonthlyData(trendsData.monthlyData || []);
      }
    } catch (error) {
      console.error("Error fetching financial data:", error);
      toast({
        title: t("error.fetch_failed"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportData = async (
    type: "revenue" | "commissions" | "transactions",
  ) => {
    try {
      const response = await fetch(
        `/api/admin/finance/export?type=${type}&period=${selectedPeriod}`,
      );
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `financial_${type}_${selectedPeriod}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        toast({
          title: t("success.export_complete"),
        });
      }
    } catch (error) {
      toast({
        title: t("error.export_failed"),
        variant: "destructive",
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
  };

  if (loading || !stats) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">{t("dashboard.title")}</h2>
          <p className="text-gray-600">{t("dashboard.description")}</p>
        </div>
        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="last30days">
              {t("periods.last30days")}
            </SelectItem>
            <SelectItem value="last3months">
              {t("periods.last3months")}
            </SelectItem>
            <SelectItem value="last6months">
              {t("periods.last6months")}
            </SelectItem>
            <SelectItem value="last12months">
              {t("periods.last12months")}
            </SelectItem>
            <SelectItem value="currentyear">
              {t("periods.currentyear")}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">
                  {t("metrics.total_revenue")}
                </p>
                <p className="text-2xl font-bold">
                  {formatCurrency(stats.revenue.total)}
                </p>
                <div className="flex items-center text-sm">
                  {stats.revenue.growth >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600 mr-1" />
                  )}
                  <span
                    className={
                      stats.revenue.growth >= 0
                        ? "text-green-600"
                        : "text-red-600"
                    }
                  >
                    {formatPercentage(stats.revenue.growth)}
                  </span>
                </div>
              </div>
              <Euro className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">
                  {t("metrics.commission_earned")}
                </p>
                <p className="text-2xl font-bold">
                  {formatCurrency(stats.commissions.total)}
                </p>
                <p className="text-sm text-gray-600">
                  {stats.commissions.averageRate.toFixed(1)}%{" "}
                  {t("metrics.avg_rate")}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">
                  {t("metrics.total_transactions")}
                </p>
                <p className="text-2xl font-bold">
                  {stats.transactions.total.toLocaleString()}
                </p>
                <p className="text-sm text-gray-600">
                  {stats.transactions.completed} {t("metrics.completed")}
                </p>
              </div>
              <CreditCard className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">
                  {t("metrics.active_users")}
                </p>
                <p className="text-2xl font-bold">
                  {stats.users.total.toLocaleString()}
                </p>
                <p className="text-sm text-gray-600">
                  +{stats.users.newThisMonth} {t("metrics.this_month")}
                </p>
              </div>
              <Users className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">{t("tabs.overview")}</TabsTrigger>
          <TabsTrigger value="revenue">{t("tabs.revenue")}</TabsTrigger>
          <TabsTrigger value="commissions">{t("tabs.commissions")}</TabsTrigger>
          <TabsTrigger value="exports">{t("tabs.exports")}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Monthly Trends */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  {t("charts.monthly_trends")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {monthlyData.slice(-6).map((data, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between"
                    >
                      <span className="text-sm font-medium">{data.month}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-sm">
                          {formatCurrency(data.revenue)}
                        </span>
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{
                              width: `${Math.min((data.revenue / Math.max(...monthlyData.map((d) => d.revenue))) * 100, 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Transaction Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  {t("charts.transaction_status")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm">{t("status.completed")}</span>
                    </div>
                    <span className="font-medium">
                      {stats.transactions.completed}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <span className="text-sm">{t("status.pending")}</span>
                    </div>
                    <span className="font-medium">
                      {stats.transactions.pending}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span className="text-sm">{t("status.failed")}</span>
                    </div>
                    <span className="font-medium">
                      {stats.transactions.failed}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("revenue.breakdown")}</CardTitle>
              <CardDescription>{t("revenue.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(stats.revenue.total)}
                  </p>
                  <p className="text-sm text-gray-600">{t("revenue.total")}</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">
                    {formatCurrency(stats.revenue.monthly)}
                  </p>
                  <p className="text-sm text-gray-600">
                    {t("revenue.monthly")}
                  </p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-2xl font-bold text-purple-600">
                    {formatCurrency(stats.revenue.commission)}
                  </p>
                  <p className="text-sm text-gray-600">
                    {t("revenue.commission")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="commissions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("commissions.top_providers")}</CardTitle>
              <CardDescription>{t("commissions.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.commissions.topProviders.map((provider, index) => (
                  <div
                    key={provider.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-blue-600">
                          #{index + 1}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{provider.name}</p>
                        <p className="text-sm text-gray-600">
                          {formatCurrency(provider.revenue)}{" "}
                          {t("commissions.revenue")}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {formatCurrency(provider.commission)}
                      </p>
                      <p className="text-sm text-gray-600">
                        {t("commissions.commission")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="exports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("exports.title")}</CardTitle>
              <CardDescription>{t("exports.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button
                  onClick={() => exportData("revenue")}
                  variant="outline"
                  className="h-24 flex flex-col gap-2"
                >
                  <Download className="h-6 w-6" />
                  <span>{t("exports.revenue")}</span>
                </Button>
                <Button
                  onClick={() => exportData("commissions")}
                  variant="outline"
                  className="h-24 flex flex-col gap-2"
                >
                  <Download className="h-6 w-6" />
                  <span>{t("exports.commissions")}</span>
                </Button>
                <Button
                  onClick={() => exportData("transactions")}
                  variant="outline"
                  className="h-24 flex flex-col gap-2"
                >
                  <Download className="h-6 w-6" />
                  <span>{t("exports.transactions")}</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
