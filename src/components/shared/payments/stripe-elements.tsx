'use client';

import React, { useEffect, useState } from 'react';
import { loadStripe, StripeElementsOptions } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertCircle, Check, CreditCard, Zap, Info } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { api } from '@/trpc/react';
import { formatCurrency } from '@/utils/document-utils';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { usePaymentConfirmation } from '@/hooks/payment/use-payment';

// Initialiser Stripe avec la clé publique
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

interface CheckoutFormProps {
  clientSecret: string;
  amount: number;
  currency?: string;
  onSuccess?: (paymentIntentId: string) => void;
  onCancel?: () => void;
  isDemoMode?: boolean;
}

// Formulaire de paiement Stripe
function CheckoutForm({
  clientSecret,
  amount,
  currency = 'EUR',
  onSuccess,
  onCancel,
  isDemoMode = false,
}: CheckoutFormProps) {
  const t = useTranslations('payment');
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'error'>(
    'idle'
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      // Stripe.js n'est pas encore chargé
      return;
    }

    setIsProcessing(true);
    setPaymentStatus('processing');

    try {
      // En mode démo, simuler un paiement réussi après un court délai
      if (isDemoMode) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        setPaymentStatus('success');
        if (onSuccess) {
          onSuccess('demo_pi_' + Math.random().toString(36).substring(2, 15));
        }
        return;
      }

      // Confirmer le paiement avec les éléments Stripe
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.origin + '/payment-result',
        },
        redirect: 'if_required',
      });

      if (error) {
        setErrorMessage(error.message || t('paymentFailed'));
        setPaymentStatus('error');
      } else if (paymentIntent.status === 'succeeded') {
        setPaymentStatus('success');
        if (onSuccess) {
          onSuccess(paymentIntent.id);
        }
      } else {
        setErrorMessage(t('paymentPending'));
        setPaymentStatus('idle');
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : t('unknownError'));
      setPaymentStatus('error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Simuler un paiement réussi (pour le mode démo)
  const handleDemoSuccess = () => {
    if (!isDemoMode) return;

    setIsProcessing(true);
    setPaymentStatus('processing');

    // Simuler un délai de traitement
    setTimeout(() => {
      setPaymentStatus('success');
      setIsProcessing(false);
      if (onSuccess) {
        onSuccess('demo_pi_' + Math.random().toString(36).substring(2, 15));
      }
    }, 1500);
  };

  // Simuler un paiement échoué (pour le mode démo)
  const handleDemoFailure = () => {
    if (!isDemoMode) return;

    setIsProcessing(true);
    setPaymentStatus('processing');

    // Simuler un délai de traitement
    setTimeout(() => {
      setPaymentStatus('error');
      setErrorMessage(t('demoPaymentFailure'));
      setIsProcessing(false);
    }, 1500);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {paymentStatus === 'success' && (
        <Alert className="mb-4 bg-green-50 text-green-800 border-green-200">
          <Check className="h-4 w-4" />
          <AlertTitle>{t('success')}</AlertTitle>
          <AlertDescription>{t('paymentSuccessful')}</AlertDescription>
        </Alert>
      )}

      {paymentStatus === 'error' && (
        <Alert className="mb-4 bg-red-50 text-red-800 border-red-200">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t('error')}</AlertTitle>
          <AlertDescription>{errorMessage || t('paymentFailed')}</AlertDescription>
        </Alert>
      )}

      {isDemoMode && paymentStatus === 'idle' && (
        <Alert className="mb-4 bg-blue-50 text-blue-800 border-blue-200">
          <Info className="h-4 w-4" />
          <AlertTitle>{t('demoPayment')}</AlertTitle>
          <AlertDescription>{t('demoStripeDescription')}</AlertDescription>
        </Alert>
      )}

      <PaymentElement
        options={{
          // Rendre les champs plus accessibles
          fields: {
            billingDetails: {
              name: 'auto',
              email: 'auto',
              phone: 'auto',
              address: {
                country: 'auto',
                postalCode: 'auto',
                line1: 'auto',
                line2: 'never',
                city: 'auto',
                state: 'auto',
              },
            },
          },
          // Ajouter des messages d'erreur en français
          terms: {
            card: t('cardTerms'),
          },
        }}
      />

      <div className="flex justify-between gap-4 mt-6">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isProcessing || paymentStatus === 'success'}
        >
          {t('cancel')}
        </Button>
        <Button
          type="submit"
          disabled={(!stripe && !isDemoMode) || isProcessing || paymentStatus === 'success'}
          className="flex-1"
          aria-live="polite"
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('processing')}
            </>
          ) : paymentStatus === 'success' ? (
            t('paymentComplete')
          ) : (
            t('makePayment')
          )}
        </Button>
      </div>

      {/* Options de démonstration */}
      {isDemoMode && paymentStatus === 'idle' && (
        <div className="mt-4 border-t pt-4">
          <p className="text-xs text-muted-foreground mb-2">{t('demoOptions')}</p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDemoSuccess}
              className="text-xs bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
            >
              <Check className="mr-1 h-3 w-3" />
              {t('simulateSuccess')}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDemoFailure}
              className="text-xs bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
            >
              <AlertCircle className="mr-1 h-3 w-3" />
              {t('simulateFailure')}
            </Button>
          </div>
        </div>
      )}
    </form>
  );
}

