"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useTranslations } from "next-intl";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "@/components/ui/use-toast";
import { 
  Crown, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  CreditCard, 
  Shield, 
  Zap,
  Calendar,
  DollarSign
} from "lucide-react";

interface Subscription {
  id: string;
  plan: 'FREE' | 'STARTER' | 'PREMIUM';
  status: 'active' | 'cancelled' | 'expired';
  startDate: string;
  endDate?: string;
  nextBillingDate?: string;
  amount: number;
}

interface SubscriptionPlan {
  id: 'FREE' | 'STARTER' | 'PREMIUM';
  name: string;
  price: number;
  features: string[];
  benefits: {
    insurance: number;
    discount: number;
    priorityShipping: boolean;
    firstShipmentFree?: boolean;
  };
}

const subscriptionPlans: SubscriptionPlan[] = [
  {
    id: 'FREE',
    name: 'Gratuit',
    price: 0,
    features: [
      'Livraisons standard',
      'Support client de base',
      'Suivi des livraisons'
    ],
    benefits: {
      insurance: 0,
      discount: 0,
      priorityShipping: false
    }
  },
  {
    id: 'STARTER',
    name: 'Starter',
    price: 9.90,
    features: [
      'Assurance jusqu\'à 115€/envoi',
      'Réduction de 5% sur les livraisons',
      'Envoi prioritaire (+5%)',
      'Support client prioritaire',
      'Réduction permanente 5% petits colis'
    ],
    benefits: {
      insurance: 115,
      discount: 5,
      priorityShipping: true
    }
  },
  {
    id: 'PREMIUM',
    name: 'Premium',
    price: 19.99,
    features: [
      'Assurance jusqu\'à 3000€/envoi',
      'Réduction de 9% sur les livraisons',
      'Premier envoi offert (< 150€)',
      '3 envois prioritaires offerts/mois',
      'Support client VIP',
      'Réduction permanente 5% tous colis'
    ],
    benefits: {
      insurance: 3000,
      discount: 9,
      priorityShipping: true,
      firstShipmentFree: true
    }
  }
];

