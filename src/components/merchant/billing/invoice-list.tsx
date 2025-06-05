'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  FileText,
  Download,
  Eye,
  Filter,
  Calendar,
  DollarSign,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
// import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { api } from '@/trpc/react';

interface MerchantInvoiceListProps {
  className?: string;
}

/**
 * Composant pour afficher la liste des factures d'un merchant
 * Réutilise les services invoice et billing existants
 */
export function MerchantInvoiceList({ className }: MerchantInvoiceListProps) {
  const t = useTranslations('merchant.invoices');
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<
    'ALL' | 'DRAFT' | 'PENDING' | 'PAID' | 'CANCELLED' | 'REFUNDED'
  >('ALL');
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [invoiceTypeFilter, setInvoiceTypeFilter] = useState<'MERCHANT_FEE' | 'SERVICE' | 'OTHER'>(
    'MERCHANT_FEE'
  );

  // Récupérer les factures du merchant
  const { data: invoicesData, isLoading: invoicesLoading } =
    api.invoice.getMerchantInvoices.useQuery({
      page: currentPage,
      limit: 10,
      status: statusFilter === 'ALL' ? undefined : statusFilter,
      startDate: dateRange.from,
      endDate: dateRange.to,
      invoiceType: invoiceTypeFilter,
      sortOrder: 'desc',
    });

  // Récupérer les statistiques de facturation
  const { data: stats, isLoading: statsLoading } = api.invoice.getMerchantBillingStats.useQuery({
    period: 'MONTH',
  });

  const invoices = invoicesData?.invoices || [];
  const pagination = invoicesData?.pagination;
  const loading = invoicesLoading || statsLoading;

  // Formatage des montants
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  // Formatage des dates
  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return format(dateObj, 'dd/MM/yyyy', { locale: fr });
  };

  // Badge de statut de facture
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      DRAFT: { variant: 'secondary' as const, label: 'Brouillon', color: 'text-gray-600' },
      PENDING: { variant: 'default' as const, label: 'En attente', color: 'text-orange-600' },
      PAID: { variant: 'default' as const, label: 'Payée', color: 'text-green-600' },
      CANCELLED: { variant: 'destructive' as const, label: 'Annulée', color: 'text-red-600' },
      REFUNDED: { variant: 'outline' as const, label: 'Remboursée', color: 'text-blue-600' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.DRAFT;
    return (
      <Badge variant={config.variant} className={config.color}>
        {config.label}
      </Badge>
    );
  };

  // Actions sur les factures
  const handleViewInvoice = (invoiceId: string) => {
    window.open(`/merchant/invoices/${invoiceId}`, '_blank');
  };

  const handleDownloadInvoice = async (invoiceId: string) => {
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/download`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `facture-${invoiceId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Erreur téléchargement facture:', error);
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* En-tête avec statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Factures ce mois</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? <Skeleton className="h-8 w-12" /> : stats?.totalInvoices || 0}
            </div>
            <p className="text-xs text-muted-foreground">Total des factures</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Montant total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                formatCurrency(stats?.totalAmount || 0)
              )}
            </div>
            <p className="text-xs text-muted-foreground">Facturé ce mois</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Factures payées</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? <Skeleton className="h-8 w-12" /> : stats?.paidInvoices || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {loading ? (
                <Skeleton className="h-4 w-16" />
              ) : (
                `${stats?.paymentRate.toFixed(1)}% payées`
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En attente</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? <Skeleton className="h-8 w-12" /> : stats?.pendingInvoices || 0}
            </div>
            <p className="text-xs text-muted-foreground">Paiements à recevoir</p>
          </CardContent>
        </Card>
      </div>

      {/* Alertes */}
      {!loading && stats && stats.pendingInvoices > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Factures en attente</AlertTitle>
          <AlertDescription>
            Vous avez {stats.pendingInvoices} facture(s) en attente de paiement pour un montant
            total de {formatCurrency((stats.totalAmount || 0) - (stats.paidAmount || 0))}.
          </AlertDescription>
        </Alert>
      )}

      {/* Filtres */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtres de recherche
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Filtre par statut */}
            <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tous les statuts</SelectItem>
                <SelectItem value="DRAFT">Brouillons</SelectItem>
                <SelectItem value="PENDING">En attente</SelectItem>
                <SelectItem value="PAID">Payées</SelectItem>
                <SelectItem value="CANCELLED">Annulées</SelectItem>
                <SelectItem value="REFUNDED">Remboursées</SelectItem>
              </SelectContent>
            </Select>

            {/* Filtre par type */}
            <Select
              value={invoiceTypeFilter}
              onValueChange={(value: any) => setInvoiceTypeFilter(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Type de facture" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MERCHANT_FEE">Frais merchants</SelectItem>
                <SelectItem value="SERVICE">Services</SelectItem>
                <SelectItem value="OTHER">Autres</SelectItem>
              </SelectContent>
            </Select>

            {/* Filtre par période */}
            <div className="flex gap-2">
              <input
                type="date"
                value={dateRange.from ? dateRange.from.toISOString().split('T')[0] : ''}
                onChange={e =>
                  setDateRange(prev => ({
                    ...prev,
                    from: e.target.value ? new Date(e.target.value) : undefined,
                  }))
                }
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
              <input
                type="date"
                value={dateRange.to ? dateRange.to.toISOString().split('T')[0] : ''}
                onChange={e =>
                  setDateRange(prev => ({
                    ...prev,
                    to: e.target.value ? new Date(e.target.value) : undefined,
                  }))
                }
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            {/* Bouton reset */}
            <Button
              variant="outline"
              onClick={() => {
                setStatusFilter('ALL');
                setInvoiceTypeFilter('MERCHANT_FEE');
                setDateRange({});
                setCurrentPage(1);
              }}
            >
              Réinitialiser
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tableau des factures */}
      <Card>
        <CardHeader>
          <CardTitle>Mes factures</CardTitle>
          <CardDescription>Historique de vos factures et paiements</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Numéro</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Échéance</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading
                ? // Skeleton de chargement
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      {[...Array(7)].map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                : invoices.map((invoice: any) => (
                    <TableRow key={invoice.id}>
                      <TableCell>
                        <div className="font-medium">{invoice.invoiceNumber}</div>
                      </TableCell>
                      <TableCell>{formatDate(invoice.issuedDate)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {invoice.invoiceType === 'MERCHANT_FEE'
                            ? 'Frais merchant'
                            : invoice.invoiceType === 'SERVICE'
                              ? 'Service'
                              : 'Autre'}
                        </Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {formatCurrency(parseFloat(invoice.totalAmount.toString()))}
                        </div>
                        {invoice.payments && invoice.payments.length > 0 && (
                          <div className="text-sm text-muted-foreground">
                            {invoice.payments.length} paiement(s)
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{invoice.dueDate ? formatDate(invoice.dueDate) : '-'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewInvoice(invoice.id)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Voir
                          </Button>

                          {invoice.pdfUrl && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownloadInvoice(invoice.id)}
                            >
                              <Download className="h-4 w-4 mr-1" />
                              PDF
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}

              {!loading && invoices.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Aucune facture trouvée</p>
                    <p className="text-sm">Vos factures apparaîtront ici une fois générées</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Affichage de {(currentPage - 1) * 10 + 1} à{' '}
            {Math.min(currentPage * 10, pagination.total)} sur {pagination.total} factures
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(currentPage - 1)}
            >
              Précédent
            </Button>

            <div className="flex items-center gap-1">
              {[...Array(Math.min(5, pagination.pages))].map((_, i) => {
                const page = i + 1;
                return (
                  <Button
                    key={page}
                    variant={currentPage === page ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </Button>
                );
              })}
            </div>

            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= pagination.pages}
              onClick={() => setCurrentPage(currentPage + 1)}
            >
              Suivant
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
