"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslations } from "next-intl";
import {
  Download,
  Calendar,
  Euro,
  FileText,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  BarChart3,
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";

interface ProviderBillingDashboardProps {
  providerId: string;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  period: {
    start: Date;
    end: Date;
  };
  amount: number;
  status: string;
  paidAt?: Date;
  pdfUrl?: string;
  metadata: {
    platformFee: number;
    interventionsCount: number;
    totalHours: number;
  };
  itemsCount: number;
  createdAt: Date;
}

interface BillingStats {
  currentMonth: {
    totalEarnings: number;
    interventions: number;
    totalHours: number;
    avgHourlyRate: number;
  };
  lastMonth: {
    totalEarnings: number;
    interventions: number;
    totalHours: number;
    avgHourlyRate: number;
  };
  yearToDate: {
    totalEarnings: number;
    interventions: number;
    totalHours: number;
    avgHourlyRate: number;
  };
}

export default function ProviderBillingDashboard({
  providerId,
}: ProviderBillingDashboardProps) {
  const t = useTranslations("provider.billing");
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stats, setStats] = useState<BillingStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBillingData();
  }, [providerId]);

  const fetchBillingData = async () => {
    setLoading(true);
    try {
      const [invoicesResponse, statsResponse] = await Promise.all([
        fetch(`/api/provider/billing/invoices`),
        fetch(`/api/provider/billing/stats`),
      ]);

      if (invoicesResponse.ok && statsResponse.ok) {
        const invoicesData = await invoicesResponse.json();
        const statsData = await statsResponse.json();

        setInvoices(invoicesData.invoices || []);
        setStats(statsData.stats);
      }
    } catch (error) {
      console.error("Error fetching billing data:", error);
      toast({
        title: t("error.fetch_failed"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadInvoice = async (
    invoiceId: string,
    invoiceNumber: string,
  ) => {
    try {
      const response = await fetch(
        `/api/provider/billing/invoices/${invoiceId}/download`,
      );
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `facture_${invoiceNumber}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        throw new Error("Échec du téléchargement");
      }
    } catch (error) {
      toast({
        title: t("error.download_failed"),
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

  const formatDate = (dateString: string | Date) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      SENT: { label: "Envoyée", variant: "secondary" as const },
      PAID: { label: "Payée", variant: "default" as const },
      OVERDUE: { label: "En retard", variant: "destructive" as const },
      CANCELLED: { label: "Annulée", variant: "outline" as const },
    };

    const config =
      statusConfig[status as keyof typeof statusConfig] || statusConfig.SENT;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const calculateGrowthRate = (current: number, previous: number) => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  if (loading) {
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
      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">
                    {t("stats.current_month_earnings")}
                  </p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(stats.currentMonth.totalEarnings)}
                  </p>
                  <div className="flex items-center text-sm">
                    <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                    <span className="text-green-600">
                      {calculateGrowthRate(
                        stats.currentMonth.totalEarnings,
                        stats.lastMonth.totalEarnings,
                      ).toFixed(1)}
                      %
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
                    {t("stats.interventions_this_month")}
                  </p>
                  <p className="text-2xl font-bold">
                    {stats.currentMonth.interventions}
                  </p>
                  <div className="flex items-center text-sm">
                    <span className="text-gray-600">
                      vs {stats.lastMonth.interventions} le mois dernier
                    </span>
                  </div>
                </div>
                <BarChart3 className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">
                    {t("stats.hours_worked")}
                  </p>
                  <p className="text-2xl font-bold">
                    {stats.currentMonth.totalHours.toFixed(1)}h
                  </p>
                  <div className="flex items-center text-sm">
                    <span className="text-gray-600">
                      {stats.currentMonth.avgHourlyRate.toFixed(0)}€/h moyen
                    </span>
                  </div>
                </div>
                <Clock className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">
                    {t("stats.year_to_date")}
                  </p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(stats.yearToDate.totalEarnings)}
                  </p>
                  <div className="flex items-center text-sm">
                    <span className="text-gray-600">
                      {stats.yearToDate.interventions} interventions
                    </span>
                  </div>
                </div>
                <TrendingUp className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="invoices" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="invoices">{t("tabs.invoices")}</TabsTrigger>
          <TabsTrigger value="analytics">{t("tabs.analytics")}</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="space-y-4">
          {/* Invoices List */}
          {invoices.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {t("invoices.empty_title")}
                </h3>
                <p className="text-gray-600">
                  {t("invoices.empty_description")}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {invoices.map((invoice) => (
                <Card key={invoice.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <h3 className="font-medium">
                            {invoice.invoiceNumber}
                          </h3>
                          {getStatusBadge(invoice.status)}
                        </div>

                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>
                              {formatDate(invoice.period.start)} -{" "}
                              {formatDate(invoice.period.end)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <BarChart3 className="h-4 w-4" />
                            <span>
                              {invoice.metadata.interventionsCount}{" "}
                              interventions
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>
                              {invoice.metadata.totalHours.toFixed(1)}h
                            </span>
                          </div>
                        </div>

                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span>Sous-total:</span>
                            <span>
                              {formatCurrency(
                                invoice.amount + invoice.metadata.platformFee,
                              )}
                            </span>
                          </div>
                          <div className="flex justify-between text-red-600">
                            <span>Commission EcoDeli (10%):</span>
                            <span>
                              -{formatCurrency(invoice.metadata.platformFee)}
                            </span>
                          </div>
                          <div className="flex justify-between font-medium">
                            <span>Total net:</span>
                            <span>{formatCurrency(invoice.amount)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <p className="text-2xl font-bold">
                          {formatCurrency(invoice.amount)}
                        </p>

                        {invoice.status === "PAID" && invoice.paidAt && (
                          <div className="flex items-center gap-1 text-sm text-green-600">
                            <CheckCircle className="h-4 w-4" />
                            <span>Payé le {formatDate(invoice.paidAt)}</span>
                          </div>
                        )}

                        {invoice.pdfUrl && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleDownloadInvoice(
                                invoice.id,
                                invoice.invoiceNumber,
                              )
                            }
                          >
                            <Download className="h-4 w-4 mr-2" />
                            {t("actions.download")}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          {stats && (
            <>
              {/* Monthly Comparison */}
              <Card>
                <CardHeader>
                  <CardTitle>{t("analytics.monthly_comparison")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <h4 className="font-medium mb-3">
                        {t("analytics.this_month")}
                      </h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">
                            {t("analytics.earnings")}
                          </span>
                          <span className="font-medium">
                            {formatCurrency(stats.currentMonth.totalEarnings)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">
                            {t("analytics.interventions")}
                          </span>
                          <span className="font-medium">
                            {stats.currentMonth.interventions}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">
                            {t("analytics.hours")}
                          </span>
                          <span className="font-medium">
                            {stats.currentMonth.totalHours.toFixed(1)}h
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">
                            {t("analytics.hourly_rate")}
                          </span>
                          <span className="font-medium">
                            {stats.currentMonth.avgHourlyRate.toFixed(0)}€/h
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-3">
                        {t("analytics.last_month")}
                      </h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">
                            {t("analytics.earnings")}
                          </span>
                          <span className="font-medium">
                            {formatCurrency(stats.lastMonth.totalEarnings)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">
                            {t("analytics.interventions")}
                          </span>
                          <span className="font-medium">
                            {stats.lastMonth.interventions}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">
                            {t("analytics.hours")}
                          </span>
                          <span className="font-medium">
                            {stats.lastMonth.totalHours.toFixed(1)}h
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">
                            {t("analytics.hourly_rate")}
                          </span>
                          <span className="font-medium">
                            {stats.lastMonth.avgHourlyRate.toFixed(0)}€/h
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-3">
                        {t("analytics.year_to_date")}
                      </h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">
                            {t("analytics.earnings")}
                          </span>
                          <span className="font-medium">
                            {formatCurrency(stats.yearToDate.totalEarnings)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">
                            {t("analytics.interventions")}
                          </span>
                          <span className="font-medium">
                            {stats.yearToDate.interventions}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">
                            {t("analytics.hours")}
                          </span>
                          <span className="font-medium">
                            {stats.yearToDate.totalHours.toFixed(1)}h
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">
                            {t("analytics.hourly_rate")}
                          </span>
                          <span className="font-medium">
                            {stats.yearToDate.avgHourlyRate.toFixed(0)}€/h
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Performance Indicators */}
              <Card>
                <CardHeader>
                  <CardTitle>{t("analytics.performance_indicators")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium mb-3">
                        {t("analytics.growth_trends")}
                      </h4>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">
                            {t("analytics.earnings_growth")}
                          </span>
                          <div className="flex items-center">
                            <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                            <span className="font-medium text-green-600">
                              {calculateGrowthRate(
                                stats.currentMonth.totalEarnings,
                                stats.lastMonth.totalEarnings,
                              ).toFixed(1)}
                              %
                            </span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">
                            {t("analytics.interventions_growth")}
                          </span>
                          <div className="flex items-center">
                            <TrendingUp className="h-4 w-4 text-blue-600 mr-1" />
                            <span className="font-medium text-blue-600">
                              {calculateGrowthRate(
                                stats.currentMonth.interventions,
                                stats.lastMonth.interventions,
                              ).toFixed(1)}
                              %
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-3">
                        {t("analytics.efficiency_metrics")}
                      </h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">
                            {t("analytics.avg_intervention_value")}
                          </span>
                          <span className="font-medium">
                            {stats.currentMonth.interventions > 0
                              ? formatCurrency(
                                  stats.currentMonth.totalEarnings /
                                    stats.currentMonth.interventions,
                                )
                              : formatCurrency(0)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">
                            {t("analytics.monthly_target")}
                          </span>
                          <div className="flex items-center">
                            <span className="font-medium mr-2">
                              {formatCurrency(2000)}
                            </span>
                            <Badge
                              variant={
                                stats.currentMonth.totalEarnings >= 2000
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {stats.currentMonth.totalEarnings >= 2000
                                ? "Atteint"
                                : "En cours"}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
