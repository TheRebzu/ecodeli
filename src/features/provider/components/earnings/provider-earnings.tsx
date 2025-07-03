"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Euro, 
  TrendingUp, 
  Download, 
  CreditCard,
  Calendar,
  FileText,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useApi } from "@/hooks/use-api";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

interface EarningsSummary {
  currentMonth: number;
  previousMonth: number;
  totalEarnings: number;
  pendingAmount: number;
  availableForWithdrawal: number;
  lastWithdrawal?: {
    amount: number;
    date: string;
    status: string;
  };
}

interface Transaction {
  id: string;
  type: "EARNING" | "WITHDRAWAL" | "REFUND";
  amount: number;
  description: string;
  serviceId?: string;
  serviceName?: string;
  status: "COMPLETED" | "PENDING" | "FAILED";
  createdAt: string;
}

interface MonthlyInvoice {
  id: string;
  month: string;
  year: number;
  totalAmount: number;
  servicesCount: number;
  status: "GENERATED" | "PAID" | "PENDING";
  pdfUrl?: string;
  generatedAt: string;
  paidAt?: string;
}

export function ProviderEarnings() {
  const t = useTranslations("provider.earnings");
  const { user } = useAuth();
  const { execute } = useApi();
  const [summary, setSummary] = useState<EarningsSummary | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [invoices, setInvoices] = useState<MonthlyInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [withdrawalAmount, setWithdrawalAmount] = useState("");
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  // Créer les méthodes GET et POST basées sur execute
  const get = async (url: string) => {
    return await execute(url, { method: 'GET' });
  };

  const post = async (url: string, options: { body: string }) => {
    return await execute(url, { 
      method: 'POST',
      body: options.body,
      headers: { 'Content-Type': 'application/json' }
    });
  };

  useEffect(() => {
    fetchEarningsData();
  }, [user?.id]);

  const fetchEarningsData = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const [summaryRes, transactionsRes, invoicesRes] = await Promise.all([
        get(`/api/provider/earnings/summary?providerId=${user.id}`),
        get(`/api/provider/earnings/transactions?providerId=${user.id}`),
        get(`/api/provider/billing/invoices?providerId=${user.id}`)
      ]);

      if (summaryRes) setSummary(summaryRes);
      if (transactionsRes) setTransactions(transactionsRes.transactions || []);
      if (invoicesRes) setInvoices(invoicesRes.invoices || []);
    } catch (error) {
      console.error("Error fetching earnings data:", error);
    } finally {
      setLoading(false);
    }
  };

  const requestWithdrawal = async () => {
    const amount = parseFloat(withdrawalAmount);
    if (!amount || amount <= 0) {
      toast.error("Veuillez entrer un montant valide");
      return;
    }

    if (summary && amount > summary.availableForWithdrawal) {
      toast.error("Montant supérieur au solde disponible");
      return;
    }

    setIsWithdrawing(true);
    try {
      const response = await post("/api/provider/earnings/withdraw", {
        body: JSON.stringify({
          providerId: user?.id,
          amount
        })
      });

      if (response) {
        toast.success("Demande de virement envoyée");
        setWithdrawalAmount("");
        fetchEarningsData();
      }
    } catch (error) {
      toast.error("Erreur lors de la demande de virement");
    } finally {
      setIsWithdrawing(false);
    }
  };

  const downloadInvoice = async (invoiceId: string) => {
    try {
      const response = await get(`/api/provider/billing/invoices/${invoiceId}/download`);
      if (response?.url) {
        window.open(response.url, "_blank");
      }
    } catch (error) {
      toast.error("Erreur lors du téléchargement de la facture");
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                  <div className="h-8 bg-gray-200 rounded w-full"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const monthlyTrend = summary 
    ? ((summary.currentMonth - summary.previousMonth) / summary.previousMonth) * 100 
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground mt-2">{t("description")}</p>
      </div>

      {/* Statistiques principales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gains ce mois</CardTitle>
            <Euro className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.currentMonth.toFixed(2)}€</div>
            <p className="text-xs text-muted-foreground flex items-center mt-1">
              {monthlyTrend > 0 ? (
                <>
                  <ArrowUpRight className="h-3 w-3 text-green-600 mr-1" />
                  <span className="text-green-600">+{monthlyTrend.toFixed(1)}%</span>
                </>
              ) : monthlyTrend < 0 ? (
                <>
                  <ArrowDownRight className="h-3 w-3 text-red-600 mr-1" />
                  <span className="text-red-600">{monthlyTrend.toFixed(1)}%</span>
                </>
              ) : (
                <span>Stable</span>
              )}
              <span className="ml-1">vs mois dernier</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Disponible au retrait</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {summary?.availableForWithdrawal.toFixed(2)}€
            </div>
            <p className="text-xs text-muted-foreground">
              {summary?.pendingAmount.toFixed(2)}€ en attente
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total des gains</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.totalEarnings.toFixed(2)}€</div>
            {summary?.lastWithdrawal && (
              <p className="text-xs text-muted-foreground">
                Dernier retrait: {summary.lastWithdrawal.amount}€
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Demande de virement */}
      <Card>
        <CardHeader>
          <CardTitle>Demander un virement</CardTitle>
          <CardDescription>
            Les virements sont effectués sous 3-5 jours ouvrés
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="amount">Montant à retirer</Label>
              <div className="relative mt-1">
                <Euro className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={withdrawalAmount}
                  onChange={(e) => setWithdrawalAmount(e.target.value)}
                  className="pl-10"
                  max={summary?.availableForWithdrawal}
                />
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Maximum: {summary?.availableForWithdrawal.toFixed(2)}€
              </p>
            </div>
            <div className="flex items-end">
              <Button 
                onClick={requestWithdrawal}
                disabled={isWithdrawing || !withdrawalAmount || parseFloat(withdrawalAmount) <= 0}
              >
                {isWithdrawing ? "Traitement..." : "Demander le virement"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Historique et factures */}
      <Tabs defaultValue="transactions" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="transactions">Historique des transactions</TabsTrigger>
          <TabsTrigger value="invoices">Factures mensuelles</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Transactions récentes</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Montant</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        {format(new Date(transaction.createdAt), "dd/MM/yyyy", { locale: fr })}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{transaction.description}</p>
                          {transaction.serviceName && (
                            <p className="text-sm text-muted-foreground">{transaction.serviceName}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={transaction.type === "EARNING" ? "default" : "secondary"}>
                          {transaction.type === "EARNING" ? "Gain" : 
                           transaction.type === "WITHDRAWAL" ? "Retrait" : "Remboursement"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {transaction.status === "COMPLETED" && (
                          <Badge variant="outline" className="text-green-600">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Complété
                          </Badge>
                        )}
                        {transaction.status === "PENDING" && (
                          <Badge variant="outline" className="text-yellow-600">
                            <Clock className="h-3 w-3 mr-1" />
                            En attente
                          </Badge>
                        )}
                        {transaction.status === "FAILED" && (
                          <Badge variant="outline" className="text-red-600">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Échoué
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        <span className={transaction.type === "EARNING" ? "text-green-600" : "text-red-600"}>
                          {transaction.type === "EARNING" ? "+" : "-"}{transaction.amount.toFixed(2)}€
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Factures mensuelles</CardTitle>
              <CardDescription>
                Générées automatiquement le 30 de chaque mois à 23h
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {invoices.map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-gray-100 rounded">
                        <FileText className="h-5 w-5 text-gray-600" />
                      </div>
                      <div>
                        <h4 className="font-medium">
                          Facture {format(new Date(`${invoice.year}-${invoice.month}-01`), "MMMM yyyy", { locale: fr })}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {invoice.servicesCount} prestations • {invoice.totalAmount.toFixed(2)}€
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={invoice.status === "PAID" ? "default" : "secondary"}>
                        {invoice.status === "PAID" ? "Payée" : 
                         invoice.status === "GENERATED" ? "Générée" : "En attente"}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadInvoice(invoice.id)}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Télécharger
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Information importante */}
      <Card className="bg-amber-50 border-amber-200">
        <CardHeader>
          <CardTitle className="text-amber-900">Informations importantes</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-amber-800">
            <li>• La facturation est automatique le 30 de chaque mois à 23h</li>
            <li>• Les virements sont effectués automatiquement après génération de la facture</li>
            <li>• Les gains sont calculés selon les tarifs négociés avec EcoDeli</li>
            <li>• Conservez toutes vos factures pour votre comptabilité d'autoentrepreneur</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
} 