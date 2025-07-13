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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslations } from "next-intl";
import {
  Euro,
  Download,
  Calendar,
  TrendingUp,
  FileText,
  AlertCircle,
  CheckCircle,
  Clock,
  BarChart3,
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";

interface BillingManagementProps {
  merchantId: string;
}

interface BillingCycle {
  id: string;
  periodStart: string;
  periodEnd: string;
  status: string;
  totalOrders: number;
  totalRevenue: number;
  commissionAmount: number;
  monthlyFee: number;
  additionalFees: number;
  totalAmount: number;
  invoiceNumber?: string;
  invoicePath?: string;
  dueDate?: string;
  paidAt?: string;
  paymentMethod?: string;
  createdAt: string;
  contract?: {
    id: string;
    title: string;
    commissionRate: number;
  };
  ordersCount: number;
}

interface BillingStats {
  totalBillings: number;
  totalRevenue: number;
  totalCommissions: number;
  totalAmountDue: number;
}

interface CurrentMonthBilling {
  id: string;
  totalOrders: number;
  totalRevenue: number;
  commissionAmount: number;
  status: string;
}

export default function BillingManagement({
  merchantId,
}: BillingManagementProps) {
  const t = useTranslations("merchant.billing");
  const [billingCycles, setBillingCycles] = useState<BillingCycle[]>([]);
  const [stats, setStats] = useState<BillingStats | null>(null);
  const [currentMonth, setCurrentMonth] = useState<CurrentMonthBilling | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [yearFilter, setYearFilter] = useState<string>(
    new Date().getFullYear().toString(),
  );

  useEffect(() => {
    fetchBillingData();
  }, [merchantId, statusFilter, yearFilter]);

  const fetchBillingData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append("status", statusFilter);
      params.append("year", yearFilter);

      const response = await fetch(
        `/api/merchant/billing?${params.toString()}`,
      );
      if (response.ok) {
        const data = await response.json();
        setBillingCycles(data.billingCycles || []);
        setStats(data.stats);
        setCurrentMonth(data.currentMonth);
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

  const downloadInvoice = async (billingId: string, invoiceNumber?: string) => {
    try {
      const response = await fetch(
        `/api/merchant/billing/${billingId}/download`,
      );
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.style.display = "none";
        a.href = url;
        a.download = `invoice_${invoiceNumber || billingId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      toast({
        title: t("error.download_failed"),
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      PENDING: {
        color: "bg-yellow-100 text-yellow-800",
        label: t("status.pending"),
      },
      SENT: { color: "bg-blue-100 text-blue-800", label: t("status.sent") },
      PAID: { color: "bg-green-100 text-green-800", label: t("status.paid") },
      OVERDUE: { color: "bg-red-100 text-red-800", label: t("status.overdue") },
    };

    const config =
      statusConfig[status as keyof typeof statusConfig] || statusConfig.PENDING;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  const getMonthYear = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      month: "long",
      year: "numeric",
    });
  };

  const years = Array.from(
    { length: 5 },
    (_, i) => new Date().getFullYear() - i,
  );

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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">
                  {t("stats.total_billings")}
                </p>
                <p className="text-2xl font-bold">
                  {stats?.totalBillings || 0}
                </p>
              </div>
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">
                  {t("stats.total_revenue")}
                </p>
                <p className="text-2xl font-bold">
                  {formatCurrency(stats?.totalRevenue || 0)}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">
                  {t("stats.total_commissions")}
                </p>
                <p className="text-2xl font-bold">
                  {formatCurrency(stats?.totalCommissions || 0)}
                </p>
              </div>
              <Euro className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{t("stats.amount_due")}</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(stats?.totalAmountDue || 0)}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Current Month */}
      {currentMonth && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              {t("current_month.title")}
            </CardTitle>
            <CardDescription>{t("current_month.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-600">
                  {t("current_month.orders")}
                </p>
                <p className="text-xl font-semibold">
                  {currentMonth.totalOrders}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">
                  {t("current_month.revenue")}
                </p>
                <p className="text-xl font-semibold">
                  {formatCurrency(currentMonth.totalRevenue)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">
                  {t("current_month.commission")}
                </p>
                <p className="text-xl font-semibold">
                  {formatCurrency(currentMonth.commissionAmount)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">
                  {t("current_month.status")}
                </p>
                <div className="mt-1">
                  {getStatusBadge(currentMonth.status)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder={t("filters.status")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filters.all")}</SelectItem>
            <SelectItem value="PENDING">{t("status.pending")}</SelectItem>
            <SelectItem value="SENT">{t("status.sent")}</SelectItem>
            <SelectItem value="PAID">{t("status.paid")}</SelectItem>
            <SelectItem value="OVERDUE">{t("status.overdue")}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={yearFilter} onValueChange={setYearFilter}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder={t("filters.year")} />
          </SelectTrigger>
          <SelectContent>
            {years.map((year) => (
              <SelectItem key={year} value={year.toString()}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="billing" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="billing">{t("tabs.billing_cycles")}</TabsTrigger>
          <TabsTrigger value="analytics">{t("tabs.analytics")}</TabsTrigger>
        </TabsList>

        <TabsContent value="billing" className="space-y-4">
          {billingCycles.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {t("billing.empty_title")}
                </h3>
                <p className="text-gray-600">
                  {t("billing.empty_description")}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {billingCycles.map((billing) => (
                <Card key={billing.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Calendar className="h-5 w-5" />
                          {getMonthYear(billing.periodStart)}
                        </CardTitle>
                        <CardDescription>
                          {formatDate(billing.periodStart)} -{" "}
                          {formatDate(billing.periodEnd)}
                          {billing.invoiceNumber && (
                            <span className="ml-2">
                              • {t("invoice_number")}: {billing.invoiceNumber}
                            </span>
                          )}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        {getStatusBadge(billing.status)}
                        {billing.contract && (
                          <Badge variant="outline">
                            {billing.contract.commissionRate}% {t("commission")}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">{t("billing.orders")}</p>
                        <p className="font-medium text-lg">
                          {billing.totalOrders}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">{t("billing.revenue")}</p>
                        <p className="font-medium text-lg">
                          {formatCurrency(billing.totalRevenue)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">
                          {t("billing.commission")}
                        </p>
                        <p className="font-medium text-lg">
                          {formatCurrency(billing.commissionAmount)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">{t("billing.fees")}</p>
                        <p className="font-medium text-lg">
                          {formatCurrency(
                            billing.monthlyFee + billing.additionalFees,
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">{t("billing.total")}</p>
                        <p className="font-semibold text-xl text-blue-600">
                          {formatCurrency(billing.totalAmount)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t">
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        {billing.dueDate && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>
                              {t("due_date")}: {formatDate(billing.dueDate)}
                            </span>
                          </div>
                        )}
                        {billing.paidAt && (
                          <div className="flex items-center gap-1">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span className="text-green-600">
                              {t("paid_on")}: {formatDate(billing.paidAt)}
                            </span>
                          </div>
                        )}
                        {billing.paymentMethod && (
                          <span>
                            {t("payment_method")}: {billing.paymentMethod}
                          </span>
                        )}
                      </div>

                      {billing.invoicePath && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            downloadInvoice(billing.id, billing.invoiceNumber)
                          }
                        >
                          <Download className="h-4 w-4 mr-2" />
                          {t("actions.download_invoice")}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("analytics.title")}</CardTitle>
              <CardDescription>{t("analytics.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-3">
                    {t("analytics.revenue_breakdown")}
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span className="text-sm">
                        {t("analytics.gross_revenue")}
                      </span>
                      <span className="font-medium">
                        {formatCurrency(stats?.totalRevenue || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span className="text-sm">
                        {t("analytics.commissions_paid")}
                      </span>
                      <span className="font-medium text-red-600">
                        -{formatCurrency(stats?.totalCommissions || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-green-50 rounded border border-green-200">
                      <span className="text-sm font-medium">
                        {t("analytics.net_revenue")}
                      </span>
                      <span className="font-semibold text-green-600">
                        {formatCurrency(
                          (stats?.totalRevenue || 0) -
                            (stats?.totalCommissions || 0),
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3">
                    {t("analytics.billing_summary")}
                  </h4>
                  <div className="space-y-2">
                    {["PENDING", "SENT", "PAID", "OVERDUE"].map((status) => {
                      const count = billingCycles.filter(
                        (b) => b.status === status,
                      ).length;
                      const total = billingCycles
                        .filter((b) => b.status === status)
                        .reduce((sum, b) => sum + b.totalAmount, 0);

                      return (
                        <div
                          key={status}
                          className="flex justify-between items-center p-2 bg-gray-50 rounded"
                        >
                          <div className="flex items-center gap-2">
                            {getStatusBadge(status)}
                            <span className="text-sm">({count})</span>
                          </div>
                          <span className="font-medium">
                            {formatCurrency(total)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-start gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-800 mb-1">
                      {t("analytics.commission_rate_info")}
                    </p>
                    <p className="text-sm text-blue-700">
                      {t("analytics.commission_rate_description")}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
