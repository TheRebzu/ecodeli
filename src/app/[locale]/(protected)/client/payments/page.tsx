"use client";

import { useAuth } from "@/hooks/use-auth";
import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/layout/page-header";
import { useTranslations } from "next-intl";
import {
  CreditCard,
  Download,
  Search,
  Calendar,
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileText,
  Filter,
  User,
  Package,
} from "lucide-react";

interface Payment {
  id: string;
  type:
    | "DELIVERY_PAYMENT"
    | "SUBSCRIPTION"
    | "CANCELLATION_FEE"
    | "INSURANCE_CLAIM";
  amount: number;
  currency: string;
  status: "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED";
  description: string;
  createdAt: string;
  recipientName?: string;
  deliveryId?: string;
  stripePaymentId?: string;
  refundAmount?: number;
}

interface PaymentStats {
  totalSpent: number;
  totalRefunds: number;
  totalPending: number;
  monthlySpending: Array<{
    month: string;
    amount: number;
  }>;
}

const statusLabels = {
  PENDING: {
    label: "En attente",
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
    icon: "⏳",
  },
  COMPLETED: {
    label: "Terminé",
    color: "bg-green-100 text-green-800 border-green-200",
    icon: "✅",
  },
  FAILED: {
    label: "Échoué",
    color: "bg-red-100 text-red-800 border-red-200",
    icon: "❌",
  },
  REFUNDED: {
    label: "Remboursé",
    color: "bg-blue-100 text-blue-800 border-blue-200",
    icon: "↩️",
  },
};

const typeLabels = {
  DELIVERY_PAYMENT: {
    label: "Paiement livraison",
    icon: "📦",
    color: "bg-blue-50 border-blue-200",
  },
  SUBSCRIPTION: {
    label: "Abonnement",
    icon: "👑",
    color: "bg-purple-50 border-purple-200",
  },
  CANCELLATION_FEE: {
    label: "Frais annulation",
    icon: "❌",
    color: "bg-red-50 border-red-200",
  },
  INSURANCE_CLAIM: {
    label: "Assurance",
    icon: "🛡️",
    color: "bg-green-50 border-green-200",
  },
};

