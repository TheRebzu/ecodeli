'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CreditCard, AlertCircle, Check, Euro } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { useTranslations } from 'next-intl';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';
import { api } from '@/trpc/react';
import { Textarea } from '@/components/ui/textarea';
import { PaymentMethodSelector, type SavedCard } from './payment-method-selector';

// Type d'objet pour représenter une méthode de paiement sauvegardée
export interface PaymentFormProps {
  onSuccess: (paymentId: string) => void;
  onCancel: () => void;
  savedPaymentMethods: SavedCard[];
  initialAmount?: number;
  destinationId?: string;
  destinationType?: 'DELIVERY' | 'SERVICE' | 'SUBSCRIPTION';
  walletBalance?: number;
}

export function PaymentForm({
  onSuccess,
  onCancel,
  savedPaymentMethods = [],
  initialAmount,
  destinationId,
  destinationType,
  walletBalance,
}: PaymentFormProps) {
  const t = useTranslations('payment');
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [useExistingCard, setUseExistingCard] = useState(savedPaymentMethods.length > 0);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<
    'card' | 'wallet' | 'sepa' | 'saved_card'
  >('card');
  const [selectedCardId, setSelectedCardId] = useState<string | undefined>(
    savedPaymentMethods.length > 0 ? savedPaymentMethods[0].id : undefined
  );

  // Créer un intent de paiement via tRPC
  const createPaymentIntent = api.payment.createPaymentIntent.useMutation({
    onSuccess: data => {
      setIsProcessing(false);
      setStatus('success');
      toast({
        title: t('paymentSuccessful'),
        description: t('paymentProcessed'),
      });
      if (onSuccess) {
        onSuccess(data.paymentIntentId);
      }
    },
    onError: error => {
      setIsProcessing(false);
      setStatus('error');
      setErrorMessage(error.message);
      toast({
        variant: 'destructive',
        title: t('paymentFailed'),
        description: error.message,
      });
    },
  });

  // Schéma de validation avec Zod
  const paymentSchema = z.object({
    amount: z
      .number()
      .positive({ message: t('amountPositive') })
      .min(1, { message: t('amountMinimum') }),
    description: z.string().optional(),
    savePaymentMethod: z.boolean().optional(),
  });

  type PaymentFormValues = z.infer<typeof paymentSchema>;

  // Initialisation du formulaire
  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount: initialAmount || 0,
      description: '',
      savePaymentMethod: false,
    },
  });

  // Mois pour le champ d'expiration
  const months = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    return { value: month.toString().padStart(2, '0'), label: month.toString().padStart(2, '0') };
  });

  // Années pour le champ d'expiration (année courante + 10 ans)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => {
    const year = currentYear + i;
    return { value: year.toString(), label: year.toString() };
  });

  // Fonction pour gérer la soumission du formulaire
  const onSubmit = async (values: PaymentFormValues) => {
    try {
      setIsProcessing(true);
      setStatus('idle');
      setErrorMessage(null);

      // Construire les paramètres de paiement en fonction du contexte
      const paymentParams = {
        amount: values.useExistingCard ? initialAmount || 0 : values.amount,
        currency: 'EUR',
        description: values.description || 'Paiement EcoDeli',
        ...(destinationId ? { deliveryId: destinationId } : {}),
        ...(destinationType === 'SERVICE' ? { serviceId: destinationId } : {}),
        ...(values.useExistingCard && values.paymentMethodId
          ? { paymentMethodId: values.paymentMethodId }
          : {}),
        // Si on n'utilise pas de carte existante, on devrait envoyer les détails de la carte à Stripe
        // via leur SDK et obtenir un token/PaymentMethod, mais cette partie nécessite StripeElements
      };

      // Appel de l'API tRPC pour créer l'intent de paiement
      createPaymentIntent.mutate(paymentParams);
    } catch (error) {
      setIsProcessing(false);
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : t('unknownError'));
    }
  };

  // Fonction pour gérer le changement de méthode de paiement
  const handlePaymentMethodChange = (
    method: 'card' | 'wallet' | 'sepa' | 'saved_card',
    cardId?: string
  ) => {
    setSelectedPaymentMethod(method);
    if (method === 'saved_card' && cardId) {
      setSelectedCardId(cardId);
    }
  };

  // Formatage du numéro de carte (ajout d'espaces tous les 4 chiffres)
  const formatCardNumber = (value: string) => {
    return value
      .replace(/\s/g, '')
      .replace(/(\d{4})/g, '$1 ')
      .trim();
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          {t('processPayment')}
        </CardTitle>
        <CardDescription>
          {initialAmount > 0
            ? t('amountToPay', { amount: formatCurrency(initialAmount, 'EUR') })
            : t('enterPaymentDetails')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {status === 'success' && (
          <Alert className="mb-4 bg-green-50 text-green-800 border-green-200">
            <Check className="h-4 w-4" />
            <AlertTitle>{t('success')}</AlertTitle>
            <AlertDescription>{t('paymentSuccessful')}</AlertDescription>
          </Alert>
        )}

        {status === 'error' && (
          <Alert className="mb-4 bg-red-50 text-red-800 border-red-200">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t('error')}</AlertTitle>
            <AlertDescription>{errorMessage || t('paymentFailed')}</AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Montant */}
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('amount')}</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                        €
                      </span>
                      <Input
                        {...field}
                        type="number"
                        min="0.01"
                        step="0.01"
                        placeholder="0.00"
                        className="pl-8"
                        value={field.value}
                        onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                        disabled={isProcessing || status === 'success'}
                      />
                    </div>
                  </FormControl>
                  <FormDescription>{t('enterAmountDesc')}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('description')}</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder={t('descriptionPlaceholder')}
                      disabled={isProcessing || status === 'success'}
                    />
                  </FormControl>
                  <FormDescription>{t('descriptionDesc')}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Méthode de paiement */}
            <div className="space-y-4">
              <Label>{t('paymentMethod')}</Label>
              <PaymentMethodSelector
                selectedMethod={selectedPaymentMethod}
                onSelect={handlePaymentMethodChange}
                savedCards={savedPaymentMethods}
                walletBalance={walletBalance}
                disabled={isProcessing || status === 'success'}
              />
            </div>

            {/* Sélection de méthode de paiement enregistrée si disponible */}
            {savedPaymentMethods.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="useExistingCard"
                    checked={useExistingCard}
                    onCheckedChange={checked => {
                      setUseExistingCard(checked === true);
                      form.setValue('useExistingCard', checked === true);
                    }}
                  />
                  <label
                    htmlFor="useExistingCard"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {t('useExistingCard')}
                  </label>
                </div>

                {useExistingCard && (
                  <FormField
                    control={form.control}
                    name="paymentMethodId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('selectCard')}</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value || savedPaymentMethods[0]?.id}
                          disabled={isProcessing || status === 'success'}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('selectCard')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {savedPaymentMethods.map(method => (
                              <SelectItem key={method.id} value={method.id}>
                                {method.brand.toUpperCase()} •••• {method.last4} (
                                {method.expiryMonth.toString().padStart(2, '0')}/
                                {method.expiryYear.toString().substring(2)})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            )}

            {/* Boutons d'action */}
            <div className="flex justify-end gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isProcessing || status === 'success'}
              >
                {t('cancel')}
              </Button>
              <Button type="submit" disabled={isProcessing || status === 'success'}>
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('processing')}
                  </>
                ) : status === 'success' ? (
                  t('paymentComplete')
                ) : (
                  t('pay')
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
