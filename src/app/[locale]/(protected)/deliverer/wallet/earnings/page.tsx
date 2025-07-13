"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/layout/page-header";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TrendingUp,
  Calendar,
  Euro,
  Download,
  Filter,
  BarChart3,
  PieChart,
  Clock,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

interface Earning {
  id: string;
  deliveryId: string;
  announcementTitle: string;
  clientName: string;
  amount: number;
  commission: number;
  netAmount: number;
  status: string;
  date: string;
  paidAt?: string;
}

interface EarningsReport {
  totalEarnings: number;
  totalCommission: number;
  netEarnings: number;
  totalDeliveries: number;
  averagePerDelivery: number;
  earningsByStatus: {
    completed: number;
    pending: number;
    processing: number;
  };
  earningsByMonth: Array<{
    month: string;
    earnings: number;
    deliveries: number;
  }>;
}

export default function DelivererEarningsPage() {
  const { user } = useAuth();
  const t = useTranslations("deliverer.wallet");
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [report, setReport] = useState<EarningsReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    // Set default date range to current month
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    setStartDate(firstDay.toISOString().split("T")[0]);
    setEndDate(lastDay.toISOString().split("T")[0]);
  }, []);

  useEffect(() => {
    if (startDate && endDate) {
      fetchEarnings();
      fetchEarningsReport();
    }
  }, [startDate, endDate, filterStatus]);

  const fetchEarnings = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        startDate,
        endDate,
        ...(filterStatus !== "all" && { status: filterStatus }),
      });

      const response = await fetch(`/api/deliverer/wallet/earnings?${params}`);
      if (response.ok) {
        const data = await response.json();
        setEarnings(data.earnings || []);
      }
    } catch (error) {
      console.error("Error fetching earnings:", error);
      toast.error(t("error.fetch_failed"));
    } finally {
      setLoading(false);
    }
  };

  const fetchEarningsReport = async () => {
    try {
      const params = new URLSearchParams({ startDate, endDate });
      const response = await fetch(`/api/deliverer/wallet/earnings?${params}`);
      if (response.ok) {
        const data = await response.json();
        setReport(data.report);
      }
    } catch (error) {
      console.error("Error fetching earnings report:", error);
    }
  };

  const exportEarnings = async () => {
    try {
      const params = new URLSearchParams({
        startDate,
        endDate,
        format: "csv",
      });

      const response = await fetch(
        `/api/deliverer/wallet/earnings/export?${params}`,
      );
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `gains-${startDate}-${endDate}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        toast.success(t("export.success"));
      }
    } catch (error) {
      console.error("Error exporting earnings:", error);
      toast.error(t("export.error"));
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      completed: {
        color: "bg-green-100 text-green-800",
        label: "Terminé",
        icon: CheckCircle,
      },
      pending: {
        color: "bg-yellow-100 text-yellow-800",
        label: "En attente",
        icon: Clock,
      },
      processing: {
        color: "bg-blue-100 text-blue-800",
        label: "En cours",
        icon: AlertCircle,
      },
    };

    const config =
      statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge className={config.color}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            Authentification requise
          </h2>
          <p className="text-gray-600">
            Vous devez être connecté pour accéder à cette page
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t("page.title")} description={t("page.description")}>
        <div></div>
      </PageHeader>

      {/* Date Range Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            {t("filters.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="startDate">{t("filters.start_date")}</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="endDate">{t("filters.end_date")}</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="status">{t("filters.status")}</Label>
              <select
                id="status"
                className="w-full p-2 border rounded-md"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">{t("filters.all_statuses")}</option>
                <option value="completed">{t("filters.completed")}</option>
                <option value="pending">{t("filters.pending")}</option>
                <option value="processing">{t("filters.processing")}</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button onClick={exportEarnings} className="w-full">
                <Download className="w-4 h-4 mr-2" />
                {t("filters.export")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Earnings Summary */}
      {report && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t("stats.total_earnings")}
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {report.totalEarnings.toFixed(2)}€
              </div>
              <p className="text-xs text-muted-foreground">
                {report.totalDeliveries} {t("analytics.deliveries")}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t("stats.net_earnings")}
              </CardTitle>
              <Euro className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {report.netEarnings.toFixed(2)}€
              </div>
              <p className="text-xs text-muted-foreground">
                {t("stats.after_commission")}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t("stats.average_per_delivery")}
              </CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {report.averagePerDelivery.toFixed(2)}€
              </div>
              <p className="text-xs text-muted-foreground">
                {t("stats.per_delivery")}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t("stats.commission")}
              </CardTitle>
              <PieChart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {report.totalCommission.toFixed(2)}€
              </div>
              <p className="text-xs text-muted-foreground">
                {t("stats.platform_fees")}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="list" className="space-y-4">
        <TabsList>
          <TabsTrigger value="list">{t("tabs.list")}</TabsTrigger>
          <TabsTrigger value="analytics">{t("tabs.analytics")}</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("earnings.title")}</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-16 bg-gray-200 rounded"></div>
                    </div>
                  ))}
                </div>
              ) : earnings.length > 0 ? (
                <div className="space-y-4">
                  {earnings.map((earning) => (
                    <div
                      key={earning.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-medium">
                            {earning.announcementTitle}
                          </h3>
                          {getStatusBadge(earning.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {t("earnings.client")}: {earning.clientName} •{" "}
                          {new Date(earning.date).toLocaleDateString("fr-FR")}
                        </p>
                        {earning.paidAt && (
                          <p className="text-xs text-green-600">
                            {t("earnings.paid_on")}{" "}
                            {new Date(earning.paidAt).toLocaleDateString(
                              "fr-FR",
                            )}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-green-600">
                          +{earning.netAmount.toFixed(2)}€
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {t("earnings.commission")}:{" "}
                          {earning.commission.toFixed(2)}€
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>{t("earnings.no_earnings")}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("analytics.title")}</CardTitle>
            </CardHeader>
            <CardContent>
              {report ? (
                <div className="space-y-6">
                  {/* Earnings by Status */}
                  <div>
                    <h3 className="font-medium mb-3">
                      {t("analytics.status_breakdown")}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 border rounded-lg">
                        <div className="text-2xl font-bold text-green-600">
                          {report.earningsByStatus.completed.toFixed(2)}€
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {t("analytics.completed")}
                        </p>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <div className="text-2xl font-bold text-yellow-600">
                          {report.earningsByStatus.pending.toFixed(2)}€
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {t("analytics.pending")}
                        </p>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">
                          {report.earningsByStatus.processing.toFixed(2)}€
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {t("analytics.processing")}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Monthly Breakdown */}
                  <div>
                    <h3 className="font-medium mb-3">
                      {t("analytics.monthly_evolution")}
                    </h3>
                    <div className="space-y-2">
                      {report.earningsByMonth.map((month) => (
                        <div
                          key={month.month}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div>
                            <p className="font-medium">{month.month}</p>
                            <p className="text-sm text-muted-foreground">
                              {month.deliveries} {t("analytics.deliveries")}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">
                              {month.earnings.toFixed(2)}€
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>{t("analytics.no_data")}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
