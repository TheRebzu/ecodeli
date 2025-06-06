'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  PaymentForm,
  PaymentSummary,
  PaymentMethodSelector,
  PaymentHistory,
  StripeElements,
} from '@/server/api/routers/merchant/merchant-payments.router';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useInitiatePayment, usePaymentConfirmation, usePaymentHistory } from '@/hooks/payment/use-payment';
import { toast } from '@/components/ui/use-toast';

// Données de démo
const demoPaymentMethods = [
  {
    id: 'card_demo_visa',
    last4: '4242',
    brand: 'visa',
    expiryMonth: 12,
    expiryYear: 2030,
  },
  {
    id: 'card_demo_mastercard',
    last4: '5555',
    brand: 'mastercard',
    expiryMonth: 10,
    expiryYear: 2028,
  },
];

const demoPayment = {
  paymentId: 'pi_demo_123456',
  amount: 42.99,
  status: 'PENDING',
  createdAt: new Date(),
  updatedAt: new Date(),
  paymentMethod: 'Visa •••• 4242',
  customerName: 'Jean Dupont',
  customerEmail: 'jean.dupont@example.com',
  description: 'Paiement de démonstration',
  reference: 'REF123456',
  metadata: {
    orderId: 'order_123',
    product: 'Abonnement Premium',
  },
};

export function PaymentDemo() {
  const t = useTranslations('payment');
  const [activeTab, setActiveTab] = useState('payment-form');
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string>('PENDING');
  const [amount, setAmount] = useState<number>(42.99);
  const [description, setDescription] = useState<string>('Paiement de démonstration');

  // Utiliser nos hooks personnalisés
  const { initiatePayment, clientSecret, PaymentElementsProvider } = useInitiatePayment();
  const { simulateSuccess, simulateFailure, simulateRefund, simulateDispute } =
    usePaymentConfirmation();
  const { paymentHistory, loadPaymentHistory } = usePaymentHistory();

  // Gérer la soumission d'un paiement
  const handlePaymentSubmit = async (paymentId: string) => {
    setPaymentIntentId(paymentId);
    toast({
      title: t('paymentInitiated'),
      description: t('checkPaymentSummary'),
    });
    setActiveTab('payment-summary');
  };

  // Gérer la simulation de succès
  const handleSimulateSuccess = async () => {
    if (paymentIntentId) {
      await simulateSuccess(paymentIntentId);
      setPaymentStatus('COMPLETED');
      toast({
        title: t('paymentSuccessful'),
        description: t('paymentProcessed'),
      });
    }
  };

  // Gérer la simulation d'échec
  const handleSimulateFailure = async () => {
    if (paymentIntentId) {
      await simulateFailure(paymentIntentId);
      setPaymentStatus('FAILED');
      toast({
        variant: 'destructive',
        title: t('paymentFailed'),
        description: t('paymentFailedDescription'),
      });
    }
  };

  // Gérer la simulation de remboursement
  const handleSimulateRefund = async () => {
    if (paymentIntentId) {
      await simulateRefund(paymentIntentId);
      setPaymentStatus('REFUNDED');
      toast({
        title: t('paymentRefunded'),
        description: t('paymentRefundedDescription'),
      });
    }
  };

  // Gérer la simulation de litige
  const handleSimulateDispute = async () => {
    if (paymentIntentId) {
      await simulateDispute(paymentIntentId);
      setPaymentStatus('DISPUTED');
      toast({
        variant: 'destructive',
        title: t('paymentDisputed'),
        description: t('paymentDisputedDescription'),
      });
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">{t('paymentDemoTitle')}</h1>
        <Badge
          variant="outline"
          className="bg-amber-50 text-amber-700 border-amber-200 flex items-center gap-1"
        >
          <Zap className="h-4 w-4" />
          {t('demoMode')}
        </Badge>
      </div>

      <Alert className="mb-8 bg-blue-50 text-blue-800 border-blue-200">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{t('demoNotice')}</AlertTitle>
        <AlertDescription>{t('demoDescription')}</AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>{t('paymentConfiguration')}</CardTitle>
              <CardDescription>{t('configurePaymentDemo')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">{t('amount')}</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                      €
                    </span>
                    <Input
                      type="number"
                      value={amount}
                      onChange={e => setAmount(parseFloat(e.target.value))}
                      className="pl-8"
                      step="0.01"
                      min="0.01"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">{t('description')}</label>
                  <Input
                    type="text"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-8">
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="payment-form">{t('paymentForm')}</TabsTrigger>
              <TabsTrigger value="payment-summary">{t('paymentSummary')}</TabsTrigger>
              <TabsTrigger value="payment-history">{t('paymentHistory')}</TabsTrigger>
            </TabsList>

            <TabsContent value="payment-form">
              <PaymentForm
                onSuccess={handlePaymentSubmit}
                onCancel={() => console.log('Paiement annulé')}
                savedPaymentMethods={demoPaymentMethods}
                initialAmount={amount}
                description={description}
                walletBalance={100}
                metadata={{ demo: true, source: 'payment-demo' }}
              />
            </TabsContent>

            <TabsContent value="payment-summary">
              <PaymentSummary
                paymentId={paymentIntentId || demoPayment.paymentId}
                amount={amount}
                status={paymentStatus as any}
                createdAt={new Date()}
                updatedAt={new Date()}
                paymentMethod="Visa •••• 4242"
                customerName="Jean Dupont"
                customerEmail="jean.dupont@example.com"
                description={description}
                reference="REF123456"
                metadata={{ demo: true, source: 'payment-demo' }}
                isDemo={true}
                onSimulateSuccess={handleSimulateSuccess}
                onSimulateFailure={handleSimulateFailure}
                onSimulateRefund={handleSimulateRefund}
                onSimulateDispute={handleSimulateDispute}
                onDownloadReceipt={() => toast({ title: t('receiptDownloaded') })}
              />
            </TabsContent>

            <TabsContent value="payment-history">
              <PaymentHistory
                isDemo={true}
                showEmptyState={true}
                showRefreshButton={true}
                onRefresh={() => loadPaymentHistory(1, 10)}
                onViewDetails={id => {
                  setPaymentIntentId(id);
                  setActiveTab('payment-summary');
                }}
              />
            </TabsContent>
          </Tabs>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>{t('availableComponents')}</CardTitle>
              <CardDescription>{t('demoComponentsDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-sm font-medium">{t('paymentMethodSelector')}</h3>
                <PaymentMethodSelector
                  selectedMethod="card"
                  onSelect={method => console.log('Méthode sélectionnée:', method)}
                  savedCards={demoPaymentMethods}
                  walletBalance={100}
                  isDemoMode={true}
                />
              </div>

              <div className="space-y-2 mt-8">
                <h3 className="text-sm font-medium">{t('stripeElements')}</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {t('stripeElementsDescription')}
                </p>
                {clientSecret ? (
                  <PaymentElementsProvider>
                    <StripeElements
                      paymentIntentId={paymentIntentId || 'pi_demo_123456'}
                      clientSecret={clientSecret}
                      amount={amount}
                      demo={true}
                      onSuccess={handlePaymentSubmit}
                      onCancel={() => console.log('Paiement annulé')}
                    />
                  </PaymentElementsProvider>
                ) : (
                  <Button
                    onClick={async () => {
                      const result = await initiatePayment({
                        amount,
                        description,
                        metadata: { demo: true },
                      });
                      if (result.success) {
                        setPaymentIntentId(result.paymentIntentId || null);
                      }
                    }}
                  >
                    {t('initializeStripeElements')}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
