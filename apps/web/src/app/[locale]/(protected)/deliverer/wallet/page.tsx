'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Wallet,
  BanknoteIcon,
  ArrowUpFromLine,
  FileText,
  BarChart,
  RefreshCw,
  CheckCircle,
  Clock,
} from 'lucide-react';

import { api } from '@/trpc/react';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils/common';
import { formatCurrency } from '@/utils/document-utils';

import { DelivererWalletDashboard } from '@/config/dashboard';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

export default function DelivererWalletPage() {
  const t = useTranslations('wallet');
  const { data: session } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Récupérer les données du portefeuille
  const { data: walletData, isLoading: isLoadingWallet } = api.wallet.getMyWallet.useQuery(
    undefined,
    {
      refetchOnWindowFocus: false,
    }
  );

  // Récupérer les demandes de retrait en attente
  const { data: pendingWithdrawals, isLoading: isLoadingWithdrawals } =
    api.withdrawal.getMyWithdrawals.useQuery(
      { status: 'PENDING', limit: 5 },
      {
        refetchOnWindowFocus: false,
      }
    );

  // Rafraîchir les données
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        api.wallet.getMyWallet.refetch(),
        api.withdrawal.getMyWithdrawals.refetch(),
      ]);

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

  // Accéder à la page de retrait
  const handleRequestWithdrawal = () => {
    router.push('/deliverer/wallet/withdrawal');
  };

  // Accéder à l'historique des paiements
  const handleViewPayments = () => {
    router.push('/deliverer/payments');
  };

  // Afficher un écran de chargement
  if (isLoadingWallet && !walletData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">{t('dashboardTitle')}</h1>
          <Button variant="outline" size="sm" disabled={true}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {t('refresh')}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-4 w-24 mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-4 w-24 mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-4 w-24 mt-2" />
            </CardContent>
          </Card>
        </div>

        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  // Contenu principal
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Wallet className="h-8 w-8" />
          {t('dashboardTitle')}
        </h1>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {t('refresh')}
          </Button>

          <Button size="sm" onClick={handleRequestWithdrawal}>
            <ArrowUpFromLine className="h-4 w-4 mr-2" />
            {t('requestWithdrawal')}
          </Button>
        </div>
      </div>

      {/* Cartes d'aperçu rapide */}
      {walletData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <BanknoteIcon className="h-4 w-4 text-primary" />
                {t('availableBalance')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {formatCurrency(walletData.wallet.balance, walletData.wallet.currency)}
              </div>
              <p className="text-sm text-muted-foreground mt-1">{t('withdrawalAvailable')}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart className="h-4 w-4 text-green-500" />
                {t('totalEarned')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {formatCurrency(walletData.wallet.totalEarned || 0, walletData.wallet.currency)}
              </div>
              <p className="text-sm text-muted-foreground mt-1">{t('sinceJoining')}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500" />
                {t('pendingWithdrawals')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <div className="text-3xl font-bold text-amber-600">
                  {pendingWithdrawals ? pendingWithdrawals.withdrawals.length : 0}
                </div>
                {pendingWithdrawals && pendingWithdrawals.withdrawals.length > 0 && (
                  <div className="text-sm text-muted-foreground">
                    (
                    {formatCurrency(
                      pendingWithdrawals.withdrawals.reduce((sum, w) => sum + w.amount, 0),
                      walletData.wallet.currency
                    )}
                    )
                  </div>
                )}
              </div>
              <div className="flex gap-2 mt-1">
                {pendingWithdrawals && pendingWithdrawals.withdrawals.length > 0 ? (
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                    <Clock className="h-3 w-3 mr-1" />
                    {t('processing')}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    {t('allProcessed')}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Afficher le contenu du tableau de bord */}
      {session?.user ? (
        <DelivererWalletDashboard userId={session.user.id} isDemo={walletData?.isDemoMode} />
      ) : (
        <Alert variant="destructive">
          <AlertTitle>{t('notAuthenticated')}</AlertTitle>
          <AlertDescription>{t('loginRequired')}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col sm:flex-row gap-2 justify-end mt-4">
        <Button variant="outline" onClick={handleViewPayments}>
          <FileText className="h-4 w-4 mr-2" />
          {t('viewPaymentHistory')}
        </Button>
      </div>
    </div>
  );
}
