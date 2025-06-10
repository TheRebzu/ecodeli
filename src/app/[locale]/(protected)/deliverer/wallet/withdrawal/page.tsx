'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useSession } from 'next-auth/react';
import {
  ArrowLeft,
  BanknoteIcon,
  ArrowUpFromLine,
  Wallet,
  AlertCircle,
  Clock,
  CheckCircle,
  Loader2,
} from 'lucide-react';

import { api } from '@/trpc/react';
import { useToast } from '@/components/ui/use-toast';
import { formatCurrency } from '@/utils/document-utils';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

// Schéma de validation du formulaire
const withdrawalFormSchema = z.object({
  amount: z.coerce
    .number()
    .min(10, { message: 'Le montant minimum de retrait est de 10€' })
    .refine(val => val > 0, { message: 'Le montant doit être supérieur à 0' }),
  method: z.enum(['BANK_TRANSFER', 'STRIPE_CONNECT']),
  expedited: z.boolean().default(false),
  notes: z.string().optional(),
  acceptTerms: z.boolean().refine(val => val === true, {
    message: 'Vous devez accepter les conditions',
  }),
});

type WithdrawalFormValues = z.infer<typeof withdrawalFormSchema>;

export default function WithdrawalPage() {
  const t = useTranslations('wallet');
  const router = useRouter();
  const { data: session } = useSession();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [withdrawalSuccess, setWithdrawalSuccess] = useState(false);

  // Récupérer les données du portefeuille
  const { data: walletData, isLoading: isLoadingWallet } = api.wallet.getMyWallet.useQuery(
    undefined,
    {
      refetchOnWindowFocus: false,
    }
  );

  // Récupérer les demandes de retrait en attente
  const { data: withdrawals, isLoading: isLoadingWithdrawals } =
    api.withdrawal.getMyWithdrawals.useQuery(
      {
        limit: 3,
        status: 'PENDING',
      },
      {
        refetchOnWindowFocus: false,
      }
    );

  // Mutation pour demander un retrait
  const withdrawalMutation = api.withdrawal.requestWithdrawal.useMutation({
    onSuccess: () => {
      setWithdrawalSuccess(true);
      toast({
        title: t('withdrawalRequestSuccess'),
        description: t('withdrawalRequestProcessing'),
      });
    },
    onError: error => {
      toast({
        variant: 'destructive',
        title: t('withdrawalRequestFailed'),
        description: error.message || t('genericError'),
      });
      setIsSubmitting(false);
    },
  });

  // Configurer le formulaire
  const form = useForm<WithdrawalFormValues>({
    resolver: zodResolver(withdrawalFormSchema),
    defaultValues: {
      amount: 0,
      method: 'BANK_TRANSFER',
      expedited: false,
      notes: '',
      acceptTerms: false,
    },
  });

  // Gérer la soumission du formulaire
  const onSubmit = async (data: WithdrawalFormValues) => {
    if (!walletData || data.amount > walletData.wallet.balance) {
      toast({
        variant: 'destructive',
        title: t('insufficientFunds'),
        description: t('insufficientFundsDescription'),
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await withdrawalMutation.mutateAsync({
        amount: data.amount,
        method: data.method,
        expedited: data.expedited,
        notes: data.notes,
      });
    } catch (error) {
      // L'erreur est déjà gérée dans onError
    }
  };

  // Revenir à la page principale du portefeuille
  const handleBack = () => {
    router.push('/deliverer/wallet');
  };

  // Calculer les informations du retrait
  const calculateWithdrawalDetails = (amount: number, expedited: boolean) => {
    // Frais : 1% pour régulier, 2.5% pour express (minimum 1€)
    const feePercentage = expedited ? 0.025 : 0.01;
    const fees = Math.max(amount * feePercentage, 1);

    // Arrondir à 2 décimales
    const roundedFees = Math.round(fees * 100) / 100;
    const netAmount = Math.round((amount - roundedFees) * 100) / 100;

    // Délai de traitement
    const processingTime = expedited ? '1-2 jours ouvrés' : '3-5 jours ouvrés';

    return {
      fees: roundedFees,
      netAmount,
      processingTime,
    };
  };

  // Obtenir les détails du retrait en fonction des valeurs actuelles du formulaire
  const withdrawalDetails = calculateWithdrawalDetails(
    form.watch('amount') || 0,
    form.watch('expedited') || false
  );

  // Afficher un écran de chargement
  if ((isLoadingWallet && !walletData) || !session?.user) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('backToWallet')}
          </Button>
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-4 w-1/4" />
          </CardHeader>
          <CardContent className="space-y-8">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-12 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Afficher une erreur si les informations bancaires ne sont pas complètes
  if (walletData && !walletData.wallet.iban && !withdrawalSuccess) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('backToWallet')}
          </Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>{t('bankDetailsRequired')}</CardTitle>
            <CardDescription>{t('bankDetailsRequiredDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{t('missingBankDetails')}</AlertTitle>
              <AlertDescription>{t('missingBankDetailsDescription')}</AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter>
            <Button variant="outline" onClick={() => router.push('/deliverer/profile')}>
              {t('updateProfile')}
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Afficher la confirmation de retrait
  if (withdrawalSuccess) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('backToWallet')}
          </Button>
        </div>
        <Card>
          <CardHeader className="text-center">
            <div className="mb-4 flex justify-center">
              <div className="rounded-full bg-green-100 p-3">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <CardTitle className="text-2xl">{t('withdrawalRequestSuccess')}</CardTitle>
            <CardDescription>{t('withdrawalRequestSubmitted')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md bg-muted p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {t('withdrawalAmount')}
                  </p>
                  <p className="text-lg font-semibold">
                    {formatCurrency(form.getValues('amount'), walletData?.wallet.currency || 'EUR')}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('netAmount')}</p>
                  <p className="text-lg font-semibold">
                    {formatCurrency(
                      withdrawalDetails.netAmount,
                      walletData?.wallet.currency || 'EUR'
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('processingTime')}</p>
                  <p className="text-lg font-semibold">{withdrawalDetails.processingTime}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {t('withdrawalStatus')}
                  </p>
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                    {t('statusProcessing')}
                  </Badge>
                </div>
              </div>
            </div>

            <Alert className="bg-blue-50 text-blue-700 border-blue-200">
              <Clock className="h-4 w-4" />
              <AlertDescription>{t('withdrawalConfirmationSent')}</AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button onClick={handleBack}>{t('backToWallet')}</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Afficher le formulaire de retrait
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('backToWallet')}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowUpFromLine className="h-5 w-5" />
                {t('requestWithdrawal')}
              </CardTitle>
              <CardDescription>{t('requestWithdrawalDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('withdrawalAmount')}</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <BanknoteIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="0.00"
                              type="number"
                              min={10}
                              step="0.01"
                              className="pl-10"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormDescription>
                          {t('availableBalance')}:{' '}
                          <span className="font-medium">
                            {formatCurrency(
                              walletData?.wallet.balance || 0,
                              walletData?.wallet.currency || 'EUR'
                            )}
                          </span>
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="method"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('withdrawalMethod')}</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex flex-col space-y-3"
                          >
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="BANK_TRANSFER" />
                              </FormControl>
                              <FormLabel className="font-normal cursor-pointer">
                                {t('bankTransfer')}
                              </FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="STRIPE_CONNECT" />
                              </FormControl>
                              <FormLabel className="font-normal cursor-pointer">
                                {t('stripeConnect')}
                              </FormLabel>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="expedited"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="font-medium cursor-pointer">
                            {t('expeditedProcessing')}
                          </FormLabel>
                          <FormDescription>{t('expeditedProcessingDescription')}</FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('notes')}</FormLabel>
                        <FormControl>
                          <Input placeholder={t('notesPlaceholder')} {...field} />
                        </FormControl>
                        <FormDescription>{t('notesDescription')}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Separator />

                  <div className="rounded-md bg-muted/40 p-4">
                    <h3 className="text-sm font-medium mb-2">{t('withdrawalSummary')}</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>{t('withdrawalAmount')}</span>
                        <span className="font-medium">
                          {formatCurrency(
                            form.watch('amount') || 0,
                            walletData?.wallet.currency || 'EUR'
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>
                          {t('processingFees')}
                          {form.watch('expedited') ? ` (${t('expedited')})` : ''}
                        </span>
                        <span className="font-medium text-red-600">
                          -{' '}
                          {formatCurrency(
                            withdrawalDetails.fees,
                            walletData?.wallet.currency || 'EUR'
                          )}
                        </span>
                      </div>
                      <Separator className="my-2" />
                      <div className="flex justify-between font-bold">
                        <span>{t('netAmount')}</span>
                        <span>
                          {formatCurrency(
                            withdrawalDetails.netAmount,
                            walletData?.wallet.currency || 'EUR'
                          )}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        <Clock className="h-3.5 w-3.5 inline-block mr-1" />
                        {t('estimatedArrival')}: {withdrawalDetails.processingTime}
                      </div>
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="acceptTerms"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="font-medium cursor-pointer">
                            {t('acceptTerms')}
                          </FormLabel>
                          <FormDescription>{t('acceptTermsDescription')}</FormDescription>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" type="button" onClick={handleBack}>
                      {t('cancel')}
                    </Button>
                    <Button
                      type="submit"
                      disabled={
                        isSubmitting ||
                        form.watch('amount') <= 0 ||
                        form.watch('amount') > (walletData?.wallet.balance || 0)
                      }
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          {t('processing')}
                        </>
                      ) : (
                        t('confirmWithdrawal')
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                <Wallet className="h-4 w-4 inline-block mr-2" />
                {t('walletStatus')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">{t('availableBalance')}</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(
                    walletData?.wallet.balance || 0,
                    walletData?.wallet.currency || 'EUR'
                  )}
                </p>
              </div>

              <Separator />

              <div>
                <h3 className="text-sm font-medium mb-2">{t('pendingWithdrawals')}</h3>
                {withdrawals && withdrawals.withdrawals.length > 0 ? (
                  <div className="space-y-3">
                    {withdrawals.withdrawals.map(withdrawal => (
                      <div
                        key={withdrawal.id}
                        className="flex justify-between items-center text-sm p-2 border rounded-md"
                      >
                        <div>
                          <Badge
                            variant="outline"
                            className="bg-amber-50 text-amber-700 border-amber-200"
                          >
                            <Clock className="h-3 w-3 mr-1" />
                            {t('pending')}
                          </Badge>
                          <p className="mt-1">
                            {new Date(withdrawal.requestedAt).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                        <p className="font-medium">
                          {formatCurrency(withdrawal.amount, walletData?.wallet.currency || 'EUR')}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{t('noWithdrawals')}</p>
                )}
              </div>

              <Alert className="mt-4 bg-blue-50 text-blue-700 border-blue-200">
                <AlertDescription className="text-xs">{t('withdrawalTips')}</AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
