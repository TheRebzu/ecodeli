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
import {
  Loader2,
  FileDown,
  Search,
  X,
  Filter,
  Eye,
  Calendar,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Receipt,
  AlertCircle,
  CheckCircle,
  Clock,
  Zap,
  RefreshCcw,
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { formatCurrency, formatDate } from '@/lib/utils';
import { api } from '@/trpc/react';
import { Payment, PaymentStatus } from '@prisma/client';
import { DateRange } from 'react-day-picker';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { usePaymentHistory } from '@/hooks/use-payment';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';

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
  const dateFields = [
    'createdAt',
    'updatedAt',
    'deliveryDate',
    'dueDate',
    'processedAt',
    'completedAt',
  ];

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
  isDemo?: boolean;
  showEmptyState?: boolean;
  emptyStateMessage?: string;
  showRefreshButton?: boolean;
  onRefresh?: () => void;
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
    console.error("Erreur lors de l'accès à la propriété:", path, error);
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
  onViewDetails,
  isDemo = false,
  showEmptyState = true,
  emptyStateMessage,
  showRefreshButton = false,
  onRefresh,
}: PaymentHistoryProps) {
  const t = useTranslations('payment');

  // Utiliser notre hook personnalisé pour l'historique des paiements
  const {
    paymentHistory,
    isRefreshing,
    loadPaymentHistory,
    filterPaymentHistory,
    isDemoMode,
  } = usePaymentHistory();

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
    refetch,
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
      enabled: !!userId && !(isDemo || isDemoMode),
    }
  );

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
      ...displayData.payments.map(payment =>
        [
          safeFormatDate(payment.createdAt, 'dd/MM/yyyy HH:mm'),
          getPaymentType(payment),
          payment.status,
          `${safeAmount(payment.amount, safeGet(payment, 'currency', 'EUR'))}`,
          `"${getPaymentDescription(payment)}"`,
          payment.metadata?.reference || '',
        ].join(',')
      ),
    ].join('\n');

    // Créer un blob et déclencher le téléchargement
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `payment_history_${safeFormatDate(new Date(), 'yyyy-MM-dd')}.csv`
    );
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
          label: t('statusCompleted'),
        };
      case 'PENDING':
        return {
          variant: 'secondary' as const,
          icon: <Clock className="h-3 w-3 mr-1" />,
          label: t('statusPending'),
        };
      case 'FAILED':
        return {
          variant: 'destructive' as const,
          icon: <AlertCircle className="h-3 w-3 mr-1" />,
          label: t('statusFailed'),
        };
      case 'REFUNDED':
        return {
          variant: 'outline' as const,
          icon: <Receipt className="h-3 w-3 mr-1" />,
          label: t('statusRefunded'),
        };
      default:
        return {
          variant: 'secondary' as const,
          icon: <CreditCard className="h-3 w-3 mr-1" />,
          label: status,
        };
    }
  };

  // Fonction de rafraîchissement des données
  const handleRefresh = async () => {
    if (isDemo || isDemoMode) {
      // En mode démo, utiliser notre hook personnalisé
      await loadPaymentHistory(page, itemsPerPage);
    } else {
      // Sinon, rafraîchir les données via tRPC
      await refetch();
    }

    // Callback personnalisé si fourni
    if (onRefresh) {
      onRefresh();
    }
  };

  // Détermine si on est en mode démo
  const inDemoMode = isDemo || isDemoMode;

  // Générer des données de démonstration si nécessaire
  const getDisplayData = () => {
    // Si des données d'API existent et que nous ne sommes pas en mode démo, les utiliser
    if (apiData && !inDemoMode) {
      return {
        ...apiData,
        payments: apiData.payments.map(normalizePayment),
      };
    }

    // Si des paiements sont passés en prop, les utiliser
    if (payments.length > 0) {
      return {
        payments: payments.map(normalizePayment),
        pagination: {
          total: payments.length,
          totalPages: Math.ceil(payments.length / itemsPerPage),
          page: 1,
          limit: itemsPerPage,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };
    }

    // En mode démo, utiliser les données de notre hook personnalisé
    if (inDemoMode && paymentHistory) {
      return {
        payments: paymentHistory.data || [],
        pagination: paymentHistory.pagination || {
          total: 0,
          page: page,
          limit: itemsPerPage,
          totalPages: 0,
        },
      };
    }

    // Par défaut, retourner un objet vide
    return {
      payments: [],
      pagination: {
        total: 0,
        page: 1,
        limit: itemsPerPage,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    };
  };

  const displayData = getDisplayData();

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <div>
              <CardTitle>{t('paymentHistory')}</CardTitle>
              <CardDescription>{t('paymentHistoryDescription')}</CardDescription>
            </div>
            {inDemoMode && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 flex items-center gap-1">
                      <Zap className="h-3 w-3" />
                      {t('demoMode')}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t('demoPaymentHistoryDescription')}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          <div className="flex mt-2 sm:mt-0 gap-2">
            {showRefreshButton && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isLoading || isRefreshing}
              >
                {isRefreshing || isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCcw className="h-4 w-4" />
                )}
                <span className="ml-2 sr-only sm:not-sr-only">{t('refresh')}</span>
              </Button>
            )}
            {showExportButton && (
              <Button
                variant="outline"
                size="sm"
                disabled={isLoading || !displayData?.payments?.length}
                onClick={exportToCsv}
              >
                <FileDown className="mr-2 h-4 w-4" />
                {t('exportToCsv')}
              </Button>
            )}
          </div>
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
                  onChange={e => setSearchQuery(e.target.value)}
                  aria-label={t('searchPayments')}
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setSearchQuery('')}
                    aria-label={t('clear')}
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">{t('clear')}</span>
                  </Button>
                )}
              </div>
              <Select
                value={statusFilter || 'ALL'}
                onValueChange={value => setStatusFilter(value === 'ALL' ? undefined : value)}
              >
                <SelectTrigger className="w-full sm:w-[150px]" aria-label={t('statusFilter')}>
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
              <Select
                value={typeFilter || 'ALL'}
                onValueChange={value => setTypeFilter(value === 'ALL' ? undefined : value)}
              >
                <SelectTrigger className="w-full sm:w-[150px]" aria-label={t('typeFilter')}>
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
            </div>

            {/* Date range picker */}
            <div className="flex justify-between">
              <div className="flex items-center space-x-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 px-2 lg:px-3">
                      <Calendar className="mr-2 h-4 w-4" />
                      {dateRange?.from ? (
                        dateRange.to ? (
                          <>
                            {safeFormatDate(dateRange.from, 'dd/MM/yyyy')} -{' '}
                            {safeFormatDate(dateRange.to, 'dd/MM/yyyy')}
                          </>
                        ) : (
                          safeFormatDate(dateRange.from, 'dd/MM/yyyy')
                        )
                      ) : (
                        <span>{t('dateRange')}</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      initialFocus
                      mode="range"
                      defaultMonth={dateRange?.from}
                      selected={dateRange as any}
                      onSelect={value => setDateRange(value || {})}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <Button variant="ghost" size="sm" onClick={resetFilters}>
                <X className="mr-2 h-4 w-4" />
                {t('resetFilters')}
              </Button>
            </div>
          </div>
        )}

        {/* État de chargement */}
        {isLoading && (
          <div className="space-y-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        )}

        {/* État d'erreur */}
        {isError && !inDemoMode && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t('error')}</AlertTitle>
            <AlertDescription>{t('errorLoadingPayments')}</AlertDescription>
          </Alert>
        )}

        {/* Tableau avec les paiements */}
        {!isLoading && !isError && displayData?.payments?.length > 0 && (
          <div className="rounded-md border">
            <Table>
              <TableCaption>
                {t('totalPayments', { count: displayData.pagination?.total || 0 })}
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('date')}</TableHead>
                  <TableHead>{t('description')}</TableHead>
                  <TableHead className="text-right">{t('amount')}</TableHead>
                  <TableHead className="text-center">{t('status')}</TableHead>
                  <TableHead className="text-center">{t('type')}</TableHead>
                  <TableHead className="text-right">{t('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayData.payments.map(payment => {
                  const status = safeGet(payment, 'status', 'PENDING');
                  const type = getPaymentType(payment);
                  const statusBadge = getStatusBadge(status as PaymentStatus);
                  const description = getPaymentDescription(payment);
                  const paymentId = safeGet(payment, 'id', '');
                  const amount = safeGet(payment, 'amount', 0);
                  const currency = safeGet(payment, 'currency', 'EUR');
                  const createdAt = safeGet(payment, 'createdAt', new Date());

                  return (
                    <TableRow key={paymentId} data-payment-id={paymentId}>
                      <TableCell className="font-medium">
                        {safeFormatDate(createdAt, 'dd/MM/yyyy')}
                        <div className="text-xs text-muted-foreground">
                          {safeFormatDate(createdAt, 'HH:mm')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[200px] truncate" title={description}>
                          {description}
                        </div>
                        {payment.metadata?.reference && (
                          <div className="text-xs text-muted-foreground">
                            {t('reference')}: {payment.metadata.reference}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={
                            type === 'REFUND' ? 'text-red-600' : amount < 0 ? 'text-red-600' : ''
                          }
                        >
                          {type === 'REFUND' && amount > 0 ? '-' : ''}
                          {safeAmount(amount, currency)}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={statusBadge.variant}
                          className={`flex items-center justify-center ${getStatusBadgeVariant(
                            status
                          )}`}
                        >
                          {statusBadge.icon}
                          <span className="hidden sm:inline">{statusBadge.label}</span>
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={`${getTypeBadgeVariant(type)}`}
                        >
                          {t(`type${type.charAt(0)}${type.slice(1).toLowerCase()}`)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {onViewDetails && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onViewDetails(paymentId)}
                            aria-label={t('viewDetails')}
                          >
                            <Eye className="h-4 w-4" />
                            <span className="sr-only">{t('viewDetails')}</span>
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* État vide */}
        {!isLoading && !isError && displayData?.payments?.length === 0 && showEmptyState && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CreditCard className="h-12 w-12 text-muted-foreground mb-3" />
            <h3 className="text-lg font-medium mb-1">{t('noPayments')}</h3>
            <p className="text-muted-foreground max-w-md mb-6">
              {emptyStateMessage || t('noPaymentsDescription')}
            </p>
            {inDemoMode && (
              <Button
                variant="outline"
                onClick={handleRefresh}
                disabled={isLoading || isRefreshing}
              >
                <Zap className="mr-2 h-4 w-4" />
                {t('generateDemoPayments')}
              </Button>
            )}
          </div>
        )}

        {/* Pagination */}
        {!isLoading &&
          !isError &&
          displayData?.payments?.length > 0 &&
          displayData.pagination &&
          displayData.pagination.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                      disabled={page === 1}
                      aria-label={t('previousPage')}
                    />
                  </PaginationItem>

                  {Array.from({ length: displayData.pagination.totalPages }, (_, i) => (
                    <PaginationItem key={i + 1}>
                      <Button
                        variant={page === i + 1 ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPage(i + 1)}
                        className="w-8 h-8"
                        aria-label={t('goToPage', { page: i + 1 })}
                        aria-current={page === i + 1 ? 'page' : undefined}
                      >
                        {i + 1}
                      </Button>
                    </PaginationItem>
                  ))}

                  <PaginationItem>
                    <PaginationNext
                      onClick={() =>
                        setPage(prev => Math.min(prev + 1, displayData.pagination.totalPages))
                      }
                      disabled={page === displayData.pagination.totalPages}
                      aria-label={t('nextPage')}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
      </CardContent>
    </Card>
  );
}
