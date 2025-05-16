'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { api } from '@/trpc/react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  CreditCard,
  Wallet,
  Receipt,
  ArrowUpRight,
  Loader2,
  CreditCardIcon,
  AlertCircle,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Todo, TodoItem } from '@/components/todo';
import { PaymentStatus } from '@prisma/client';

// Importez individuellement les composants jusqu'à ce que l'index.ts soit correctement créé
import { WalletBalance } from '@/components/payments/wallet-balance';
import { PaymentHistory } from '@/components/payments/payment-history';
import { PaymentSummary } from '@/components/payments/payment-summary';
import { PaymentForm } from '@/components/payments/payment-form';
import { PaymentMethodSelector } from '@/components/payments/payment-method-selector';

export default function ClientPaymentsPage() {
  const t = useTranslations('payment');
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  // Récupérer le solde du portefeuille
  const {
    data: walletData,
    isLoading: isLoadingWallet,
    error: walletError,
  } = api.wallet.getUserWalletBalance.useQuery();

  // Récupérer l'historique des paiements
  const {
    data: paymentsData,
    isLoading: isLoadingPayments,
    error: paymentsError,
  } = api.payment.getUserPayments.useQuery({
    page: 1,
    limit: 10,
  });

  // Récupérer les détails d'un paiement spécifique
  const { data: paymentDetails, isLoading: isLoadingPaymentDetails } =
    api.payment.getPaymentDetails.useQuery(
      { paymentId: selectedPaymentId || '' },
      { enabled: !!selectedPaymentId }
    );

  // Récupérer les tâches financières
  const { data: financialTasks, isLoading: isLoadingTasks } =
    api.payment.getFinancialTasks.useQuery();

  // Convertir les tâches financières en TodoItems
  const todoItems: TodoItem[] = financialTasks
    ? financialTasks.map(task => ({
        id: task.id,
        title: task.title,
        description: task.description,
        dueDate: task.dueDate,
        completed: task.completed,
        priority: task.priority as 'low' | 'medium' | 'high',
        category: task.category as 'payment' | 'invoice' | 'withdrawal' | 'other',
      }))
    : [];

  // Gérer la sélection d'un paiement
  const handleSelectPayment = (paymentId: string) => {
    setSelectedPaymentId(paymentId);
    setActiveTab('details');
  };

  // Gérer le succès d'un paiement
  const handlePaymentSuccess = (paymentId: string) => {
    setSelectedPaymentId(paymentId);
    setShowPaymentForm(false);
    setActiveTab('details');
  };

  // Afficher le formulaire de paiement
  const handleShowPaymentForm = () => {
    setShowPaymentForm(true);
    setActiveTab('make-payment');
  };

  // Annuler le paiement
  const handleCancelPayment = () => {
    setShowPaymentForm(false);
    setActiveTab('overview');
  };

  // Gérer le changement de page dans l'historique des paiements
  const handlePageChange = (page: number) => {
    // À implémenter avec une requête paramétrée
    console.log('Changement de page vers', page);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground">{t('description')}</p>
        </div>
        <Button onClick={handleShowPaymentForm}>
          <CreditCard className="mr-2 h-4 w-4" />
          {t('makePayment')}
        </Button>
      </header>

      {/* Onglets principaux */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4">
          <TabsTrigger value="overview">
            <Wallet className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">{t('wallet')}</span>
          </TabsTrigger>
          <TabsTrigger value="history">
            <Receipt className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">{t('paymentHistory')}</span>
          </TabsTrigger>
          <TabsTrigger value="details" disabled={!selectedPaymentId}>
            <CreditCardIcon className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">{t('paymentDetails')}</span>
          </TabsTrigger>
          <TabsTrigger value="make-payment">
            <ArrowUpRight className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">{t('makePayment')}</span>
          </TabsTrigger>
        </TabsList>

        {/* Contenu des onglets */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Portefeuille */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Wallet className="mr-2 h-5 w-5" />
                  {t('wallet')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {walletError ? (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>{t('error')}</AlertTitle>
                    <AlertDescription>{walletError.message}</AlertDescription>
                  </Alert>
                ) : isLoadingWallet ? (
                  <div className="space-y-2">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : (
                  <WalletBalance
                    balance={Number(walletData?.balance) || 0}
                    currency={walletData?.currency || 'EUR'}
                    pendingAmount={Number(walletData?.pendingAmount) || 0}
                    reservedAmount={Number(walletData?.reservedAmount) || 0}
                    availableAmount={Number(walletData?.availableAmount) || 0}
                    lastUpdated={walletData?.lastUpdated}
                    onRequestWithdrawal={() => {}}
                    onViewAllTransactions={() => setActiveTab('history')}
                    transactions={[]}
                  />
                )}
              </CardContent>
            </Card>

            {/* Tâches financières */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Receipt className="mr-2 h-5 w-5" />
                  {t('financialTasks')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingTasks ? (
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                ) : (
                  <Todo items={todoItems} showAddButton={false} />
                )}
              </CardContent>
            </Card>
          </div>

          {/* Historique récent */}
          <Card>
            <CardHeader>
              <CardTitle>{t('paymentHistory')}</CardTitle>
              <CardDescription>{t('recentTransactions')}</CardDescription>
            </CardHeader>
            <CardContent>
              {paymentsError ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>{t('error')}</AlertTitle>
                  <AlertDescription>{paymentsError.message}</AlertDescription>
                </Alert>
              ) : isLoadingPayments ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : paymentsData?.payments.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-xl font-semibold">{t('noPaymentHistory')}</p>
                  <p className="text-muted-foreground">{t('noPaymentHistoryDescription')}</p>
                  <Button onClick={handleShowPaymentForm} className="mt-4">
                    {t('makePayment')}
                  </Button>
                </div>
              ) : (
                <PaymentHistory
                  payments={
                    paymentsData?.payments.map(p => ({
                      id: p.id,
                      date: p.createdAt,
                      type: 'PAYMENT',
                      status: p.status,
                      amount: Number(p.amount),
                      currency: p.currency,
                      description:
                        typeof p.metadata === 'object' && p.metadata
                          ? (p.metadata as Record<string, any>).description || ''
                          : '',
                    })) || []
                  }
                  onViewDetails={handleSelectPayment}
                  totalCount={paymentsData?.pagination.totalCount || 0}
                  currentPage={paymentsData?.pagination.currentPage || 1}
                  onPageChange={handlePageChange}
                  pageSize={paymentsData?.pagination.perPage || 10}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>{t('paymentHistory')}</CardTitle>
              <CardDescription>{t('allTransactions')}</CardDescription>
            </CardHeader>
            <CardContent>
              {paymentsError ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>{t('error')}</AlertTitle>
                  <AlertDescription>{paymentsError.message}</AlertDescription>
                </Alert>
              ) : isLoadingPayments ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : paymentsData?.payments.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-xl font-semibold">{t('noPaymentHistory')}</p>
                  <p className="text-muted-foreground">{t('noPaymentHistoryDescription')}</p>
                  <Button onClick={handleShowPaymentForm} className="mt-4">
                    {t('makePayment')}
                  </Button>
                </div>
              ) : (
                <PaymentHistory
                  payments={
                    paymentsData?.payments.map(p => ({
                      id: p.id,
                      date: p.createdAt,
                      type: 'PAYMENT',
                      status: p.status,
                      amount: Number(p.amount),
                      currency: p.currency,
                      description:
                        typeof p.metadata === 'object' && p.metadata
                          ? (p.metadata as Record<string, any>).description || ''
                          : '',
                    })) || []
                  }
                  onViewDetails={handleSelectPayment}
                  totalCount={paymentsData?.pagination.totalCount || 0}
                  currentPage={paymentsData?.pagination.currentPage || 1}
                  onPageChange={handlePageChange}
                  pageSize={paymentsData?.pagination.perPage || 10}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle>{t('paymentDetails')}</CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedPaymentId ? (
                <div className="text-center py-6">
                  <p className="text-xl font-semibold">{t('selectPayment')}</p>
                  <p className="text-muted-foreground">{t('selectPaymentDescription')}</p>
                  <Button onClick={() => setActiveTab('history')} className="mt-4">
                    {t('paymentHistory')}
                  </Button>
                </div>
              ) : isLoadingPaymentDetails ? (
                <div className="space-y-2">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : !paymentDetails ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>{t('error')}</AlertTitle>
                  <AlertDescription>{t('paymentNotFound')}</AlertDescription>
                </Alert>
              ) : (
                <PaymentSummary
                  paymentId={paymentDetails.id}
                  amount={Number(paymentDetails.amount)}
                  currency={paymentDetails.currency}
                  status={paymentDetails.status}
                  createdAt={paymentDetails.createdAt}
                  updatedAt={paymentDetails.updatedAt}
                  paymentMethod={paymentDetails.paymentMethod ? 'card' : 'wallet'}
                  description={
                    typeof paymentDetails.metadata === 'object' && paymentDetails.metadata
                      ? (paymentDetails.metadata as Record<string, any>).description || ''
                      : ''
                  }
                  invoiceId={paymentDetails.invoiceId}
                  onViewInvoice={
                    paymentDetails.invoiceId
                      ? () => console.log('View invoice', paymentDetails.invoiceId)
                      : undefined
                  }
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="make-payment">
          <Card>
            <CardHeader>
              <CardTitle>{t('makePayment')}</CardTitle>
              <CardDescription>{t('paymentFormDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              <PaymentForm
                onSuccess={handlePaymentSuccess}
                onCancel={handleCancelPayment}
                savedPaymentMethods={[]} // À remplacer par les méthodes de paiement sauvegardées
                walletBalance={Number(walletData?.balance) || 0}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