export default function ClientPaymentsPage() {
  const { user } = useAuth();
  const t = useTranslations("client.payments");
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: "all",
    type: "all",
    dateFrom: "",
    dateTo: "",
    search: "",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchPayments = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const filteredParams = Object.fromEntries(
        Object.entries(filters).filter(
          ([_, v]) => v && v !== "all" && v !== "",
        ),
      );

      const params = new URLSearchParams({
        clientId: user.id,
        page: currentPage.toString(),
        limit: "10",
        ...filteredParams,
      });

      const response = await fetch(`/api/client/payments?${params}`);

      if (response.ok) {
        const data = await response.json();
        setPayments(data.payments || []);
        setStats(data.stats || null);
        setTotalPages(data.pagination?.totalPages || 1);
      }
    } catch (error) {
      console.error("Error fetching payments:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user, filters, currentPage]);

  // Effect séparé pour l'initialisation
  useEffect(() => {
    if (user) {
      fetchPayments();
    }
  }, [user]); // Seulement au montage et changement d'utilisateur

  // Effect pour les changements de page
  useEffect(() => {
    if (user && currentPage > 1) {
      // Éviter le double appel au montage
      fetchPayments();
    }
  }, [currentPage]);

  // Effect pour les changements de filtres avec debounce
  useEffect(() => {
    if (!user) return;

    const timeoutId = setTimeout(() => {
      if (currentPage !== 1) {
        setCurrentPage(1); // Reset page quand les filtres changent
      } else {
        fetchPayments(); // Fetch directement si déjà page 1
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [filters]);

  const exportPayments = async (format: "pdf" | "csv") => {
    if (!user) return;

    try {
      const filteredParams = Object.fromEntries(
        Object.entries(filters).filter(
          ([_, v]) => v && v !== "all" && v !== "",
        ),
      );

      const params = new URLSearchParams({
        clientId: user.id,
        format,
        ...filteredParams,
      });

      const response = await fetch(`/api/client/payments/export?${params}`);

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `paiements-${new Date().toISOString().split("T")[0]}.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error("Export error:", error);
    }
  };

  const viewInvoice = (paymentId: string) => {
    // Rediriger vers la page de facture
    window.open(`/fr/client/invoice/${paymentId}`, "_blank");
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatAmount = (amount: number, currency: string = "EUR") => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <PageHeader title={t("page.title")} description={t("page.description")} />

      <Tabs defaultValue="history" className="space-y-6">
        <TabsList className="grid grid-cols-2 w-full max-w-md">
          <TabsTrigger value="history">{t("tabs.history")}</TabsTrigger>
          <TabsTrigger value="stats">{t("tabs.statistics")}</TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                {t("filters.title")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="search">{t("filters.search")}</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="search"
                      placeholder={t("filters.search_placeholder")}
                      value={filters.search}
                      onChange={(e) =>
                        setFilters({ ...filters, search: e.target.value })
                      }
                      className="pl-10"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="status">{t("filters.status")}</Label>
                  <Select
                    value={filters.status}
                    onValueChange={(value) =>
                      setFilters({ ...filters, status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("filters.all_statuses")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        {t("filters.all_statuses")}
                      </SelectItem>
                      {Object.entries(statusLabels).map(([status, config]) => (
                        <SelectItem key={status} value={status}>
                          {config.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="type">{t("filters.type")}</Label>
                  <Select
                    value={filters.type}
                    onValueChange={(value) =>
                      setFilters({ ...filters, type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("filters.all_types")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        {t("filters.all_types")}
                      </SelectItem>
                      {Object.entries(typeLabels).map(([type, config]) => (
                        <SelectItem key={type} value={type}>
                          {config.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end gap-2">
                  <Button
                    onClick={() =>
                      setFilters({
                        status: "all",
                        type: "all",
                        dateFrom: "",
                        dateTo: "",
                        search: "",
                      })
                    }
                    variant="outline"
                    size="sm"
                  >
                    {t("filters.reset")}
                  </Button>
                  <Button
                    onClick={() => exportPayments("pdf")}
                    variant="outline"
                    size="sm"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    PDF
                  </Button>
                  <Button
                    onClick={() => exportPayments("csv")}
                    variant="outline"
                    size="sm"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    CSV
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {isLoading ? (
            <div className="text-center py-8">{t("loading")}</div>
          ) : payments.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <div className="text-gray-500 text-lg mb-4">
                  💳 {t("empty.title")}
                </div>
                <p className="text-gray-400">{t("empty.description")}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {payments.map((payment) => (
                <Card
                  key={payment.id}
                  className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-blue-500"
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        {/* Icon avec type background */}
                        <div
                          className={`p-3 rounded-lg ${typeLabels[payment.type]?.color || "bg-gray-50 border-gray-200"} border`}
                        >
                          <span className="text-2xl">
                            {typeLabels[payment.type]?.icon || "💳"}
                          </span>
                        </div>

                        <div className="flex-1">
                          {/* Header avec type et statut */}
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-semibold text-lg">
                              {typeLabels[payment.type]?.label || payment.type}
                            </h4>
                            <Badge
                              className={`${statusLabels[payment.status].color} border`}
                            >
                              <span className="mr-1">
                                {statusLabels[payment.status].icon}
                              </span>
                              {statusLabels[payment.status].label}
                            </Badge>
                          </div>

                          {/* Description */}
                          <p className="text-gray-700 mb-2 font-medium">
                            {payment.description}
                          </p>

                          {/* Metadata */}
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(payment.createdAt)}
                            </span>
                            {payment.recipientName && (
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                Vers: {payment.recipientName}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <CreditCard className="h-3 w-3" />
                              ID: {payment.id.slice(-8).toUpperCase()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Montant et actions */}
                      <div className="text-right min-w-0 ml-4">
                        <div
                          className={`text-2xl font-bold mb-2 ${
                            payment.status === "REFUNDED"
                              ? "text-blue-600"
                              : payment.status === "FAILED"
                                ? "text-red-600"
                                : payment.status === "PENDING"
                                  ? "text-yellow-600"
                                  : "text-green-600"
                          }`}
                        >
                          {payment.status === "REFUNDED" && "+"}
                          {formatAmount(payment.amount, payment.currency)}
                        </div>

                        {payment.refundAmount && (
                          <div className="text-sm text-blue-600 mb-2 font-medium">
                            ↩️ Remboursé:{" "}
                            {formatAmount(
                              payment.refundAmount,
                              payment.currency,
                            )}
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex flex-col gap-2">
                          {payment.deliveryId && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full justify-start"
                            >
                              <Package className="h-4 w-4 mr-2" />
                              Voir livraison
                            </Button>
                          )}
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => viewInvoice(payment.id)}
                            className="w-full justify-start bg-blue-600 hover:bg-blue-700"
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            Voir facture
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    {t("pagination.previous")}
                  </Button>
                  <span className="text-sm text-gray-600">
                    {t("pagination.page", {
                      current: currentPage,
                      total: totalPages,
                    })}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentPage(Math.min(totalPages, currentPage + 1))
                    }
                    disabled={currentPage === totalPages}
                  >
                    {t("pagination.next")}
                  </Button>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="stats" className="space-y-6">
          {stats && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                      <TrendingDown className="h-4 w-4" />
                      {t("stats.total_spent")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">
                      {formatAmount(stats.totalSpent)}
                    </div>
                    <p className="text-xs text-gray-500">
                      {t("stats.all_time")}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      {t("stats.total_refunds")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {formatAmount(stats.totalRefunds)}
                    </div>
                    <p className="text-xs text-gray-500">
                      {t("stats.refunds_received")}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      {t("stats.pending")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-yellow-600">
                      {formatAmount(stats.totalPending)}
                    </div>
                    <p className="text-xs text-gray-500">
                      {t("stats.pending_payments")}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    {t("stats.monthly_evolution")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                    <div className="text-center text-gray-500">
                      <TrendingUp className="h-12 w-12 mx-auto mb-4" />
                      <p>{t("stats.chart_placeholder")}</p>
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
