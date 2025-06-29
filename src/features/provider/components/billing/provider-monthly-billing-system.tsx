"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Euro, FileText, Download, Eye, Clock, CheckCircle, AlertCircle, TrendingUp, Calculator } from "lucide-react";
import { useTranslations } from "next-intl";

interface ProviderMonthlyBillingSystemProps {
  providerId: string;
}

interface MonthlyBilling {
  id: string;
  providerId: string;
  period: string; // YYYY-MM
  status: "draft" | "pending_review" | "approved" | "paid" | "disputed";
  generatedAt: string;
  reviewedAt?: string;
  paidAt?: string;
  dueDate: string;
  
  // Données financières
  totalServices: number;
  totalHours: number;
  grossAmount: number;
  commission: number;
  commissionRate: number;
  taxes: number;
  taxRate: number;
  netAmount: number;
  bonuses: number;
  penalties: number;
  
  // Détails des services
  servicesSummary: ServiceSummary[];
  detailedServices: DetailedService[];
  
  // Documents
  invoiceUrl?: string;
  paymentReceiptUrl?: string;
  
  // Informations bancaires
  bankTransferReference?: string;
  bankTransferDate?: string;
  
  // Méta données
  generatedBy?: string;
  reviewedBy?: string;
  notes?: string;
}

interface ServiceSummary {
  serviceType: string;
  serviceName: string;
  count: number;
  totalHours: number;
  averageRating: number;
  totalAmount: number;
  commissionAmount: number;
}

interface DetailedService {
  id: string;
  date: string;
  clientName: string;
  serviceType: string;
  serviceName: string;
  duration: number;
  basePrice: number;
  finalPrice: number;
  commission: number;
  rating?: number;
  status: "completed" | "cancelled" | "disputed";
  notes?: string;
}

interface BillingMetrics {
  currentMonth: {
    totalServices: number;
    totalHours: number;
    grossAmount: number;
    netAmount: number;
    averageRating: number;
  };
  previousMonth: {
    totalServices: number;
    totalHours: number;
    grossAmount: number;
    netAmount: number;
    averageRating: number;
  };
  yearToDate: {
    totalServices: number;
    totalHours: number;
    grossAmount: number;
    netAmount: number;
    averageRating: number;
  };
}

