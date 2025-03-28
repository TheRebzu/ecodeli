import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Eye, Download, Search, PlusCircle } from "lucide-react";
import Link from "next/link";
import { InvoiceStatus } from "@prisma/client";

export default async function InvoicesPage() {
  // Récupération des factures depuis la base de données
  const invoices = await prisma.invoice.findMany({
    include: {
      items: true,
      payment: true,
    },
    orderBy: {
      issueDate: "desc",
    },
  });

  // Statistiques
  const totalInvoices = invoices.length;
  const paidInvoices = invoices.filter(
    (invoice) => invoice.status === InvoiceStatus.PAID
  ).length;
  const pendingInvoices = invoices.filter(
    (invoice) => invoice.status === InvoiceStatus.UNPAID
  ).length;
  const totalAmount = invoices.reduce((acc, invoice) => acc + invoice.total, 0);

  // Formatter le statut pour l'affichage
  const getStatusBadge = (status: InvoiceStatus) => {
    switch (status) {
      case InvoiceStatus.PAID:
        return <Badge variant="success">Payée</Badge>;
      case InvoiceStatus.UNPAID:
        return <Badge variant="default">En attente</Badge>;
      case InvoiceStatus.DRAFT:
        return <Badge variant="secondary">Brouillon</Badge>;
      case InvoiceStatus.CANCELLED:
        return <Badge variant="destructive">Annulée</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Gestion des factures</h1>
          <p className="text-slate-500">
            Consultez et gérez les factures de la plateforme
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2">
            <PlusCircle className="h-4 w-4" />
            <span>Créer une facture</span>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total factures</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalInvoices}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Factures payées</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{paidInvoices}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Factures en attente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingInvoices}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Montant total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAmount.toFixed(2)} €</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>Liste des factures</CardTitle>
              <CardDescription>
                {totalInvoices} factures enregistrées
              </CardDescription>
            </div>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
              <Input
                type="search"
                placeholder="Rechercher une facture..."
                className="w-full pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-100 dark:bg-slate-800">
                  <th className="px-4 py-3 text-left font-medium">Numéro</th>
                  <th className="px-4 py-3 text-left font-medium">Description</th>
                  <th className="px-4 py-3 text-left font-medium">Date d&apos;émission</th>
                  <th className="px-4 py-3 text-left font-medium">Date d&apos;échéance</th>
                  <th className="px-4 py-3 text-left font-medium">Montant</th>
                  <th className="px-4 py-3 text-left font-medium">Statut</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b">
                    <td className="px-4 py-3 font-medium">#{invoice.invoiceNumber}</td>
                    <td className="px-4 py-3">
                      {invoice.notes || `Facture ${invoice.invoiceNumber}`}
                    </td>
                    <td className="px-4 py-3">
                      {new Date(invoice.issueDate).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="px-4 py-3">
                      {new Date(invoice.dueDate).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="px-4 py-3">{invoice.total.toFixed(2)} €</td>
                    <td className="px-4 py-3">
                      {getStatusBadge(invoice.status)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/admin/invoices/${invoice.id}`}
                          className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 w-8"
                        >
                          <Eye className="h-4 w-4" />
                          <span className="sr-only">Voir la facture</span>
                        </Link>
                        <Button variant="outline" size="icon" className="h-8 w-8">
                          <Download className="h-4 w-4" />
                          <span className="sr-only">Télécharger</span>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 