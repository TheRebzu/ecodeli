'use client';

import React from 'react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { api } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2, AlertCircle, ArrowLeftCircle, CreditCard, Check, DollarSign, AlertTriangle, ArrowUpRight, Wallet } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatCurrency } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { useWallet } from '@/hooks/use-wallet';
import { useTranslations } from 'next-intl';

// Schéma de validation pour le formulaire de retrait
const withdrawalSchema = z.object({
  amount: z
    .string()
    .min(1, { message: 'Le montant est requis' })
    .refine((val) => !isNaN(parseFloat(val)), {
      message: 'Le montant doit être un nombre valide',
    })
    .refine((val) => parseFloat(val) > 0, {
      message: 'Le montant doit être supérieur à 0',
    }),
  bankDetails: z.object({
    accountName: z.string().min(1, { message: 'Le nom du titulaire du compte est requis' }),
    iban: z.string().min(15, { message: 'IBAN invalide' }).max(34, { message: 'IBAN invalide' }),
    bic: z.string().min(8, { message: 'BIC/SWIFT invalide' }).max(11, { message: 'BIC/SWIFT invalide' }),
  }),
});

type WithdrawalFormValues = z.infer<typeof withdrawalSchema>;

interface WithdrawalFormProps {
  walletBalance: number;
  currency?: string;
  minimumAmount?: number;
  onSubmit: (data: WithdrawalFormValues) => Promise<void>;
  isLoading?: boolean;
  savedBankDetails?: {
    accountName: string;
    iban: string;
    bic: string;
  } | null;
}

export function WithdrawalForm({
  walletBalance,
  currency = 'EUR',
  minimumAmount = 20,
  onSubmit,
  isLoading = false,
  savedBankDetails = null,
}: WithdrawalFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations('wallet');
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const form = useForm<WithdrawalFormValues>({
    resolver: zodResolver(withdrawalSchema),
    defaultValues: {
      amount: '',
      bankDetails: savedBankDetails || {
        accountName: '',
        iban: '',
        bic: '',
      },
    },
  });

  const handleSubmit = async (data: WithdrawalFormValues) => {
    try {
      setStatus('idle');
      setErrorMessage(null);
      
      // Valider que le montant est inférieur au solde
      if (parseFloat(data.amount) > walletBalance) {
        setStatus('error');
        setErrorMessage(t('insufficientBalance'));
        return;
      }
      
      // Valider que le montant est supérieur au minimum
      if (parseFloat(data.amount) < minimumAmount) {
        setStatus('error');
        setErrorMessage(t('belowMinimumAmount', { amount: minimumAmount, currency }));
        return;
      }
      
      await onSubmit(data);
      setStatus('success');
      form.reset();
    } catch (error) {
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : t('unknownError'));
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          {t('requestWithdrawal')}
        </CardTitle>
        <CardDescription>
          {t('currentBalance')}: <span className="font-bold">{formatCurrency(walletBalance, currency)}</span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        {status === 'success' && (
          <Alert className="mb-4 bg-green-50 text-green-800 border-green-200">
            <Check className="h-4 w-4" />
            <AlertTitle>{t('success')}</AlertTitle>
            <AlertDescription>{t('withdrawalRequestSubmitted')}</AlertDescription>
          </Alert>
        )}

        {status === 'error' && (
          <Alert className="mb-4 bg-red-50 text-red-800 border-red-200">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t('error')}</AlertTitle>
            <AlertDescription>{errorMessage || t('withdrawalRequestFailed')}</AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('withdrawalAmount')}</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        {...field}
                        type="text"
                        inputMode="decimal"
                        placeholder="0.00"
                        className="pl-8"
                        disabled={isLoading || status === 'success'}
                      />
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <span className="text-gray-500">{currency === 'EUR' ? '€' : currency}</span>
                      </div>
                    </div>
                  </FormControl>
                  <FormDescription>
                    {t('minimumAmount')}: {formatCurrency(minimumAmount, currency)}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4 border p-3 rounded-md">
              <h3 className="font-medium text-sm">{t('bankDetails')}</h3>
              
              <FormField
                control={form.control}
                name="bankDetails.accountName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('accountName')}</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={isLoading || status === 'success'} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bankDetails.iban"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>IBAN</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="FR76 1234 5678 9123 4567 8912 345"
                        disabled={isLoading || status === 'success'}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bankDetails.bic"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>BIC / SWIFT</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="CEPAFRPP751"
                        disabled={isLoading || status === 'success'}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <CardFooter className="px-0 pt-2">
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading || status === 'success'}
              >
                {isLoading ? t('processing') : t('requestWithdrawal')}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
