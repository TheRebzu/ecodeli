'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { api } from '@/trpc/react';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatDate } from '@/utils/document-utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Wallet,
  ArrowDownToLine,
  ArrowUpFromLine,
  Calendar,
  CreditCard,
  Package,
  CircleDollarSign,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  ReceiptText,
  History,
  DollarSign,
  Truck,
  RefreshCw,
  BanknoteIcon,
  BarChart,
  TrendingUp,
  Zap,
  Info,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils/common';
import { useToast } from '@/components/ui/use-toast';
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
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  TransactionStatus,
  TransactionType,
  WithdrawalStatus,
  type WalletBalanceInfo,
} from '@/types/financial/payment';
import { WalletTransaction as Transaction, WithdrawalRequest as Withdrawal } from '@/trpc/client';
import { WalletBalance } from '@/components/shared/payments/wallet-balance';
import { useWallet } from '@/hooks/payment/use-wallet';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { addDays, format, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';

// Composant pour le graphique des revenus
interface EarningChartProps {
  data: { date: Date; amount: number }[];
  isLoading?: boolean;
  isDemo?: boolean;
}

const EarningChart = ({ data, isLoading = false, isDemo = false }: EarningChartProps) => {
  // Trouver les valeurs max pour dimensionner le graphique
  const maxAmount = Math.max(...data.map(item => item.amount), 1);

  if (isLoading) {
    return (
      <div className="h-60 w-full bg-muted/20 rounded-md flex items-center justify-center">
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="h-60 w-full">
      <div className="flex h-full items-end gap-2">
        {data.map((item, index) => {
          const height = (item.amount / maxAmount) * 100;
          const today = new Date();
          const isToday = format(item.date, 'dd/MM') === format(today, 'dd/MM');

          return (
            <TooltipProvider key={index}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={`w-full rounded-t-md transition-all ${
                        isToday ? 'bg-primary' : 'bg-primary/60'
                      }`}
                      style={{ height: `${height}%` }}
                    ></div>
                    <span className="text-xs mt-2 text-muted-foreground">
                      {format(item.date, 'dd/MM')}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="space-y-1">
                    <p className="font-medium">
                      {format(item.date, 'EEEE dd MMMM', { locale: fr })}
                    </p>
                    <p className="text-sm">{formatCurrency(item.amount)}</p>
                    {isDemo && (
                      <p className="text-xs text-muted-foreground">(Données de démonstration)</p>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </div>
    </div>
  );
};

// Types pour les transactions et withdrawals
interface PaginationData {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'COMPLETED':
      return (
        <Badge
          variant="outline"
          className="bg-green-50 text-green-700 border-green-200 flex items-center gap-1"
        >
          <CheckCircle2 className="h-3 w-3" />
          Complété
        </Badge>
      );
    case 'PENDING':
      return (
        <Badge variant="outline" className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          En attente
        </Badge>
      );
    case 'PROCESSING':
      return (
        <Badge variant="secondary" className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          En cours
        </Badge>
      );
    case 'CANCELLED':
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <XCircle className="h-3 w-3" />
          Annulé
        </Badge>
      );
    case 'FAILED':
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          Échoué
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

const getTransactionIcon = (type: string) => {
  switch (type) {
    case 'EARNING':
      return (
        <Badge
          variant="outline"
          className="bg-green-50 text-green-700 border-green-200 min-w-10 justify-center"
        >
          <ArrowDownToLine className="h-4 w-4" />
        </Badge>
      );
    case 'WITHDRAWAL':
      return (
        <Badge variant="destructive" className="min-w-10 justify-center">
          <ArrowUpFromLine className="h-4 w-4" />
        </Badge>
      );
    case 'REFUND':
      return (
        <Badge variant="secondary" className="min-w-10 justify-center">
          <CreditCard className="h-4 w-4" />
        </Badge>
      );
    case 'SUBSCRIPTION_FEE':
      return (
        <Badge variant="destructive" className="min-w-10 justify-center">
          <Calendar className="h-4 w-4" />
        </Badge>
      );
    case 'PLATFORM_FEE':
      return (
        <Badge variant="destructive" className="min-w-10 justify-center">
          <CircleDollarSign className="h-4 w-4" />
        </Badge>
      );
    case 'ADJUSTMENT':
      return (
        <Badge variant="secondary" className="min-w-10 justify-center">
          <BanknoteIcon className="h-4 w-4" />
        </Badge>
      );
    case 'BONUS':
      return (
        <Badge
          variant="outline"
          className="bg-green-50 text-green-700 border-green-200 min-w-10 justify-center"
        >
          <CircleDollarSign className="h-4 w-4" />
        </Badge>
      );
    default:
      return (
        <Badge className="min-w-10 justify-center">
          <Package className="h-4 w-4" />
        </Badge>
      );
  }
};

const getTransactionTitle = (type: string) => {
  switch (type) {
    case 'EARNING':
      return 'Gain';
    case 'WITHDRAWAL':
      return 'Virement';
    case 'REFUND':
      return 'Remboursement';
    case 'SUBSCRIPTION_FEE':
      return "Frais d'abonnement";
    case 'PLATFORM_FEE':
      return 'Commission plateforme';
    case 'ADJUSTMENT':
      return 'Ajustement';
    case 'BONUS':
      return 'Bonus';
    default:
      return type;
  }
};

interface DelivererWalletDashboardProps {
  userId: string;
  isDemo?: boolean;
}

export default function DelivererWalletDashboard({
  userId,
  isDemo = false,
}: DelivererWalletDashboardProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('transactions');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const { toast } = useToast();
  const utils = api.useUtils();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Générer des données de démo pour l'historique des gains sur 7 jours
  const generateDemoEarningsData = () => {
    const data = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const date = subDays(today, i);
      // Générer un montant aléatoire entre 20 et 80 euros
      // Les weekends ont des montants plus élevés
      const isWeekend = [0, 6].includes(date.getDay());
      const baseAmount = isWeekend ? 50 : 30;
      const amount = baseAmount + Math.random() * (isWeekend ? 30 : 20);

      data.push({
        date,
        amount,
      });
    }

    return data;
  };

  // Récupérer les vraies données de gains via l'API
  const { data: earningsApiData, isLoading: isLoadingEarnings } = isDemo
    ? { data: null, isLoading: false }
    : api.wallet.getWalletStats.useQuery({
        period: 'daily',
        startDate: subDays(new Date(), 7),
        endDate: new Date(),
      });

  // État pour stocker les données de gains
  const [earningsData, setEarningsData] = useState<{ date: Date; amount: number }[]>([]);

  useEffect(() => {
    if (isDemo) {
      setEarningsData(generateDemoEarningsData());
    } else if (earningsApiData?.dailyEarnings) {
      // Utiliser les vraies données d'earnings si disponibles
      setEarningsData(earningsApiData.dailyEarnings);
    } else {
      // Fallback vers les données générées si pas de données API
      setEarningsData(generateDemoEarningsData());
    }
  }, [isDemo, earningsApiData]);

  // Simuler des données de transactions pour le mode démo
  const generateDemoTransactions = () => {
    const types = ['EARNING', 'WITHDRAWAL', 'PLATFORM_FEE', 'BONUS'] as const;
    const statuses = ['COMPLETED', 'PENDING'] as const;

    return Array(20)
      .fill(0)
      .map((_, i) => ({
        id: `tx_demo_${i}`,
        type: types[Math.floor(Math.random() * types.length)],
        status: statuses[Math.floor(Math.random() * statuses.length)],
        amount: Math.floor(Math.random() * 100) + 20,
        currency: 'EUR',
        createdAt: subDays(new Date(), Math.floor(Math.random() * 30)),
        description: `Transaction démo #${i}`,
      }));
  };

  // Simuler des données de retraits pour le mode démo
  const generateDemoWithdrawals = () => {
    const statuses = ['COMPLETED', 'PENDING', 'PROCESSING'] as const;

    return Array(5)
      .fill(0)
      .map((_, i) => ({
        id: `wd_demo_${i}`,
        amount: Math.floor(Math.random() * 200) + 50,
        currency: 'EUR',
        status: statuses[Math.floor(Math.random() * statuses.length)],
        requestedAt: subDays(new Date(), Math.floor(Math.random() * 60)),
        processedAt:
          Math.random() > 0.3 ? subDays(new Date(), Math.floor(Math.random() * 30)) : null,
      }));
  };

  // Utiliser les vraies données par défaut, sauf si isDemo est explicitement true
  const { data: transactionsData, isLoading: isLoadingTransactions } = isDemo
    ? {
        data: {
          transactions: generateDemoTransactions(),
          pagination: { total: 20, totalPages: 2, page: 1, limit: 10 },
        },
        isLoading: false,
      }
    : api.wallet.getTransactionHistory.useQuery(
        {
          page: currentPage,
          limit: pageSize,
        },
        {
          enabled: activeTab === 'transactions',
        }
      );

  // Utiliser les transactions de type WITHDRAWAL pour les retraits
  const { data: withdrawalsData, isLoading: isLoadingWithdrawals } = isDemo
    ? {
        data: {
          withdrawals: generateDemoWithdrawals(),
          pagination: { total: 5, totalPages: 1, page: 1, limit: 10 },
        },
        isLoading: false,
      }
    : api.wallet.getTransactionHistory.useQuery(
        {
          page: currentPage,
          limit: pageSize,
          type: 'WITHDRAWAL',
        },
        {
          enabled: activeTab === 'withdrawals',
        }
      );

  const cancelWithdrawalMutation = api.wallet.cancelWithdrawal.useMutation({
    onSuccess: () => {
      toast({
        title: 'Demande de virement annulée',
        variant: 'success',
      });

      if (activeTab === 'withdrawals') {
        refetchWithdrawals();
      }
    },
  });

  const { refetch: refetchWithdrawals } = isDemo
    ? { refetch: () => Promise.resolve() }
    : api.wallet.getTransactionHistory.useQuery(
        { page: 1, limit: 10, type: 'WITHDRAWAL' },
        { enabled: false }
      );

  const handleCancelWithdrawal = (withdrawalId: string) => {
    if (confirm('Êtes-vous sûr de vouloir annuler cette demande de virement ?')) {
      if (isDemo) {
        toast({
          title: 'Annulation simulée',
          description: "Dans le mode démo, aucune modification réelle n'est effectuée.",
          variant: 'success',
        });
      } else {
        cancelWithdrawalMutation.mutate({ withdrawalId });
      }
    }
  };

  // Rafraîchir les données
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      if (!isDemo) {
        if (activeTab === 'transactions') {
          await utils.wallet.getTransactionHistory.invalidate();
        } else if (activeTab === 'withdrawals') {
          await refetchWithdrawals();
        }
      } else {
        // En mode démo, on simule juste un délai
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Régénérer de nouvelles données aléatoires
        setEarningsData(generateDemoEarningsData());
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            Portefeuille
            {isDemo && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge
                      variant="outline"
                      className="ml-2 bg-amber-50 text-amber-700 border-amber-200 flex items-center gap-1"
                    >
                      <Zap className="h-3 w-3" />
                      Mode démo
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">
                      En mode démo, les données affichées sont fictives et les actions n'ont pas
                      d'effet réel.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </h1>
          <p className="text-muted-foreground">Gérez vos gains et demandes de virement</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-1"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Rafraîchir
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <WalletBalance
          userId={userId}
          className="lg:col-span-2"
          isDemo={isDemo}
          onRefresh={handleRefresh}
        />

        <Card>
          <CardHeader className="bg-primary/10 pb-2">
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Actions rapides
            </CardTitle>
            <CardDescription>Gérez vos revenus et paiements</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 pt-6">
            <Button
              variant="default"
              className="w-full justify-start"
              onClick={() => router.push('/deliverer/wallet/withdrawal')}
            >
              <ArrowUpFromLine className="mr-2 h-5 w-5" />
              Demander un virement
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => router.push('/deliverer/deliveries/active')}
            >
              <Package className="mr-2 h-5 w-5" />
              Voir les livraisons disponibles
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => router.push('/deliverer/schedule')}
            >
              <Calendar className="mr-2 h-5 w-5" />
              Gérer mon planning
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Tendance des gains
          </CardTitle>
          <CardDescription>Vos gains des 7 derniers jours</CardDescription>
        </CardHeader>
        <CardContent>
          <EarningChart data={earningsData} isLoading={isRefreshing} isDemo={isDemo} />

          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-1">
              <DollarSign className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">
                Total: {formatCurrency(earningsData.reduce((sum, item) => sum + item.amount, 0))}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Truck className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">{earningsData.length} jours</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="transactions" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="w-full">
          <TabsTrigger value="transactions" className="flex-1">
            Historique des transactions
          </TabsTrigger>
          <TabsTrigger value="withdrawals" className="flex-1">
            Demandes de virement
          </TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="pt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle>Transactions</CardTitle>
                <Button variant="outline" size="sm" className="h-8">
                  <ReceiptText className="mr-2 h-4 w-4" />
                  Filtrer
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingTransactions ? (
                <div className="space-y-3">
                  {Array(5)
                    .fill(0)
                    .map((_, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <div className="space-y-1 flex-1">
                          <Skeleton className="h-4 w-1/3" />
                          <Skeleton className="h-3 w-1/4" />
                        </div>
                        <Skeleton className="h-4 w-16" />
                      </div>
                    ))}
                </div>
              ) : (
                <>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Type</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Montant</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transactionsData?.transactions &&
                        transactionsData.transactions.length > 0 ? (
                          transactionsData.transactions.map((transaction: Transaction) => (
                            <TableRow key={transaction.id}>
                              <TableCell>
                                <div className="flex flex-col items-center gap-1">
                                  {getTransactionIcon(transaction.type)}
                                  <span className="text-xs">
                                    {getTransactionTitle(transaction.type)}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">{formatDate(transaction.createdAt)}</div>
                              </TableCell>
                              <TableCell>
                                <div className="max-w-[200px] truncate">
                                  {transaction.description ||
                                    `Transaction #${transaction.id.slice(-6)}`}
                                </div>
                              </TableCell>
                              <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                              <TableCell className="text-right font-medium">
                                <span
                                  className={
                                    transaction.type === 'WITHDRAWAL' ||
                                    transaction.type === 'PLATFORM_FEE'
                                      ? 'text-destructive'
                                      : 'text-emerald-600'
                                  }
                                >
                                  {transaction.type === 'WITHDRAWAL' ||
                                  transaction.type === 'PLATFORM_FEE'
                                    ? '-'
                                    : '+'}
                                  {formatCurrency(Number(transaction.amount), transaction.currency)}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center">
                              Aucune transaction trouvée
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {transactionsData?.pagination && transactionsData.pagination.total > 0 && (
                    <Pagination className="mt-4">
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            href="#"
                            onClick={(e: React.MouseEvent) => {
                              e.preventDefault();
                              if (currentPage > 1) setCurrentPage(currentPage - 1);
                            }}
                            className={currentPage <= 1 ? 'pointer-events-none opacity-50' : ''}
                          />
                        </PaginationItem>

                        {Array.from(
                          { length: Math.min(3, transactionsData.pagination.totalPages) },
                          (_, i) => {
                            const pageNumber = i + 1;
                            return (
                              <PaginationItem key={i}>
                                <PaginationLink
                                  href="#"
                                  onClick={(e: React.MouseEvent) => {
                                    e.preventDefault();
                                    setCurrentPage(pageNumber);
                                  }}
                                  isActive={currentPage === pageNumber}
                                >
                                  {pageNumber}
                                </PaginationLink>
                              </PaginationItem>
                            );
                          }
                        )}

                        {transactionsData.pagination.totalPages > 3 && (
                          <>
                            <PaginationItem>
                              <PaginationEllipsis />
                            </PaginationItem>
                            <PaginationItem>
                              <PaginationLink
                                href="#"
                                onClick={(e: React.MouseEvent) => {
                                  e.preventDefault();
                                  setCurrentPage(transactionsData.pagination.totalPages);
                                }}
                                isActive={currentPage === transactionsData.pagination.totalPages}
                              >
                                {transactionsData.pagination.totalPages}
                              </PaginationLink>
                            </PaginationItem>
                          </>
                        )}

                        <PaginationItem>
                          <PaginationNext
                            href="#"
                            onClick={(e: React.MouseEvent) => {
                              e.preventDefault();
                              if (currentPage < transactionsData.pagination.totalPages)
                                setCurrentPage(currentPage + 1);
                            }}
                            className={
                              currentPage >= transactionsData.pagination.totalPages
                                ? 'pointer-events-none opacity-50'
                                : ''
                            }
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="withdrawals" className="pt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle>Demandes de virement</CardTitle>
                <Button onClick={() => router.push('/deliverer/wallet/withdrawal')}>
                  Nouveau virement
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingWithdrawals ? (
                <div className="space-y-3">
                  {Array(5)
                    .fill(0)
                    .map((_, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <div className="space-y-1 flex-1">
                          <Skeleton className="h-4 w-1/3" />
                          <Skeleton className="h-3 w-1/4" />
                        </div>
                        <Skeleton className="h-4 w-16" />
                      </div>
                    ))}
                </div>
              ) : (
                <>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date de demande</TableHead>
                          <TableHead>Montant</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Date de traitement</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {withdrawalsData?.withdrawals && withdrawalsData.withdrawals.length > 0 ? (
                          withdrawalsData.withdrawals.map((withdrawal: Withdrawal) => (
                            <TableRow key={withdrawal.id}>
                              <TableCell>
                                <div className="text-sm">{formatDate(withdrawal.requestedAt)}</div>
                              </TableCell>
                              <TableCell className="font-medium">
                                {formatCurrency(Number(withdrawal.amount), withdrawal.currency)}
                              </TableCell>
                              <TableCell>{getStatusBadge(withdrawal.status)}</TableCell>
                              <TableCell>
                                {withdrawal.processedAt ? formatDate(withdrawal.processedAt) : '-'}
                              </TableCell>
                              <TableCell className="text-right">
                                {withdrawal.status === 'PENDING' && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8"
                                    onClick={() => handleCancelWithdrawal(withdrawal.id)}
                                  >
                                    Annuler
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center">
                              Aucune demande de virement trouvée
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {withdrawalsData?.pagination && withdrawalsData.pagination.total > 0 && (
                    <Pagination className="mt-4">
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            href="#"
                            onClick={(e: React.MouseEvent) => {
                              e.preventDefault();
                              if (currentPage > 1) setCurrentPage(currentPage - 1);
                            }}
                            className={currentPage <= 1 ? 'pointer-events-none opacity-50' : ''}
                          />
                        </PaginationItem>

                        {Array.from(
                          { length: Math.min(3, withdrawalsData.pagination.totalPages) },
                          (_, i) => {
                            const pageNumber = i + 1;
                            return (
                              <PaginationItem key={i}>
                                <PaginationLink
                                  href="#"
                                  onClick={(e: React.MouseEvent) => {
                                    e.preventDefault();
                                    setCurrentPage(pageNumber);
                                  }}
                                  isActive={currentPage === pageNumber}
                                >
                                  {pageNumber}
                                </PaginationLink>
                              </PaginationItem>
                            );
                          }
                        )}

                        {withdrawalsData.pagination.totalPages > 3 && (
                          <>
                            <PaginationItem>
                              <PaginationEllipsis />
                            </PaginationItem>
                            <PaginationItem>
                              <PaginationLink
                                href="#"
                                onClick={(e: React.MouseEvent) => {
                                  e.preventDefault();
                                  setCurrentPage(withdrawalsData.pagination.totalPages);
                                }}
                                isActive={currentPage === withdrawalsData.pagination.totalPages}
                              >
                                {withdrawalsData.pagination.totalPages}
                              </PaginationLink>
                            </PaginationItem>
                          </>
                        )}

                        <PaginationItem>
                          <PaginationNext
                            href="#"
                            onClick={(e: React.MouseEvent) => {
                              e.preventDefault();
                              if (currentPage < withdrawalsData.pagination.totalPages)
                                setCurrentPage(currentPage + 1);
                            }}
                            className={
                              currentPage >= withdrawalsData.pagination.totalPages
                                ? 'pointer-events-none opacity-50'
                                : ''
                            }
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
