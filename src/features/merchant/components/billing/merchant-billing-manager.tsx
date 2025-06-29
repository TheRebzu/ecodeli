"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTranslations } from "next-intl";
import {
  Euro,
  Download,
  Calendar,
  CreditCard,
  Receipt,
  AlertCircle,
  CheckCircle,
  Clock,
  FileText,
  TrendingUp,
  TrendingDown
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";

interface BillingOverview {
  currentBalance: number;
  monthlyTotal: number;
  pendingPayments: number;
  totalSpent: number;
  activeContract: {
    monthlyFee: number;
    commissionRate: number;
    nextBillingDate: string;
  };
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  period: string;
  issueDate: string;
  dueDate: string;
  amount: number;
  status: 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  items: InvoiceItem[];
  downloadUrl?: string;
}

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface PaymentMethod {
  id: string;
  type: 'CARD' | 'BANK_TRANSFER' | 'WALLET';
  lastFour?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
}

interface Transaction {
  id: string;
  type: 'PAYMENT' | 'REFUND' | 'FEE' | 'COMMISSION';
  amount: number;
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
  description: string;
  createdAt: string;
  invoiceId?: string;
}

interface MerchantBillingManagerProps {
  merchantId: string;
}

export function MerchantBillingManager({ merchantId }: MerchantBillingManagerProps) {
  const t = useTranslations("merchant.billing");
  const [overview, setOverview] = useState<BillingOverview | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    fetchBillingData();
  }, [merchantId]);

  const fetchBillingData = async () => {
    setIsLoading(true);
    try {
      const [overviewRes, invoicesRes, transactionsRes, paymentMethodsRes] = await Promise.all([
        fetch(`/api/merchant/billing/overview?merchantId=${merchantId}`),
        fetch(`/api/merchant/billing/invoices?merchantId=${merchantId}`),
        fetch(`/api/merchant/billing/transactions?merchantId=${merchantId}`),
        fetch(`/api/merchant/billing/payment-methods?merchantId=${merchantId}`)
      ]);

      if (overviewRes.ok) {
        const data = await overviewRes.json();
        setOverview(data.overview);
      }

      if (invoicesRes.ok) {
        const data = await invoicesRes.json();
        setInvoices(data.invoices || []);
      }

      if (transactionsRes.ok) {
        const data = await transactionsRes.json();
        setTransactions(data.transactions || []);
      }

      if (paymentMethodsRes.ok) {
        const data = await paymentMethodsRes.json();
        setPaymentMethods(data.paymentMethods || []);
      }
    } catch (error) {
      console.error("Error fetching billing data:", error);
      toast({
        title: t("error.fetch_failed"),
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePayInvoice = async (invoiceId: string, paymentMethodId: string) => {
    try {
      const response = await fetch("/api/merchant/billing/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchantId,
          invoiceId,
          paymentMethodId
        })
      });

      if (response.ok) {
        toast({
          title: t("success.payment_processed"),
          description: t("success.payment_description")
        });
        setShowPaymentDialog(false);
        setSelectedInvoice(null);
        fetchBillingData();
      } else {
        const error = await response.json();
        throw new Error(error.error || "Payment failed");
      }
    } catch (error) {
      toast({
        title: t("error.payment_failed"),
        description: error instanceof Error ? error.message : t("error.generic"),
        variant: "destructive"
      });
    }
  };

  const downloadInvoice = async (invoiceId: string) => {
    try {
      const response = await fetch(`/api/merchant/billing/invoices/${invoiceId}/download`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `invoice_${invoiceId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      toast({
        title: t("error.download_failed"),
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID': case 'COMPLETED': return 'bg-green-100 text-green-800';
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'OVERDUE': case 'FAILED': return 'bg-red-100 text-red-800';
      case 'CANCELLED': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PAID': case 'COMPLETED': return <CheckCircle className="h-4 w-4" />;
      case 'PENDING': return <Clock className="h-4 w-4" />;
      case 'OVERDUE': case 'FAILED': return <AlertCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
      {/* Vue d'ensemble */}
      {overview && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Euro className="h-4 w-4 text-blue-600" />
                {t("overview.current_balance")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {overview.currentBalance.toFixed(2)}€
              </div>
              <p className="text-xs text-muted-foreground">
                {t("overview.account_balance")}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4 text-green-600" />
                {t("overview.monthly_total")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {overview.monthlyTotal.toFixed(2)}€
              </div>
              <p className="text-xs text-muted-foreground">
                {t("overview.this_month")}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-600" />
                {t("overview.pending_payments")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {overview.pendingPayments.toFixed(2)}€
              </div>
              <p className="text-xs text-muted-foreground">
                {t("overview.awaiting_payment")}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-purple-600" />
                {t("overview.total_spent")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {overview.totalSpent.toFixed(2)}€
              </div>
              <p className="text-xs text-muted-foreground">
                {t("overview.all_time")}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Informations du contrat */}
      {overview?.activeContract && (
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-900">{t("contract.active_contract")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-blue-700">{t("contract.monthly_fee")}</p>
                <p className="font-semibold text-blue-900">{overview.activeContract.monthlyFee}€</p>
              </div>
              <div>
                <p className="text-sm text-blue-700">{t("contract.commission_rate")}</p>
                <p className="font-semibold text-blue-900">{overview.activeContract.commissionRate}%</p>
              </div>
              <div>
                <p className="text-sm text-blue-700">{t("contract.next_billing")}</p>
                <p className="font-semibold text-blue-900">
                  {formatDate(overview.activeContract.nextBillingDate)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="invoices" className="space-y-4">
        <TabsList>
          <TabsTrigger value="invoices">{t("tabs.invoices")}</TabsTrigger>
          <TabsTrigger value="transactions">{t("tabs.transactions")}</TabsTrigger>
          <TabsTrigger value="payment_methods">{t("tabs.payment_methods")}</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {t("invoices.title")}
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  {t("actions.export_all")}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {invoices.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p>{t("invoices.empty")}</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("invoices.table.number")}</TableHead>
                      <TableHead>{t("invoices.table.period")}</TableHead>
                      <TableHead>{t("invoices.table.amount")}</TableHead>
                      <TableHead>{t("invoices.table.status")}</TableHead>
                      <TableHead>{t("invoices.table.due_date")}</TableHead>
                      <TableHead>{t("invoices.table.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">
                          {invoice.invoiceNumber}
                        </TableCell>
                        <TableCell>{invoice.period}</TableCell>
                        <TableCell className="font-semibold">
                          {invoice.amount.toFixed(2)}€
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(invoice.status)}>
                            {getStatusIcon(invoice.status)}
                            {t(`invoices.statuses.${invoice.status.toLowerCase()}`)}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(invoice.dueDate)}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => downloadInvoice(invoice.id)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            {invoice.status === 'PENDING' && (
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedInvoice(invoice);
                                  setShowPaymentDialog(true);
                                }}
                              >
                                {t("actions.pay")}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle>{t("transactions.title")}</CardTitle>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p>{t("transactions.empty")}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {transactions.map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{transaction.description}</span>
                          <Badge className={getStatusColor(transaction.status)}>
                            {t(`transactions.statuses.${transaction.status.toLowerCase()}`)}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-600">
                          {t(`transactions.types.${transaction.type.toLowerCase()}`)} • {formatDate(transaction.createdAt)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-semibold ${
                          transaction.type === 'PAYMENT' ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {transaction.type === 'PAYMENT' ? '-' : '+'}{transaction.amount.toFixed(2)}€
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payment_methods">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {t("payment_methods.title")}
                <Button size="sm">
                  {t("actions.add_payment_method")}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {paymentMethods.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p>{t("payment_methods.empty")}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {paymentMethods.map((method) => (
                    <div key={method.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <CreditCard className="h-5 w-5 text-gray-400" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {method.brand} •••• {method.lastFour}
                            </span>
                            {method.isDefault && (
                              <Badge variant="outline">{t("payment_methods.default")}</Badge>
                            )}
                          </div>
                          {method.expiryMonth && method.expiryYear && (
                            <p className="text-sm text-gray-600">
                              {t("payment_methods.expires")}: {method.expiryMonth.toString().padStart(2, '0')}/{method.expiryYear}
                            </p>
                          )}
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        {t("actions.edit")}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog de paiement */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("payment_dialog.title")}</DialogTitle>
            <DialogDescription>
              {selectedInvoice && t("payment_dialog.description", {
                invoice: selectedInvoice.invoiceNumber,
                amount: selectedInvoice.amount.toFixed(2)
              })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t("payment_dialog.payment_method")}</Label>
              <div className="space-y-2 mt-2">
                {paymentMethods.map((method) => (
                  <div key={method.id} className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id={method.id}
                      name="paymentMethod"
                      className="h-4 w-4"
                    />
                    <label htmlFor={method.id} className="flex items-center gap-2 cursor-pointer">
                      <CreditCard className="h-4 w-4" />
                      {method.brand} •••• {method.lastFour}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
              {t("actions.cancel")}
            </Button>
            <Button>
              {t("actions.confirm_payment")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}