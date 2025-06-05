'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CreditCard,
  Download,
  Filter,
  Search,
  Wallet,
  ChevronDown,
  Calendar,
  CircleDollarSign,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRightLeft,
  RefreshCw,
} from 'lucide-react';

import { api } from '@/trpc/react';
import { cn, formatCurrency } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';

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
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';

// Type d'une transaction
interface Transaction {
  id: string;
  type: 'PAYMENT' | 'REFUND' | 'WITHDRAWAL' | 'DEPOSIT';
  status: 'COMPLETED' | 'PENDING' | 'FAILED' | 'CANCELLED';
  amount: number;
  currency: string;
  date: Date;
  description: string;
  paymentMethod?: {
    type: string;
    last4?: string;
    brand?: string;
  };
  reference?: string;
  recipient?: {
    name: string;
    id: string;
  };
  metadata?: {
    invoiceId?: string;
    announcementId?: string;
    serviceId?: string;
  };
}

// Type d'un résumé de portefeuille
interface WalletSummary {
  balance: number;
  pendingBalance: number;
  currency: string;
  monthlyIncoming: number;
  monthlyOutgoing: number;
  recentActivity: {
    date: Date;
    amount: number;
    type: 'INCOMING' | 'OUTGOING';
  }[];
}

export default function PaymentsPage() {
  const t = useTranslations('payments');
  const { toast } = useToast();

  // États pour la pagination, le filtrage et la recherche
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | undefined>();
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  // Requête pour récupérer les transactions
  const {
    data: transactions,
    isLoading: isLoadingTransactions,
    refetch: refetchTransactions,
  } = api.payment.getClientTransactions.useQuery(
    {
      page: currentPage,
      limit: pageSize,
      type: typeFilter as any,
      status: statusFilter as any,
      search: searchQuery || undefined,
      startDate: startDate?.toISOString(),
      endDate: endDate?.toISOString(),
    },
    {
      keepPreviousData: true,
    }
  );

  // Requête pour récupérer le résumé du portefeuille
  const {
    data: walletSummary,
    isLoading: isLoadingWallet,
    refetch: refetchWallet,
  } = api.wallet.getClientWalletSummary.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  // Télécharger le relevé de transactions
  const handleDownloadStatement = async () => {
    try {
      toast({
        variant: 'default',
        title: t('downloadStarted'),
        description: t('statementDownloadStarted'),
      });

      // Dans une implémentation réelle, on appellerait une API pour générer
      // et télécharger le relevé de transactions
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('downloadError'),
        description: typeof error === 'string' ? error : t('genericError'),
      });
    }
  };

  // Rafraîchir les données
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refetchTransactions(), refetchWallet()]);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Réinitialiser les filtres
  const resetFilters = () => {
    setSearchQuery('');
    setTypeFilter(undefined);
    setStatusFilter(undefined);
    setStartDate(undefined);
    setEndDate(undefined);
    setCurrentPage(1);
  };

  // Obtenir la couleur selon le type de transaction
  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case 'PAYMENT':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'REFUND':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'WITHDRAWAL':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'DEPOSIT':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  // Obtenir l'icône selon le type de transaction
  const getTransactionTypeIcon = (type: string) => {
    switch (type) {
      case 'PAYMENT':
        return <ArrowUpIcon className="h-4 w-4" />;
      case 'REFUND':
        return <ArrowDownIcon className="h-4 w-4" />;
      case 'WITHDRAWAL':
        return <ArrowRightLeft className="h-4 w-4" />;
      case 'DEPOSIT':
        return <ArrowDownIcon className="h-4 w-4" />;
      default:
        return <CircleDollarSign className="h-4 w-4" />;
    }
  };

  // Obtenir la couleur selon le statut de transaction
  const getTransactionStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'PENDING':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'FAILED':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'CANCELLED':
        return 'bg-gray-50 text-gray-700 border-gray-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  // Obtenir l'icône selon le statut de transaction
  const getTransactionStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'PENDING':
        return <Clock className="h-4 w-4" />;
      case 'FAILED':
        return <XCircle className="h-4 w-4" />;
      case 'CANCELLED':
        return <XCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  // Calculer le nombre total de pages
  const totalPages = Math.ceil((transactions?.pagination.total || 0) / pageSize);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">{t('historyTitle')}</h1>
      <p className="text-muted-foreground">{t('historyDescription')}</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Résumé du portefeuille */}
        <div className="md:col-span-1 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                {t('walletBalance')}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {isLoadingWallet ? (
                <div className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ) : walletSummary ? (
                <div className="space-y-4">
                  <div>
                    <div className="text-3xl font-bold">
                      {formatCurrency(walletSummary.balance, walletSummary.currency)}
                    </div>

                    {walletSummary.pendingBalance > 0 && (
                      <div className="text-sm text-muted-foreground mt-1 flex items-center">
                        <Clock className="h-3.5 w-3.5 mr-1" />
                        {t('pendingBalance', {
                          amount: formatCurrency(
                            walletSummary.pendingBalance,
                            walletSummary.currency
                          ),
                        })}
                      </div>
                    )}
                  </div>

                  <div className="pt-2">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-muted-foreground">{t('monthlyActivity')}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-muted/40 p-2 rounded-md">
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <ArrowDownIcon className="h-3.5 w-3.5 text-green-500" />
                          {t('incoming')}
                        </div>
                        <div className="font-medium">
                          {formatCurrency(walletSummary.monthlyIncoming, walletSummary.currency)}
                        </div>
                      </div>
                      <div className="bg-muted/40 p-2 rounded-md">
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <ArrowUpIcon className="h-3.5 w-3.5 text-red-500" />
                          {t('outgoing')}
                        </div>
                        <div className="font-medium">
                          {formatCurrency(walletSummary.monthlyOutgoing, walletSummary.currency)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {walletSummary.recentActivity && walletSummary.recentActivity.length > 0 && (
                    <div className="pt-2">
                      <div className="text-sm text-muted-foreground mb-1">
                        {t('recentActivity')}
                      </div>
                      <div className="space-y-2">
                        {walletSummary.recentActivity.map((activity, index) => (
                          <div key={index} className="flex justify-between items-center text-sm">
                            <div className="flex items-center gap-1">
                              {activity.type === 'INCOMING' ? (
                                <ArrowDownIcon className="h-3.5 w-3.5 text-green-500" />
                              ) : (
                                <ArrowUpIcon className="h-3.5 w-3.5 text-red-500" />
                              )}
                              <span>
                                {format(new Date(activity.date), 'dd MMM', { locale: fr })}
                              </span>
                            </div>
                            <span
                              className={cn(
                                'font-medium',
                                activity.type === 'INCOMING' ? 'text-green-600' : 'text-red-600'
                              )}
                            >
                              {activity.type === 'INCOMING' ? '+' : '-'}
                              {formatCurrency(activity.amount, walletSummary.currency)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-muted-foreground">{t('noWalletData')}</p>
                </div>
              )}
            </CardContent>
            <CardFooter className="border-t pt-4">
              <div className="w-full">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={handleDownloadStatement}
                >
                  <Download className="h-4 w-4 mr-2" />
                  {t('downloadStatement')}
                </Button>
              </div>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t('paymentMethods')}</CardTitle>
              <CardDescription>{t('paymentMethodsDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                <div className="bg-muted/30 p-3 rounded-md flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary text-primary-foreground rounded-md p-1.5">
                      <CreditCard className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium">Visa •••• 4242</p>
                      <p className="text-xs text-muted-foreground">Exp. 12/2025</p>
                    </div>
                  </div>
                  <Badge variant="outline">Par défaut</Badge>
                </div>

                <Button variant="outline" size="sm" className="w-full">
                  {t('managePaymentMethods')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Historique des transactions */}
        <div className="md:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CircleDollarSign className="h-5 w-5" />
                    {t('transactionsHistory')}
                  </CardTitle>
                  <CardDescription>{t('transactionsDescription')}</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isLoadingTransactions || isRefreshing}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                  {t('refresh')}
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Barre de recherche et filtres */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder={t('searchTransactions')}
                    className="pl-8"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>

                <Collapsible
                  open={isFiltersOpen}
                  onOpenChange={setIsFiltersOpen}
                  className="w-full sm:w-auto"
                >
                  <CollapsibleTrigger asChild>
                    <Button variant="outline" className="w-full sm:w-auto">
                      <Filter className="h-4 w-4 mr-2" />
                      {t('filters')}
                      <ChevronDown
                        className={`h-4 w-4 ml-2 transition-transform ${isFiltersOpen ? 'rotate-180' : ''}`}
                      />
                    </Button>
                  </CollapsibleTrigger>

                  <CollapsibleContent className="mt-2 space-y-2 p-2 border rounded-md">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                      <div className="space-y-1">
                        <label className="text-sm font-medium">{t('type')}</label>
                        <Select value={typeFilter} onValueChange={setTypeFilter}>
                          <SelectTrigger>
                            <SelectValue placeholder={t('allTypes')} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">{t('allTypes')}</SelectItem>
                            <SelectItem value="PAYMENT">{t('typePayment')}</SelectItem>
                            <SelectItem value="REFUND">{t('typeRefund')}</SelectItem>
                            <SelectItem value="WITHDRAWAL">{t('typeWithdrawal')}</SelectItem>
                            <SelectItem value="DEPOSIT">{t('typeDeposit')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-sm font-medium">{t('status')}</label>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                          <SelectTrigger>
                            <SelectValue placeholder={t('allStatuses')} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">{t('allStatuses')}</SelectItem>
                            <SelectItem value="COMPLETED">{t('statusCompleted')}</SelectItem>
                            <SelectItem value="PENDING">{t('statusPending')}</SelectItem>
                            <SelectItem value="FAILED">{t('statusFailed')}</SelectItem>
                            <SelectItem value="CANCELLED">{t('statusCancelled')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-sm font-medium">{t('startDate')}</label>
                        <DatePicker
                          selected={startDate}
                          onSelect={setStartDate}
                          placeholder={t('selectStartDate')}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-sm font-medium">{t('endDate')}</label>
                        <DatePicker
                          selected={endDate}
                          onSelect={setEndDate}
                          placeholder={t('selectEndDate')}
                          disabled={date => (startDate ? date < startDate : false)}
                        />
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={resetFilters}
                        className="flex items-center"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        {t('resetFilters')}
                      </Button>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>

              {/* Tableau des transactions */}
              {isLoadingTransactions ? (
                <div className="space-y-2">
                  {Array(5)
                    .fill(0)
                    .map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                </div>
              ) : transactions?.data && transactions.data.length > 0 ? (
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('date')}</TableHead>
                        <TableHead>{t('description')}</TableHead>
                        <TableHead>{t('type')}</TableHead>
                        <TableHead>{t('status')}</TableHead>
                        <TableHead className="text-right">{t('amount')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.data.map(transaction => (
                        <TableRow key={transaction.id} className="cursor-pointer hover:bg-muted/50">
                          <TableCell>
                            {format(new Date(transaction.date), 'dd/MM/yyyy')}
                            <div className="text-xs text-muted-foreground">
                              {format(new Date(transaction.date), 'HH:mm')}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{transaction.description}</div>
                            {transaction.reference && (
                              <div className="text-xs text-muted-foreground">
                                Réf: {transaction.reference}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={cn(getTransactionTypeColor(transaction.type))}
                            >
                              <div className="flex items-center gap-1">
                                {getTransactionTypeIcon(transaction.type)}
                                <span>
                                  {t(
                                    `type${transaction.type.charAt(0) + transaction.type.slice(1).toLowerCase()}`
                                  )}
                                </span>
                              </div>
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={cn(getTransactionStatusColor(transaction.status))}
                            >
                              <div className="flex items-center gap-1">
                                {getTransactionStatusIcon(transaction.status)}
                                <span>
                                  {t(
                                    `status${transaction.status.charAt(0) + transaction.status.slice(1).toLowerCase()}`
                                  )}
                                </span>
                              </div>
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            <span
                              className={cn(
                                transaction.type === 'PAYMENT' || transaction.type === 'WITHDRAWAL'
                                  ? 'text-red-600'
                                  : 'text-green-600'
                              )}
                            >
                              {transaction.type === 'PAYMENT' || transaction.type === 'WITHDRAWAL'
                                ? '-'
                                : '+'}
                              {formatCurrency(transaction.amount, transaction.currency)}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <CircleDollarSign className="h-12 w-12 text-muted-foreground/60 mb-3" />
                  <h3 className="text-lg font-medium">{t('noTransactionsFound')}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {searchQuery || typeFilter || statusFilter || startDate || endDate
                      ? t('noTransactionsMatchingFilters')
                      : t('emptyTransactionList')}
                  </p>
                  {(searchQuery || typeFilter || statusFilter || startDate || endDate) && (
                    <Button variant="outline" className="mt-4" onClick={resetFilters}>
                      {t('resetFilters')}
                    </Button>
                  )}
                </div>
              )}

              {/* Pagination */}
              {transactions?.data && transactions.data.length > 0 && totalPages > 1 && (
                <Pagination className="mt-4">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={e => {
                          e.preventDefault();
                          if (currentPage > 1) setCurrentPage(currentPage - 1);
                        }}
                        className={currentPage <= 1 ? 'pointer-events-none opacity-50' : ''}
                      />
                    </PaginationItem>

                    {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
                      // Afficher les 2 premières pages, la page courante, et les 2 dernières pages
                      let pageNumber = i + 1;
                      if (totalPages > 5) {
                        if (currentPage > 3 && i === 1) {
                          return (
                            <PaginationItem key="ellipsis-1">
                              <span className="px-4">...</span>
                            </PaginationItem>
                          );
                        }
                        if (currentPage > 3 && i < 2) {
                          pageNumber = i === 0 ? 1 : currentPage;
                        } else if (currentPage > totalPages - 3 && i > 2) {
                          pageNumber = i === 4 ? totalPages : totalPages - (4 - i);
                        } else if (totalPages > 5 && i === 3) {
                          return (
                            <PaginationItem key="ellipsis-2">
                              <span className="px-4">...</span>
                            </PaginationItem>
                          );
                        }
                      }

                      return (
                        <PaginationItem key={pageNumber}>
                          <PaginationLink
                            href="#"
                            onClick={e => {
                              e.preventDefault();
                              setCurrentPage(pageNumber);
                            }}
                            isActive={currentPage === pageNumber}
                          >
                            {pageNumber}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })}

                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={e => {
                          e.preventDefault();
                          if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                        }}
                        className={
                          currentPage >= totalPages ? 'pointer-events-none opacity-50' : ''
                        }
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </CardContent>

            <CardFooter className="flex justify-between border-t pt-4">
              <div className="text-sm text-muted-foreground">
                {transactions?.pagination.total
                  ? t('totalResults', { count: transactions.pagination.total })
                  : t('noResults')}
              </div>
              <Button variant="outline" size="sm" onClick={handleDownloadStatement}>
                <Download className="h-4 w-4 mr-2" />
                {t('export')}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
