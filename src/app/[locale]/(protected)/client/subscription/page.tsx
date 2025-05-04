'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { api } from '@/trpc/react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  AlertCircle, 
  Check, 
  CheckCircle2, 
  Clock, 
  CreditCard, 
  Gift, 
  Shield, 
  Star, 
  X 
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { formatCurrency, formatDate } from '@/lib/format';

// Types des abonnements
enum SubscriptionPlan {
  FREE = 'FREE',
  STARTER = 'STARTER',
  PREMIUM = 'PREMIUM'
}

interface Subscription {
  id: string;
  userId: string;
  plan: SubscriptionPlan;
  status: 'ACTIVE' | 'CANCELLED' | 'EXPIRED' | 'PENDING';
  startDate: Date;
  endDate: Date;
  trialEndsAt?: Date;
  cancelAtPeriodEnd: boolean;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  price: number;
  currency: string;
  paymentMethod?: {
    id: string;
    type: 'CARD' | 'PAYPAL';
    lastFour?: string;
    expiryDate?: string;
    brand?: string;
  }
}

// Données mockées pour les plans d'abonnement
const subscriptionPlans = [
  {
    id: 'plan_free',
    name: 'Gratuit',
    price: 0,
    currency: 'EUR',
    period: 'month',
    features: [
      { name: 'Livraison standard', included: true },
      { name: 'Jusqu\'à 5 colis par mois', included: true },
      { name: 'Accès aux livreurs standards', included: true },
      { name: 'Délai de livraison: 24-48h', included: true },
      { name: 'Support client par email', included: true },
      { name: 'Livraison express', included: false },
      { name: 'Livraison le jour même', included: false },
      { name: 'Stockage temporaire', included: false },
      { name: 'Livreurs premium', included: false },
      { name: 'Support prioritaire', included: false },
    ],
    popular: false,
    cta: 'Plan Actuel',
    ctaDisabled: true,
    type: SubscriptionPlan.FREE
  },
  {
    id: 'plan_starter',
    name: 'Starter',
    price: 9.99,
    currency: 'EUR',
    period: 'month',
    features: [
      { name: 'Livraison standard', included: true },
      { name: 'Jusqu\'à 15 colis par mois', included: true },
      { name: 'Accès aux livreurs standards', included: true },
      { name: 'Délai de livraison: 12-24h', included: true },
      { name: 'Support client par email et téléphone', included: true },
      { name: 'Livraison express', included: true },
      { name: 'Livraison le jour même', included: false },
      { name: 'Stockage temporaire (1 semaine)', included: true },
      { name: 'Livreurs premium', included: false },
      { name: 'Support prioritaire', included: false },
    ],
    popular: true,
    cta: 'Passer au plan Starter',
    ctaDisabled: false,
    type: SubscriptionPlan.STARTER
  },
  {
    id: 'plan_premium',
    name: 'Premium',
    price: 19.99,
    currency: 'EUR',
    period: 'month',
    features: [
      { name: 'Livraison standard', included: true },
      { name: 'Colis illimités', included: true },
      { name: 'Accès aux livreurs standards et premium', included: true },
      { name: 'Délai de livraison: Express', included: true },
      { name: 'Support client prioritaire', included: true },
      { name: 'Livraison express', included: true },
      { name: 'Livraison le jour même', included: true },
      { name: 'Stockage temporaire (1 mois)', included: true },
      { name: 'Livreurs premium', included: true },
      { name: 'Support prioritaire 24/7', included: true },
    ],
    popular: false,
    cta: 'Passer au plan Premium',
    ctaDisabled: false,
    type: SubscriptionPlan.PREMIUM
  }
];

// Mock de l'abonnement actuel
const mockSubscription: Subscription | null = {
  id: 'sub_123',
  userId: 'user_abc',
  plan: SubscriptionPlan.FREE,
  status: 'ACTIVE',
  startDate: new Date('2025-03-15'),
  endDate: new Date('2026-03-15'),
  cancelAtPeriodEnd: false,
  currentPeriodStart: new Date('2025-05-15'),
  currentPeriodEnd: new Date('2025-06-15'),
  price: 0,
  currency: 'EUR',
};

