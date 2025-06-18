"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Check,
  CreditCard,
  Gem,
  Info,
  Rocket,
  Sparkles,
  Star,
  X,
  Zap,
} from "lucide-react";

import { cn } from "@/lib/utils/common";
import { useSubscriptionStore } from "@/store/use-subscription-store";
import { useToast } from "@/components/ui/use-toast";
import { api } from "@/trpc/react";
import { StripeFeatureGuard, StripeStatusIndicator } from "./stripe-status-indicator";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";

// Type d'une fonctionnalité dans un plan
interface PlanFeature {
  id: string;
  name: string;
  description?: string;
  included: boolean;
  limit?: number | string;
  highlight?: boolean;
}

// Type d'un plan d'abonnement
export interface SubscriptionPlan {
  id: string;
  type: "FREE" | "BASIC" | "PREMIUM" | "BUSINESS" | "ENTERPRISE" | "CUSTOM";
  name: string;
  description: string;
  price: {
    monthly: number;
    annual: number;
  };
  currency: string;
  features: PlanFeature[];
  mostPopular?: boolean;
  recommended?: boolean;
  icon?: React.ReactNode;
  badge?: string;
  cta: string;
  details?: string;
}

interface SubscriptionPlansProps {
  currentPlanId?: string;
  onSelectPlan: (planId: string) => void;
  className?: string;
}

export function SubscriptionPlans({
  currentPlanId,
  onSelectPlan,
  className,
}: SubscriptionPlansProps) {
  const t = useTranslations("subscriptions");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">(
    "monthly",
  );
  const { toast } = useToast();

  // Récupération des plans depuis le store et API
  const { availablePlans } = useSubscriptionStore((state) => ({ availablePlans: state.availablePlans,
   }));

  // Requête tRPC réelle pour récupérer les plans
  const { data: plansData, isLoading } = api.subscription.getAvailablePlans.useQuery();
  
  // Utiliser les plans de l'API ou ceux du store en fallback
  const plans = plansData?.plans || availablePlans;

  // Formater le prix
  const formatPrice = (amount: number, currency: string): string => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Calculer la réduction annuelle
  const getAnnualDiscount = (plan: SubscriptionPlan): number => {
    const annualMonthlyPrice = plan.price.annual / 12;
    const monthlyPrice = plan.price.monthly;
    if (monthlyPrice === 0) return 0;
    return Math.round(((monthlyPrice - annualMonthlyPrice) / monthlyPrice) * 100);
  };

  return (
    <div className={cn("space-y-8", className)}>
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold tracking-tight">{t("title")}</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          {t("description")}
        </p>
        
        {/* Indicateur de statut Stripe */}
        <div className="flex justify-center">
          <StripeStatusIndicator showFullMessage />
        </div>

        {/* Toggle mensuel/annuel */}
        <div className="flex items-center justify-center space-x-3 mt-6">
          <Label htmlFor="billing-toggle" className="font-medium">
            {t("billingMonthly")}
          </Label>
          <Switch
            id="billing-toggle"
            checked={billingCycle === "annual"}
            onCheckedChange={() =>
              setBillingCycle(
                billingCycle === "monthly" ? "annual" : "monthly",
              )
            }
          />
          <Label
            htmlFor="billing-toggle"
            className="flex items-center space-x-2 font-medium"
          >
            <span>{t("billingAnnual")}</span>
            <Badge
              variant="outline"
              className="bg-green-50 text-green-700 border-green-200"
            >
              {t("savePercent", { percent: "20" })}
            </Badge>
          </Label>
        </div>
      </div>

      <StripeFeatureGuard
        fallback={
          <div className="text-center py-12">
            <h3 className="text-lg font-semibold mb-2">Plans d'abonnement temporairement indisponibles</h3>
            <p className="text-muted-foreground">Les fonctionnalités d'abonnement payant ne sont pas disponibles actuellement.</p>
          </div>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {plans.map((plan) => {
          const isCurrentPlan = currentPlanId === plan.id;
          const discount = getAnnualDiscount(plan);
          const price =
            billingCycle === "monthly"
              ? plan.price.monthly
              : plan.price.annual / 12;

          return (
            <Card
              key={plan.id}
              className={cn(
                "flex flex-col h-full",
                plan.mostPopular && "border-primary shadow-md",
                isCurrentPlan && "border-primary bg-primary/5",
              )}
            >
              <CardHeader className="pb-6">
                {plan.badge && (
                  <Badge
                    className={cn(
                      "absolute right-4 top-4 whitespace-nowrap",
                      plan.mostPopular && "bg-primary",
                      plan.recommended && "bg-green-600",
                    )}
                  >
                    {plan.badge}
                  </Badge>
                )}

                <div className="flex items-center gap-2">
                  {plan.icon}
                  <CardTitle>{plan.name}</CardTitle>
                </div>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>

              <CardContent className="flex-grow space-y-6">
                <div className="space-y-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold">
                      {formatPrice(price, plan.currency)}
                    </span>
                    <span className="text-muted-foreground">
                      /{t("perMonth")}
                    </span>
                  </div>
                  {billingCycle === "annual" && plan.price.monthly > 0 && (
                    <div className="text-sm text-muted-foreground">
                      {t("billedAnnuallyAs", {
                        amount: formatPrice(plan.price.annual, plan.currency),
                      })}
                      {discount > 0 && (
                        <Badge
                          variant="outline"
                          className="ml-2 bg-green-50 text-green-700 border-green-200"
                        >
                          {t("savePercent", { percent: discount.toString() })}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="text-sm font-medium leading-none">
                    {t("features.title")}
                  </h4>
                  <ul className="space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature.id} className="flex items-start gap-2">
                        {feature.included ? (
                          <Check
                            className={cn(
                              "h-5 w-5 text-green-500 mt-0.5",
                              feature.highlight && "text-primary",
                            )}
                          />
                        ) : (
                          <X className="h-5 w-5 text-muted-foreground mt-0.5" />
                        )}
                        <div>
                          <div className="text-sm">
                            {feature.name}
                            {feature.limit && (
                              <span
                                className={cn(
                                  "ml-1.5 text-xs text-muted-foreground",
                                  feature.highlight &&
                                    "text-primary font-medium",
                                )}
                              >
                                ({ feature.limit })
                              </span>
                            )}
                          </div>
                          {feature.description && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {feature.description}
                            </p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>

              <CardFooter className="pt-6">
                <Button
                  onClick={() => onSelectPlan(plan.id)}
                  className="w-full"
                  variant={
                    isCurrentPlan
                      ? "outline"
                      : plan.mostPopular || plan.recommended
                        ? "default"
                        : "outline"
                  }
                  disabled={isCurrentPlan}
                >
                  {isCurrentPlan ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      {t("currentPlan")}
                    </>
                  ) : (
                    <>
                      {plan.price.monthly === 0 ? null : (
                        <CreditCard className="h-4 w-4 mr-2" />
                      )}
                      {plan.cta}
                    </>
                  )}
                </Button>

                {plan.details && (
                  <p className="text-xs text-muted-foreground text-center mt-4">
                    {plan.details}
                  </p>
                )}
              </CardFooter>
            </Card>
          );
        })}
        </div>
      </StripeFeatureGuard>

      <div className="max-w-3xl mx-auto text-center text-sm text-muted-foreground mt-12">
        <p>{t("planFooterDescription")}</p>
        <p className="mt-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger className="underline cursor-help">
                {t("termsApply")}
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>{t("termsTooltip")}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </p>
      </div>
    </div>
  );
}
