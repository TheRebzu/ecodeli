"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  FileText, 
  Download, 
  Eye, 
  Search, 
  Filter,
  Calendar,
  Euro,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  TrendingUp,
  TrendingDown
} from "lucide-react";
import { api } from "@/trpc/react";
import { useToast } from "@/components/ui/use-toast";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";

interface MerchantInvoicesDashboardProps {
  locale?: string;
}

export default function MerchantInvoicesDashboard({ locale }: MerchantInvoicesDashboardProps) {
  const { data: session } = useSession();
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [selectedInvoice, setSelectedInvoice] = useState<string | null>(null);

  // Récupérer les factures du commerçant
  const {
    data: invoices,
    isLoading: invoicesLoading,
    refetch: refetchInvoices
  } = api.merchant.billing.getInvoices.useQuery(
    { 
      merchantId: session?.user?.id || "",
      status: statusFilter !== "all" ? statusFilter : undefined,
      startDate: dateRange?.from,
      endDate: dateRange?.to,
      search: searchTerm || undefined
    },
    { enabled: !!session?.user?.id }
  );

  // Récupérer les statistiques de facturation
  const {
    data: billingStats,
    isLoading: statsLoading
  } = api.merchant.billing.getStats.useQuery(
    { merchantId: session?.user?.id || "" },
    { enabled: !!session?.user?.id }
  );

  // Mutation pour télécharger une facture
  const downloadInvoiceMutation = api.merchant.billing.downloadInvoice.useMutation({
    onSuccess: (result) => {
      // Créer et télécharger le fichier PDF
      const blob = new Blob([result.pdfData], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Téléchargement réussi",
        description: "La facture a été téléchargée",
        variant: "default"
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de télécharger la facture",
        variant: "destructive"
      });
    }
  });

  // Mutation pour payer une facture
  const payInvoiceMutation = api.merchant.billing.payInvoice.useMutation({
    onSuccess: () => {
      toast({
        title: "Paiement initié",
        description: "Le paiement de la facture a été initié",
        variant: "default"
      });
      refetchInvoices();
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'initier le paiement",
        variant: "destructive"
      });
    }
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "DRAFT":
        return <Badge variant="secondary"><FileText className="w-3 h-3 mr-1" />Brouillon</Badge>;
      case "SENT":
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />Envoyée</Badge>;
      case "PAID":
        return <Badge variant="default"><CheckCircle className="w-3 h-3 mr-1" />Payée</Badge>;
      case "OVERDUE":
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />En retard</Badge>;
      case "CANCELLED":
        return <Badge variant="secondary"><XCircle className="w-3 h-3 mr-1" />Annulée</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredInvoices = invoices?.invoices?.filter(invoice => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        invoice.invoiceNumber?.toLowerCase().includes(searchLower) ||
        invoice.description?.toLowerCase().includes(searchLower)
      );
    }
    return true;
  }) || [];

  if (invoicesLoading || statsLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Facturation</h1>
          <p className="text-muted-foreground">
            Gérez vos factures et suivez vos paiements
          </p>
        </div>
      </div>

      {/* Statistiques de facturation */}
      {billingStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Factures</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{billingStats.totalInvoices}</div>
              <p className="text-xs text-muted-foreground">
                +{billingStats.newInvoicesThisMonth} ce mois
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Montant Total</CardTitle>
              <Euro className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(billingStats.totalAmount)}</div>
              <p className="text-xs text-muted-foreground flex items-center">
                {billingStats.monthlyTrend > 0 ? (
                  <TrendingUp className="w-3 h-3 mr-1 text-green-600" />
                ) : (
                  <TrendingDown className="w-3 h-3 mr-1 text-red-600" />
                )}
                {Math.abs(billingStats.monthlyTrend)}% vs mois dernier
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Factures Payées</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{billingStats.paidInvoices}</div>
              <p className="text-xs text-muted-foreground">
                {billingStats.paymentRate}% taux de paiement
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">En Attente</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{billingStats.pendingInvoices}</div>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(billingStats.pendingAmount)} en attente
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtres et recherche */}
      <Card>
        <CardHeader>
          <CardTitle>Filtres de recherche</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Recherche</label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Numéro de facture..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Statut</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="DRAFT">Brouillon</SelectItem>
                  <SelectItem value="SENT">Envoyée</SelectItem>
                  <SelectItem value="PAID">Payée</SelectItem>
                  <SelectItem value="OVERDUE">En retard</SelectItem>
                  <SelectItem value="CANCELLED">Annulée</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Période</label>
              <DatePickerWithRange
                date={dateRange}
                onDateChange={setDateRange}
              />
            </div>

            <div className="flex items-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
                  setDateRange(undefined);
                }}
              >
                <Filter className="w-4 h-4 mr-2" />
                Réinitialiser
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Liste des factures */}
      <Tabs defaultValue="list" className="space-y-4">
        <TabsList>
          <TabsTrigger value="list">Liste des factures</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Mes Factures</CardTitle>
              <CardDescription>
                {invoices?.totalCount || 0} facture(s) trouvée(s)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredInvoices.length === 0 ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Aucune facture trouvée pour les critères sélectionnés.
                    </AlertDescription>
                  </Alert>
                ) : (
                  filteredInvoices.map((invoice) => (
                    <div
                      key={invoice.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                          <FileText className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="font-medium">{invoice.invoiceNumber}</h3>
                            {getStatusBadge(invoice.status)}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {invoice.description || "Facture EcoDeli"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Créée le {formatDate(invoice.createdAt)}
                            {invoice.dueDate && ` • Échéance le ${formatDate(invoice.dueDate)}`}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <p className="font-medium">
                            {formatCurrency(invoice.amount)}
                          </p>
                          {invoice.status === "OVERDUE" && (
                            <p className="text-xs text-red-600">
                              En retard depuis {invoice.daysOverdue} jour(s)
                            </p>
                          )}
                        </div>

                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downloadInvoiceMutation.mutate({ 
                              invoiceId: invoice.id 
                            })}
                            disabled={downloadInvoiceMutation.isPending}
                          >
                            <Download className="h-4 w-4" />
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedInvoice(invoice.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>

                          {(invoice.status === "SENT" || invoice.status === "OVERDUE") && (
                            <Button
                              size="sm"
                              onClick={() => payInvoiceMutation.mutate({ 
                                invoiceId: invoice.id 
                              })}
                              disabled={payInvoiceMutation.isPending}
                            >
                              Payer
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Analytics de Facturation</CardTitle>
              <CardDescription>
                Analyse de vos performances de facturation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Analytics détaillées disponibles bientôt</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 