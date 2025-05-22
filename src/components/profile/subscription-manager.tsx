'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { format, addMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  AlertCircle,
  Calendar,
  Check,
  CreditCard,
  FileText,
  HelpCircle,
  LifeBuoy,
  Package,
  RefreshCw,
  Shield,
  Sparkles,
  X,
  Zap,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { api } from '@/trpc/react';
import { useToast } from '@/components/ui/use-toast';
import { useSubscriptionStore } from '@/store/use-subscription-store';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';

import { SubscriptionPlans, type SubscriptionPlan } from '../payments/subscription-plans';

// Type de la souscription courante
interface CurrentSubscription {
  id: string;
  planType: string;
  status: 'ACTIVE' | 'CANCELLED' | 'EXPIRED' | 'TRIALING' | 'PAST_DUE';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  trialEndsAt?: string | null;
  autoRenew: boolean;
  createdAt: string;
  updatedAt: string;
  renewalReminders: boolean;
  paymentMethod?: {
    id: string;
    brand: string;
    last4: string;
    expiryMonth: number;
    expiryYear: number;
  } | null;
  plan: {
    name: string;
    description: string;
    features: string[];
    limits: Record<string, any>;
  };
  usage: {
    deliveries: {
      used: number;
      limit: number | null;
      percent: number;
    };
    storage: {
      used: number;
      limit: number | null;
      percent: number;
    };
  };
}

interface SubscriptionManagerProps {
  userId?: string;
  isDemo?: boolean;
  className?: string;
}