export default function ProviderMonthlyBillingSystem({ providerId }: ProviderMonthlyBillingSystemProps) {
  const t = useTranslations("provider.billing");
  const [billings, setBillings] = useState<MonthlyBilling[]>([]);
  const [selectedBilling, setSelectedBilling] = useState<MonthlyBilling | null>(null);
  const [metrics, setMetrics] = useState<BillingMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterPeriod, setFilterPeriod] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  useEffect(() => {
    fetchBillingData();
  }, [providerId]);

  const fetchBillingData = async () => {
    try {
      const [billingsRes, metricsRes] = await Promise.all([
        fetch(`/api/provider/billing?providerId=${providerId}`),
        fetch(`/api/provider/billing/metrics?providerId=${providerId}`)
      ]);

      if (billingsRes.ok) {
        const data = await billingsRes.json();
        setBillings(data.billings || []);
      }

      if (metricsRes.ok) {
        const data = await metricsRes.json();
        setMetrics(data.metrics);
      }
    } catch (error) {
      console.error("Error fetching billing data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateMonthlyBilling = async (period: string) => {
    try {
      const response = await fetch("/api/provider/billing/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerId, period })
      });

      if (response.ok) {
        await fetchBillingData();
      }
    } catch (error) {
      console.error("Error generating billing:", error);
    }
  };

  const handleApproveBilling = async (billingId: string) => {
    try {
      const response = await fetch(`/api/provider/billing/${billingId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerId })
      });

      if (response.ok) {
        await fetchBillingData();
      }
    } catch (error) {
      console.error("Error approving billing:", error);
    }
  };

  const handleDisputeBilling = async (billingId: string, reason: string) => {
    try {
      const response = await fetch(`/api/provider/billing/${billingId}/dispute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerId, reason })
      });

      if (response.ok) {
        await fetchBillingData();
      }
    } catch (error) {
      console.error("Error disputing billing:", error);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { color: "bg-gray-100 text-gray-800", label: t("status.draft"), icon: FileText },
      pending_review: { color: "bg-yellow-100 text-yellow-800", label: t("status.pending_review"), icon: Clock },
      approved: { color: "bg-blue-100 text-blue-800", label: t("status.approved"), icon: CheckCircle },
      paid: { color: "bg-green-100 text-green-800", label: t("status.paid"), icon: CheckCircle },
      disputed: { color: "bg-red-100 text-red-800", label: t("status.disputed"), icon: AlertCircle }
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    const Icon = config.icon;
    
    return (
      <Badge className={config.color}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const calculateGrowth = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  const formatPeriod = (period: string) => {
    const [year, month] = period.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' });
  };

  const filteredBillings = billings.filter(billing => {
    if (filterStatus !== "all" && billing.status !== filterStatus) return false;
    if (filterPeriod !== "all") {
      const currentYear = new Date().getFullYear();
      const billingYear = parseInt(billing.period.split('-')[0]);
      switch (filterPeriod) {
        case "current_year":
          return billingYear === currentYear;
        case "previous_year":
          return billingYear === currentYear - 1;
      }
    }
    return true;
  });

  if (loading) {
    return <div className="flex justify-center p-8">{t("loading")}</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">{t("title")}</h1>
        <p className="text-gray-600">{t("description")}</p>
      </div>

      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("metrics.current_month_revenue")}</CardTitle>
              <Euro className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">€{metrics.currentMonth.netAmount.toFixed(2)}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                <TrendingUp className="h-3 w-3 mr-1" />
                {calculateGrowth(metrics.currentMonth.netAmount, metrics.previousMonth.netAmount) > 0 ? '+' : ''}
                {calculateGrowth(metrics.currentMonth.netAmount, metrics.previousMonth.netAmount)}%
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("metrics.services_completed")}</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.currentMonth.totalServices}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                <TrendingUp className="h-3 w-3 mr-1" />
                {calculateGrowth(metrics.currentMonth.totalServices, metrics.previousMonth.totalServices) > 0 ? '+' : ''}
                {calculateGrowth(metrics.currentMonth.totalServices, metrics.previousMonth.totalServices)}%
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("metrics.total_hours")}</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.currentMonth.totalHours}h</div>
              <div className="flex items-center text-xs text-muted-foreground">
                <TrendingUp className="h-3 w-3 mr-1" />
                {calculateGrowth(metrics.currentMonth.totalHours, metrics.previousMonth.totalHours) > 0 ? '+' : ''}
                {calculateGrowth(metrics.currentMonth.totalHours, metrics.previousMonth.totalHours)}%
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("metrics.average_rating")}</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.currentMonth.averageRating.toFixed(1)}/5</div>
              <Progress value={metrics.currentMonth.averageRating * 20} className="mt-2" />
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-4">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder={t("filters.status")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filters.all")}</SelectItem>
              <SelectItem value="draft">{t("status.draft")}</SelectItem>
              <SelectItem value="pending_review">{t("status.pending_review")}</SelectItem>
              <SelectItem value="approved">{t("status.approved")}</SelectItem>
              <SelectItem value="paid">{t("status.paid")}</SelectItem>
              <SelectItem value="disputed">{t("status.disputed")}</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterPeriod} onValueChange={setFilterPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder={t("filters.period")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filters.all_periods")}</SelectItem>
              <SelectItem value="current_year">{t("filters.current_year")}</SelectItem>
              <SelectItem value="previous_year">{t("filters.previous_year")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button onClick={() => handleGenerateMonthlyBilling(new Date().toISOString().substr(0, 7))}>
          <Calculator className="h-4 w-4 mr-2" />
          {t("actions.generate_current_month")}
        </Button>
      </div>

      <Tabs defaultValue="billings" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="billings">{t("tabs.monthly_billings")}</TabsTrigger>
          <TabsTrigger value="current">{t("tabs.current_period")}</TabsTrigger>
          <TabsTrigger value="analytics">{t("tabs.analytics")}</TabsTrigger>
        </TabsList>

        <TabsContent value="billings" className="space-y-4">
          {filteredBillings.map((billing) => (
            <Card key={billing.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      {formatPeriod(billing.period)}
                    </CardTitle>
                    <CardDescription>
                      {billing.totalServices} {t("services_completed")} • {billing.totalHours}h {t("worked")}
                    </CardDescription>
                  </div>
                  {getStatusBadge(billing.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <span className="text-sm text-gray-600">{t("gross_amount")}:</span>
                    <div className="font-semibold">€{billing.grossAmount.toFixed(2)}</div>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">{t("commission")} ({billing.commissionRate}%):</span>
                    <div className="font-semibold text-red-600">-€{billing.commission.toFixed(2)}</div>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">{t("taxes")} ({billing.taxRate}%):</span>
                    <div className="font-semibold text-red-600">-€{billing.taxes.toFixed(2)}</div>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">{t("net_amount")}:</span>
                    <div className="font-semibold text-green-600">€{billing.netAmount.toFixed(2)}</div>
                  </div>
                </div>

                {billing.bonuses > 0 && (
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded">
                    <span className="text-sm text-green-800">
                      {t("bonuses_earned")}: +€{billing.bonuses.toFixed(2)}
                    </span>
                  </div>
                )}

                {billing.penalties > 0 && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
                    <span className="text-sm text-red-800">
                      {t("penalties_applied")}: -€{billing.penalties.toFixed(2)}
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-600">
                    {t("generated_at")}: {new Date(billing.generatedAt).toLocaleDateString()}
                    {billing.dueDate && (
                      <span className="ml-4">
                        {t("due_date")}: {new Date(billing.dueDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedBilling(billing);
                        setShowDetailDialog(true);
                      }}
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      {t("actions.view_details")}
                    </Button>

                    {billing.invoiceUrl && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={billing.invoiceUrl} target="_blank">
                          <Download className="h-3 w-3 mr-1" />
                          {t("actions.download_invoice")}
                        </a>
                      </Button>
                    )}

                    {billing.status === "pending_review" && (
                      <Button size="sm" onClick={() => handleApproveBilling(billing.id)}>
                        <CheckCircle className="h-3 w-3 mr-1" />
                        {t("actions.approve")}
                      </Button>
                    )}

                    {["pending_review", "approved"].includes(billing.status) && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDisputeBilling(billing.id, "Contestation sur les montants")}
                      >
                        <AlertCircle className="h-3 w-3 mr-1" />
                        {t("actions.dispute")}
                      </Button>
                    )}
                  </div>
                </div>

                {billing.bankTransferReference && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
                    <div className="text-sm text-blue-800">
                      <strong>{t("bank_transfer")}:</strong> {billing.bankTransferReference}
                      {billing.bankTransferDate && (
                        <span className="ml-2">
                          ({new Date(billing.bankTransferDate).toLocaleDateString()})
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {filteredBillings.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">{t("empty.title")}</h3>
                <p className="text-gray-600 text-center mb-4">{t("empty.description")}</p>
                <Button onClick={() => handleGenerateMonthlyBilling(new Date().toISOString().substr(0, 7))}>
                  {t("empty.generate_first")}
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="current" className="space-y-4">
          {metrics && (
            <Card>
              <CardHeader>
                <CardTitle>{t("current_period.title")}</CardTitle>
                <CardDescription>{t("current_period.description")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-semibold">{t("current_period.summary")}</h4>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>{t("services_completed")}:</span>
                        <span className="font-medium">{metrics.currentMonth.totalServices}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>{t("hours_worked")}:</span>
                        <span className="font-medium">{metrics.currentMonth.totalHours}h</span>
                      </div>
                      <div className="flex justify-between">
                        <span>{t("average_rating")}:</span>
                        <span className="font-medium">{metrics.currentMonth.averageRating.toFixed(1)}/5</span>
                      </div>
                      <div className="flex justify-between">
                        <span>{t("gross_earnings")}:</span>
                        <span className="font-medium">€{metrics.currentMonth.grossAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between border-t pt-2">
                        <span className="font-semibold">{t("estimated_net")}:</span>
                        <span className="font-semibold text-green-600">€{metrics.currentMonth.netAmount.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-semibold">{t("current_period.comparison")}</h4>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>{t("vs_previous_month")}:</span>
                        <span className={calculateGrowth(metrics.currentMonth.netAmount, metrics.previousMonth.netAmount) >= 0 ? "text-green-600" : "text-red-600"}>
                          {calculateGrowth(metrics.currentMonth.netAmount, metrics.previousMonth.netAmount) > 0 ? '+' : ''}
                          {calculateGrowth(metrics.currentMonth.netAmount, metrics.previousMonth.netAmount)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>{t("services_vs_previous")}:</span>
                        <span className={calculateGrowth(metrics.currentMonth.totalServices, metrics.previousMonth.totalServices) >= 0 ? "text-green-600" : "text-red-600"}>
                          {calculateGrowth(metrics.currentMonth.totalServices, metrics.previousMonth.totalServices) > 0 ? '+' : ''}
                          {calculateGrowth(metrics.currentMonth.totalServices, metrics.previousMonth.totalServices)}%
                        </span>
                      </div>
                    </div>

                    <div className="mt-4">
                      <Button className="w-full" onClick={() => handleGenerateMonthlyBilling(new Date().toISOString().substr(0, 7))}>
                        <Calculator className="h-4 w-4 mr-2" />
                        {t("actions.generate_billing")}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          {metrics && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>{t("analytics.year_to_date")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>{t("total_revenue")}:</span>
                      <span className="font-bold">€{metrics.yearToDate.netAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t("total_services")}:</span>
                      <span className="font-medium">{metrics.yearToDate.totalServices}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t("total_hours")}:</span>
                      <span className="font-medium">{metrics.yearToDate.totalHours}h</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t("avg_service_value")}:</span>
                      <span className="font-medium">
                        €{metrics.yearToDate.totalServices > 0 ? (metrics.yearToDate.grossAmount / metrics.yearToDate.totalServices).toFixed(2) : '0.00'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t("analytics.performance")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm">{t("average_rating")}</span>
                        <span className="text-sm font-medium">{metrics.yearToDate.averageRating.toFixed(1)}/5</span>
                      </div>
                      <Progress value={metrics.yearToDate.averageRating * 20} />
                    </div>
                    
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm">{t("monthly_target")}</span>
                        <span className="text-sm font-medium">
                          {metrics.currentMonth.totalServices >= 20 ? "✅" : "⏳"} 
                          {metrics.currentMonth.totalServices}/20
                        </span>
                      </div>
                      <Progress value={(metrics.currentMonth.totalServices / 20) * 100} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {showDetailDialog && selectedBilling && (
        <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t("detail_dialog.title", { period: formatPeriod(selectedBilling.period) })}</DialogTitle>
              <DialogDescription>
                {t("detail_dialog.description")}
              </DialogDescription>
            </DialogHeader>
            
            <Tabs defaultValue="summary" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="summary">{t("detail_tabs.summary")}</TabsTrigger>
                <TabsTrigger value="services">{t("detail_tabs.services")}</TabsTrigger>
                <TabsTrigger value="detailed">{t("detail_tabs.detailed")}</TabsTrigger>
              </TabsList>

              <TabsContent value="summary" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-semibold">{t("financial_summary")}</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>{t("gross_amount")}:</span>
                        <span>€{selectedBilling.grossAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-red-600">
                        <span>{t("commission")} ({selectedBilling.commissionRate}%):</span>
                        <span>-€{selectedBilling.commission.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-red-600">
                        <span>{t("taxes")} ({selectedBilling.taxRate}%):</span>
                        <span>-€{selectedBilling.taxes.toFixed(2)}</span>
                      </div>
                      {selectedBilling.bonuses > 0 && (
                        <div className="flex justify-between text-green-600">
                          <span>{t("bonuses")}:</span>
                          <span>+€{selectedBilling.bonuses.toFixed(2)}</span>
                        </div>
                      )}
                      {selectedBilling.penalties > 0 && (
                        <div className="flex justify-between text-red-600">
                          <span>{t("penalties")}:</span>
                          <span>-€{selectedBilling.penalties.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-semibold border-t pt-1">
                        <span>{t("net_amount")}:</span>
                        <span>€{selectedBilling.netAmount.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-semibold">{t("activity_summary")}</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>{t("total_services")}:</span>
                        <span>{selectedBilling.totalServices}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>{t("total_hours")}:</span>
                        <span>{selectedBilling.totalHours}h</span>
                      </div>
                      <div className="flex justify-between">
                        <span>{t("avg_service_duration")}:</span>
                        <span>{selectedBilling.totalServices > 0 ? (selectedBilling.totalHours / selectedBilling.totalServices).toFixed(1) : 0}h</span>
                      </div>
                      <div className="flex justify-between">
                        <span>{t("avg_hourly_rate")}:</span>
                        <span>€{selectedBilling.totalHours > 0 ? (selectedBilling.grossAmount / selectedBilling.totalHours).toFixed(2) : '0.00'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="services" className="space-y-4">
                {selectedBilling.servicesSummary.map((service, index) => (
                  <Card key={index} className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold">{service.serviceName}</h4>
                        <p className="text-sm text-gray-600">{service.serviceType}</p>
                      </div>
                      <Badge>{service.count} {t("services")}</Badge>
                    </div>
                    <div className="grid grid-cols-4 gap-4 mt-3 text-sm">
                      <div>
                        <span className="text-gray-600">{t("total_hours")}:</span>
                        <div className="font-medium">{service.totalHours}h</div>
                      </div>
                      <div>
                        <span className="text-gray-600">{t("avg_rating")}:</span>
                        <div className="font-medium">{service.averageRating.toFixed(1)}/5</div>
                      </div>
                      <div>
                        <span className="text-gray-600">{t("total_amount")}:</span>
                        <div className="font-medium">€{service.totalAmount.toFixed(2)}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">{t("commission")}:</span>
                        <div className="font-medium text-red-600">€{service.commissionAmount.toFixed(2)}</div>
                      </div>
                    </div>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="detailed" className="space-y-4">
                <div className="max-h-96 overflow-y-auto">
                  {selectedBilling.detailedServices.map((service) => (
                    <Card key={service.id} className="p-3 mb-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <h5 className="font-medium">{service.serviceName}</h5>
                          <p className="text-sm text-gray-600">
                            {service.clientName} • {new Date(service.date).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">€{service.finalPrice.toFixed(2)}</div>
                          <div className="text-sm text-gray-600">{service.duration}min</div>
                        </div>
                      </div>
                      {service.rating && (
                        <div className="mt-2">
                          <span className="text-sm text-gray-600">{t("rating")}: {service.rating}/5</span>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
            
            <DialogFooter>
              <Button onClick={() => setShowDetailDialog(false)}>
                {t("detail_dialog.close")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}