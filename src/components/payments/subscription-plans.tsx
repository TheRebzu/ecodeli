'use client';

import React from 'react';
import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { SUBSCRIPTION_PLANS } from '@/schemas/subscription.schema';

// Types pour les plans d'abonnement
export type SubscriptionFeature = {
  name: string;
  included: boolean | string;
};

export type SubscriptionPlan = {
  id: string;
  name: string;
  description: string;
  price: {
    monthly: number;
    annually: number;
  };
  features: SubscriptionFeature[];
  popular?: boolean;
  badge?: string;
};

// Définition des plans d'abonnement
const SUBSCRIPTION_PLANS_ARRAY: SubscriptionPlan[] = [
  {
    id: 'free',
    name: 'Free',
    description: 'Plan gratuit avec fonctionnalités essentielles',
    price: {
      monthly: 0,
      annually: 0,
    },
    features: [
      { name: 'Accès basic à la plateforme', included: true },
      { name: 'Recherche de livraisons', included: true },
      { name: '3 livraisons par mois', included: true },
      { name: 'Assistance par email', included: true },
      { name: 'Notifications de livraison', included: true },
      { name: 'Historique de paiement', included: '30 jours' },
      { name: 'Livraisons prioritaires', included: false },
      { name: 'Support client prioritaire', included: false },
      { name: 'Facturation personnalisée', included: false },
      { name: 'API access', included: false },
    ],
  },
  {
    id: 'starter',
    name: 'Starter',
    description: 'Pour les clients réguliers avec besoins modérés',
    price: {
      monthly: 9.90,
      annually: 99.00,
    },
    popular: true,
    badge: 'Populaire',
    features: [
      { name: 'Accès basic à la plateforme', included: true },
      { name: 'Recherche de livraisons', included: true },
      { name: 'Livraisons illimitées', included: true },
      { name: 'Assistance par email', included: true },
      { name: 'Notifications de livraison', included: true },
      { name: 'Historique de paiement', included: '1 an' },
      { name: 'Livraisons prioritaires', included: true },
      { name: 'Support client prioritaire', included: false },
      { name: 'Facturation personnalisée', included: false },
      { name: 'API access', included: false },
    ],
  },
  {
    id: 'premium',
    name: 'Premium',
    description: 'Plan complet pour les utilisateurs professionnels',
    price: {
      monthly: 19.99,
      annually: 199.90,
    },
    features: [
      { name: 'Accès basic à la plateforme', included: true },
      { name: 'Recherche de livraisons', included: true },
      { name: 'Livraisons illimitées', included: true },
      { name: 'Assistance par email', included: true },
      { name: 'Notifications de livraison', included: true },
      { name: 'Historique de paiement', included: 'Illimité' },
      { name: 'Livraisons prioritaires', included: true },
      { name: 'Support client prioritaire', included: true },
      { name: 'Facturation personnalisée', included: true },
      { name: 'API access', included: true },
    ],
  },
];

interface SubscriptionPlansProps {
  currentPlan?: 'FREE' | 'STARTER' | 'PREMIUM';
  onSelectPlan: (planType: 'FREE' | 'STARTER' | 'PREMIUM') => void;
  isLoading?: boolean;
  className?: string;
}

export const SubscriptionPlans = ({
  currentPlan = 'FREE',
  onSelectPlan,
  isLoading = false,
  className
}: SubscriptionPlansProps) => {
  const t = useTranslations('subscription');
  
  // Formatage des plans depuis le schema
  const plans = [
    {
      type: 'FREE' as const,
      ...SUBSCRIPTION_PLANS.FREE,
      recommended: false,
    },
    {
      type: 'STARTER' as const,
      ...SUBSCRIPTION_PLANS.STARTER,
      recommended: false,
    },
    {
      type: 'PREMIUM' as const,
      ...SUBSCRIPTION_PLANS.PREMIUM,
      recommended: true,
    }
  ];

  return (
    <div className={cn("grid gap-6 md:grid-cols-3", className)}>
      {plans.map((plan) => (
        <Card 
          key={plan.type} 
          className={cn(
            "flex flex-col",
            plan.recommended && "border-primary shadow-md"
          )}
        >
          <CardHeader className="flex flex-col space-y-1">
            {plan.recommended && (
              <Badge className="w-fit mb-2">
                {t('recommended')}
              </Badge>
            )}
            <CardTitle className="text-xl">{plan.name}</CardTitle>
            <CardDescription className="flex items-baseline">
              <span className="text-3xl font-bold">
                {plan.priceFormatted}
              </span>
              {plan.type !== 'FREE' && (
                <span className="text-sm text-muted-foreground ml-1">
                  /{t('month')}
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            <ul className="space-y-2 text-sm">
              {plan.features.map((feature, i) => (
                <li key={i} className="flex items-center">
                  <Check className="h-4 w-4 text-primary mr-2" />
                  <span>{feature}</span>
                </li>
              ))}

              {/* Limites spécifiques avec détails */}
              <li className="flex items-center mt-4">
                <span className="text-sm font-medium">
                  {t('assuranceLimit')}: 
                  {plan.limits.insurance > 0 ? 
                    <span className="text-primary font-bold ml-1">
                      {plan.limits.insurance}€
                    </span> : 
                    <span className="text-muted-foreground ml-1">
                      {t('none')}
                    </span>
                  }
                </span>
              </li>
              
              <li className="flex items-center">
                <span className="text-sm font-medium">
                  {t('discount')}: 
                  {plan.limits.discount > 0 ? 
                    <span className="text-primary font-bold ml-1">
                      {plan.limits.discount * 100}%
                    </span> : 
                    <span className="text-muted-foreground ml-1">
                      {t('none')}
                    </span>
                  }
                </span>
              </li>
              
              <li className="flex items-center">
                <span className="text-sm font-medium">
                  {t('deliveryLimit')}: 
                  {plan.limits.deliveriesPerMonth < 0 ? 
                    <span className="text-primary font-bold ml-1">
                      {t('unlimited')}
                    </span> : 
                    <span className="text-primary font-bold ml-1">
                      {plan.limits.deliveriesPerMonth}
                    </span>
                  }
                </span>
              </li>
              
              <li className="flex items-center">
                <span className="text-sm font-medium">
                  {t('priorityDelivery')}: 
                  {plan.limits.priority ? 
                    <Check className="h-4 w-4 text-primary ml-1" /> : 
                    <X className="h-4 w-4 text-muted-foreground ml-1" />
                  }
                </span>
              </li>
            </ul>
          </CardContent>
          <CardFooter>
            <Button
              className="w-full"
              variant={currentPlan === plan.type ? "outline" : "default"}
              onClick={() => onSelectPlan(plan.type)}
              disabled={isLoading || currentPlan === plan.type}
            >
              {currentPlan === plan.type ? t('currentPlan') : t('selectPlan')}
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}; 