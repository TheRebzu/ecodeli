'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { api } from '@/trpc/react';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatDate } from '@/lib/utils';
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
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
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
} from '@/types/payment';
import {
  WalletTransaction as Transaction,
  WithdrawalRequest as Withdrawal,
} from '@/types/prisma-client';
import WalletBalance from '../wallet-balance';
import { useWallet } from '@/hooks/use-wallet';

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

export default function DelivererWalletDashboard({ userId }: { userId: string }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('transactions');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const { toast } = useToast();
  const utils = api.useUtils();

  const { data: transactionsData, isLoading: isLoadingTransactions } =
    api.wallet.getTransactionHistory.useQuery(
      {
        page: currentPage,
        limit: pageSize,
      },
      {
        enabled: activeTab === 'transactions',
      }
    );

  const { data: withdrawalsData, isLoading: isLoadingWithdrawals } =
    api.wallet.getWithdrawals.useQuery(
      {
        page: currentPage,
        limit: pageSize,
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

  const { refetch: refetchWithdrawals } = api.wallet.getWithdrawals.useQuery(
    { page: 1, limit: 10 },
    { enabled: false }
  );

  const handleCancelWithdrawal = (withdrawalId: string) => {
    if (confirm('Êtes-vous sûr de vouloir annuler cette demande de virement ?')) {
      cancelWithdrawalMutation.mutate({ withdrawalId });
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <WalletBalance userId={userId} className="lg:col-span-2" />

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
