'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useSession } from 'next-auth/react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  BanknoteIcon,
  Download,
  Filter,
  Search,
  RefreshCw,
  Calendar,
  CircleDollarSign,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronDown,
  Wallet,
  ReceiptText,
  Package,
  CreditCard,
  Users,
  ArrowDownUp,
  BarChart4,
} from 'lucide-react';

import { api } from '@/trpc/react';
import { formatCurrency } from '@/utils/document-utils';
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
import { DateRange } from '@/components/ui/date-range';
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
import { AreaChart, LineChart, BarChart } from '@/components/ui/charts';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function AdminPaymentsPage() {
  const t = useTranslations('admin.payments');
  const { data: session } = useSession();
  const { toast } = useToast();

  // États pour la pagination, le filtrage et la recherche
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | undefined>();
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [currentTab, setCurrentTab] = useState('payments');
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date } | undefined>({
    from: new Date(new Date().setDate(1)), // Premier jour du mois
    to: new Date(),
  });
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [userFilter, setUserFilter] = useState<string | undefined>();

  // Récupérer tous les paiements (admin uniquement)
  const {
    data: payments,
    isLoading: isLoadingPayments,
    refetch: refetchPayments,
  } = api.payment.getAllPayments.useQuery(
    {
      page: currentPage,
      limit: pageSize,
      status: statusFilter as any,
      type: typeFilter as any,
      search: searchQuery || undefined,
      startDate: dateRange?.from,
      endDate: dateRange?.to,
      userId: userFilter,
    },
    {
      keepPreviousData: true,
      refetchOnWindowFocus: false,
    }
  );

  // Récupérer les statistiques financières
  const {
    data: financialStats,
    isLoading: isLoadingStats,
    refetch: refetchStats,
  } = api.financial.getFinancialStats.useQuery(
    {
      period: 'monthly',
      startDate: dateRange?.from,
      endDate: dateRange?.to,
    },
    {
      refetchOnWindowFocus: false,
    }
  );

  // Télécharger le rapport de paiements
  const handleDownloadReport = async () => {
    try {
      toast({
        title: t('downloadStarted'),
        description: t('paymentReportDownloadStarted'),
      });

      // Simuler un délai pour la démo
      setTimeout(() => {
        toast({
          title: t('downloadComplete'),
          description: t('paymentReportDownloadComplete'),
        });
      }, 2000);
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
      await Promise.all([refetchPayments(), refetchStats()]);
      toast({
        title: t('refreshSuccess'),
        description: t('dataRefreshed'),
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('refreshError'),
        description: typeof error === 'string' ? error : t('genericError'),
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Réinitialiser les filtres
  const resetFilters = () => {
    setSearchQuery('');
    setTypeFilter(undefined);
    setStatusFilter(undefined);
    setUserFilter(undefined);
    setDateRange({
      from: new Date(new Date().setDate(1)), // Premier jour du mois
      to: new Date(),
    });
    setCurrentPage(1);
  };

  // Obtenir la couleur selon le type de paiement
  const getPaymentTypeColor = (type: string) => {
    switch (type) {
      case 'DELIVERY_PAYMENT':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'SUBSCRIPTION':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'TIP':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'REFUND':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'COMMISSION':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'SERVICE_PAYMENT':
        return 'bg-pink-50 text-pink-700 border-pink-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  // Obtenir l'icône selon le type de paiement
  const getPaymentTypeIcon = (type: string) => {
    switch (type) {
      case 'DELIVERY_PAYMENT':
        return <Package className="h-4 w-4" />;
      case 'SUBSCRIPTION':
        return <ReceiptText className="h-4 w-4" />;
      case 'TIP':
        return <BanknoteIcon className="h-4 w-4" />;
      case 'REFUND':
        return <ArrowDownUp className="h-4 w-4" />;
      case 'COMMISSION':
        return <CircleDollarSign className="h-4 w-4" />;
      case 'SERVICE_PAYMENT':
        return <Users className="h-4 w-4" />;
      default:
        return <CreditCard className="h-4 w-4" />;
    }
  };

  // Obtenir la couleur selon le statut de paiement
  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'PENDING':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'FAILED':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'CANCELLED':
        return 'bg-gray-50 text-gray-700 border-gray-200';
      case 'PROCESSING':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'REFUNDED':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  // Obtenir l'icône selon le statut de paiement
  const getPaymentStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'PENDING':
        return <Clock className="h-4 w-4" />;
      case 'FAILED':
        return <XCircle className="h-4 w-4" />;
      case 'CANCELLED':
        return <XCircle className="h-4 w-4" />;
      case 'PROCESSING':
        return <RefreshCw className="h-4 w-4" />;
      case 'REFUNDED':
        return <ArrowDownUp className="h-4 w-4" />;
      default:
        return null;
    }
  };

  // Formater les données pour les graphiques
  const formatChartData = () => {
    if (!financialStats?.dailyStats) return [];

    return financialStats.dailyStats.map(stat => ({
      date: format(new Date(stat.date), 'dd/MM'),
      montant: parseFloat(stat.totalAmount.toFixed(2)),
      nombre: stat.count,
    }));
  };

  // Formater les données pour le graphique de répartition
  const formatPaymentTypeData = () => {
    if (!financialStats?.paymentTypeStats) return [];

    return Object.entries(financialStats.paymentTypeStats).map(([type, data]) => ({
      type,
      montant: parseFloat(data.amount.toFixed(2)),
      nombre: data.count,
    }));
  };

  // Calculer le nombre total de pages
  const totalPages = Math.ceil((payments?.total || 0) / pageSize);

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} description={t('description')} />

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center w-full sm:w-auto">
          <DateRange
            date={dateRange}
            onUpdate={setDateRange}
            className="w-full sm:w-auto"
            align="start"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {t('refresh')}
          </Button>
          <Button size="sm" onClick={handleDownloadReport}>
            <Download className="h-4 w-4 mr-2" />
            {t('downloadReport')}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" value={currentTab} onValueChange={setCurrentTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="overview">
            <BarChart4 className="h-4 w-4 mr-2" />
            {t('overview')}
          </TabsTrigger>
          <TabsTrigger value="payments">
            <CreditCard className="h-4 w-4 mr-2" />
            {t('payments')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Cartes d'aperçu financier */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{t('totalRevenue')}</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingStats ? (
                  <Skeleton className="h-10 w-32" />
                ) : (
                  <div className="text-2xl font-bold">
                    {formatCurrency(financialStats?.overview?.totalAmount || 0, 'EUR')}
                  </div>
                )}
                <p className="text-sm text-muted-foreground">
                  {dateRange
                    ? `${format(dateRange.from, 'dd/MM/yyyy')} - ${format(dateRange.to, 'dd/MM/yyyy')}`
                    : t('currentPeriod')}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{t('successfulPayments')}</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingStats ? (
                  <Skeleton className="h-10 w-32" />
                ) : (
                  <div className="text-2xl font-bold text-green-600">
                    {financialStats?.overview?.completed || 0}
                  </div>
                )}
                <p className="text-sm text-muted-foreground">
                  {financialStats?.overview?.successRate
                    ? `${(financialStats.overview.successRate * 100).toFixed(1)}% ${t('successRate')}`
                    : t('noData')}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{t('pendingPayments')}</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingStats ? (
                  <Skeleton className="h-10 w-32" />
                ) : (
                  <div className="text-2xl font-bold text-amber-600">
                    {financialStats?.overview?.pending || 0}
                  </div>
                )}
                <p className="text-sm text-muted-foreground">
                  {formatCurrency(financialStats?.overview?.pendingAmount || 0, 'EUR')}{' '}
                  {t('inProcess')}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{t('failedPayments')}</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingStats ? (
                  <Skeleton className="h-10 w-32" />
                ) : (
                  <div className="text-2xl font-bold text-red-600">
                    {financialStats?.overview?.failed || 0}
                  </div>
                )}
                <p className="text-sm text-muted-foreground">
                  {financialStats?.overview?.failureRate
                    ? `${(financialStats.overview.failureRate * 100).toFixed(1)}% ${t('failureRate')}`
                    : t('noData')}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Graphiques de tendance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('paymentTrends')}</CardTitle>
                <CardDescription>{t('paymentTrendsDescription')}</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingStats ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <AreaChart
                    data={formatChartData()}
                    categories={['montant']}
                    index="date"
                    colors={['#0ea5e9']}
                    valueFormatter={value => `€${value.toFixed(2)}`}
                  />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('paymentTypeDistribution')}</CardTitle>
                <CardDescription>{t('paymentTypeDistributionDescription')}</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingStats ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <BarChart
                    data={formatPaymentTypeData()}
                    categories={['montant']}
                    index="type"
                    colors={['#8b5cf6']}
                    valueFormatter={value => `€${value.toFixed(2)}`}
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="payments" className="space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <CardTitle>{t('allPayments')}</CardTitle>
                  <CardDescription>{t('allPaymentsDescription')}</CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Barre de recherche et filtres */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder={t('searchPayments')}
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
                      <Badge className="ml-2" variant="secondary">
                        {(statusFilter ? 1 : 0) + (typeFilter ? 1 : 0) + (userFilter ? 1 : 0)}
                      </Badge>
                      <ChevronDown
                        className={`h-4 w-4 ml-2 transition-transform ${isFiltersOpen ? 'rotate-180' : ''}`}
                      />
                    </Button>
                  </CollapsibleTrigger>

                  <CollapsibleContent className="mt-2 space-y-2 p-2 border rounded-md">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <label className="text-sm font-medium">{t('type')}</label>
                        <Select value={typeFilter} onValueChange={setTypeFilter}>
                          <SelectTrigger>
                            <SelectValue placeholder={t('allTypes')} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">{t('allTypes')}</SelectItem>
                            <SelectItem value="DELIVERY_PAYMENT">
                              {t('typeDeliveryPayment')}
                            </SelectItem>
                            <SelectItem value="SUBSCRIPTION">{t('typeSubscription')}</SelectItem>
                            <SelectItem value="SERVICE_PAYMENT">
                              {t('typeServicePayment')}
                            </SelectItem>
                            <SelectItem value="COMMISSION">{t('typeCommission')}</SelectItem>
                            <SelectItem value="TIP">{t('typeTip')}</SelectItem>
                            <SelectItem value="REFUND">{t('typeRefund')}</SelectItem>
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
                            <SelectItem value="PROCESSING">{t('statusProcessing')}</SelectItem>
                            <SelectItem value="REFUNDED">{t('statusRefunded')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-sm font-medium">{t('userRole')}</label>
                        <Select value={userFilter} onValueChange={setUserFilter}>
                          <SelectTrigger>
                            <SelectValue placeholder={t('allUsers')} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">{t('allUsers')}</SelectItem>
                            <SelectItem value="CLIENT">{t('roleClient')}</SelectItem>
                            <SelectItem value="MERCHANT">{t('roleMerchant')}</SelectItem>
                            <SelectItem value="DELIVERER">{t('roleDeliverer')}</SelectItem>
                            <SelectItem value="PROVIDER">{t('roleProvider')}</SelectItem>
                          </SelectContent>
                        </Select>
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

              {/* Tableau des paiements */}
              {isLoadingPayments ? (
                <div className="space-y-2">
                  {Array(5)
                    .fill(0)
                    .map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                </div>
              ) : payments?.payments && payments.payments.length > 0 ? (
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('id')}</TableHead>
                        <TableHead>{t('date')}</TableHead>
                        <TableHead>{t('user')}</TableHead>
                        <TableHead>{t('description')}</TableHead>
                        <TableHead>{t('type')}</TableHead>
                        <TableHead>{t('status')}</TableHead>
                        <TableHead className="text-right">{t('amount')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.payments.map(payment => (
                        <TableRow key={payment.id} className="cursor-pointer hover:bg-muted/50">
                          <TableCell className="font-mono text-xs">
                            {payment.id.substring(0, 8)}...
                          </TableCell>
                          <TableCell>
                            {format(new Date(payment.createdAt), 'dd/MM/yyyy')}
                            <div className="text-xs text-muted-foreground">
                              {format(new Date(payment.createdAt), 'HH:mm')}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">
                              {payment.user?.name || 'Utilisateur inconnu'}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {payment.user?.email}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-[200px] truncate">{payment.description}</div>
                            {payment.reference && (
                              <div className="text-xs text-muted-foreground truncate">
                                Réf: {payment.reference}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={getPaymentTypeColor(payment.type)}>
                              <div className="flex items-center gap-1">
                                {getPaymentTypeIcon(payment.type)}
                                <span>{t(`type${payment.type}`)}</span>
                              </div>
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={getPaymentStatusColor(payment.status)}
                            >
                              <div className="flex items-center gap-1">
                                {getPaymentStatusIcon(payment.status)}
                                <span>{t(`status${payment.status}`)}</span>
                              </div>
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(payment.amount, payment.currency)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <CreditCard className="h-12 w-12 text-muted-foreground/60 mb-3" />
                  <h3 className="text-lg font-medium">{t('noPaymentsFound')}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {searchQuery || typeFilter || statusFilter || userFilter
                      ? t('noPaymentsMatchingFilters')
                      : t('emptyPaymentsList')}
                  </p>
                  {(searchQuery || typeFilter || statusFilter || userFilter) && (
                    <Button variant="outline" className="mt-4" onClick={resetFilters}>
                      {t('resetFilters')}
                    </Button>
                  )}
                </div>
              )}

              {/* Pagination */}
              {payments?.payments && payments.payments.length > 0 && totalPages > 1 && (
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
                      let pageNumber = i + 1;

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
                {payments?.total ? t('totalResults', { count: payments.total }) : t('noResults')}
              </div>
              <Button variant="outline" size="sm" onClick={handleDownloadReport}>
                <Download className="h-4 w-4 mr-2" />
                {t('export')}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
