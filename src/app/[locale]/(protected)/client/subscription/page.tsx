'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useSession } from 'next-auth/react';
import { Package, CreditCard, FileText, HelpCircle, Zap } from 'lucide-react';

import { api } from '@/trpc/react';
import { useToast } from '@/components/ui/use-toast';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { SubscriptionManager } from '@/components/client/payments/subscription-manager';
import { SubscriptionPlans } from '@/components/shared/payments/subscription-plans';

export default function SubscriptionPage() {
  const t = useTranslations('subscription');
  const router = useRouter();
  const { data: session } = useSession();
  const { toast } = useToast();

  // Requête pour récupérer les données de l'abonnement
  const { data: subscription, isLoading: isLoadingSubscription } =
    api.subscription.getMySubscription.useQuery(undefined, {
      refetchOnWindowFocus: false,
    });

  // Fonction pour sélectionner un plan
  const handleSelectPlan = (planId: string) => {
    // Dans une implémentation réelle, rediriger vers le processus de paiement
    // ou mettre à jour l'abonnement
    if (subscription) {
      toast({
        variant: 'default',
        title: t('changePlanTitle'),
        description: t('changePlanDescription'),
      });

      router.push(`/client/payments?plan=${planId}`);
    } else {
      toast({
        variant: 'default',
        title: t('selectPlanTitle'),
        description: t('selectPlanDescription'),
      });

      router.push(`/client/payments?plan=${planId}`);
    }
  };

  // Fonction pour voir les factures
  const handleViewInvoices = () => {
    router.push('/client/invoices');
  };

  // Fonction pour voir l'historique des paiements
  const handleViewPayments = () => {
    router.push('/client/payments');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Package className="h-7 w-7" />
            {t('pageTitle')}
          </h1>
          <p className="text-muted-foreground">{t('pageDescription')}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" size="sm" onClick={handleViewInvoices}>
            <FileText className="h-4 w-4 mr-2" />
            {t('viewInvoices')}
          </Button>
          <Button variant="outline" size="sm" onClick={handleViewPayments}>
            <CreditCard className="h-4 w-4 mr-2" />
            {t('viewPayments')}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="current">
        <TabsList>
          <TabsTrigger value="current">{t('currentSubscription')}</TabsTrigger>
          <TabsTrigger value="plans">{t('availablePlans')}</TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="mt-6">
          {isLoadingSubscription ? (
            <Skeleton className="h-96 w-full" />
          ) : (
            <>
              {subscription ? (
                <SubscriptionManager userId={session?.user?.id} isDemo={false} />
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>{t('noActiveSubscription')}</CardTitle>
                    <CardDescription>{t('noActiveSubscriptionDescription')}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Alert>
                      <HelpCircle className="h-4 w-4" />
                      <AlertTitle>{t('subscriptionRequired')}</AlertTitle>
                      <AlertDescription>{t('subscriptionRequiredDescription')}</AlertDescription>
                    </Alert>

                    <Button onClick={() => document.querySelector('[data-value="plans"]')?.click()}>
                      {t('browsePlans')}
                    </Button>
                  </CardContent>
                </Card>
              )}

              <Separator className="my-6" />

              <div className="space-y-4">
                <h2 className="text-xl font-semibold">{t('subscriptionBenefits')}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader>
                      <Badge
                        variant="outline"
                        className="w-fit mb-2 bg-blue-50 text-blue-700 border-blue-200"
                      >
                        {t('featureDeliveries')}
                      </Badge>
                      <CardTitle className="text-lg">{t('unlimitedDeliveries')}</CardTitle>
                      <CardDescription>{t('unlimitedDeliveriesDescription')}</CardDescription>
                    </CardHeader>
                  </Card>
                  <Card>
                    <CardHeader>
                      <Badge
                        variant="outline"
                        className="w-fit mb-2 bg-green-50 text-green-700 border-green-200"
                      >
                        {t('featureSupport')}
                      </Badge>
                      <CardTitle className="text-lg">{t('prioritySupport')}</CardTitle>
                      <CardDescription>{t('prioritySupportDescription')}</CardDescription>
                    </CardHeader>
                  </Card>
                  <Card>
                    <CardHeader>
                      <Badge
                        variant="outline"
                        className="w-fit mb-2 bg-purple-50 text-purple-700 border-purple-200"
                      >
                        {t('featureAnalytics')}
                      </Badge>
                      <CardTitle className="text-lg">{t('advancedAnalytics')}</CardTitle>
                      <CardDescription>{t('advancedAnalyticsDescription')}</CardDescription>
                    </CardHeader>
                  </Card>
                </div>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="plans" className="mt-6">
          <SubscriptionPlans
            isDemo={false}
            currentPlanId={subscription?.plan?.id}
            onSelectPlan={handleSelectPlan}
          />
        </TabsContent>
      </Tabs>

      {/* Mode démo */}
      <Separator className="my-6" />
      <div className="pt-2">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500" />
              <CardTitle className="text-base">{t('demoMode')}</CardTitle>
            </div>
            <CardDescription>{t('demoModeDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => router.push('/client/subscription/demo')}>
              {t('viewDemoSubscription')}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