interface StripeElementsProps {
  paymentIntentId: string;
  clientSecret: string;
  amount: number;
  currency?: string;
  onSuccess?: (paymentIntentId: string) => void;
  onCancel?: () => void;
  demo?: boolean;
}

export function StripeElements({
  paymentIntentId,
  clientSecret,
  amount,
  currency = 'EUR',
  onSuccess,
  onCancel,
  demo = false,
}: StripeElementsProps) {
  const t = useTranslations('payment');
  const [stripeReady, setStripeReady] = useState(false);
  const { isDemoMode } = usePaymentConfirmation();

  // Déterminer si on est en mode démo
  const isInDemoMode = demo || isDemoMode || process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

  useEffect(() => {
    // Marquer Stripe comme prêt une fois le client secret disponible
    if (clientSecret) {
      setStripeReady(true);
    }
  }, [clientSecret]);

  if (!stripeReady) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const options: StripeElementsOptions = {
    clientSecret,
    appearance: {
      theme: 'stripe',
      variables: {
        colorPrimary: '#10b981',
        colorBackground: '#ffffff',
        colorText: '#1f2937',
        colorDanger: '#ef4444',
        borderRadius: '0.375rem',
      },
    },
    locale: 'fr',
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            {t('securePayment')}
          </CardTitle>
          {isInDemoMode && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant="outline"
                    className="bg-amber-50 text-amber-700 border-amber-200 flex items-center gap-1"
                  >
                    <Zap className="h-3 w-3" />
                    {t('demoMode')}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t('demoPaymentDescription')}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <CardDescription>
          {t('amountToPay', { amount: formatCurrency(amount, currency) })}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Elements stripe={stripePromise} options={options}>
          <CheckoutForm
            clientSecret={clientSecret}
            amount={amount}
            currency={currency}
            onSuccess={onSuccess}
            onCancel={onCancel}
            isDemoMode={isInDemoMode}
          />
        </Elements>
      </CardContent>
    </Card>
  );
}

// Type pour les méthodes de paiement
interface PaymentMethod {
  id: string;
  card: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  };
}

