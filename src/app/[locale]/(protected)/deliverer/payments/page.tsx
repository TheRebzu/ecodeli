'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useSession } from 'next-auth/react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  ArrowDownIcon, 
  ArrowUpIcon, 
  TruckIcon,
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
  MapPin
} from 'lucide-react';

import { api } from '@/trpc/react';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
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
  PaginationPrevious 
} from '@/components/ui/pagination';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { useRouter } from 'next/navigation';

export default function DelivererPaymentsPage() {
  const t = useTranslations('payments');
  const router = useRouter();
  const { data: session } = useSession();
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
  
  // Requête pour récupérer les paiements
  const {
    data: payments,
    isLoading: isLoadingPayments,
    refetch: refetchPayments,
  } = api.payment.getDelivererPayments.useQuery(
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
  
  // Requête pour récupérer le résumé des revenus
  const {
    data: earningsSummary,
    isLoading: isLoadingEarnings,
    refetch: refetchEarnings,
  } = api.wallet.getWalletStats.useQuery(
    {
      period: 'monthly',
    },
    {
      refetchOnWindowFocus: false,
    }
  );
  
  // Télécharger le relevé de paiements
  const handleDownloadStatement = async () => {
    try {
      toast({
        title: t('downloadStarted'),
        description: t('paymentStatementDownloadStarted'),
      });
      
      // Dans une implémentation réelle, on appellerait une API pour générer
      // et télécharger le relevé des paiements
      // Simuler un délai pour la démo
      setTimeout(() => {
        toast({
          title: t('downloadComplete'),
          description: t('paymentStatementDownloadComplete'),
        });
      }, 2000);
    } catch (error) {
      toast({
        variant: "destructive",
        title: t('downloadError'),
        description: typeof error === 'string' ? error : t('genericError'),
      });
    }
  };
  
  // Rafraîchir les données
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refetchPayments(), refetchEarnings()]);
      toast({
        title: t('refreshSuccess'),
        description: t('dataRefreshed'),
      });
    } catch (error) {
      toast({
        variant: "destructive",
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
    setStartDate(undefined);
    setEndDate(undefined);
    setCurrentPage(1);
  };
  
  // Obtenir la couleur selon le type de paiement
  const getPaymentTypeColor = (type: string) => {
    switch (type) {
      case 'DELIVERY_PAYMENT':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'BONUS':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'TIP':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'ADJUSTMENT':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'EXTRA_FEE':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };
  
  // Obtenir l'icône selon le type de paiement
  const getPaymentTypeIcon = (type: string) => {
    switch (type) {
      case 'DELIVERY_PAYMENT':
        return <TruckIcon className="h-4 w-4" />;
      case 'BONUS':
        return <CircleDollarSign className="h-4 w-4" />;
      case 'TIP':
        return <ArrowDownIcon className="h-4 w-4" />;
      case 'ADJUSTMENT':
        return <ArrowDownIcon className="h-4 w-4" />;
      case 'EXTRA_FEE':
        return <Package className="h-4 w-4" />;
      default:
        return <CircleDollarSign className="h-4 w-4" />;
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
      default:
        return null;
    }
  };
  
  // Accéder à la page du portefeuille
  const handleGoToWallet = () => {
    router.push('/deliverer/wallet');
  };

  // Calculer le nombre total de pages
  const totalPages = Math.ceil((payments?.pagination.total || 0) / pageSize);
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <ReceiptText className="h-7 w-7" />
            {t('delivererPaymentsTitle')}
          </h1>
          <p className="text-muted-foreground">{t('delivererPaymentsDescription')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {t('refresh')}
          </Button>
          <Button 
            size="sm" 
            onClick={handleGoToWallet}
          >
            <Wallet className="h-4 w-4 mr-2" />
            {t('viewWallet')}
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Résumé des revenus */}
        <div className="md:col-span-1 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <CircleDollarSign className="h-5 w-5" />
                {t('earningsSummary')}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {isLoadingEarnings ? (
                <div className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ) : earningsSummary ? (
                <div className="space-y-4">
                  <div>
                    <div className="text-3xl font-bold">
                      {formatCurrency(earningsSummary.totalEarnings, earningsSummary.currency)}
                    </div>
                    
                    <p className="text-sm text-muted-foreground mt-1">
                      {t('totalEarningsThisMonth')}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-muted/40 p-2 rounded-md">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <TruckIcon className="h-3.5 w-3.5 text-green-500" />
                        {t('deliveries')}
                      </div>
                      <div className="font-medium">
                        {earningsSummary.periodStats?.deliveryCount || 0}
                      </div>
                    </div>
                    <div className="bg-muted/40 p-2 rounded-md">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 text-red-500" />
                        {t('kmTravelled')}
                      </div>
                      <div className="font-medium">
                        {earningsSummary.periodStats?.totalKm || 0} km
                      </div>
                    </div>
                  </div>
                  
                  {earningsSummary.periodStats && (
                    <div className="pt-2">
                      <div className="text-sm text-muted-foreground mb-1">
                        {t('monthlyProgress')}
                      </div>
                      <Progress
                        value={
                          earningsSummary.periodStats.earnedPercentage
                            ? Math.min(
                                Math.round(earningsSummary.periodStats.earnedPercentage * 100),
                                100
                              )
                            : 0
                        }
                        className="h-2"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>0%</span>
                        <span>
                          {earningsSummary.periodStats.earnedPercentage
                            ? Math.min(
                                Math.round(earningsSummary.periodStats.earnedPercentage * 100),
                                100
                              )
                            : 0}
                          %
                        </span>
                        <span>100%</span>
                      </div>
                    </div>
                  )}
                  
                  <div className="pt-2">
                    <div className="text-sm text-muted-foreground mb-1">{t('earningsBreakdown')}</div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{t('deliveryBasePayments')}</span>
                        <span className="font-medium">
                          {formatCurrency(
                            earningsSummary.periodStats?.breakdown?.baseAmount || 0,
                            earningsSummary.currency
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>{t('tips')}</span>
                        <span className="font-medium">
                          {formatCurrency(
                            earningsSummary.periodStats?.breakdown?.tipsAmount || 0,
                            earningsSummary.currency
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>{t('bonuses')}</span>
                        <span className="font-medium">
                          {formatCurrency(
                            earningsSummary.periodStats?.breakdown?.bonusAmount || 0,
                            earningsSummary.currency
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>{t('extraFees')}</span>
                        <span className="font-medium">
                          {formatCurrency(
                            earningsSummary.periodStats?.breakdown?.extraFeesAmount || 0,
                            earningsSummary.currency
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-muted-foreground">{t('noEarningsData')}</p>
                </div>
              )}
            </CardContent>
            <CardFooter className="border-t pt-4">
              <div className="w-full">
                <Button variant="outline" size="sm" className="w-full" onClick={handleDownloadStatement}>
                  <Download className="h-4 w-4 mr-2" />
                  {t('downloadEarningsStatement')}
                </Button>
              </div>
            </CardFooter>
          </Card>
        </div>
        
        {/* Historique des paiements */}
        <div className="md:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <ReceiptText className="h-5 w-5" />
                    {t('paymentHistory')}
                  </CardTitle>
                  <CardDescription>{t('paymentHistoryDescription')}</CardDescription>
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
                    onChange={(e) => setSearchQuery(e.target.value)}
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
                      <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${isFiltersOpen ? 'rotate-180' : ''}`} />
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
                            <SelectItem value="DELIVERY_PAYMENT">{t('typeDeliveryPayment')}</SelectItem>
                            <SelectItem value="BONUS">{t('typeBonus')}</SelectItem>
                            <SelectItem value="TIP">{t('typeTip')}</SelectItem>
                            <SelectItem value="ADJUSTMENT">{t('typeAdjustment')}</SelectItem>
                            <SelectItem value="EXTRA_FEE">{t('typeExtraFee')}</SelectItem>
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
                          disabled={(date) => startDate ? date < startDate : false}
                        />
                      </div>
                    </div>
                    
                    <div className="flex justify-end">
                      <Button variant="ghost" size="sm" onClick={resetFilters} className="flex items-center">
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
                  {Array(5).fill(0).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : (payments?.data && payments.data.length > 0) ? (
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
                      {payments.data.map((payment) => (
                        <TableRow key={payment.id} className="cursor-pointer hover:bg-muted/50">
                          <TableCell>
                            {format(new Date(payment.date), 'dd/MM/yyyy')}
                            <div className="text-xs text-muted-foreground">
                              {format(new Date(payment.date), 'HH:mm')}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{payment.description}</div>
                            {payment.reference && (
                              <div className="text-xs text-muted-foreground">
                                Réf: {payment.reference}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn(getPaymentTypeColor(payment.type))}>
                              <div className="flex items-center gap-1">
                                {getPaymentTypeIcon(payment.type)}
                                <span>{t(`type${payment.type}`)}</span>
                              </div>
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn(getPaymentStatusColor(payment.status))}>
                              <div className="flex items-center gap-1">
                                {getPaymentStatusIcon(payment.status)}
                                <span>{t(`status${payment.status}`)}</span>
                              </div>
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            <span className="text-green-600">
                              +{formatCurrency(payment.amount, payment.currency)}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <ReceiptText className="h-12 w-12 text-muted-foreground/60 mb-3" />
                  <h3 className="text-lg font-medium">{t('noPaymentsFound')}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {searchQuery || typeFilter || statusFilter || startDate || endDate
                      ? t('noPaymentsMatchingFilters')
                      : t('emptyPaymentsList')}
                  </p>
                  {(searchQuery || typeFilter || statusFilter || startDate || endDate) && (
                    <Button variant="outline" className="mt-4" onClick={resetFilters}>
                      {t('resetFilters')}
                    </Button>
                  )}
                </div>
              )}
              
              {/* Pagination */}
              {payments?.data && payments.data.length > 0 && totalPages > 1 && (
                <Pagination className="mt-4">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(e) => {
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
                            onClick={(e) => {
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
                        onClick={(e) => {
                          e.preventDefault();
                          if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                        }}
                        className={currentPage >= totalPages ? 'pointer-events-none opacity-50' : ''}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </CardContent>

            <CardFooter className="flex justify-between border-t pt-4">
              <div className="text-sm text-muted-foreground">
                {payments?.pagination.total 
                  ? t('totalResults', { count: payments.pagination.total })
                  : t('noResults')
                }
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
