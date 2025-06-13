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
  isDemo?: boolean;
  currentPlanId?: string;
  onSelectPlan: (planId: string) => void;
  className?: string;
}

export function SubscriptionPlans({
  isDemo = false,
  currentPlanId,
  onSelectPlan,
  className,
}: SubscriptionPlansProps) {
  const t = useTranslations("subscription");
  const [billingInterval, setBillingInterval] = useState<"monthly" | "annual">(
    "monthly",
  );

  // Récupérer les plans depuis le store en mode non démo
  const { availablePlans } = useSubscriptionStore((state) => ({
    availablePlans: state.availablePlans,
  }));

  // Plans d'abonnement démo
  const demoPlans: SubscriptionPlan[] = [
    {
      id: "free",
      type: "FREE",
      name: t("plans.free.name"),
      description: t("plans.free.description"),
      price: {
        monthly: 0,
        annual: 0,
      },
      currency: "EUR",
      features: [
        {
          id: "deliveries",
          name: t("features.deliveries"),
          included: true,
          limit: "5",
        },
        {
          id: "tracking",
          name: t("features.tracking"),
          included: true,
        },
        {
          id: "reports",
          name: t("features.reports"),
          included: false,
        },
        {
          id: "support",
          name: t("features.support"),
          included: true,
          limit: t("support.basic"),
        },
        {
          id: "storage",
          name: t("features.storage"),
          included: false,
        },
      ],
      cta: t("plans.free.cta"),
      icon: <Zap className="h-5 w-5" />,
    },
    {
      id: "basic",
      type: "BASIC",
      name: t("plans.basic.name"),
      description: t("plans.basic.description"),
      price: {
        monthly: 29,
        annual: 290,
      },
      currency: "EUR",
      features: [
        {
          id: "deliveries",
          name: t("features.deliveries"),
          included: true,
          limit: "25",
        },
        {
          id: "tracking",
          name: t("features.tracking"),
          included: true,
        },
        {
          id: "reports",
          name: t("features.reports"),
          included: true,
          limit: t("reports.basic"),
        },
        {
          id: "support",
          name: t("features.support"),
          included: true,
          limit: t("support.email"),
        },
        {
          id: "storage",
          name: t("features.storage"),
          included: true,
          limit: "5 GB",
        },
        {
          id: "api",
          name: t("features.api"),
          included: false,
        },
      ],
      cta: t("plans.basic.cta"),
      icon: <Star className="h-5 w-5" />,
    },
    {
      id: "premium",
      type: "PREMIUM",
      name: t("plans.premium.name"),
      description: t("plans.premium.description"),
      price: {
        monthly: 79,
        annual: 790,
      },
      currency: "EUR",
      features: [
        {
          id: "deliveries",
          name: t("features.deliveries"),
          included: true,
          limit: "100",
        },
        {
          id: "tracking",
          name: t("features.tracking"),
          included: true,
          highlight: true,
        },
        {
          id: "reports",
          name: t("features.reports"),
          included: true,
          limit: t("reports.advanced"),
          highlight: true,
        },
        {
          id: "support",
          name: t("features.support"),
          included: true,
          limit: t("support.priority"),
        },
        {
          id: "storage",
          name: t("features.storage"),
          included: true,
          limit: "25 GB",
        },
        {
          id: "api",
          name: t("features.api"),
          included: true,
          limit: "1000 " + t("api.requests"),
        },
        {
          id: "customization",
          name: t("features.customization"),
          included: true,
          limit: t("customization.basic"),
        },
      ],
      mostPopular: true,
      cta: t("plans.premium.cta"),
      badge: t("mostPopular"),
      icon: <Gem className="h-5 w-5" />,
    },
    {
      id: "business",
      type: "BUSINESS",
      name: t("plans.business.name"),
      description: t("plans.business.description"),
      price: {
        monthly: 199,
        annual: 1990,
      },
      currency: "EUR",
      features: [
        {
          id: "deliveries",
          name: t("features.deliveries"),
          included: true,
          limit: t("unlimited"),
          highlight: true,
        },
        {
          id: "tracking",
          name: t("features.tracking"),
          included: true,
          highlight: true,
        },
        {
          id: "reports",
          name: t("features.reports"),
          included: true,
          limit: t("reports.premium"),
          highlight: true,
        },
        {
          id: "support",
          name: t("features.support"),
          included: true,
          limit: t("support.dedicated"),
          highlight: true,
        },
        {
          id: "storage",
          name: t("features.storage"),
          included: true,
          limit: "100 GB",
        },
        {
          id: "api",
          name: t("features.api"),
          included: true,
          limit: t("unlimited"),
        },
        {
          id: "customization",
          name: t("features.customization"),
          included: true,
          limit: t("customization.advanced"),
        },
        {
          id: "integration",
          name: t("features.integration"),
          included: true,
        },
      ],
      recommended: true,
      cta: t("plans.business.cta"),
      badge: t("recommended"),
      icon: <Rocket className="h-5 w-5" />,
    },
    {
      id: "enterprise",
      type: "ENTERPRISE",
      name: t("plans.enterprise.name"),
      description: t("plans.enterprise.description"),
      price: {
        monthly: 499,
        annual: 4990,
      },
      currency: "EUR",
      features: [
        {
          id: "custom",
          name: t("features.custom"),
          included: true,
          description: t("features.customDescription"),
        },
      ],
      cta: t("plans.enterprise.cta"),
      details: t("plans.enterprise.details"),
      icon: <Sparkles className="h-5 w-5" />,
    },
  ];

  // Utiliser les plans démo ou réels
  const plans = isDemo ? demoPlans : availablePlans;

  // Formatage du prix
  const formatPrice = (amount: number, currency: string): string => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency,
      minimumFractionDigits: amount === 0 ? 0 : 2,
    }).format(amount);
  };

  // Remise en pourcentage pour abonnement annuel
  const getAnnualDiscount = (plan: SubscriptionPlan): number => {
    if (plan.price.monthly === 0 || plan.price.annual === 0) return 0;

    const monthlyTotal = plan.price.monthly * 12;
    const discount = ((monthlyTotal - plan.price.annual) / monthlyTotal) * 100;

    return Math.round(discount);
  };

  return (
    <div className={cn("space-y-8", className)}>
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold tracking-tight">{t("title")}</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          {t("description")}
        </p>

        {/* Toggle mensuel/annuel */}
        <div className="flex items-center justify-center space-x-3 mt-6">
          <Label htmlFor="billing-toggle" className="font-medium">
            {t("billingMonthly")}
          </Label>
          <Switch
            id="billing-toggle"
            checked={billingInterval === "annual"}
            onCheckedChange={() =>
              setBillingInterval(
                billingInterval === "monthly" ? "annual" : "monthly",
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

        {isDemo && (
          <div className="mt-2">
            <Badge
              variant="outline"
              className="bg-amber-50 text-amber-700 border-amber-200 flex items-center gap-1 mx-auto"
            >
              <Info className="h-3.5 w-3.5 mr-1" />
              {t("demoMode")}
            </Badge>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-7xl mx-auto">
        {plans.map((plan) => {
          const isCurrentPlan = currentPlanId === plan.id;
          const discount = getAnnualDiscount(plan);
          const price =
            billingInterval === "monthly"
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
                  {billingInterval === "annual" && plan.price.monthly > 0 && (
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
                                ({feature.limit})
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
