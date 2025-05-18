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
import { CreditCard, AlertCircle, Check, Euro, Banknote, Zap } from 'lucide-react';
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PaymentMethodSelector, type SavedCard } from './payment-method-selector';
import { useInitiatePayment } from '@/hooks/use-payment';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';

// Type d'objet pour représenter une méthode de paiement sauvegardée
export interface PaymentFormProps {
  onSuccess: (paymentId: string) => void;
  onCancel: () => void;
  savedPaymentMethods: SavedCard[];
  initialAmount?: number;
  destinationId?: string;
  destinationType?: 'DELIVERY' | 'SERVICE' | 'SUBSCRIPTION';
  walletBalance?: number;
  redirectUrl?: string;
  description?: string;
  metadata?: Record<string, any>;
}

export function PaymentForm({
  onSuccess,
  onCancel,
  savedPaymentMethods = [],
  initialAmount,
  destinationId,
  destinationType,
  walletBalance,
  redirectUrl,
  description: initialDescription = '',
  metadata = {},
}: PaymentFormProps) {
  const t = useTranslations('payment');
  const { toast } = useToast();
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<
    'card' | 'wallet' | 'sepa' | 'saved_card'
  >(savedPaymentMethods.length > 0 ? 'saved_card' : 'card');
  const [selectedCardId, setSelectedCardId] = useState<string | undefined>(
    savedPaymentMethods.length > 0 ? savedPaymentMethods[0].id : undefined
  );

  // Utiliser notre hook personnalisé pour l'initialisation du paiement
  const {
    initiatePayment,
    resetPayment,
    isProcessing,
    errors,
    clientSecret,
    PaymentElementsProvider,
    isDemoMode
  } = useInitiatePayment();

  // État local pour afficher les messages de succès/erreur
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
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
      description: initialDescription,
      savePaymentMethod: false,
    },
  });

  // Fonction pour gérer la soumission du formulaire
  const onSubmit = async (values: PaymentFormValues) => {
    try {
      setStatus('idle');
      setErrorMessage(null);

      // Construire les paramètres de paiement
      const paymentParams = {
        amount: values.amount,
        currency: 'EUR',
        description: values.description || t('defaultPaymentDescription'),
        ...(destinationId && destinationType === 'DELIVERY' ? { deliveryId: destinationId } : {}),
        ...(destinationId && destinationType === 'SERVICE' ? { serviceId: destinationId } : {}),
        ...(destinationId && destinationType === 'SUBSCRIPTION' ? { subscriptionId: destinationId } : {}),
        ...(selectedPaymentMethod === 'saved_card' && selectedCardId
          ? { paymentMethodId: selectedCardId }
          : {}),
        metadata: {
          ...metadata,
          paymentMethod: selectedPaymentMethod,
          savePaymentMethod: values.savePaymentMethod,
        }
      };

      // Appel au hook pour initialiser le paiement
      const result = await initiatePayment(paymentParams, redirectUrl);
      
      if (result.success) {
        setStatus('success');
        toast({
          title: t('paymentInitiated'),
          description: t('paymentBeingProcessed'),
        });
        
        if (onSuccess && result.paymentIntentId) {
          onSuccess(result.paymentIntentId);
        }
      } else {
        setStatus('error');
        setErrorMessage(result.error || t('unknownError'));
      }
    } catch (error) {
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

  // Réinitialiser le formulaire
  const handleCancel = () => {
    resetPayment();
    form.reset();
    setStatus('idle');
    setErrorMessage(null);
    if (onCancel) {
      onCancel();
    }
  };

  return (
    <PaymentElementsProvider>
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              {t('processPayment')}
            </CardTitle>
            {isDemoMode && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 flex items-center gap-1">
                      <Zap className="h-3 w-3" />
                      {t('demoMode')}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t('demoModeDescription')}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
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

          {isDemoMode && status === 'idle' && (
            <Alert className="mb-4 bg-blue-50 text-blue-800 border-blue-200">
              <Banknote className="h-4 w-4" />
              <AlertTitle>{t('demoPayment')}</AlertTitle>
              <AlertDescription>{t('demoPaymentDescription')}</AlertDescription>
            </Alert>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Montant - caché si montant initial défini */}
              {!initialAmount && (
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
                            aria-describedby="amount-description"
                          />
                        </div>
                      </FormControl>
                      <FormDescription id="amount-description">{t('enterAmountDesc')}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

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
                        aria-describedby="description-help"
                      />
                    </FormControl>
                    <FormDescription id="description-help">{t('descriptionDesc')}</FormDescription>
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

              {/* Option pour sauvegarder la méthode de paiement */}
              {selectedPaymentMethod === 'card' && (
                <FormField
                  control={form.control}
                  name="savePaymentMethod"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isProcessing || status === 'success'}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>{t('saveCardForFuture')}</FormLabel>
                        <FormDescription>{t('saveCardDescription')}</FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              )}

              {/* Boutons d'action */}
              <div className="flex justify-end gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isProcessing}
                >
                  {t('cancel')}
                </Button>
                <Button 
                  type="submit" 
                  disabled={isProcessing || status === 'success'}
                  aria-live="polite"
                >
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
        {isDemoMode && status !== 'success' && (
          <CardFooter className="flex-col gap-2 border-t pt-4">
            <p className="text-xs text-muted-foreground">{t('demoTipTitle')}</p>
            <div className="grid grid-cols-2 gap-2 w-full">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  form.setValue('amount', 42.00);
                  form.setValue('description', t('demoSuccessDescription'));
                }}
                disabled={isProcessing}
                className="text-xs"
              >
                <Zap className="mr-1 h-3 w-3" />
                {t('simulateSuccess')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  form.setValue('amount', 666.00);
                  form.setValue('description', t('demoFailureDescription'));
                }}
                disabled={isProcessing}
                className="text-xs"
              >
                <AlertCircle className="mr-1 h-3 w-3" />
                {t('simulateFailure')}
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>
    </PaymentElementsProvider>
  );
}