export function SubscriptionManager() {
  const t = useTranslations("client.subscription");
  const { user } = useAuth();
  const [currentSubscription, setCurrentSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);

  useEffect(() => {
    fetchCurrentSubscription();
  }, []);

  const fetchCurrentSubscription = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/subscriptions/current');
      
      if (response.ok) {
        const data = await response.json();
        setCurrentSubscription(data.subscription);
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpgrade = async (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    setShowUpgradeDialog(true);
  };

  const confirmUpgrade = async () => {
    if (!selectedPlan) return;

    setIsUpgrading(true);
    try {
      const response = await fetch('/api/subscriptions/upgrade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plan: selectedPlan.id,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentSubscription(data.subscription);
        setShowUpgradeDialog(false);
        setSelectedPlan(null);
        
        toast({
          title: t("upgrade.success.title"),
          description: t("upgrade.success.description"),
        });
      } else {
        const error = await response.json();
        toast({
          title: t("upgrade.error.title"),
          description: error.error || t("upgrade.error.description"),
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error upgrading subscription:', error);
      toast({
        title: t("upgrade.error.title"),
        description: t("upgrade.error.network"),
        variant: "destructive",
      });
    } finally {
      setIsUpgrading(false);
    }
  };

  const handleCancel = () => {
    setShowCancelDialog(true);
  };

  const confirmCancel = async () => {
    setIsCancelling(true);
    try {
      const response = await fetch('/api/subscriptions/cancel', {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentSubscription(data.subscription);
        setShowCancelDialog(false);
        
        toast({
          title: t("cancel.success.title"),
          description: t("cancel.success.description"),
        });
      } else {
        const error = await response.json();
        toast({
          title: t("cancel.error.title"),
          description: error.error || t("cancel.error.description"),
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      toast({
        title: t("cancel.error.title"),
        description: t("cancel.error.network"),
        variant: "destructive",
      });
    } finally {
      setIsCancelling(false);
    }
  };

  const getCurrentPlan = () => {
    if (!currentSubscription) return subscriptionPlans[0];
    return subscriptionPlans.find(plan => plan.id === currentSubscription.plan) || subscriptionPlans[0];
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'expired': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="h-4 w-4" />;
      case 'cancelled': return <XCircle className="h-4 w-4" />;
      case 'expired': return <AlertTriangle className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card className="animate-pulse">
          <CardContent className="p-6">
            <div className="h-20 bg-gray-200 rounded"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentPlan = getCurrentPlan();

  return (
    <div className="space-y-6">
      {/* Current Subscription */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Crown className="h-5 w-5 text-primary" />
            <span>{t("current_plan")}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold">{currentPlan.name}</h3>
              <p className="text-gray-600">{currentPlan.price}€/mois</p>
            </div>
            <Badge className={getStatusColor(currentSubscription?.status || 'active')}>
              <div className="flex items-center space-x-1">
                {getStatusIcon(currentSubscription?.status || 'active')}
                <span>{t(`status.${currentSubscription?.status || 'active'}`)}</span>
              </div>
            </Badge>
          </div>

          {currentSubscription && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span>
                  {t("start_date")}: {new Date(currentSubscription.startDate).toLocaleDateString()}
                </span>
              </div>
              {currentSubscription.nextBillingDate && (
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-4 w-4 text-gray-400" />
                  <span>
                    {t("next_billing")}: {new Date(currentSubscription.nextBillingDate).toLocaleDateString()}
                  </span>
                </div>
              )}
              {currentSubscription.endDate && (
                <div className="flex items-center space-x-2">
                  <XCircle className="h-4 w-4 text-gray-400" />
                  <span>
                    {t("end_date")}: {new Date(currentSubscription.endDate).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="flex space-x-2">
            {currentSubscription?.plan !== 'PREMIUM' && (
              <Button 
                onClick={() => handleUpgrade(subscriptionPlans[2])}
                className="bg-primary hover:bg-primary/90"
              >
                {t("upgrade_to_premium")}
              </Button>
            )}
            {currentSubscription?.status === 'active' && (
              <Button 
                variant="outline" 
                onClick={handleCancel}
                className="text-red-600 border-red-600 hover:bg-red-50"
              >
                {t("cancel_subscription")}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Plan Benefits */}
      <Card>
        <CardHeader>
          <CardTitle>{t("plan_benefits")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
              <Shield className="h-5 w-5 text-blue-600" />
              <div>
                <p className="font-medium">{t("insurance")}</p>
                <p className="text-sm text-gray-600">
                  {currentPlan.benefits.insurance > 0 
                    ? `Jusqu'à ${currentPlan.benefits.insurance}€/envoi`
                    : t("no_insurance")
                  }
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
              <Zap className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium">{t("discount")}</p>
                <p className="text-sm text-gray-600">
                  {currentPlan.benefits.discount > 0 
                    ? `${currentPlan.benefits.discount}% sur les livraisons`
                    : t("no_discount")
                  }
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 p-3 bg-purple-50 rounded-lg">
              <CreditCard className="h-5 w-5 text-purple-600" />
              <div>
                <p className="font-medium">{t("priority_shipping")}</p>
                <p className="text-sm text-gray-600">
                  {currentPlan.benefits.priorityShipping 
                    ? t("priority_available")
                    : t("priority_not_available")
                  }
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Available Plans */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {subscriptionPlans.map((plan) => (
          <Card key={plan.id} className={`relative ${plan.id === currentSubscription?.plan ? 'ring-2 ring-primary' : ''}`}>
            {plan.id === currentSubscription?.plan && (
              <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-primary text-white">
                  {t("current_plan")}
                </Badge>
              </div>
            )}
            <CardHeader>
              <CardTitle className="text-center">{plan.name}</CardTitle>
              <div className="text-center">
                <span className="text-3xl font-bold">{plan.price}€</span>
                <span className="text-gray-500">/mois</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
              
              {plan.id !== currentSubscription?.plan && (
                <Button 
                  onClick={() => handleUpgrade(plan)}
                  className="w-full"
                  variant={plan.id === 'PREMIUM' ? 'default' : 'outline'}
                >
                  {plan.id === 'FREE' ? t("downgrade") : t("upgrade")}
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Upgrade Dialog */}
      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("upgrade.confirm.title")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>{t("upgrade.confirm.description")}</p>
            {selectedPlan && (
              <Alert>
                <AlertDescription>
                  <strong>{selectedPlan.name}</strong> - {selectedPlan.price}€/mois
                </AlertDescription>
              </Alert>
            )}
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                onClick={() => setShowUpgradeDialog(false)}
                disabled={isUpgrading}
              >
                {t("cancel")}
              </Button>
              <Button 
                onClick={confirmUpgrade}
                disabled={isUpgrading}
              >
                {isUpgrading ? t("processing") : t("confirm_upgrade")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("cancel.confirm.title")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {t("cancel.confirm.description")}
              </AlertDescription>
            </Alert>
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                onClick={() => setShowCancelDialog(false)}
                disabled={isCancelling}
              >
                {t("keep_subscription")}
              </Button>
              <Button 
                variant="destructive"
                onClick={confirmCancel}
                disabled={isCancelling}
              >
                {isCancelling ? t("processing") : t("confirm_cancel")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 