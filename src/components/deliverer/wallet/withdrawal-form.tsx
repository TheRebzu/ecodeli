'use client';

import React from 'react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { api } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Loader2,
  AlertCircle,
  ArrowLeftCircle,
  CreditCard,
  Check,
  DollarSign,
  AlertTriangle,
  ArrowUpRight,
  Wallet,
  Zap,
  Bank,
  Info,
  RotateCw,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatCurrency } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { useWallet } from '@/hooks/use-wallet';
import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';

// Schéma de validation pour le formulaire de retrait
const withdrawalSchema = z.object({
  amount: z
    .string()
    .min(1, { message: 'Le montant est requis' })
    .refine(val => !isNaN(parseFloat(val)), {
      message: 'Le montant doit être un nombre valide',
    })
    .refine(val => parseFloat(val) > 0, {
      message: 'Le montant doit être supérieur à 0',
    }),
  bankDetails: z.object({
    accountName: z.string().min(1, { message: 'Le nom du titulaire du compte est requis' }),
    iban: z.string().min(15, { message: 'IBAN invalide' }).max(34, { message: 'IBAN invalide' }),
    bic: z
      .string()
      .min(8, { message: 'BIC/SWIFT invalide' })
      .max(11, { message: 'BIC/SWIFT invalide' }),
  }),
  description: z.string().optional(),
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
  onCancel?: () => void;
  isDemo?: boolean;
}

export function WithdrawalForm({
  walletBalance,
  currency = 'EUR',
  minimumAmount = 20,
  onSubmit,
  isLoading = false,
  savedBankDetails = null,
  onCancel,
  isDemo = false,
}: WithdrawalFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations('wallet');
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [processingStep, setProcessingStep] = useState<string | null>(null);

  const form = useForm<WithdrawalFormValues>({
    resolver: zodResolver(withdrawalSchema),
    defaultValues: {
      amount: '',
      bankDetails: savedBankDetails || {
        accountName: '',
        iban: '',
        bic: '',
      },
      description: '',
    },
  });

  // Simulation du traitement pour le mode démo
  const simulateProcessing = async () => {
    if (!isDemo) return;

    setStatus('processing');
    setProcessingStep(t('validatingAmount'));
    setProgress(10);

    await new Promise(resolve => setTimeout(resolve, 800));
    setProgress(30);
    setProcessingStep(t('checkingAccount'));

    await new Promise(resolve => setTimeout(resolve, 1000));
    setProgress(60);
    setProcessingStep(t('preparingTransaction'));

    await new Promise(resolve => setTimeout(resolve, 1200));
    setProgress(90);
    setProcessingStep(t('finalizingWithdrawal'));

    await new Promise(resolve => setTimeout(resolve, 800));
    setProgress(100);
  };

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

      if (isDemo) {
        await simulateProcessing();
        await new Promise(resolve => setTimeout(resolve, 500));
        setStatus('success');

        toast({
          title: t('withdrawalRequestSubmitted'),
          description: t('withdrawalProcessingTime'),
          variant: 'success',
        });

        return;
      }

      await onSubmit(data);
      setStatus('success');
      form.reset();

      toast({
        title: t('withdrawalRequestSubmitted'),
        description: t('withdrawalProcessingTime'),
        variant: 'success',
      });
    } catch (error) {
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : t('unknownError'));

      toast({
        title: t('error'),
        description: error instanceof Error ? error.message : t('unknownError'),
        variant: 'destructive',
      });
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      router.back();
    }
  };

  // Préremplit avec le montant maximum
  const setMaxAmount = () => {
    form.setValue('amount', walletBalance.toString());
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            {t('requestWithdrawal')}
          </CardTitle>
          {isDemo && (
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
                  <p>{t('demoWithdrawalDescription')}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <CardDescription>
          {t('currentBalance')}:{' '}
          <span className="font-bold">{formatCurrency(walletBalance, currency)}</span>
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

        {status === 'processing' && (
          <div className="mb-6 space-y-2">
            <Alert className="mb-2 bg-blue-50 text-blue-800 border-blue-200">
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertTitle>{t('processing')}</AlertTitle>
              <AlertDescription>{processingStep || t('processingWithdrawal')}</AlertDescription>
            </Alert>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {walletBalance < minimumAmount && (
          <Alert className="mb-4 bg-amber-50 text-amber-800 border-amber-200">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{t('insufficientFunds')}</AlertTitle>
            <AlertDescription>
              {t('minimumWithdrawalAmount', { amount: formatCurrency(minimumAmount, currency) })}
            </AlertDescription>
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
                        disabled={isLoading || status === 'success' || status === 'processing'}
                        aria-describedby="withdrawal-amount-desc"
                      />
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <span className="text-gray-500">{currency === 'EUR' ? '€' : currency}</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-6 text-xs px-2"
                        onClick={setMaxAmount}
                        disabled={isLoading || status === 'success' || status === 'processing'}
                      >
                        Max
                      </Button>
                    </div>
                  </FormControl>
                  <FormDescription id="withdrawal-amount-desc">
                    {t('minimumAmount')}: {formatCurrency(minimumAmount, currency)}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('withdrawalDescription')}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder={t('withdrawalDescriptionPlaceholder')}
                      disabled={isLoading || status === 'success' || status === 'processing'}
                    />
                  </FormControl>
                  <FormDescription>{t('withdrawalDescriptionHelp')}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4 border p-3 rounded-md">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-sm flex items-center gap-1">
                  <Bank className="h-4 w-4" />
                  {t('bankDetails')}
                </h3>
                {isDemo && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-blue-500 cursor-pointer" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">{t('demoBankDetailsInfo')}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>

              <FormField
                control={form.control}
                name="bankDetails.accountName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('accountName')}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        disabled={isLoading || status === 'success' || status === 'processing'}
                        placeholder={t('accountNamePlaceholder')}
                      />
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
                        disabled={isLoading || status === 'success' || status === 'processing'}
                        aria-describedby="iban-format-desc"
                      />
                    </FormControl>
                    <FormDescription id="iban-format-desc">{t('ibanFormat')}</FormDescription>
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
                        disabled={isLoading || status === 'success' || status === 'processing'}
                        aria-describedby="bic-format-desc"
                      />
                    </FormControl>
                    <FormDescription id="bic-format-desc">{t('bicFormat')}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <CardFooter className="px-0 pt-4 flex flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={handleCancel}
                disabled={isLoading || status === 'processing'}
              >
                {t('cancel')}
              </Button>
              <Button
                type="submit"
                className="w-full sm:w-auto"
                disabled={
                  isLoading ||
                  status === 'success' ||
                  status === 'processing' ||
                  walletBalance < minimumAmount
                }
              >
                {isLoading || status === 'processing' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('processing')}
                  </>
                ) : status === 'success' ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    {t('requested')}
                  </>
                ) : (
                  t('requestWithdrawal')
                )}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
