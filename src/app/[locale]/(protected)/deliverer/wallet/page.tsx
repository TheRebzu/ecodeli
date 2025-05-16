'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { api } from '@/trpc/react';
import { redirect } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';

import { WalletBalance } from '@/components/payments/wallet-balance';
import { WithdrawalForm } from '@/components/payments/withdrawal-form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet, ArrowUpRight, BanknoteIcon, HistoryIcon, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Mock data pour les transactions (à remplacer par les données réelles)
const mockTransactions = [
  {
    id: '1',
    amount: 25.5,
    currency: 'EUR',
    type: 'EARNING',
    status: 'COMPLETED',
    description: 'Livraison #D2305-001',
    createdAt: new Date('2025-05-01T10:30:00'),
  },
  {
    id: '2',
    amount: 18.75,
    currency: 'EUR',
    type: 'EARNING',
    status: 'COMPLETED',
    description: 'Livraison #D2305-002',
    createdAt: new Date('2025-05-02T14:15:00'),
  },
  {
    id: '3',
    amount: 50,
    currency: 'EUR',
    type: 'WITHDRAWAL',
    status: 'PENDING',
    description: 'Retrait vers compte bancaire',
    createdAt: new Date('2025-05-03T09:45:00'),
  },
  {
    id: '4',
    amount: 21.25,
    currency: 'EUR',
    type: 'EARNING',
    status: 'COMPLETED',
    description: 'Livraison #D2305-003',
    createdAt: new Date('2025-05-04T16:20:00'),
  },
  {
    id: '5',
    amount: 2.5,
    currency: 'EUR',
    type: 'PLATFORM_FEE',
    status: 'COMPLETED',
    description: 'Frais de plateforme',
    createdAt: new Date('2025-05-04T16:20:00'),
  },
];

export default function DelivererWalletPage() {
  const { toast } = useToast();
  const t = useTranslations('wallet');
  const [activeTab, setActiveTab] = useState<string>('balance');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showWithdrawalForm, setShowWithdrawalForm] = useState(false);

  // Utiliser l'API tRPC pour récupérer les données du portefeuille
  const { data: walletData, isLoading, error } = api.wallet.getDelivererWallet.useQuery();

  // Pour soumettre une demande de retrait
  const withdrawalMutation = api.wallet.requestWithdrawal.useMutation({
    onSuccess: () => {
      toast({
        title: t('withdrawalRequestSuccess'),
        description: t('withdrawalRequestProcessing'),
      });
      setShowWithdrawalForm(false);
    },
    onError: error => {
      toast({
        title: t('withdrawalRequestFailed'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{t('error')}</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    );
  }

  // Gérer la demande de retrait
  const handleRequestWithdrawal = async (data: any) => {
    setIsSubmitting(true);
    try {
      await withdrawalMutation.mutateAsync({
        amount: parseFloat(data.amount),
        bankDetails: data.bankDetails,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Gérer l'affichage de toutes les transactions
  const handleViewAllTransactions = () => {
    setActiveTab('transactions');
  };

  // Valeur du portefeuille depuis l'API ou mock
  const walletBalance = walletData?.balance || 115.5;

  return (
    <div className="container py-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground mt-1">{t('description')}</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-2">
          <TabsTrigger value="balance" className="flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            {t('balance')}
          </TabsTrigger>
          <TabsTrigger value="transactions" className="flex items-center gap-2">
            <HistoryIcon className="h-4 w-4" />
            {t('transactions')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="balance" className="space-y-6">
          {showWithdrawalForm ? (
            <WithdrawalForm
              walletBalance={walletBalance}
              minimumAmount={10}
              onSubmit={handleRequestWithdrawal}
              isLoading={isSubmitting}
              savedBankDetails={walletData?.bankDetails || null}
            />
          ) : (
            <WalletBalance
              balance={walletBalance}
              transactions={mockTransactions}
              isLoading={isLoading}
              onRequestWithdrawal={() => setShowWithdrawalForm(true)}
              onViewAllTransactions={handleViewAllTransactions}
            />
          )}
        </TabsContent>

        <TabsContent value="transactions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('transactionHistory')}</CardTitle>
              <CardDescription>{t('transactionHistoryDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center p-6">
                  <p>{t('loading')}</p>
                </div>
              ) : mockTransactions.length === 0 ? (
                <div className="text-center p-6">
                  <AlertCircle className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">{t('noTransactions')}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {mockTransactions.map(transaction => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between p-4 border rounded-md"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-full ${
                            transaction.type === 'EARNING'
                              ? 'bg-green-100'
                              : transaction.type === 'WITHDRAWAL'
                                ? 'bg-amber-100'
                                : 'bg-red-100'
                          }`}
                        >
                          {transaction.type === 'EARNING' ? (
                            <BanknoteIcon className="h-5 w-5 text-green-600" />
                          ) : transaction.type === 'WITHDRAWAL' ? (
                            <ArrowUpRight className="h-5 w-5 text-amber-600" />
                          ) : (
                            <AlertCircle className="h-5 w-5 text-red-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{transaction.description}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(transaction.createdAt).toLocaleDateString('fr-FR')} •{' '}
                            {t(`transactionStatus.${transaction.status.toLowerCase()}`)}
                          </p>
                        </div>
                      </div>
                      <p
                        className={`font-medium ${
                          transaction.type === 'EARNING'
                            ? 'text-green-600'
                            : transaction.type === 'WITHDRAWAL'
                              ? 'text-amber-600'
                              : 'text-red-600'
                        }`}
                      >
                        {transaction.type === 'EARNING' ? '+' : '-'}
                        {transaction.amount.toFixed(2)} €
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
