"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Download, 
  Eye,
  Calendar,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  CreditCard
} from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface BillingManagerProps {
  providerId: string;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  month: string;
  year: number;
  amount: number;
  totalServices: number;
  commissionRate: number;
  commissionAmount: number;
  netAmount: number;
  status: string;
  issuedAt: string;
  dueDate: string;
  paidAt?: string;
  downloadUrl?: string;
}

interface BillingStats {
  currentMonthEarnings: number;
  lastMonthEarnings: number;
  yearToDateEarnings: number;
  totalUnpaidAmount: number;
  averageMonthlyEarnings: number;
  totalServices: number;
  averageCommissionRate: number;
  nextPaymentDate?: string;
}

interface ServiceBreakdown {
  serviceType: string;
  count: number;
  totalAmount: number;
  averagePrice: number;
  commission: number;
}

export default function BillingManager({ providerId }: BillingManagerProps) {
  const t = useTranslations("provider.billing");
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stats, setStats] = useState<BillingStats | null>(null);
  const [serviceBreakdown, setServiceBreakdown] = useState<ServiceBreakdown[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBillingData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/provider/billing?providerId=${providerId}`);
      if (response.ok) {
        const data = await response.json();
        setInvoices(data.invoices || []);
        setStats(data.stats);
        setServiceBreakdown(data.serviceBreakdown || []);
      }
    } catch (error) {
      console.error("Error fetching billing data:", error);
      toast.error(t("error.fetch_failed"));
    } finally {
      setLoading(false);
    }
  };

  const downloadInvoice = async (invoiceId: string) => {
    try {
      const response = await fetch(`/api/provider/billing/invoices/${invoiceId}/download`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `invoice-${invoiceId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        toast.success(t("success.invoice_downloaded"));
      } else {
        toast.error(t("error.download_failed"));
      }
    } catch (error) {
      console.error("Error downloading invoice:", error);
      toast.error(t("error.download_failed"));
    }
  };

  const requestPayment = async () => {
    try {
      const response = await fetch("/api/provider/billing/request-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerId }),
      });

      if (response.ok) {
        toast.success(t("success.payment_requested"));
        fetchBillingData();
      } else {
        toast.error(t("error.payment_request_failed"));
      }
    } catch (error) {
      console.error("Error requesting payment:", error);
      toast.error(t("error.payment_request_failed"));
    }
  };

  useEffect(() => {
    fetchBillingData();
  }, [providerId]);

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: "bg-yellow-100 text-yellow-800", icon: Clock, label: t("status.pending") },
      paid: { color: "bg-green-100 text-green-800", icon: CheckCircle, label: t("status.paid") },
      overdue: { color: "bg-red-100 text-red-800", icon: AlertCircle, label: t("status.overdue") },
      processing: { color: "bg-blue-100 text-blue-800", icon: Clock, label: t("status.processing") },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const IconComponent = config.icon;
    
    return (
      <Badge className={config.color}>
        <IconComponent className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  if (loading || !stats) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-4">
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
      {/* Billing Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("stats.current_month")}</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.currentMonthEarnings}€</div>
            <p className="text-xs text-muted-foreground">
              {stats.currentMonthEarnings > stats.lastMonthEarnings ? '+' : ''}{((stats.currentMonthEarnings - stats.lastMonthEarnings) / stats.lastMonthEarnings * 100).toFixed(1)}% {t("stats.vs_last_month")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("stats.year_to_date")}</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.yearToDateEarnings}€</div>
            <p className="text-xs text-muted-foreground">
              {t("stats.total_services", { count: stats.totalServices })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("stats.unpaid_amount")}</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUnpaidAmount}€</div>
            <p className="text-xs text-muted-foreground">
              {t("stats.awaiting_payment")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("stats.average_monthly")}</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageMonthlyEarnings}€</div>
            <p className="text-xs text-muted-foreground">
              {t("stats.commission_rate", { rate: stats.averageCommissionRate })}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Next Payment Info */}
      {stats.nextPaymentDate && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CreditCard className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-800">{t("next_payment")}</p>
                  <p className="text-sm text-green-600">
                    {new Date(stats.nextPaymentDate).toLocaleDateString()} - {stats.totalUnpaidAmount}€
                  </p>
                </div>
              </div>
              <Button onClick={requestPayment} size="sm">
                {t("request_payment")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Billing Details */}
      <Tabs defaultValue="invoices" className="space-y-6">
        <TabsList>
          <TabsTrigger value="invoices">{t("tabs.invoices")}</TabsTrigger>
          <TabsTrigger value="breakdown">{t("tabs.service_breakdown")}</TabsTrigger>
          <TabsTrigger value="history">{t("tabs.payment_history")}</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FileText className="w-5 h-5" />
                  <span>{t("invoices_title")}</span>
                </div>
                <Badge variant="outline">
                  {invoices.length} {t("invoice_count", { count: invoices.length })}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {invoices.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {t("no_invoices_title")}
                  </h3>
                  <p className="text-gray-600">
                    {t("no_invoices_description")}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {invoices.map((invoice) => (
                    <Card key={invoice.id} className="border-l-4 border-l-blue-500">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <h4 className="font-medium">{invoice.invoiceNumber}</h4>
                              {getStatusBadge(invoice.status)}
                            </div>
                            <p className="text-sm text-gray-600">
                              {invoice.month} {invoice.year}
                            </p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="text-gray-600">{t("invoice.gross_amount")}:</span>
                                <p className="font-medium">{invoice.amount}€</p>
                              </div>
                              <div>
                                <span className="text-gray-600">{t("invoice.commission")}:</span>
                                <p className="font-medium text-red-600">-{invoice.commissionAmount}€</p>
                              </div>
                              <div>
                                <span className="text-gray-600">{t("invoice.net_amount")}:</span>
                                <p className="font-medium text-green-600">{invoice.netAmount}€</p>
                              </div>
                              <div>
                                <span className="text-gray-600">{t("invoice.services")}:</span>
                                <p className="font-medium">{invoice.totalServices}</p>
                              </div>
                            </div>
                            <div className="text-xs text-gray-500">
                              {t("invoice.issued")}: {new Date(invoice.issuedAt).toLocaleDateString()} | 
                              {t("invoice.due")}: {new Date(invoice.dueDate).toLocaleDateString()}
                              {invoice.paidAt && (
                                <> | {t("invoice.paid")}: {new Date(invoice.paidAt).toLocaleDateString()}</>
                              )}
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => downloadInvoice(invoice.id)}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              {t("actions.view")}
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => downloadInvoice(invoice.id)}
                            >
                              <Download className="w-4 h-4 mr-1" />
                              {t("actions.download")}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="breakdown" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("service_breakdown_title")}</CardTitle>
            </CardHeader>
            <CardContent>
              {serviceBreakdown.length === 0 ? (
                <div className="text-center py-8">
                  <TrendingUp className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {t("no_breakdown_title")}
                  </h3>
                  <p className="text-gray-600">
                    {t("no_breakdown_description")}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {serviceBreakdown.map((service, index) => (
                    <Card key={index} className="border-l-4 border-l-purple-500">
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <h4 className="font-medium">{service.serviceType}</h4>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">{t("breakdown.count")}:</span>
                              <span>{service.count}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">{t("breakdown.total")}:</span>
                              <span className="font-medium">{service.totalAmount}€</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">{t("breakdown.average")}:</span>
                              <span>{service.averagePrice}€</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">{t("breakdown.commission")}:</span>
                              <span className="text-red-600">-{service.commission}€</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("payment_history_title")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {t("history_coming_soon")}
                </h3>
                <p className="text-gray-600">
                  {t("history_description")}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}