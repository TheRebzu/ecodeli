"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CheckCircle,
  Crown,
  Shield,
  Truck,
  Star,
  AlertTriangle,
  Calendar,
  Euro,
  Gift,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils/common";
import { api } from "@/trpc/react";
import { useToast } from "@/components/ui/use-toast";

type SubscriptionPlan = "FREE" | "STARTER" | "PREMIUM";

interface PlanFeature {
  label: string;
  included: boolean;
  value?: string;
  highlight?: boolean;
}

interface PlanDetails {
  id: SubscriptionPlan;
  name: string;
  price: number;
  period: string;
  badge?: string;
  icon: React.ReactNode;
  color: string;
  features: PlanFeature[];
  benefits: string[];
  popular?: boolean;
}

interface SubscriptionData {
  plan: SubscriptionPlan;
  status: "ACTIVE" | "CANCELLED" | "EXPIRED";
  startDate: Date;
  endDate?: Date;
  monthlyUsage: {
    deliveries: number;
    priorityDeliveries: number;
    insuranceClaims: number;
  };
  limits: {
    maxInsurance: number;
    freeDeliveries: number;
    priorityDiscount: number;
    generalDiscount: number;
  };
}

interface SubscriptionManagerProps {
  className?: string;
}

export function SubscriptionManager({ className }: SubscriptionManagerProps) {
  const t = useTranslations("client.subscription");
  const { toast } = useToast();

  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Récupérer les données d'abonnement
  const {
    data: subscription,
    isLoading,
    refetch,
  } = api.subscription.getCurrentSubscription.useQuery();

  const { data } = api.subscription.getMonthlyUsage.useQuery();

  // Mutation pour changer d'abonnement
  const changePlanMutation = api.subscription.changePlan.useMutation({ onSuccess: () => {
      toast({
        title: "Abonnement mis à jour",
        description: "Votre nouvel abonnement est maintenant actif.",
       });
      refetch();
      setShowUpgradeDialog(false);
      setIsProcessing(false);
    },
    onError: (error) => {
      toast({ title: "Erreur",
        description: error.message,
        variant: "destructive",
       });
      setIsProcessing(false);
    },
  });

  // Définition des plans selon le cahier des charges
  const plans: PlanDetails[] = [
    {
      id: "FREE",
      name: "Free",
      price: 0,
      period: "Gratuit",
      icon: <Truck className="h-5 w-5" />,
      color: "text-slate-600",
      features: [
        { label: "Assurance colis", included: false },
        { label: "Réduction envoi", included: false },
        { label: "Envoi prioritaire", included: false, value: "15% du montant" },
        { label: "Réduction permanente", included: false },
      ],
      benefits: ["Accès aux fonctionnalités de base", "Support communautaire"],
    },
    {
      id: "STARTER",
      name: "Starter",
      price: 9.9,
      period: "/mois",
      icon: <Star className="h-5 w-5" />,
      color: "text-blue-600",
      popular: true,
      features: [
        { label: "Assurance colis", included: true, value: "Jusqu'à 115€/envoi" },
        { label: "Réduction envoi", included: true, value: "5%" },
        { label: "Envoi prioritaire", included: true, value: "5% du montant" },
        { label: "Réduction permanente", included: true, value: "5% petits colis" },
      ],
      benefits: [
        "Assurance de base incluse",
        "Réductions sur tous les envois",
        "Support prioritaire",
      ],
    },
    {
      id: "PREMIUM",
      name: "Premium",
      price: 19.99,
      period: "/mois",
      badge: "Recommandé",
      icon: <Crown className="h-5 w-5" />,
      color: "text-yellow-600",
      features: [
        {
          label: "Assurance colis",
          included: true,
          value: "Jusqu'à 3000€/envoi",
          highlight: true,
        },
        { label: "Réduction envoi", included: true, value: "9% + 1er gratuit" },
        {
          label: "Envoi prioritaire",
          included: true,
          value: "3 gratuits/mois",
          highlight: true,
        },
        {
          label: "Réduction permanente",
          included: true,
          value: "5% tous colis",
          highlight: true,
        },
      ],
      benefits: [
        "Assurance premium étendue",
        "Premier envoi offert",
        "3 envois prioritaires gratuits/mois",
        "Support dédié 24/7",
        "Accès aux fonctionnalités exclusives",
      ],
    },
  ];

  const currentPlan = subscription?.plan || "FREE";
  const currentPlanDetails = plans.find((p) => p.id === currentPlan);

  // Calculer l'utilisation mensuelle
  const calculateUsageProgress = () => {
    if (!usage || !subscription) return { deliveries: 0, priority: 0 };

    const deliveries = Math.min(
      (usage.deliveries / (subscription.limits.freeDeliveries || 1)) * 100,
      100,
    );

    const priority = Math.min(
      (usage.priorityDeliveries / (subscription.limits.freeDeliveries || 1)) * 100,
      100,
    );

    return { deliveries, priority };
  };

  const usageProgress = calculateUsageProgress();

  // Gestionnaire pour changer d'abonnement
  const handlePlanChange = async (newPlan: SubscriptionPlan) => {
    if (newPlan === currentPlan) return;

    setIsProcessing(true);
    setSelectedPlan(newPlan);

    try {
      await changePlanMutation.mutateAsync({ plan  });
    } catch (error) {
      console.error("Erreur lors du changement d'abonnement:", error);
    }
  };

  // Calculer les économies potentielles
  const calculateSavings = (plan: PlanDetails) => {
    if (!usage) return 0;

    const monthlyDeliveries = usage.deliveries || 5; // Estimation
    const averageDeliveryPrice = 25; // Estimation

    let savings = 0;

    if (plan.id === "STARTER") {
      savings = monthlyDeliveries * averageDeliveryPrice * 0.05; // 5% de réduction
    } else if (plan.id === "PREMIUM") {
      savings = monthlyDeliveries * averageDeliveryPrice * 0.09; // 9% de réduction
      savings += averageDeliveryPrice; // Premier envoi gratuit
    }

    return Math.round(savings);
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-slate-200 rounded w-1/4"></div>
            <div className="h-20 bg-slate-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Abonnement actuel */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              {currentPlanDetails?.icon}
              Abonnement actuel
            </CardTitle>
            <Badge
              variant={currentPlan === "FREE" ? "secondary" : "default"}
              className={cn(
                currentPlan === "PREMIUM" && "bg-yellow-100 text-yellow-800",
                currentPlan === "STARTER" && "bg-blue-100 text-blue-800",
              )}
            >
              {currentPlanDetails?.name}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {currentPlan !== "FREE" && subscription && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Utilisation mensuelle */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Livraisons ce mois</span>
                  <span className="font-medium">
                    {usage?.deliveries || 0} / {subscription.limits.freeDeliveries}
                  </span>
                </div>
                <Progress value={usageProgress.deliveries} className="h-2" />
              </div>

              {/* Économies réalisées */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Économisé ce mois</span>
                  <span className="font-medium text-green-600">
                    {calculateSavings(currentPlanDetails!)}€
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Grâce à votre abonnement {currentPlanDetails?.name}
                </div>
              </div>
            </div>
          )}

          {/* Avantages du plan actuel */}
          <div className="space-y-2">
            <h4 className="font-medium">Vos avantages actuels :</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {currentPlanDetails?.features.map((feature, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex items-center gap-2 text-sm",
                    feature.included ? "text-green-600" : "text-muted-foreground",
                  )}
                >
                  {feature.included ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />
                  )}
                  <span>
                    {feature.label}
                    {feature.value && ` (${feature.value})`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comparaison des plans */}
      <Card data-subscription-plans>
        <CardHeader>
          <CardTitle>Changer d'abonnement</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={cn(
                  "relative border rounded-lg p-4 space-y-4 transition-all",
                  plan.id === currentPlan
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50",
                  plan.popular && "border-blue-500",
                )}
              >
                {plan.popular && (
                  <Badge className="absolute -top-2 left-4 bg-blue-500">
                    Le plus populaire
                  </Badge>
                )}

                <div className="text-center space-y-2">
                  <div className={cn("flex items-center justify-center", plan.color)}>
                    {plan.icon}
                  </div>
                  <h3 className="font-semibold">{plan.name}</h3>
                  <div className="text-2xl font-bold">
                    {plan.price}€<span className="text-sm font-normal">{plan.period}</span>
                  </div>
                  {plan.id !== "FREE" && (
                    <div className="text-sm text-green-600">
                      Économisez {calculateSavings(plan)}€/mois
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  {plan.features.map((feature, index) => (
                    <div
                      key={index}
                      className={cn(
                        "flex items-center gap-2 text-sm",
                        feature.included ? "text-green-600" : "text-muted-foreground",
                      )}
                    >
                      {feature.included ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <div className="h-4 w-4 rounded-full border border-muted-foreground/30" />
                      )}
                      <span>
                        {feature.label}
                        {feature.value && (
                          <span className={cn(feature.highlight && "font-medium")}>
                            {" "}
                            ({ feature.value })
                          </span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>

                <Button
                  className="w-full"
                  variant={plan.id === currentPlan ? "secondary" : "default"}
                  disabled={plan.id === currentPlan || isProcessing}
                  onClick={() => {
                    if (plan.id === "FREE") {
                      handlePlanChange(plan.id);
                    } else {
                      setSelectedPlan(plan.id);
                      setShowUpgradeDialog(true);
                    }
                  }}
                >
                  {plan.id === currentPlan
                    ? "Plan actuel"
                    : plan.id === "FREE"
                      ? "Rétrograder"
                      : plan.price > (currentPlanDetails?.price || 0)
                        ? "Choisir ce plan"
                        : "Changer de plan"}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Dialog de confirmation */}
      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Confirmer le changement d'abonnement
            </DialogTitle>
            <DialogDescription>
              {selectedPlan && (
                <>
                  Vous êtes sur le point de passer au plan{" "}
                  <strong>{plans.find((p) => p.id === selectedPlan)?.name}</strong>.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedPlan && (
            <div className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {selectedPlan === "FREE"
                    ? "En rétrogradant vers le plan gratuit, vous perdrez certains avantages."
                    : "Le changement prendra effet immédiatement. Votre prochaine facture sera ajustée au prorata."}
                </AlertDescription>
              </Alert>

              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-2">Résumé du nouveau plan :</h4>
                {plans
                  .find((p) => p.id === selectedPlan)
                  ?.features.filter((f) => f.included)
                  .map((feature, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span>
                        {feature.label}
                        {feature.value && ` (${feature.value})`}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowUpgradeDialog(false)}
              disabled={isProcessing}
            >
              Annuler
            </Button>
            <Button
              onClick={() => selectedPlan && handlePlanChange(selectedPlan)}
              disabled={isProcessing}
            >
              {isProcessing ? "Traitement..." : "Confirmer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
