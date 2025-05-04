'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { format } from 'date-fns';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Loader2, FileDown, Search, X, Filter, Eye, Calendar, ChevronLeft, ChevronRight, CreditCard, Receipt, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { formatCurrency, formatDate } from '@/lib/utils';
import { api } from '@/trpc/react';
import { Payment, PaymentStatus } from '@prisma/client';
import { DateRange } from 'react-day-picker';

// Fonction utilitaire pour formater les dates en toute sécurité
const safeFormatDate = (dateValue: any, formatString: string, fallback: string = '-') => {
  if (!dateValue) return fallback;
  
  try {
    // Tenter de convertir en Date selon différents formats possibles
    let date: Date;
    
    if (dateValue instanceof Date) {
      date = dateValue;
    } else if (typeof dateValue === 'string') {
      // Essayer de convertir la chaîne en date
      date = new Date(dateValue);
      
      // Si la date est invalide, essayer de parser des formats spécifiques
      if (isNaN(date.getTime())) {
        // Format ISO sans timezone
        if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(dateValue)) {
          date = new Date(dateValue + 'Z');
        } 
        // Format date uniquement
        else if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
          const [year, month, day] = dateValue.split('-').map(Number);
          date = new Date(year, month - 1, day);
        }
        // Format timestamp en ms
        else if (/^\d+$/.test(dateValue)) {
          date = new Date(parseInt(dateValue));
        }
      }
    } else if (typeof dateValue === 'number') {
      date = new Date(dateValue);
    } else {
      return fallback;
    }
    
    // Vérifier que la date est valide
    if (isNaN(date.getTime())) {
      console.warn('Date invalide:', dateValue);
      return fallback;
    }
    
    return format(date, formatString);
  } catch (error) {
    console.error('Erreur de formatage de date:', error, dateValue);
    return fallback;
  }
};

// Fonction pour normaliser un objet payment et s'assurer que ses dates sont valides
const normalizePayment = (payment: any) => {
  // Faire une copie pour éviter de modifier l'original
  const normalizedPayment = { ...payment };
  
  // Vérifier et convertir les propriétés de type date
  const dateFields = ['createdAt', 'updatedAt', 'deliveryDate', 'dueDate', 'processedAt', 'completedAt'];
  
  dateFields.forEach(field => {
    if (normalizedPayment[field]) {
      try {
        // Tenter de convertir en Date si ce n'est pas déjà une instance de Date
        if (!(normalizedPayment[field] instanceof Date)) {
          const date = new Date(normalizedPayment[field]);
          
          // Vérifier que la date est valide avant de l'assigner
          if (!isNaN(date.getTime())) {
            normalizedPayment[field] = date;
          } else {
            // Si la date est invalide, la supprimer pour éviter les erreurs
            console.warn(`Champ de date invalide ${field}:`, normalizedPayment[field]);
            normalizedPayment[field] = null;
          }
        }
      } catch (error) {
        console.error(`Erreur lors de la conversion de la date ${field}:`, error);
        normalizedPayment[field] = null;
      }
    }
  });
  
  return normalizedPayment;
};

// Interface pour les props du composant
export interface PaymentHistoryProps {
  userId?: string;
  payments?: any[]; // Utiliser any[] pour permettre la compatibilité avec différentes formes de données
  showExportButton?: boolean;
  showFilters?: boolean;
  itemsPerPage?: number;
  className?: string;
  onViewDetails?: (paymentId: string) => void;
  totalCount?: number;
  currentPage?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
}

// Définir un type personnalisé compatible avec les besoins du composant Calendar
type CustomDateRange = {
  from?: Date;
  to?: Date;
};

// Fonction pour obtenir une valeur en toute sécurité
const safeGet = (obj: any, path: string, defaultValue: any = '') => {
  try {
    const parts = path.split('.');
    let current = obj;
    
    for (const part of parts) {
      if (current === null || current === undefined) {
        return defaultValue;
      }
      current = current[part];
    }
    
    return current === null || current === undefined ? defaultValue : current;
  } catch (error) {
    console.error('Erreur lors de l\'accès à la propriété:', path, error);
    return defaultValue;
  }
};

// Fonction pour sécuriser l'affichage des montants
const safeAmount = (amount: any, currency: string = 'EUR') => {
  if (amount === null || amount === undefined) return formatCurrency(0, currency);
  
  try {
    const numericAmount = typeof amount === 'string' ? parseFloat(amount) : Number(amount);
    if (isNaN(numericAmount)) return formatCurrency(0, currency);
    return formatCurrency(numericAmount, currency);
  } catch (error) {
    console.error('Erreur lors du formatage du montant:', amount, error);
    return formatCurrency(0, currency);
  }
};

