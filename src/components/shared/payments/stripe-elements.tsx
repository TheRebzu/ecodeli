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
}

// Formulaire de paiement Stripe
function CheckoutForm({
  clientSecret,
  amount,
  currency = 'EUR',
  onSuccess,
  onCancel,
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
      // Traitement du paiement réel uniquement

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
          disabled={(!stripe) || isProcessing || paymentStatus === 'success'}
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


    </form>
  );
}

interface StripeElementsProps {
  amount: number;
  currency?: string;
  onSuccess?: (paymentIntent: any) => void;
  onError?: (error: any) => void;
  clientSecret?: string;
  metadata?: Record<string, any>;
}

const StripeElementsComponent: React.FC<StripeElementsProps> = ({
  amount,
  currency = 'EUR',
  onSuccess,
  onError,
  clientSecret,
  metadata = {},
}) => {
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const stripe = useStripe();
  const elements = useElements();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements || !clientSecret) {
      setErrorMessage('Stripe n\'est pas encore chargé');
      return;
    }

    setPaymentStatus('processing');

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/payment/success`,
        },
        redirect: 'if_required',
      });

      if (error) {
        setErrorMessage(error.message || 'Une erreur est survenue');
        setPaymentStatus('error');
        onError?.(error);
      } else if (paymentIntent?.status === 'succeeded') {
        setPaymentStatus('success');
        onSuccess?.(paymentIntent);
      }
    } catch (error: any) {
      setErrorMessage(error.message || 'Une erreur est survenue');
      setPaymentStatus('error');
      onError?.(error);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            {t('securePayment')}
          </CardTitle>
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
          />
        </Elements>
      </CardContent>
    </Card>
  );
};

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
}: {
  selectedPaymentMethodId?: string;
  onPaymentMethodSelected: (paymentMethodId: string) => void;
}) {
  const t = useTranslations('payment');
  const [isLoading, setIsLoading] = useState(true);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);

  // Récupérer les méthodes de paiement sauvegardées via l'API tRPC
  const paymentMethodsQuery = api.payment.getPaymentMethods.useQuery();

  // Mise à jour des données lorsque la requête est terminée
  useEffect(() => {
    if (!paymentMethodsQuery.isLoading) {
      setIsLoading(false);
      if (paymentMethodsQuery.data?.success && paymentMethodsQuery.data.paymentMethods) {
        // Conversion du type pour correspondre à notre interface
        setPaymentMethods(paymentMethodsQuery.data.paymentMethods as unknown as PaymentMethod[]);
      }
    }
  }, [paymentMethodsQuery.isLoading, paymentMethodsQuery.data]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (paymentMethodsQuery.isError) {
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
