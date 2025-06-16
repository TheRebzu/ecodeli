"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Shield, 
  Truck, 
  Crown, 
  Zap, 
  Gift,
  Percent,
  CheckCircle,
  ArrowRight 
} from "lucide-react";
import { cn } from "@/lib/utils/common";
import { api } from "@/trpc/react";

interface SubscriptionBenefitsProps {
  showUpgradePrompt?: boolean;
  onUpgrade?: () => void;
  className?: string;
}

/**
 * Composant qui affiche dynamiquement les avantages de l'abonnement
 * et applique les réductions/bénéfices selon le plan actuel
 */
export function SubscriptionBenefits({ 
  showUpgradePrompt = true,
  onUpgrade,
  className 
}: SubscriptionBenefitsProps) {
  const { data } = api.subscription.getCurrentSubscription.useQuery();
  const currentPlan = subscription?.plan || "FREE";

  // Calculer les avantages appliqués selon le plan
  const getActiveBenefits = () => {
    const benefits = [];

    switch (currentPlan) {
      case "PREMIUM":
        benefits.push(
          {
            icon: <Shield className="h-4 w-4" />,
            title: "Assurance Premium",
            description: "Jusqu'à 3000€ par envoi",
            value: "3000€",
            active: true,
            highlight: true,
          },
          {
            icon: <Gift className="h-4 w-4" />,
            title: "Premier envoi offert",
            description: "Économie directe sur votre premier colis",
            value: "Gratuit",
            active: true,
            highlight: true,
          },
          {
            icon: <Zap className="h-4 w-4" />,
            title: "3 envois prioritaires",
            description: "Gratuits chaque mois",
            value: "3/mois",
            active: true,
            highlight: true,
          },
          {
            icon: <Percent className="h-4 w-4" />,
            title: "Réduction permanente",
            description: "9% sur tous vos envois",
            value: "9%",
            active: true,
          }
        );
        break;

      case "STARTER":
        benefits.push(
          {
            icon: <Shield className="h-4 w-4" />,
            title: "Assurance incluse",
            description: "Jusqu'à 115€ par envoi",
            value: "115€",
            active: true,
          },
          {
            icon: <Percent className="h-4 w-4" />,
            title: "Réduction envoi",
            description: "5% sur tous vos envois",
            value: "5%",
            active: true,
          },
          {
            icon: <Zap className="h-4 w-4" />,
            title: "Envoi prioritaire",
            description: "Seulement 5% du montant",
            value: "5%",
            active: true,
          },
          {
            icon: <Truck className="h-4 w-4" />,
            title: "Réduction petits colis",
            description: "5% supplémentaire",
            value: "5%",
            active: true,
          }
        );
        break;

      case "FREE":
      default:
        benefits.push(
          {
            icon: <Shield className="h-4 w-4" />,
            title: "Assurance colis",
            description: "Non incluse",
            value: "0€",
            active: false,
          },
          {
            icon: <Percent className="h-4 w-4" />,
            title: "Réduction envoi",
            description: "Non disponible",
            value: "0%",
            active: false,
          },
          {
            icon: <Zap className="h-4 w-4" />,
            title: "Envoi prioritaire",
            description: "15% du montant",
            value: "15%",
            active: false,
          }
        );
    }

    return benefits;
  };

  const benefits = getActiveBenefits();
  const isPremium = currentPlan === "PREMIUM";
  const isStarter = currentPlan === "STARTER";
  const isFree = currentPlan === "FREE";

  return (
    <div className={cn("space-y-4", className)}>
      {/* Badge du plan actuel */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Crown className={cn(
            "h-5 w-5",
            isPremium ? "text-yellow-500" : isStarter ? "text-blue-500" : "text-gray-400"
          )} />
          <span className="font-medium">Plan {currentPlan}</span>
        </div>
        <Badge variant={isPremium ? "default" : isStarter ? "secondary" : "outline"}>
          {isPremium ? "Premium" : isStarter ? "Starter" : "Gratuit"}
        </Badge>
      </div>

      {/* Avantages actifs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {benefits.map((benefit, index) => (
          <Card 
            key={index}
            className={cn(
              "transition-all",
              benefit.active 
                ? "border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20" 
                : "border-gray-200 bg-gray-50/50 dark:border-gray-700 dark:bg-gray-800/20",
              benefit.highlight && "ring-2 ring-yellow-200 dark:ring-yellow-800"
            )}
          >
            <CardContent className="p-3">
              <div className="flex items-start gap-3">
                <div className={cn(
                  "p-1.5 rounded-lg",
                  benefit.active 
                    ? "bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400" 
                    : "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500"
                )}>
                  {benefit.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className={cn(
                      "font-medium text-sm",
                      benefit.active ? "text-green-800 dark:text-green-200" : "text-gray-600 dark:text-gray-400"
                    )}>
                      {benefit.title}
                    </h4>
                    {benefit.active && (
                      <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                    )}
                  </div>
                  <p className={cn(
                    "text-xs mt-1",
                    benefit.active ? "text-green-600 dark:text-green-300" : "text-gray-500 dark:text-gray-400"
                  )}>
                    {benefit.description}
                  </p>
                  <div className={cn(
                    "text-xs font-medium mt-1",
                    benefit.highlight ? "text-yellow-600 dark:text-yellow-400" :
                    benefit.active ? "text-green-700 dark:text-green-300" : "text-gray-500 dark:text-gray-400"
                  )}>
                    {benefit.value}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Prompt de mise à niveau */}
      {showUpgradePrompt && isFree && (
        <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-blue-800 dark:text-blue-200">
                  Débloquez plus d'avantages
                </h4>
                <p className="text-sm text-blue-600 dark:text-blue-300 mt-1">
                  Passez au plan Starter pour 9,90€/mois et économisez dès le premier envoi !
                </p>
              </div>
              <Button 
                size="sm" 
                onClick={onUpgrade}
                className="flex items-center gap-1"
              >
                Upgrade
                <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {showUpgradePrompt && isStarter && (
        <Card className="border-yellow-200 bg-yellow-50/50 dark:border-yellow-800 dark:bg-yellow-950/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-yellow-800 dark:text-yellow-200">
                  Passez au Premium
                </h4>
                <p className="text-sm text-yellow-600 dark:text-yellow-300 mt-1">
                  Assurance jusqu'à 3000€, premier envoi offert et 3 prioritaires/mois !
                </p>
              </div>
              <Button 
                size="sm" 
                onClick={onUpgrade}
                className="flex items-center gap-1 bg-yellow-600 hover:bg-yellow-700"
              >
                Premium
                <Crown className="h-3 w-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/**
 * Hook utilitaire pour appliquer automatiquement les réductions selon l'abonnement
 */
export function useSubscriptionDiscount() {
  const { data } = api.subscription.getCurrentSubscription.useQuery();

  const calculateDiscount = (basePrice: number, isPriority = false, isSmallPackage = false) => {
    if (!subscription) return { finalPrice: basePrice, discount: 0, savings: 0 };

    const plan = subscription.plan;
    let discountPercent = 0;
    let priorityDiscountPercent = 0;

    switch (plan) {
      case "STARTER":
        discountPercent = 5; // 5% général
        priorityDiscountPercent = 5; // 5% au lieu de 15% pour prioritaire
        if (isSmallPackage) discountPercent += 5; // 5% supplémentaire petits colis
        break;
      
      case "PREMIUM":
        discountPercent = 9; // 9% général
        priorityDiscountPercent = 0; // 3 gratuits/mois puis 5%
        break;
      
      case "FREE":
      default:
        discountPercent = 0;
        priorityDiscountPercent = 15; // 15% pour prioritaire
        break;
    }

    let finalPrice = basePrice;
    let totalDiscount = 0;

    // Appliquer la réduction générale
    if (discountPercent > 0) {
      const generalDiscount = (basePrice * discountPercent) / 100;
      finalPrice -= generalDiscount;
      totalDiscount += generalDiscount;
    }

    // Appliquer la surcharge/réduction prioritaire
    if (isPriority && priorityDiscountPercent > 0) {
      const priorityCharge = (basePrice * priorityDiscountPercent) / 100;
      finalPrice += priorityCharge;
      totalDiscount -= priorityCharge; // Compte comme une charge
    }

    return {
      finalPrice: Math.max(0, finalPrice),
      discount: totalDiscount,
      savings: Math.max(0, totalDiscount),
      appliedDiscounts: {
        general: discountPercent,
        priority: priorityDiscountPercent,
        smallPackage: isSmallPackage && plan === "STARTER" ? 5 : 0,
      },
    };
  };

  const canUseInsurance = (value: number) => {
    if (!subscription) return false;
    
    const maxInsurance = subscription.limits.maxInsurance;
    return maxInsurance > 0 && value <= maxInsurance;
  };

  const getMaxInsuranceValue = () => {
    return subscription?.limits.maxInsurance || 0;
  };

  return {
    subscription,
    calculateDiscount,
    canUseInsurance,
    getMaxInsuranceValue,
  };
}