export function PaymentHistory({
  userId,
  payments = [],
  showExportButton = true,
  showFilters = true,
  itemsPerPage = 10,
  className = '',
  onViewDetails
}: PaymentHistoryProps) {
  const t = useTranslations('payment');
  
  // États pour la pagination, le filtrage et le tri
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [typeFilter, setTypeFilter] = useState<string | undefined>(undefined);
  // Utiliser notre type personnalisé
  const [dateRange, setDateRange] = useState<CustomDateRange>({});
  const [searchQuery, setSearchQuery] = useState('');

  // Récupérer l'historique des paiements depuis l'API tRPC
  const {
    data: apiData,
    isLoading,
    isError,
  } = api.payment.getPaymentHistory.useQuery(
    {
      page,
      limit: itemsPerPage,
      status: statusFilter,
      type: typeFilter,
      startDate: dateRange.from,
      endDate: dateRange.to,
    },
    {
      // Désactiver la requête si userId n'est pas défini
      enabled: !!userId,
    }
  );
  
  // Normaliser les données de l'API si elles existent
  const normalizedApiData = apiData ? {
    ...apiData,
    payments: apiData.payments.map(normalizePayment)
  } : undefined;
  
  // Obtenir les données à afficher soit depuis l'API normalisée, soit depuis les props
  const displayData = normalizedApiData || (payments.length > 0 ? {
    payments: payments.map(normalizePayment),
    pagination: {
      totalCount: payments.length,
      totalPages: Math.ceil(payments.length / itemsPerPage),
      currentPage: 1,
      limit: itemsPerPage,
      hasNextPage: false,
      hasPreviousPage: false
    }
  } : undefined);

  // Fonction pour déterminer le type de paiement à partir de l'objet payment
  const getPaymentType = (payment: any) => {
    if (!payment) return 'PAYMENT';
    
    if (safeGet(payment, 'deliveryId')) return 'DELIVERY';
    if (safeGet(payment, 'serviceId')) return 'SERVICE';
    if (safeGet(payment, 'subscriptionId')) return 'SUBSCRIPTION';
    if (safeGet(payment, 'refunded')) return 'REFUND';
    if (safeGet(payment, 'metadata.type')) return safeGet(payment, 'metadata.type');
    return 'PAYMENT';
  };
  
  // Fonction pour obtenir la description du paiement
  const getPaymentDescription = (payment: any) => {
    if (!payment) return 'Paiement';
    
    if (safeGet(payment, 'metadata.description')) {
      return safeGet(payment, 'metadata.description');
    }
    
    if (safeGet(payment, 'delivery')) {
      return `Livraison #${safeGet(payment, 'delivery.trackingNumber', '') || safeGet(payment, 'deliveryId', '')}`;
    }
    
    if (safeGet(payment, 'service')) {
      return safeGet(payment, 'service.name', 'Service');
    }
    
    if (safeGet(payment, 'subscription')) {
      return `Abonnement ${safeGet(payment, 'subscription.planId', '')}`;
    }
    
    return 'Paiement';
  };
  
  // Fonction pour réinitialiser tous les filtres
  const resetFilters = () => {
    setStatusFilter(undefined);
    setTypeFilter(undefined);
    setDateRange({});
    setSearchQuery('');
    setPage(1);
  };

  // Fonction pour exporter les données au format CSV
  const exportToCsv = () => {
    if (!displayData?.payments?.length) return;

    // Créer le contenu CSV
    const headers = ['Date', 'Type', 'Status', 'Amount', 'Description', 'Reference'];
    const csvContent = [
      headers.join(','),
      ...displayData.payments.map((payment) => [
        safeFormatDate(payment.createdAt, 'dd/MM/yyyy HH:mm'),
        getPaymentType(payment),
        payment.status,
        `${safeAmount(payment.amount, safeGet(payment, 'currency', 'EUR'))}`,
        `"${getPaymentDescription(payment)}"`,
        payment.metadata?.reference || '',
      ].join(',')),
    ].join('\n');

    // Créer un blob et déclencher le téléchargement
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `payment_history_${safeFormatDate(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Fonction pour obtenir la couleur du badge en fonction du statut
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'outline bg-green-50 text-green-700 border-green-200';
      case 'PENDING':
        return 'outline bg-amber-50 text-amber-700 border-amber-200';
      case 'FAILED':
        return 'outline bg-red-50 text-red-700 border-red-200';
      case 'CANCELLED':
        return 'outline bg-slate-50 text-slate-700 border-slate-200';
      case 'REFUNDED':
        return 'outline bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'outline';
    }
  };

  // Fonction pour obtenir la couleur du badge en fonction du type
  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'PAYMENT':
        return 'outline bg-violet-50 text-violet-700 border-violet-200';
      case 'REFUND':
        return 'outline bg-blue-50 text-blue-700 border-blue-200';
      case 'SUBSCRIPTION':
        return 'outline bg-pink-50 text-pink-700 border-pink-200';
      case 'ESCROW_RELEASE':
        return 'outline bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'WITHDRAWAL':
        return 'outline bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'outline';
    }
  };

  const getStatusBadge = (status: PaymentStatus) => {
    switch (status) {
      case 'COMPLETED':
        return { 
          variant: 'default' as const,
          icon: <CheckCircle className="h-3 w-3 mr-1" />,
          label: t('statusCompleted')
        };
      case 'PENDING':
        return { 
          variant: 'secondary' as const,
          icon: <Clock className="h-3 w-3 mr-1" />,
          label: t('statusPending')
        };
      case 'FAILED':
        return { 
          variant: 'destructive' as const,
          icon: <AlertCircle className="h-3 w-3 mr-1" />,
          label: t('statusFailed')
        };
      case 'REFUNDED':
        return { 
          variant: 'outline' as const,
          icon: <Receipt className="h-3 w-3 mr-1" />,
          label: t('statusRefunded')
        };
      default:
        return { 
          variant: 'secondary' as const,
          icon: <CreditCard className="h-3 w-3 mr-1" />,
          label: status
        };
    }
  };

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>{t('paymentHistory')}</CardTitle>
            <CardDescription>{t('paymentHistoryDescription')}</CardDescription>
          </div>
          {showExportButton && (
            <Button
              variant="outline"
              size="sm"
              className="mt-2 sm:mt-0"
              disabled={isLoading || !displayData?.payments?.length}
              onClick={exportToCsv}
            >
              <FileDown className="mr-2 h-4 w-4" />
              {t('exportToCsv')}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {showFilters && (
          <div className="mb-6 space-y-4">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder={t('searchPayments')}
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setSearchQuery('')}
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">{t('clear')}</span>
                  </Button>
                )}
              </div>
              <Select value={statusFilter || 'ALL'} onValueChange={(value) => setStatusFilter(value === 'ALL' ? undefined : value)}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder={t('statusFilter')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{t('allStatuses')}</SelectItem>
                  <SelectItem value="PENDING">{t('statusPending')}</SelectItem>
                  <SelectItem value="COMPLETED">{t('statusCompleted')}</SelectItem>
                  <SelectItem value="FAILED">{t('statusFailed')}</SelectItem>
                  <SelectItem value="CANCELLED">{t('statusCancelled')}</SelectItem>
                  <SelectItem value="REFUNDED">{t('statusRefunded')}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter || 'ALL'} onValueChange={(value) => setTypeFilter(value === 'ALL' ? undefined : value)}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder={t('typeFilter')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{t('allTypes')}</SelectItem>
                  <SelectItem value="PAYMENT">{t('typePayment')}</SelectItem>
                  <SelectItem value="REFUND">{t('typeRefund')}</SelectItem>
                  <SelectItem value="SUBSCRIPTION">{t('typeSubscription')}</SelectItem>
                  <SelectItem value="ESCROW_RELEASE">{t('typeEscrowRelease')}</SelectItem>
                  <SelectItem value="WITHDRAWAL">{t('typeWithdrawal')}</SelectItem>
                </SelectContent>
              </Select>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={dateRange.from ? "outline" : "ghost"}
                    className="w-full sm:w-auto justify-start text-left font-normal flex items-center"
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {dateRange.from ? (
                      dateRange.to ? (
                        <>
                          {safeFormatDate(dateRange.from, 'dd/MM/yyyy')} - {safeFormatDate(dateRange.to, 'dd/MM/yyyy')}
                        </>
                      ) : (
                        safeFormatDate(dateRange.from, 'dd/MM/yyyy')
                      )
                    ) : (
                      <span>{t('dateRange')}</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <CalendarComponent
                    initialFocus
                    mode="range"
                    selected={dateRange as any} // Cast pour éviter les erreurs de type
                    onSelect={setDateRange as any} // Cast pour éviter les erreurs de type
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {displayData?.pagination?.totalCount
                  ? t('showingResults', {
                      start: (page - 1) * itemsPerPage + 1,
                      end: Math.min(page * itemsPerPage, displayData.pagination.totalCount),
                      total: displayData.pagination.totalCount,
                    })
                  : t('noResults')}
              </div>
              {(statusFilter || typeFilter || dateRange.from || searchQuery) && (
                <Button variant="ghost" size="sm" onClick={resetFilters} className="h-8 px-2">
                  <Filter className="mr-2 h-3 w-3" />
                  {t('resetFilters')}
                </Button>
              )}
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : isError ? (
          <div className="text-center py-8 text-muted-foreground">
            {t('errorLoadingPayments')}
          </div>
        ) : displayData?.payments?.length ? (
          <div className="overflow-x-auto">
            <Table>
              <TableCaption>{t('paymentHistoryCaption')}</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('date')}</TableHead>
                  <TableHead>{t('type')}</TableHead>
                  <TableHead>{t('amount')}</TableHead>
                  <TableHead>{t('description')}</TableHead>
                  <TableHead>{t('status')}</TableHead>
                  {onViewDetails && <TableHead className="text-right">{t('actions')}</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayData.payments.map((payment) => {
                  const statusBadge = getStatusBadge(safeGet(payment, 'status', 'PENDING') as PaymentStatus);
                  const paymentType = getPaymentType(payment);
                  return (
                    <TableRow key={safeGet(payment, 'id', `payment-${Math.random().toString(36).substring(2, 9)}`)}>
                      <TableCell className="font-medium">
                        {safeFormatDate(payment.createdAt, 'dd/MM/yyyy')}
                        <div className="text-xs text-muted-foreground">
                          {safeFormatDate(payment.createdAt, 'HH:mm')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getTypeBadgeVariant(paymentType)} variant="outline">
                          {t(`type${paymentType}`)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span
                          className={
                            ['REFUND', 'WITHDRAWAL'].includes(paymentType)
                              ? 'text-red-600'
                              : 'text-green-600'
                          }
                        >
                          {['REFUND', 'WITHDRAWAL'].includes(paymentType) ? '-' : '+'}
                          {safeAmount(payment.amount, safeGet(payment, 'currency', 'EUR'))}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[200px] truncate" title={getPaymentDescription(payment)}>
                          {getPaymentDescription(payment)}
                        </div>
                        {safeGet(payment, 'metadata.reference') && (
                          <div className="text-xs text-muted-foreground">
                            Ref: {safeGet(payment, 'metadata.reference', '')}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusBadge.variant} className="flex w-fit items-center">
                          {statusBadge.icon}
                          <span>{statusBadge.label}</span>
                        </Badge>
                      </TableCell>
                      {onViewDetails && (
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onViewDetails(safeGet(payment, 'id', ''))}
                          >
                            <Eye className="h-4 w-4" />
                            <span className="sr-only">{t('viewDetails')}</span>
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            {t('noPaymentsFound')}
          </div>
        )}
      </CardContent>
      {displayData && displayData.pagination.totalPages > 1 && (
        <CardFooter className="flex justify-center">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  aria-disabled={page === 1}
                  href="#"
                />
              </PaginationItem>
              {Array.from({ length: displayData.pagination.totalPages }, (_, i) => i + 1)
                .filter(
                  (pageNumber) =>
                    pageNumber === 1 ||
                    pageNumber === displayData.pagination.totalPages ||
                    Math.abs(pageNumber - page) <= 1
                )
                .map((pageNumber, idx, arr) => (
                  <React.Fragment key={pageNumber}>
                    {idx > 0 && arr[idx - 1] !== pageNumber - 1 && (
                      <PaginationItem>
                        <span className="px-4 py-2">...</span>
                      </PaginationItem>
                    )}
                    <PaginationItem>
                      <Button
                        variant={page === pageNumber ? 'default' : 'outline'}
                        size="icon"
                        onClick={() => setPage(pageNumber)}
                        className="w-9 h-9"
                      >
                        {pageNumber}
                      </Button>
                    </PaginationItem>
                  </React.Fragment>
                ))}
              <PaginationItem>
                <PaginationNext
                  onClick={() => setPage((p) => (p < displayData.pagination.totalPages ? p + 1 : p))}
                  aria-disabled={page === displayData.pagination.totalPages}
                  href="#"
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </CardFooter>
      )}
    </Card>
  );
}
