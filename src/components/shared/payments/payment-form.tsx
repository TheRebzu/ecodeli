"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  CreditCard,
  AlertCircle,
  Check,
  Euro,
  Banknote,
  Zap,
  CheckCircle,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { useTranslations } from "next-intl";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  PaymentMethodSelector,
  type SavedCard,
} from "@/components/shared/payments/payment-method-selector";
import { useInitiatePayment } from "@/hooks/payment/use-payment";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { api } from "@/trpc/react";

interface PaymentFormProps {
  amount: number;
  currency?: string;
  onSuccess?: (paymentIntent: any) => void;
  onError?: (error: any) => void;
  onCancel?: () => void;
  description?: string;
  metadata?: Record<string, any>;
}

export function PaymentForm({
  amount,
  currency = 'EUR',
  onSuccess,
  onError,
  onCancel,
  description,
  metadata = {},
}: PaymentFormProps) {
  const t = useTranslations('payment');
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Utilisation du hook tRPC pour les paiements
  const createPaymentMutation = api.payment.createPaymentIntent.useMutation();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsProcessing(true);
    setStatus('processing');

    try {
      // Appel API réel pour le paiement via tRPC
      const result = await createPaymentMutation.mutateAsync({ amount,
        currency,
        description: description || t('defaultPaymentDescription'),
        metadata,
       });

      if (result.success) {
        setStatus('success');
        onSuccess?.(result.paymentIntent);
      } else {
        setStatus('error');
        setErrorMessage(result.error || t('paymentFailed'));
        onError?.(new Error(result.error || t('paymentFailed')));
      }
    } catch (error) {
      setStatus('error');
      const message = error instanceof Error ? error.message : t('unknownError');
      setErrorMessage(message);
      onError?.(error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          {t('securePayment')}
        </CardTitle>
        <CardDescription>
          {t('amountToPay', { amount: formatCurrency(amount, currency) })}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {status === 'success' && (
            <Alert className="bg-green-50 text-green-800 border-green-200">
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>{t('success')}</AlertTitle>
              <AlertDescription>{t('paymentSuccessful')}</AlertDescription>
            </Alert>
          )}

          {status === 'error' && (
            <Alert className="bg-red-50 text-red-800 border-red-200">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{t('error')}</AlertTitle>
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#424770',
                  '::placeholder': {
                    color: '#aab7c4',
                  },
                },
              },
            }}
          />

          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isProcessing}
              className="flex-1"
            >
              {t('cancel')}
            </Button>
            <Button
              type="submit"
              disabled={isProcessing}
              className="flex-1"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('processing')}
                </>
              ) : (
                t('makePayment')
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