// Composant de sélection de méthode de paiement Stripe
export function StripePaymentMethodSelector({
  selectedPaymentMethodId,
  onPaymentMethodSelected,
  demo = false,
}: {
  selectedPaymentMethodId?: string;
  onPaymentMethodSelected: (paymentMethodId: string) => void;
  demo?: boolean;
}) {
  const t = useTranslations('payment');
  const [isLoading, setIsLoading] = useState(true);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const { isDemoMode } = usePaymentConfirmation();

  // Déterminer si on est en mode démo
  const isInDemoMode = demo || isDemoMode || process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

  // Récupérer les méthodes de paiement sauvegardées via l'API tRPC
  const paymentMethodsQuery = api.payment.getPaymentMethods.useQuery();

  // Mise à jour des données lorsque la requête est terminée
  useEffect(() => {
    // En mode démo, créer des méthodes de paiement factices
    if (isInDemoMode) {
      setIsLoading(false);

      const demoMethods: PaymentMethod[] = [
        {
          id: 'pm_demo_visa',
          card: { brand: 'visa', last4: '4242', exp_month: 12, exp_year: 2030 },
        },
        {
          id: 'pm_demo_mastercard',
          card: { brand: 'mastercard', last4: '5555', exp_month: 10, exp_year: 2028 },
        },
        {
          id: 'pm_demo_amex',
          card: { brand: 'amex', last4: '0005', exp_month: 8, exp_year: 2026 },
        },
      ];

      setPaymentMethods(demoMethods);
      return;
    }

    if (!paymentMethodsQuery.isLoading) {
      setIsLoading(false);
      if (paymentMethodsQuery.data?.success && paymentMethodsQuery.data.paymentMethods) {
        // Conversion du type pour correspondre à notre interface
        setPaymentMethods(paymentMethodsQuery.data.paymentMethods as unknown as PaymentMethod[]);
      }
    }
  }, [paymentMethodsQuery.isLoading, paymentMethodsQuery.data, isInDemoMode]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (paymentMethodsQuery.isError && !isInDemoMode) {
    return (
      <Alert className="border-red-200 bg-red-50 text-red-800">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{t('error')}</AlertTitle>
        <AlertDescription>{t('errorLoadingPaymentMethods')}</AlertDescription>
      </Alert>
    );
  }

  if (paymentMethods.length === 0) {
    return (
      <Alert className="border-amber-200 bg-amber-50 text-amber-800">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{t('noSavedPaymentMethods')}</AlertTitle>
        <AlertDescription>{t('addNewPaymentMethod')}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium">{t('selectSavedPaymentMethod')}</h3>
        {isInDemoMode && (
          <Badge
            variant="outline"
            className="text-xs bg-amber-50 text-amber-700 border-amber-200 flex items-center gap-1"
          >
            <Zap className="h-3 w-3" />
            {t('demoMode')}
          </Badge>
        )}
      </div>
      <div className="space-y-2">
        {paymentMethods.map(method => (
          <div
            key={method.id}
            className={`border rounded-md p-3 cursor-pointer transition-colors ${
              selectedPaymentMethodId === method.id
                ? 'border-primary bg-primary/5'
                : 'hover:bg-muted/50'
            }`}
            onClick={() => onPaymentMethodSelected(method.id)}
            role="radio"
            aria-checked={selectedPaymentMethodId === method.id}
            tabIndex={0}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                onPaymentMethodSelected(method.id);
                e.preventDefault();
              }
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  {method.card.brand === 'visa' && (
                    <span className="text-blue-600 font-bold">Visa</span>
                  )}
                  {method.card.brand === 'mastercard' && (
                    <span className="text-red-600 font-bold">Mastercard</span>
                  )}
                  {method.card.brand === 'amex' && (
                    <span className="text-blue-800 font-bold">Amex</span>
                  )}
                  {!['visa', 'mastercard', 'amex'].includes(method.card.brand) && (
                    <span className="font-bold">{method.card.brand}</span>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium">•••• {method.card.last4}</p>
                  <p className="text-xs text-muted-foreground">
                    {t('expiresOn', {
                      month: method.card.exp_month.toString().padStart(2, '0'),
                      year: method.card.exp_year.toString().slice(-2),
                    })}
                  </p>
                </div>
              </div>
              {selectedPaymentMethodId === method.id && <Check className="h-5 w-5 text-primary" />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
