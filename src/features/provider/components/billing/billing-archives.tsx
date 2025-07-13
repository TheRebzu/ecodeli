"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, Download, Calendar, Search, Euro } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

interface Invoice {
  id: string;
  type: string;
  status: string;
  totalAmount: number;
  periodStart: string;
  periodEnd: string;
  dueDate?: string;
  paidAt?: string;
  pdfUrl?: string;
  createdAt: string;
  itemsCount: number;
}

export function BillingArchives() {
  const t = useTranslations("provider.billing.archives");
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (!user?.id) return;
    fetchInvoices();
  }, [user?.id, page, statusFilter, yearFilter]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);

      let url = `/api/provider/billing/invoices?providerId=${user?.id}&page=${page}&limit=10`;
      if (statusFilter !== "all") {
        url += `&status=${statusFilter}`;
      }

      const response = await fetch(url);
      const data = await response.json();

      if (data.invoices) {
        let filteredInvoices = data.invoices;

        // Filtrer par année
        if (yearFilter !== "all") {
          filteredInvoices = filteredInvoices.filter((invoice: Invoice) => {
            const year = new Date(invoice.periodStart).getFullYear().toString();
            return year === yearFilter;
          });
        }

        setInvoices(filteredInvoices);
        setTotalPages(data.pagination?.totalPages || 1);
      }
    } catch (error) {
      console.error("Error fetching invoices:", error);
      toast.error("Erreur lors du chargement des factures");
    } finally {
      setLoading(false);
    }
  };

  const downloadInvoice = async (invoiceId: string) => {
    try {
      const response = await fetch(
        `/api/provider/billing/invoices/${invoiceId}/download`,
      );
      const data = await response.json();

      if (data.url) {
        window.open(data.url, "_blank");
        toast.success("Téléchargement de la facture démarré");
      }
    } catch (error) {
      toast.error("Erreur lors du téléchargement de la facture");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PAID":
        return <Badge className="bg-green-100 text-green-800">Payée</Badge>;
      case "GENERATED":
        return <Badge className="bg-blue-100 text-blue-800">Générée</Badge>;
      case "PENDING":
        return (
          <Badge className="bg-yellow-100 text-yellow-800">En attente</Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Calculer les années disponibles
  const availableYears = Array.from(
    new Set(
      invoices.map((invoice) => new Date(invoice.periodStart).getFullYear()),
    ),
  ).sort((a, b) => b - a);

  // Calculer les totaux
  const totalAmount = invoices.reduce(
    (sum, invoice) => sum + invoice.totalAmount,
    0,
  );
  const paidAmount = invoices
    .filter((invoice) => invoice.status === "PAID")
    .reduce((sum, invoice) => sum + invoice.totalAmount, 0);

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground mt-2">{t("description")}</p>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total factures
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{invoices.length}</div>
            <p className="text-xs text-muted-foreground">Factures générées</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Montant total</CardTitle>
            <Euro className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAmount.toFixed(2)}€</div>
            <p className="text-xs text-muted-foreground">
              Toutes factures confondues
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Montant perçu</CardTitle>
            <Euro className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {paidAmount.toFixed(2)}€
            </div>
            <p className="text-xs text-muted-foreground">Factures payées</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtres */}
      <Card>
        <CardHeader>
          <CardTitle>Filtres</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
                icon={<Search className="h-4 w-4" />}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="PAID">Payées</SelectItem>
                <SelectItem value="GENERATED">Générées</SelectItem>
                <SelectItem value="PENDING">En attente</SelectItem>
              </SelectContent>
            </Select>
            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Année" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les années</SelectItem>
                {availableYears.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Liste des factures */}
      <Card>
        <CardHeader>
          <CardTitle>Historique des factures</CardTitle>
          <CardDescription>
            Toutes vos factures mensuelles générées automatiquement
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>N° Facture</TableHead>
                <TableHead>Période</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Date génération</TableHead>
                <TableHead>Date paiement</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">
                    {invoice.id.slice(0, 8).toUpperCase()}
                  </TableCell>
                  <TableCell>
                    {format(new Date(invoice.periodStart), "MMMM yyyy", {
                      locale: fr,
                    })}
                  </TableCell>
                  <TableCell className="font-semibold">
                    {invoice.totalAmount.toFixed(2)}€
                  </TableCell>
                  <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                  <TableCell>
                    {format(new Date(invoice.createdAt), "dd/MM/yyyy")}
                  </TableCell>
                  <TableCell>
                    {invoice.paidAt
                      ? format(new Date(invoice.paidAt), "dd/MM/yyyy")
                      : "-"}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadInvoice(invoice.id)}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      PDF
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {invoices.length === 0 && (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-muted-foreground">Aucune facture trouvée</p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
              >
                Précédent
              </Button>
              <span className="flex items-center px-3 text-sm">
                Page {page} sur {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page + 1)}
                disabled={page === totalPages}
              >
                Suivant
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Informations importantes */}
      <Card className="bg-gray-50 border-gray-200">
        <CardHeader>
          <CardTitle>Informations importantes</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li>
              • Les factures sont générées automatiquement le 30 de chaque mois
              à 23h00
            </li>
            <li>
              • Le paiement est effectué par virement bancaire sous 5 jours
              ouvrés
            </li>
            <li>
              • Conservez toutes vos factures pour votre déclaration URSSAF
            </li>
            <li>
              • En cas de problème, contactez le service comptabilité d'EcoDeli
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
