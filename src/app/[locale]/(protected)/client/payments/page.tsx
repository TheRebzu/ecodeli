"use client";

import { useAuth } from "@/hooks/use-auth";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  Filter
} from "lucide-react";

interface Payment {
  id: string;
  type: 'DELIVERY_PAYMENT' | 'SUBSCRIPTION' | 'CANCELLATION_FEE' | 'INSURANCE_CLAIM';
  amount: number;
  currency: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
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
  PENDING: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800' },
  COMPLETED: { label: 'Terminé', color: 'bg-green-100 text-green-800' },
  FAILED: { label: 'Échoué', color: 'bg-red-100 text-red-800' },
  REFUNDED: { label: 'Remboursé', color: 'bg-blue-100 text-blue-800' }
};

const typeLabels = {
  DELIVERY_PAYMENT: { label: 'Paiement livraison', icon: '📦' },
  SUBSCRIPTION: { label: 'Abonnement', icon: '👑' },
  CANCELLATION_FEE: { label: 'Frais annulation', icon: '❌' },
  INSURANCE_CLAIM: { label: 'Assurance', icon: '🛡️' }
};

export default function ClientPaymentsPage() {
  const { user } = useAuth();
  const t = useTranslations("client.payments");
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    type: '',
    dateFrom: '',
    dateTo: '',
    search: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (user) {
      fetchPayments();
    }
  }, [user, filters, currentPage]);

  const fetchPayments = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        clientId: user.id,
        page: currentPage.toString(),
        limit: '10',
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v))
      });

      const response = await fetch(`/api/client/payments?${params}`);
      
      if (response.ok) {
        const data = await response.json();
        setPayments(data.payments || []);
        setStats(data.stats || null);
        setTotalPages(data.pagination?.totalPages || 1);
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const exportPayments = async (format: 'pdf' | 'csv') => {
    if (!user) return;
    
    try {
      const params = new URLSearchParams({
        clientId: user.id,
        format,
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v))
      });

      const response = await fetch(`/api/client/payments/export?${params}`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `paiements-${new Date().toISOString().split('T')[0]}.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatAmount = (amount: number, currency: string = 'EUR') => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency
    }).format(amount);
  };

  return (
        <div className="space-y-6">
          <PageHeader
            title={t("page.title")}
            description={t("page.description")}
          />

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
                          onChange={(e) => setFilters({...filters, search: e.target.value})}
                          className="pl-10"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="status">{t("filters.status")}</Label>
                      <Select
                        value={filters.status}
                        onValueChange={(value) => setFilters({...filters, status: value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t("filters.all_statuses")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">{t("filters.all_statuses")}</SelectItem>
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
                        onValueChange={(value) => setFilters({...filters, type: value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t("filters.all_types")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">{t("filters.all_types")}</SelectItem>
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
                        onClick={() => setFilters({
                          status: '', type: '', dateFrom: '', dateTo: '', search: ''
                        })} 
                        variant="outline" 
                        size="sm"
                      >
                        {t("filters.reset")}
                      </Button>
                      <Button onClick={() => exportPayments('pdf')} variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-1" />
                        PDF
                      </Button>
                      <Button onClick={() => exportPayments('csv')} variant="outline" size="sm">
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
                    <p className="text-gray-400">
                      {t("empty.description")}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {payments.map((payment) => (
                    <Card key={payment.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="text-2xl">
                              {typeLabels[payment.type]?.icon || '💳'}
                            </div>
                            <div>
                              <h4 className="font-semibold flex items-center gap-2">
                                {typeLabels[payment.type]?.label || payment.type}
                                <Badge className={statusLabels[payment.status].color}>
                                  {statusLabels[payment.status].label}
                                </Badge>
                              </h4>
                              <p className="text-sm text-gray-600">{payment.description}</p>
                              <p className="text-xs text-gray-500">
                                {formatDate(payment.createdAt)}
                                {payment.recipientName && ` • Vers: ${payment.recipientName}`}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`text-lg font-bold ${
                              payment.status === 'REFUNDED' ? 'text-blue-600' :
                              payment.status === 'FAILED' ? 'text-red-600' :
                              'text-green-600'
                            }`}>
                              {payment.status === 'REFUNDED' && '+'}
                              {formatAmount(payment.amount, payment.currency)}
                            </div>
                            {payment.refundAmount && (
                              <div className="text-sm text-blue-600">
                                Remboursé: {formatAmount(payment.refundAmount, payment.currency)}
                              </div>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              {payment.deliveryId && (
                                <Button variant="outline" size="sm">
                                  👁️ Voir livraison
                                </Button>
                              )}
                              <Button variant="outline" size="sm">
                                <FileText className="h-4 w-4 mr-1" />
                                Facture
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
                        {t("pagination.page", { current: currentPage, total: totalPages })}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
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
                        <p className="text-xs text-gray-500">{t("stats.all_time")}</p>
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
                        <p className="text-xs text-gray-500">{t("stats.refunds_received")}</p>
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
                        <p className="text-xs text-gray-500">{t("stats.pending_payments")}</p>
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