export default function ClientSubscriptionPage() {
  const t = useTranslations('subscription');
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>('plans');
  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  // À remplacer par un appel tRPC réel
  const { data: subscription, isLoading, error } = {
    data: mockSubscription,
    isLoading: false,
    error: null
  };
  // Décommenter pour utiliser tRPC
  // const { data: subscription, isLoading, error } = api.subscription.getCurrentSubscription.useQuery();

  // Gérer la mise à jour de l'abonnement
  const handleUpgradeSubscription = async (planType: SubscriptionPlan) => {
    if (subscription?.plan === planType) {
      return; // Déjà sur ce plan
    }

    setIsProcessing(true);
    try {
      // Simuler un délai réseau
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Rediriger vers la page de paiement
      router.push(`/client/payments/subscription?plan=${planType}`);
      
      // Décommenter pour utiliser tRPC
      // await api.subscription.createCheckoutSession.mutate({ planType });
    } catch (err) {
      console.error("Erreur lors de la mise à jour de l'abonnement", err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Gérer l'annulation de l'abonnement
  const handleCancelSubscription = async () => {
    if (subscription?.plan === SubscriptionPlan.FREE) {
      return; // Pas d'abonnement payant à annuler
    }

    setIsProcessing(true);
    try {
      // Simuler un délai réseau
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Décommenter pour utiliser tRPC
      // await api.subscription.cancelSubscription.mutate();
      
      // Simuler une mise à jour locale
      setConfirmCancel(false);
      
      // Dans une vraie app, on rechargerait les données ou redirigerait l'utilisateur
    } catch (err) {
      console.error("Erreur lors de l'annulation de l'abonnement", err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Trouver le plan d'abonnement actuel de l'utilisateur
  const currentPlan = subscriptionPlans.find(plan => plan.type === subscription?.plan) || subscriptionPlans[0];

  // Gérer les erreurs
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{t('error')}</AlertTitle>
        <AlertDescription>{typeof error === 'object' && error !== null ? (error as any).message || t('unknownError') : t('unknownError')}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="container py-8">
      <div className="flex flex-col space-y-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
          <p className="mt-1 text-muted-foreground">{t('description')}</p>
        </div>

        {/* Statut de l'abonnement actuel */}
        {!isLoading && subscription && (
          <Card className="bg-muted/40">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{t('currentPlan')}: {t(`plans.${subscription.plan.toLowerCase()}.name`)}</CardTitle>
                  <CardDescription>
                    {subscription.plan !== SubscriptionPlan.FREE ? (
                      <>
                        {subscription.cancelAtPeriodEnd 
                          ? t('willCancelOn', { date: formatDate(subscription.currentPeriodEnd) })
                          : t('renewsOn', { date: formatDate(subscription.currentPeriodEnd) })
                        }
                      </>
                    ) : (
                      t('freePlanDescription')
                    )}
                  </CardDescription>
                </div>
                <Badge 
                  variant={subscription.status === 'ACTIVE' ? 'default' : subscription.status === 'CANCELLED' ? 'destructive' : 'outline'}
                  className="ml-auto"
                >
                  {subscription.status === 'ACTIVE' && <CheckCircle2 className="h-3.5 w-3.5 mr-1" />}
                  {subscription.status === 'CANCELLED' && <X className="h-3.5 w-3.5 mr-1" />}
                  {subscription.status === 'PENDING' && <Clock className="h-3.5 w-3.5 mr-1" />}
                  {t(`status.${subscription.status.toLowerCase()}`)}
                </Badge>
              </div>
            </CardHeader>
            {subscription.plan !== SubscriptionPlan.FREE && (
              <CardContent>
                <div className="flex flex-col space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('currentBilling')}:</span>
                    <span className="font-medium">
                      {formatCurrency(subscription.price, subscription.currency)}/{t('month')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('nextBillingDate')}:</span>
                    <span className="font-medium">
                      {formatDate(subscription.currentPeriodEnd)}
                    </span>
                  </div>
                  
                  {subscription.paymentMethod && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('paymentMethod')}:</span>
                      <span className="font-medium flex items-center">
                        <CreditCard className="h-4 w-4 mr-1" />
                        {subscription.paymentMethod.type === 'CARD' && subscription.paymentMethod.brand && (
                          <>
                            {subscription.paymentMethod.brand.toUpperCase()} 
                            •••• {subscription.paymentMethod.lastFour} 
                            {subscription.paymentMethod.expiryDate && ` (${subscription.paymentMethod.expiryDate})`}
                          </>
                        )}
                        {subscription.paymentMethod.type === 'PAYPAL' && 'PayPal'}
                      </span>
                    </div>
                  )}
                  
                  {!subscription.cancelAtPeriodEnd && subscription.plan !== SubscriptionPlan.FREE && (
                    <div className="pt-2">
                      {confirmCancel ? (
                        <div className="space-y-2">
                          <p className="text-sm text-amber-600">{t('cancelConfirmation')}</p>
                          <div className="flex space-x-2">
                            <Button 
                              variant="destructive" 
                              size="sm" 
                              onClick={handleCancelSubscription}
                              disabled={isProcessing}
                            >
                              {t('confirmCancel')}
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => setConfirmCancel(false)}
                              disabled={isProcessing}
                            >
                              {t('keepSubscription')}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setConfirmCancel(true)}
                        >
                          {t('cancelSubscription')}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            )}
          </Card>
        )}

        <Tabs defaultValue="plans" className="w-full pt-4" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="plans">{t('plans')}</TabsTrigger>
            <TabsTrigger value="history">{t('billingHistory')}</TabsTrigger>
          </TabsList>
          
          <TabsContent value="plans" className="pt-4">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {subscriptionPlans.map((plan) => (
                <Card 
                  key={plan.id} 
                  className={`flex flex-col ${plan.popular ? 'border-primary shadow-md' : ''}`}
                >
                  {plan.popular && (
                    <div className="absolute top-0 right-0 transform translate-x-2 -translate-y-2">
                      <Badge className="flex items-center gap-1 bg-primary hover:bg-primary">
                        <Star className="h-3.5 w-3.5" />
                        {t('mostPopular')}
                      </Badge>
                    </div>
                  )}
                  
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {plan.name === 'Gratuit' && <Gift className="h-5 w-5 text-muted-foreground" />}
                      {plan.name === 'Starter' && <Shield className="h-5 w-5 text-blue-500" />}
                      {plan.name === 'Premium' && <Star className="h-5 w-5 text-amber-500" />}
                      
                      {plan.name}
                    </CardTitle>
                    <div className="flex items-baseline">
                      <span className="text-3xl font-bold">
                        {plan.price === 0 ? t('free') : formatCurrency(plan.price, plan.currency)}
                      </span>
                      {plan.price > 0 && (
                        <span className="ml-1 text-muted-foreground">/{t(plan.period)}</span>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="flex-grow grid gap-4">
                    <Separator />
                    <ul className="grid gap-2.5">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-2">
                          {feature.included ? (
                            <Check className="h-4 w-4 mt-0.5 text-green-600" />
                          ) : (
                            <X className="h-4 w-4 mt-0.5 text-muted-foreground" />
                          )}
                          <span className={feature.included ? '' : 'text-muted-foreground line-through'}>
                            {feature.name}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter className="pt-4">
                    <Button 
                      className="w-full" 
                      variant={currentPlan.type === plan.type ? "outline" : "default"}
                      disabled={currentPlan.type === plan.type || plan.ctaDisabled || isProcessing}
                      onClick={() => handleUpgradeSubscription(plan.type)}
                    >
                      {currentPlan.type === plan.type ? t('currentPlan') : plan.cta}
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="history" className="pt-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('billingHistory')}</CardTitle>
                <CardDescription>{t('billingHistoryDescription')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  {subscription?.plan === SubscriptionPlan.FREE ? (
                    <p>{t('noPaymentHistory')}</p>
                  ) : (
                    <p>{t('noTransactionsYet')}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
