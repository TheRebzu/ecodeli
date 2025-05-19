'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useSession } from 'next-auth/react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Download,
  Filter,
  Search,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronDown,
  PercentIcon,
  Settings,
  PieChart,
  BarChart4,
  Users,
  CalendarRange,
  Package,
  ArrowUpDown,
  Edit,
  Save,
  Undo,
  Store,
  TruckIcon
} from 'lucide-react';

import { api } from '@/trpc/react';
import { formatCurrency } from '@/lib/utils';
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
import { DateRange } from '@/components/ui/date-range';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
import { PieChart as ChartPie, BarChart } from '@/components/ui/charts';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export default function AdminCommissionsPage() {
  const t = useTranslations('admin.commissions');
  const { data: session } = useSession();
  const { toast } = useToast();
  
  // États pour la pagination, le filtrage et la recherche
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | undefined>();
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [currentTab, setCurrentTab] = useState('overview');
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date } | undefined>({
    from: new Date(new Date().setMonth(new Date().getMonth() - 1)),
    to: new Date(),
  });
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedCommission, setSelectedCommission] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Récupérer les commissions
  const { 
    data: commissions, 
    isLoading: isLoadingCommissions,
    refetch: refetchCommissions 
  } = api.commission.getCommissions.useQuery(
    {
      page: currentPage,
      limit: pageSize,
      status: statusFilter as any,
      type: typeFilter as any,
      search: searchQuery || undefined,
      startDate: dateRange?.from,
      endDate: dateRange?.to,
    },
    {
      keepPreviousData: true,
      refetchOnWindowFocus: false,
    }
  );
  
  // Récupérer les statistiques des commissions
  const { 
    data: commissionStats, 
    isLoading: isLoadingStats,
    refetch: refetchStats 
  } = api.commission.getCommissionStats.useQuery(
    {
      startDate: dateRange?.from,
      endDate: dateRange?.to,
    },
    {
      refetchOnWindowFocus: false,
    }
  );
  
  // Récupérer les taux de commission
  const { 
    data: commissionRates, 
    isLoading: isLoadingRates,
    refetch: refetchRates 
  } = api.commission.getCommissionRates.useQuery(
    undefined,
    {
      refetchOnWindowFocus: false,
    }
  );
  
  // Mutation pour mettre à jour les taux de commission
  const updateCommissionRateMutation = api.commission.updateCommissionRate.useMutation({
    onSuccess: () => {
      toast({
        title: t('rateUpdated'),
        description: t('rateUpdatedSuccess'),
      });
      refetchRates();
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: t('updateFailed'),
        description: error.message || t('genericError'),
      });
    }
  });
  
  // Télécharger le rapport de commissions
  const handleDownloadReport = async () => {
    try {
      toast({
        title: t('downloadStarted'),
        description: t('commissionReportDownloadStarted'),
      });
      
      // Simuler un délai pour la démo
      setTimeout(() => {
        toast({
          title: t('downloadComplete'),
          description: t('commissionReportDownloadComplete'),
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
      await Promise.all([refetchCommissions(), refetchStats(), refetchRates()]);
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
    setDateRange({
      from: new Date(new Date().setMonth(new Date().getMonth() - 1)),
      to: new Date(),
    });
    setCurrentPage(1);
  };
  
  // Éditer un taux de commission
  const handleEditCommission = (commission: any) => {
    setSelectedCommission({...commission});
    setIsModalOpen(true);
  };
  
  // Sauvegarder un taux de commission
  const handleSaveCommission = async () => {
    if (!selectedCommission) return;
    
    try {
      await updateCommissionRateMutation.mutateAsync({
        id: selectedCommission.id,
        rate: selectedCommission.rate,
        minAmount: selectedCommission.minAmount,
        maxAmount: selectedCommission.maxAmount,
        isActive: selectedCommission.isActive,
      });
      
      setIsModalOpen(false);
    } catch (error) {
      // Erreur déjà gérée par la mutation
    }
  };
  
  // Obtenir la couleur selon le type de commission
  const getCommissionTypeColor = (type: string) => {
    switch (type) {
      case 'DELIVERY':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'SERVICE':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'MERCHANT':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'PLATFORM':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };
  
  // Obtenir l'icône selon le type de commission
  const getCommissionTypeIcon = (type: string) => {
    switch (type) {
      case 'DELIVERY':
        return <TruckIcon className="h-4 w-4" />;
      case 'SERVICE':
        return <Users className="h-4 w-4" />;
      case 'MERCHANT':
        return <Store className="h-4 w-4" />;
      case 'PLATFORM':
        return <PercentIcon className="h-4 w-4" />;
      default:
        return <PercentIcon className="h-4 w-4" />;
    }
  };
  
  // Formater les données pour les graphiques de distribution par type
  const formatDistributionData = () => {
    if (!commissionStats?.byType) return [];
    
    return Object.entries(commissionStats.byType).map(([type, data]) => ({
      type,
      montant: parseFloat(data.amount.toFixed(2)),
      nombre: data.count
    }));
  };

  // Calculer le nombre total de pages
  const totalPages = Math.ceil((commissions?.total || 0) / pageSize);
  
  return (
    <div className="space-y-6">
      <PageHeader
        title={t('title')}
        description={t('description')}
      />
      
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
            onClick={handleDownloadReport}
          >
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
          <TabsTrigger value="commissions">
            <PercentIcon className="h-4 w-4 mr-2" />
            {t('commissions')}
          </TabsTrigger>
          <TabsTrigger value="rates">
            <Settings className="h-4 w-4 mr-2" />
            {t('commissionRates')}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          {/* Cartes d'aperçu de commissions */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{t('totalCommissions')}</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingStats ? (
                  <Skeleton className="h-10 w-32" />
                ) : (
                  <div className="text-2xl font-bold">
                    {formatCurrency(commissionStats?.total?.amount || 0, 'EUR')}
                  </div>
                )}
                <p className="text-sm text-muted-foreground">
                  {commissionStats?.total?.count} {t('transactions')}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{t('deliveryCommissions')}</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingStats ? (
                  <Skeleton className="h-10 w-32" />
                ) : (
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(commissionStats?.byType?.DELIVERY?.amount || 0, 'EUR')}
                  </div>
                )}
                <p className="text-sm text-muted-foreground">
                  {commissionStats?.byType?.DELIVERY?.count || 0} {t('deliveries')}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{t('serviceCommissions')}</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingStats ? (
                  <Skeleton className="h-10 w-32" />
                ) : (
                  <div className="text-2xl font-bold text-purple-600">
                    {formatCurrency(commissionStats?.byType?.SERVICE?.amount || 0, 'EUR')}
                  </div>
                )}
                <p className="text-sm text-muted-foreground">
                  {commissionStats?.byType?.SERVICE?.count || 0} {t('services')}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{t('merchantCommissions')}</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingStats ? (
                  <Skeleton className="h-10 w-32" />
                ) : (
                  <div className="text-2xl font-bold text-blue-600">
                    {formatCurrency(commissionStats?.byType?.MERCHANT?.amount || 0, 'EUR')}
                  </div>
                )}
                <p className="text-sm text-muted-foreground">
                  {commissionStats?.byType?.MERCHANT?.count || 0} {t('merchants')}
                </p>
              </CardContent>
            </Card>
          </div>
          
          {/* Graphiques */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('commissionDistribution')}</CardTitle>
                <CardDescription>{t('commissionDistributionDescription')}</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingStats ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <ChartPie
                    data={formatDistributionData()}
                    category="montant"
                    index="type"
                    valueFormatter={(value) => `€${value.toFixed(2)}`}
                    colors={['#22c55e', '#8b5cf6', '#3b82f6', '#f59e0b']}
                  />
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>{t('commissionsOverTime')}</CardTitle>
                <CardDescription>{t('commissionsOverTimeDescription')}</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingStats ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <BarChart
                    data={commissionStats?.byMonth || []}
                    categories={['amount']}
                    index="month"
                    colors={['#8b5cf6']}
                    valueFormatter={(value) => `€${value.toFixed(2)}`}
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="commissions" className="space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <CardTitle>{t('allCommissions')}</CardTitle>
                  <CardDescription>{t('allCommissionsDescription')}</CardDescription>
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
                    placeholder={t('searchCommissions')}
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
                      <Badge className="ml-2" variant="secondary">{
                        (statusFilter ? 1 : 0) + (typeFilter ? 1 : 0)
                      }</Badge>
                      <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${isFiltersOpen ? 'rotate-180' : ''}`} />
                    </Button>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent className="mt-2 space-y-2 p-2 border rounded-md">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-sm font-medium">{t('type')}</label>
                        <Select value={typeFilter} onValueChange={setTypeFilter}>
                          <SelectTrigger>
                            <SelectValue placeholder={t('allTypes')} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">{t('allTypes')}</SelectItem>
                            <SelectItem value="DELIVERY">{t('typeDelivery')}</SelectItem>
                            <SelectItem value="SERVICE">{t('typeService')}</SelectItem>
                            <SelectItem value="MERCHANT">{t('typeMerchant')}</SelectItem>
                            <SelectItem value="PLATFORM">{t('typePlatform')}</SelectItem>
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
                            <SelectItem value="PAID">{t('statusPaid')}</SelectItem>
                            <SelectItem value="PENDING">{t('statusPending')}</SelectItem>
                            <SelectItem value="CANCELLED">{t('statusCancelled')}</SelectItem>
                          </SelectContent>
                        </Select>
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

              {/* Tableau des commissions */}
              {isLoadingCommissions ? (
                <div className="space-y-2">
                  {Array(5).fill(0).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : (commissions?.data && commissions.data.length > 0) ? (
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('id')}</TableHead>
                        <TableHead>{t('date')}</TableHead>
                        <TableHead>{t('entity')}</TableHead>
                        <TableHead>{t('transaction')}</TableHead>
                        <TableHead>{t('type')}</TableHead>
                        <TableHead>{t('status')}</TableHead>
                        <TableHead className="text-right">{t('amount')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {commissions.data.map((commission) => (
                        <TableRow key={commission.id} className="cursor-pointer hover:bg-muted/50">
                          <TableCell className="font-mono text-xs">{commission.id.substring(0, 8)}...</TableCell>
                          <TableCell>
                            {format(new Date(commission.createdAt), 'dd/MM/yyyy')}
                            <div className="text-xs text-muted-foreground">
                              {format(new Date(commission.createdAt), 'HH:mm')}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{commission.entity?.name || t('platform')}</div>
                            <div className="text-xs text-muted-foreground">{commission.entity?.id?.substring(0, 8) || '-'}</div>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-[200px] truncate">{commission.description}</div>
                            <div className="text-xs text-muted-foreground truncate">
                              {commission.transactionId?.substring(0, 8) || '-'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={getCommissionTypeColor(commission.type)}>
                              <div className="flex items-center gap-1">
                                {getCommissionTypeIcon(commission.type)}
                                <span>{t(`type${commission.type}`)}</span>
                              </div>
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={commission.status === 'PAID' ? 'success' : commission.status === 'PENDING' ? 'warning' : 'secondary'}>
                              {t(`status${commission.status}`)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(commission.amount, commission.currency)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <PercentIcon className="h-12 w-12 text-muted-foreground/60 mb-3" />
                  <h3 className="text-lg font-medium">{t('noCommissionsFound')}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {searchQuery || typeFilter || statusFilter
                      ? t('noCommissionsMatchingFilters')
                      : t('emptyCommissionsList')}
                  </p>
                  {(searchQuery || typeFilter || statusFilter) && (
                    <Button variant="outline" className="mt-4" onClick={resetFilters}>
                      {t('resetFilters')}
                    </Button>
                  )}
                </div>
              )}
              
              {/* Pagination */}
              {commissions?.data && commissions.data.length > 0 && totalPages > 1 && (
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
                {commissions?.total 
                  ? t('totalResults', { count: commissions.total })
                  : t('noResults')
                }
              </div>
              <Button variant="outline" size="sm" onClick={handleDownloadReport}>
                <Download className="h-4 w-4 mr-2" />
                {t('export')}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="rates" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('commissionRatesConfiguration')}</CardTitle>
              <CardDescription>{t('commissionRatesConfigurationDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingRates ? (
                <div className="space-y-4">
                  {Array(4).fill(0).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-md border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('type')}</TableHead>
                          <TableHead>{t('rate')}</TableHead>
                          <TableHead>{t('minAmount')}</TableHead>
                          <TableHead>{t('maxAmount')}</TableHead>
                          <TableHead>{t('status')}</TableHead>
                          <TableHead className="text-right">{t('actions')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {commissionRates?.rates.map((rate) => (
                          <TableRow key={rate.id}>
                            <TableCell>
                              <Badge variant="outline" className={getCommissionTypeColor(rate.type)}>
                                <div className="flex items-center gap-1">
                                  {getCommissionTypeIcon(rate.type)}
                                  <span>{t(`type${rate.type}`)}</span>
                                </div>
                              </Badge>
                            </TableCell>
                            <TableCell>{rate.rate}%</TableCell>
                            <TableCell>{formatCurrency(rate.minAmount, 'EUR')}</TableCell>
                            <TableCell>{rate.maxAmount ? formatCurrency(rate.maxAmount, 'EUR') : t('unlimited')}</TableCell>
                            <TableCell>
                              <Badge variant={rate.isActive ? 'success' : 'secondary'}>
                                {rate.isActive ? t('active') : t('inactive')}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm" onClick={() => handleEditCommission(rate)}>
                                <Edit className="h-4 w-4 mr-2" />
                                {t('edit')}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  
                  <div className="bg-muted rounded-md p-4 text-sm">
                    <p>{t('commissionRatesNote')}</p>
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="border-t">
              <div className="flex w-full justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  {t('lastUpdated')}: {commissionRates?.lastUpdated ? 
                    format(new Date(commissionRates.lastUpdated), 'dd/MM/yyyy HH:mm') : 
                    t('never')
                  }
                </p>
                <Button size="sm" variant="default" disabled={isLoadingRates || isRefreshing} onClick={handleRefresh}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                  {t('refresh')}
                </Button>
              </div>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Modal d'édition des taux de commission */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('editCommissionRate')}</DialogTitle>
            <DialogDescription>{t('editCommissionRateDescription')}</DialogDescription>
          </DialogHeader>
          
          {selectedCommission && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('type')}</label>
                <div>
                  <Badge variant="outline" className={getCommissionTypeColor(selectedCommission.type)}>
                    <div className="flex items-center gap-1">
                      {getCommissionTypeIcon(selectedCommission.type)}
                      <span>{t(`type${selectedCommission.type}`)}</span>
                    </div>
                  </Badge>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('rate')}</label>
                <div className="flex items-center">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={selectedCommission.rate}
                    onChange={(e) => setSelectedCommission({
                      ...selectedCommission,
                      rate: parseFloat(e.target.value)
                    })}
                  />
                  <span className="ml-2">%</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('minAmount')}</label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={selectedCommission.minAmount}
                    onChange={(e) => setSelectedCommission({
                      ...selectedCommission,
                      minAmount: parseFloat(e.target.value)
                    })}
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('maxAmount')}</label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder={t('unlimited')}
                    value={selectedCommission.maxAmount || ''}
                    onChange={(e) => setSelectedCommission({
                      ...selectedCommission,
                      maxAmount: e.target.value ? parseFloat(e.target.value) : null
                    })}
                  />
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={selectedCommission.isActive}
                  onChange={(e) => setSelectedCommission({
                    ...selectedCommission,
                    isActive: e.target.checked
                  })}
                />
                <label htmlFor="isActive" className="text-sm font-medium">
                  {t('active')}
                </label>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              {t('cancel')}
            </Button>
            <Button onClick={handleSaveCommission}>
              <Save className="h-4 w-4 mr-2" />
              {t('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
