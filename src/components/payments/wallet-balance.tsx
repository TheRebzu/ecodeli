'use client';

import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslations } from 'next-intl';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ArrowUpRight, ArrowDownLeft, Clock, AlertCircle, Check } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { CreditCard, ArrowUp } from 'lucide-react';

// Types pour les transactions
export type TransactionStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
export type TransactionType =
  | 'EARNING'
  | 'WITHDRAWAL'
  | 'REFUND'
  | 'SUBSCRIPTION_FEE'
  | 'PLATFORM_FEE'
  | 'ADJUSTMENT'
  | 'BONUS';

export interface Transaction {
  id: string;
  amount: number;
  currency: string;
  type: TransactionType;
  status: TransactionStatus;
  description?: string;
  reference?: string;
  createdAt: Date;
}

interface WalletBalanceProps {
  balance: number;
  currency?: string;
  transactions: Transaction[];
  isLoading?: boolean;
  onRequestWithdrawal: () => void;
  onViewAllTransactions: () => void;
  lastUpdated?: Date;
  pendingAmount?: number;
  reservedAmount?: number;
  availableAmount?: number;
}

export const WalletBalance = ({
  balance,
  currency = 'EUR',
  transactions,
  isLoading = false,
  onRequestWithdrawal,
  onViewAllTransactions,
  lastUpdated,
  pendingAmount = 0,
  reservedAmount = 0,
  availableAmount,
}: WalletBalanceProps) => {
  const t = useTranslations('wallet');

  // Convertir les transactions entre entrées et sorties pour l'affichage par onglets
  const incomingTransactions = transactions.filter(tx =>
    ['EARNING', 'REFUND', 'ADJUSTMENT', 'BONUS'].includes(tx.type)
  );

  const outgoingTransactions = transactions.filter(tx =>
    ['WITHDRAWAL', 'SUBSCRIPTION_FEE', 'PLATFORM_FEE'].includes(tx.type)
  );

  // Fonction d'affichage des icônes par type
  const getTransactionIcon = (type: TransactionType) => {
    switch (type) {
      case 'EARNING':
        return <ArrowDownLeft className="h-4 w-4 text-green-500" />;
      case 'WITHDRAWAL':
        return <ArrowUpRight className="h-4 w-4 text-amber-500" />;
      case 'REFUND':
        return <ArrowDownLeft className="h-4 w-4 text-blue-500" />;
      case 'SUBSCRIPTION_FEE':
      case 'PLATFORM_FEE':
        return <ArrowUpRight className="h-4 w-4 text-red-500" />;
      case 'ADJUSTMENT':
        return <Check className="h-4 w-4 text-blue-500" />;
      case 'BONUS':
        return <ArrowDownLeft className="h-4 w-4 text-purple-500" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  // Fonction d'affichage du status
  const getStatusBadge = (status: TransactionStatus) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            {t('completed')}
          </Badge>
        );
      case 'PENDING':
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
            {t('pending')}
          </Badge>
        );
      case 'FAILED':
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            {t('failed')}
          </Badge>
        );
      case 'CANCELLED':
        return (
          <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">
            {t('cancelled')}
          </Badge>
        );
      default:
        return null;
    }
  };

  // Si disponible n'est pas fourni, calculer à partir du solde et des montants réservés/en attente
  const available = availableAmount ?? balance - pendingAmount - reservedAmount;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{t('walletBalance')}</CardTitle>
        <CardDescription>{t('walletDescription')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : (
          <div className="flex flex-col space-y-1">
            <span className="text-sm text-muted-foreground">{t('availableBalance')}</span>
            <span className="text-4xl font-bold">{formatCurrency(balance, currency)}</span>
          </div>
        )}

        <Tabs defaultValue="incoming" className="w-full">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="incoming">{t('incoming')}</TabsTrigger>
            <TabsTrigger value="outgoing">{t('outgoing')}</TabsTrigger>
          </TabsList>

          <TabsContent value="incoming" className="mt-4 space-y-4">
            {isLoading ? (
              <>
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </>
            ) : (
              <>
                {incomingTransactions.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    <AlertCircle className="h-5 w-5 mx-auto mb-2" />
                    <p>{t('noIncomingTransactions')}</p>
                  </div>
                ) : (
                  incomingTransactions.slice(0, 5).map(transaction => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between border-b pb-3"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="bg-slate-100 p-2 rounded-full">
                          {getTransactionIcon(transaction.type)}
                        </div>
                        <div>
                          <p className="font-medium text-sm">
                            {t(`transactionTypes.${transaction.type.toLowerCase()}`)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(transaction.createdAt, 'dd/MM/yyyy HH:mm')}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <p className="font-medium text-green-600">
                          +{formatCurrency(transaction.amount, transaction.currency)}
                        </p>
                        {getStatusBadge(transaction.status)}
                      </div>
                    </div>
                  ))
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="outgoing" className="mt-4 space-y-4">
            {isLoading ? (
              <>
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </>
            ) : (
              <>
                {outgoingTransactions.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    <AlertCircle className="h-5 w-5 mx-auto mb-2" />
                    <p>{t('noOutgoingTransactions')}</p>
                  </div>
                ) : (
                  outgoingTransactions.slice(0, 5).map(transaction => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between border-b pb-3"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="bg-slate-100 p-2 rounded-full">
                          {getTransactionIcon(transaction.type)}
                        </div>
                        <div>
                          <p className="font-medium text-sm">
                            {t(`transactionTypes.${transaction.type.toLowerCase()}`)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(transaction.createdAt, 'dd/MM/yyyy HH:mm')}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <p className="font-medium text-red-600">
                          -{formatCurrency(transaction.amount, transaction.currency)}
                        </p>
                        {getStatusBadge(transaction.status)}
                      </div>
                    </div>
                  ))
                )}
              </>
            )}
          </TabsContent>
        </Tabs>

        <div className="space-y-4">
          <div className="flex flex-col items-center justify-center py-6">
            <p className="text-sm font-medium text-muted-foreground mb-2">{t('currentBalance')}</p>
            <h2 className="text-3xl font-bold">{formatCurrency(balance, currency)}</h2>
            {lastUpdated && (
              <p className="text-xs text-muted-foreground mt-1 flex items-center">
                <Clock className="h-3 w-3 mr-1" />
                {t('lastUpdated')}: {formatDate(lastUpdated)}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-2">
            <Card className="bg-primary/5 border-primary/10">
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <CreditCard className="h-4 w-4 mr-2 text-primary" />
                    <span className="text-sm font-medium">{t('available')}</span>
                  </div>
                  <span className="font-bold">{formatCurrency(available, currency)}</span>
                </div>
              </CardContent>
            </Card>

            {pendingAmount > 0 && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-2 text-amber-500" />
                      <span className="text-sm font-medium">{t('pending')}</span>
                    </div>
                    <span className="font-medium text-amber-500">
                      {formatCurrency(pendingAmount, currency)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}

            {reservedAmount > 0 && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <ArrowUp className="h-4 w-4 mr-2 text-blue-500" />
                      <span className="text-sm font-medium">{t('reserved')}</span>
                    </div>
                    <span className="font-medium text-blue-500">
                      {formatCurrency(reservedAmount, currency)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onViewAllTransactions}>
          {t('viewAllTransactions')}
        </Button>
        <Button onClick={onRequestWithdrawal}>{t('requestWithdrawal')}</Button>
      </CardFooter>
    </Card>
  );
};
