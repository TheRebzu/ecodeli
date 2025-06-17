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
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";

export default function MerchantInvoicesPage() {
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
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{billingStats.paidInvoices}</div>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(billingStats.paidAmount)} payé
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">En Attente</CardTitle>
              <Clock className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{billingStats.pendingInvoices}</div>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(billingStats.pendingAmount)} en attente
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtres de recherche */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtres
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher une facture..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Statut" />
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

            <DatePickerWithRange
              date={dateRange}
              onDateChange={setDateRange}
              placeholder="Période"
            />

            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("all");
                setDateRange(undefined);
              }}
            >
              Réinitialiser
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Liste des factures */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">Toutes</TabsTrigger>
          <TabsTrigger value="pending">En attente</TabsTrigger>
          <TabsTrigger value="paid">Payées</TabsTrigger>
          <TabsTrigger value="overdue">En retard</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {filteredInvoices.length > 0 ? (
            <div className="space-y-4">
              {filteredInvoices.map((invoice) => (
                <Card key={invoice.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <CardTitle className="text-lg">
                          Facture {invoice.invoiceNumber}
                        </CardTitle>
                        <CardDescription>
                          {invoice.description || "Facture de services"}
                        </CardDescription>
                      </div>
                      {getStatusBadge(invoice.status)}
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Montant:</span>
                        <div className="text-lg font-semibold text-green-600">
                          {formatCurrency(invoice.totalAmount)}
                        </div>
                      </div>
                      <div>
                        <span className="font-medium">Date d'émission:</span>
                        <div>{formatDate(invoice.createdAt)}</div>
                      </div>
                      <div>
                        <span className="font-medium">Date d'échéance:</span>
                        <div>{formatDate(invoice.dueDate)}</div>
                      </div>
                      <div>
                        <span className="font-medium">Services:</span>
                        <div>{invoice.items?.length || 0} ligne(s)</div>
                      </div>
                    </div>

                    {/* Détails des services */}
                    {invoice.items && invoice.items.length > 0 && (
                      <div className="border rounded-lg p-3 bg-muted/50">
                        <h4 className="font-medium mb-2">Détail des services:</h4>
                        <div className="space-y-1 text-sm">
                          {invoice.items.slice(0, 3).map((item, index) => (
                            <div key={index} className="flex justify-between">
                              <span>{item.description}</span>
                              <span>{formatCurrency(item.unitPrice * item.quantity)}</span>
                            </div>
                          ))}
                          {invoice.items.length > 3 && (
                            <div className="text-muted-foreground">
                              +{invoice.items.length - 3} autre(s) service(s)
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-4 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedInvoice(invoice.id)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Voir détails
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadInvoiceMutation.mutate({ invoiceId: invoice.id })}
                        disabled={downloadInvoiceMutation.isPending}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Télécharger PDF
                      </Button>

                      {(invoice.status === "SENT" || invoice.status === "OVERDUE") && (
                        <Button
                          size="sm"
                          onClick={() => payInvoiceMutation.mutate({ invoiceId: invoice.id })}
                          disabled={payInvoiceMutation.isPending}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Payer
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Aucune facture trouvée</h3>
                <p className="text-muted-foreground text-center max-w-md">
                  {searchTerm || statusFilter !== "all" || dateRange
                    ? "Aucune facture ne correspond à vos critères de recherche."
                    : "Vous n'avez pas encore de factures. Elles apparaîtront ici une fois vos services utilisés."
                  }
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Autres onglets avec filtres */}
        <TabsContent value="pending">
          {/* Factures en attente */}
        </TabsContent>

        <TabsContent value="paid">
          {/* Factures payées */}
        </TabsContent>

        <TabsContent value="overdue">
          {/* Factures en retard */}
        </TabsContent>
      </Tabs>

      {/* Alert pour factures en retard */}
      {billingStats && billingStats.overdueInvoices > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            Vous avez {billingStats.overdueInvoices} facture(s) en retard pour un montant de {formatCurrency(billingStats.overdueAmount)}.
            Veuillez effectuer le paiement pour éviter la suspension de service.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}