export function SubscriptionManager({
  userId,
  isDemo = false,
  className,
}: SubscriptionManagerProps) {
  const t = useTranslations('subscription');
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);
  const [showChangeDialog, setShowChangeDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const { setCurrentPlan } = useSubscriptionStore();
  
  // Générer des données d'abonnement de démonstration
  const generateDemoSubscription = (): CurrentSubscription => {
    const now = new Date();
    const periodStart = now;
    const periodEnd = addMonths(now, 1);
    
    const randomPlanType = Math.random() > 0.7 ? 'PREMIUM' : Math.random() > 0.4 ? 'BASIC' : 'FREE';
    const planName = randomPlanType === 'PREMIUM' 
      ? t('plans.premium.name') 
      : randomPlanType === 'BASIC' 
      ? t('plans.basic.name') 
      : t('plans.free.name');
    
    const deliveriesUsed = Math.floor(Math.random() * 85);
    const deliveriesLimit = randomPlanType === 'PREMIUM' ? 100 : randomPlanType === 'BASIC' ? 25 : 5;
    const storageUsed = Math.floor(Math.random() * 15);
    const storageLimit = randomPlanType === 'PREMIUM' ? 25 : randomPlanType === 'BASIC' ? 5 : 1;
    
    return {
      id: 'demo-subscription-id',
      planType: randomPlanType,
      status: 'ACTIVE',
      currentPeriodStart: periodStart.toISOString(),
      currentPeriodEnd: periodEnd.toISOString(),
      cancelAtPeriodEnd: false,
      autoRenew: true,
      createdAt: new Date(now.getFullYear(), now.getMonth() - 2, now.getDate()).toISOString(),
      updatedAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 5).toISOString(),
      renewalReminders: true,
      paymentMethod: randomPlanType !== 'FREE' ? {
        id: 'demo-payment-method',
        brand: 'visa',
        last4: '4242',
        expiryMonth: 12,
        expiryYear: now.getFullYear() + 1,
      } : null,
      plan: {
        name: planName,
        description: t(`plans.${randomPlanType.toLowerCase()}.description`),
        features: [
          t('features.deliveries'),
          t('features.tracking'),
          ...(randomPlanType !== 'FREE' ? [t('features.reports')] : []),
          ...(randomPlanType === 'PREMIUM' ? [t('features.api'), t('features.customization')] : []),
        ],
        limits: {
          deliveriesPerMonth: deliveriesLimit,
          storageGB: storageLimit,
          support: randomPlanType === 'PREMIUM' 
            ? 'priority' 
            : randomPlanType === 'BASIC' 
            ? 'email' 
            : 'basic',
        },
      },
      usage: {
        deliveries: {
          used: deliveriesUsed,
          limit: deliveriesLimit,
          percent: (deliveriesUsed / deliveriesLimit) * 100,
        },
        storage: {
          used: storageUsed,
          limit: storageLimit,
          percent: (storageUsed / storageLimit) * 100,
        },
      },
    };
  };
  
  // Requête pour récupérer l'abonnement courant
  const { 
    data: subscription, 
    isLoading, 
    refetch 
  } = isDemo 
    ? { data: generateDemoSubscription(), isLoading: false, refetch: async () => {} }
    : api.subscription.getMySubscription.useQuery(
        undefined,
        {
          enabled: !isDemo && !!userId,
          refetchOnWindowFocus: false,
        }
      );
      
  // Mise à jour du stockage global
  useEffect(() => {
    if (subscription) {
      setCurrentPlan({
        id: subscription.id,
        type: subscription.planType,
        name: subscription.plan.name,
        features: subscription.plan.features,
      });
    }
  }, [subscription, setCurrentPlan]);
  
  // Rafraîchir les données
  const handleRefresh = async () => {
    if (!isDemo) {
      await refetch();
    }
  };
  
  // Mettre à jour les paramètres de l'abonnement
  const updateSubscriptionMutation = api.subscription.updateSubscriptionSettings.useMutation({
    onSuccess: () => {
      toast({
        title: t('settingsUpdated'),
        description: t('settingsUpdatedDescription'),
      });
      refetch();
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: t('settingsUpdateError'),
        description: error.message,
      });
    },
  });
  
  // Annuler l'abonnement
  const cancelSubscriptionMutation = api.subscription.cancelSubscription.useMutation({
    onSuccess: () => {
      toast({
        title: t('subscriptionCancelled'),
        description: t('subscriptionCancelledDescription'),
      });
      setShowCancelDialog(false);
      refetch();
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: t('cancellationError'),
        description: error.message,
      });
    },
  });
  
  // Mise à jour du paramètre autoRenew
  const handleAutoRenewToggle = async (enabled: boolean) => {
    if (isDemo) {
      toast({
        title: enabled ? t('autoRenewEnabled') : t('autoRenewDisabled'),
        description: t('demoModeNoChanges'),
      });
      return;
    }
    
    setIsUpdating(true);
    try {
      await updateSubscriptionMutation.mutateAsync({
        autoRenew: enabled,
      });
    } finally {
      setIsUpdating(false);
    }
  };
  
  // Mise à jour des rappels de renouvellement
  const handleRenewalRemindersToggle = async (enabled: boolean) => {
    if (isDemo) {
      toast({
        title: enabled ? t('remindersEnabled') : t('remindersDisabled'),
        description: t('demoModeNoChanges'),
      });
      return;
    }
    
    setIsUpdating(true);
    try {
      await updateSubscriptionMutation.mutateAsync({
        renewalReminders: enabled,
      });
    } finally {
      setIsUpdating(false);
    }
  };
  
  // Confirmation d'annulation
  const handleConfirmCancellation = async () => {
    if (isDemo) {
      toast({
        title: t('subscriptionCancelled'),
        description: t('demoModeNoChanges'),
      });
      setShowCancelDialog(false);
      return;
    }
    
    setIsUpdating(true);
    try {
      await cancelSubscriptionMutation.mutateAsync({
        cancelAtPeriodEnd: true,
        reason: cancelReason,
      });
    } finally {
      setIsUpdating(false);
    }
  };
  
  // Simulation de changement de plan
  const handleChangePlan = async (planId: string) => {
    if (isDemo) {
      toast({
        title: t('planChanged'),
        description: t('demoModeNoChanges'),
      });
      setShowChangeDialog(false);
      return;
    }
    
    // Dans un cas réel, on appellerait l'API pour changer de plan
    toast({
      title: t('planChangeRequested'),
      description: t('redirectToCheckout'),
    });
    setShowChangeDialog(false);
  };
  
  if (isLoading) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader className="pb-2">
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }
  
  if (!subscription) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <CardTitle>{t('noActiveSubscription')}</CardTitle>
          <CardDescription>{t('subscriptionRequired')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="warning">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t('noSubscriptionTitle')}</AlertTitle>
            <AlertDescription>{t('noSubscriptionDescription')}</AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter>
          <Dialog open={showChangeDialog} onOpenChange={setShowChangeDialog}>
            <DialogTrigger asChild>
              <Button>{t('choosePlan')}</Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t('selectPlan')}</DialogTitle>
                <DialogDescription>{t('selectPlanDescription')}</DialogDescription>
              </DialogHeader>
              
              <SubscriptionPlans
                isDemo={isDemo}
                onSelectPlan={handleChangePlan}
                className="py-4"
              />
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowChangeDialog(false)}>
                  {t('cancel')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardFooter>
      </Card>
    );
  }
  
  const remainingDays = Math.ceil(
    (new Date(subscription.currentPeriodEnd).getTime() - new Date().getTime()) / 
    (1000 * 60 * 60 * 24)
  );
  
  const statusColors = {
    ACTIVE: 'bg-green-50 text-green-700 border-green-200',
    CANCELLED: 'bg-gray-50 text-gray-700 border-gray-200',
    EXPIRED: 'bg-red-50 text-red-700 border-red-200',
    TRIALING: 'bg-blue-50 text-blue-700 border-blue-200',
    PAST_DUE: 'bg-amber-50 text-amber-700 border-amber-200',
  };
  
  const statusLabels = {
    ACTIVE: t('status.active'),
    CANCELLED: t('status.cancelled'),
    EXPIRED: t('status.expired'),
    TRIALING: t('status.trialing'),
    PAST_DUE: t('status.pastDue'),
  };
  
  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              {t('subscriptionDetails')}
            </CardTitle>
            <CardDescription>{t('subscriptionManagement')}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge 
              variant="outline" 
              className={cn(statusColors[subscription.status])}
            >
              {statusLabels[subscription.status]}
            </Badge>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              className="h-8"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-2" />
              {t('refresh')}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Détails de l'abonnement */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">{t('currentPlan')}</h3>
            
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      {subscription.plan.name}
                    </CardTitle>
                    <CardDescription>
                      {subscription.plan.description}
                    </CardDescription>
                  </div>
                  {subscription.planType !== 'FREE' && (
                    <Badge variant="outline" className="bg-primary/10 text-primary">
                      {subscription.cancelAtPeriodEnd 
                        ? t('notRenewing')
                        : t('active')
                      }
                    </Badge>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="pb-2 pt-0">
                <div className="space-y-4">
                  {/* Période actuelle */}
                  <div className="text-sm">
                    <div className="flex items-center text-muted-foreground mb-1">
                      <Calendar className="h-3.5 w-3.5 mr-1" />
                      {t('billingPeriod')}:
                    </div>
                    <p>
                      {format(new Date(subscription.currentPeriodStart), 'dd MMMM yyyy', { locale: fr })} - {' '}
                      {format(new Date(subscription.currentPeriodEnd), 'dd MMMM yyyy', { locale: fr })}
                    </p>
                    
                    {!subscription.cancelAtPeriodEnd && subscription.planType !== 'FREE' && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {t('autoRenewOn', { date: format(new Date(subscription.currentPeriodEnd), 'dd MMMM yyyy', { locale: fr }) })}
                      </p>
                    )}
                    
                    {subscription.cancelAtPeriodEnd && (
                      <div className="mt-2">
                        <Alert variant="warning" className="py-2">
                          <AlertCircle className="h-3.5 w-3.5" />
                          <AlertDescription className="text-xs">
                            {t('subscriptionEndsOn', { date: format(new Date(subscription.currentPeriodEnd), 'dd MMMM yyyy', { locale: fr }) })}
                          </AlertDescription>
                        </Alert>
                      </div>
                    )}
                  </div>
                  
                  {/* Méthode de paiement */}
                  {subscription.planType !== 'FREE' && subscription.paymentMethod && (
                    <div className="text-sm">
                      <div className="flex items-center text-muted-foreground mb-1">
                        <CreditCard className="h-3.5 w-3.5 mr-1" />
                        {t('paymentMethod')}:
                      </div>
                      <p className="flex items-center">
                        {subscription.paymentMethod.brand.toUpperCase()} •••• {subscription.paymentMethod.last4}
                        <span className="text-xs text-muted-foreground ml-2">
                          {t('expires')}: {subscription.paymentMethod.expiryMonth}/{subscription.paymentMethod.expiryYear}
                        </span>
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* Fonctionnalités */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{t('planFeatures')}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="space-y-2 text-sm">
                  {subscription.plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-green-500 mt-0.5" />
                      <span>
                        {feature}
                        {subscription.plan.limits && subscription.plan.limits[`limit_${index}`] && (
                          <span className="text-xs text-muted-foreground ml-1">
                            ({subscription.plan.limits[`limit_${index}`]})
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
          
          {/* Utilisation et paramètres */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">{t('usage')}</h3>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{t('currentUsage')}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-4">
                {subscription.usage.deliveries.limit && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm">{t('deliveries')}</span>
                      <span className="text-sm text-muted-foreground">
                        {subscription.usage.deliveries.used} / {subscription.usage.deliveries.limit}
                      </span>
                    </div>
                    <Progress value={subscription.usage.deliveries.percent} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-1">
                      {subscription.usage.deliveries.percent > 80 
                        ? t('approachingLimit') 
                        : t('usageOk')
                      }
                    </p>
                  </div>
                )}
                
                {subscription.usage.storage.limit && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm">{t('storage')}</span>
                      <span className="text-sm text-muted-foreground">
                        {subscription.usage.storage.used} / {subscription.usage.storage.limit} GB
                      </span>
                    </div>
                    <Progress value={subscription.usage.storage.percent} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-1">
                      {subscription.usage.storage.percent > 80 
                        ? t('approachingLimit') 
                        : t('usageOk')
                      }
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Paramètres */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{t('settings')}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-4">
                  {subscription.planType !== 'FREE' && (
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="auto-renew">{t('autoRenew')}</Label>
                        <p className="text-xs text-muted-foreground">
                          {t('autoRenewDescription')}
                        </p>
                      </div>
                      <Switch
                        id="auto-renew"
                        checked={subscription.autoRenew}
                        disabled={isUpdating || subscription.cancelAtPeriodEnd}
                        onCheckedChange={handleAutoRenewToggle}
                      />
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="renewal-reminders">{t('renewalReminders')}</Label>
                      <p className="text-xs text-muted-foreground">
                        {t('renewalRemindersDescription')}
                      </p>
                    </div>
                    <Switch
                      id="renewal-reminders"
                      checked={subscription.renewalReminders}
                      disabled={isUpdating}
                      onCheckedChange={handleRenewalRemindersToggle}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        
        {/* Historique des factures */}
        <div>
          <h3 className="text-lg font-medium mb-3">{t('billingHistory')}</h3>
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">{t('recentInvoices')}</CardTitle>
                <Button variant="outline" size="sm" className="h-8">
                  <FileText className="h-3.5 w-3.5 mr-2" />
                  {t('viewAllInvoices')}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {isDemo ? (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">{t('demoInvoicesMessage')}</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-2">{t('noInvoicesYet')}</p>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Dialog open={showChangeDialog} onOpenChange={setShowChangeDialog}>
            <DialogTrigger asChild>
              <Button variant="default">
                <Sparkles className="h-4 w-4 mr-2" />
                {t('changePlan')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t('selectNewPlan')}</DialogTitle>
                <DialogDescription>{t('selectNewPlanDescription')}</DialogDescription>
              </DialogHeader>
              
              <SubscriptionPlans
                isDemo={isDemo}
                currentPlanId={subscription.planType.toLowerCase()}
                onSelectPlan={handleChangePlan}
                className="py-4"
              />
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowChangeDialog(false)}>
                  {t('cancel')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          {subscription.planType !== 'FREE' && !subscription.cancelAtPeriodEnd && (
            <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <X className="h-4 w-4 mr-2" />
                  {t('cancelSubscription')}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('confirmCancellation')}</DialogTitle>
                  <DialogDescription>
                    {t('cancellationWarning', { date: format(new Date(subscription.currentPeriodEnd), 'dd MMMM yyyy', { locale: fr }) })}
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  <Alert variant="warning">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>{t('cancellationImpact')}</AlertTitle>
                    <AlertDescription>
                      <ul className="list-disc pl-4 mt-2 space-y-1">
                        <li>{t('cancellationLoseAccess')}</li>
                        <li>{t('cancellationNoRefund')}</li>
                        <li>{t('cancellationDowngrade')}</li>
                      </ul>
                    </AlertDescription>
                  </Alert>
                  
                  <div className="space-y-2">
                    <Label htmlFor="cancel-reason">{t('cancellationReason')}</Label>
                    <textarea
                      id="cancel-reason"
                      className="w-full min-h-[80px] p-2 border rounded-md"
                      placeholder={t('cancellationReasonPlaceholder')}
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                    />
                  </div>
                </div>
                
                <DialogFooter>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowCancelDialog(false)}
                  >
                    {t('keepSubscription')}
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={handleConfirmCancellation}
                    disabled={isUpdating}
                  >
                    {isUpdating ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        {t('processing')}
                      </>
                    ) : (
                      <>
                        <X className="h-4 w-4 mr-2" />
                        {t('confirmCancel')}
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
          
          <Button variant="outline">
            <LifeBuoy className="h-4 w-4 mr-2" />
            {t('getHelp')}
          </Button>
        </div>
      </CardContent>
      
      {isDemo && (
        <CardFooter className="border-t pt-6">
          <Alert>
            <HelpCircle className="h-4 w-4" />
            <AlertTitle>{t('demoMode')}</AlertTitle>
            <AlertDescription>
              {t('demoModeDescription')}
            </AlertDescription>
          </Alert>
        </CardFooter>
      )}
    </Card>
  );
}
