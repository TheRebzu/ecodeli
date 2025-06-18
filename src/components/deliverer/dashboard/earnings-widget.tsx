"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  Euro, 
  TrendingUp, 
  TrendingDown,
  Calendar, 
  Clock,
  Target,
  CreditCard,
  BarChart3,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  DollarSign,
  Eye
} from "lucide-react";
import { api } from "@/trpc/react";
import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface EarningsData {
  totalEarnings: number;
  todayEarnings: number;
  weeklyEarnings: number;
  monthlyEarnings: number;
  pendingPayouts: number;
  completedTrips: number;
  bonuses: number;
}

interface EarningsWidgetProps {
  earnings?: EarningsData;
  isLoading?: boolean;
}

export default function EarningsWidget({ 
  earnings, 
  isLoading = false 
}: EarningsWidgetProps) {
  const t = useTranslations("dashboard.deliverer.earnings");
  const [selectedPeriod, setSelectedPeriod] = useState("month");
  
  // Récupération des données de gains
  const { data: earningsData, isLoading: earningsLoading } = api.deliverer.getEarnings.useQuery({
    period: selectedPeriod
  });
  const { data: payouts } = api.deliverer.getRecentPayouts.useQuery({ limit: 5 });
  const { data: monthlyBreakdown } = api.deliverer.getMonthlyBreakdown.useQuery();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  if (earningsLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-5 bg-gray-200 rounded w-32"></div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="h-8 bg-gray-200 rounded w-24"></div>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex justify-between">
              <div className="h-4 bg-gray-200 rounded w-20"></div>
              <div className="h-4 bg-gray-200 rounded w-16"></div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  // Utiliser les données réelles ou les données par défaut de l'API
  const realEarnings = earningsData || earnings || {
    totalEarnings: 0,
    todayEarnings: 0,
    weeklyEarnings: 0,
    monthlyEarnings: 0,
    pendingPayouts: 0,
    completedTrips: 0,
    bonuses: 0
  };

  const earningsCards = [
    {
      title: t("totalEarnings"),
      value: formatCurrency(realEarnings.totalEarnings),
      icon: DollarSign,
      description: t("thisMonth"),
      trend: earningsData?.totalTrend || 0,
      color: "text-green-600"
    },
    {
      title: t("pendingPayment"),
      value: formatCurrency(earnings.pendingPayouts),
      icon: Clock,
      description: t("awaitingPayout"),
      trend: earningsData?.pendingTrend || 0,
      color: "text-orange-600"
    },
    {
      title: t("averagePerDelivery"),
      value: formatCurrency(earnings.monthlyEarnings),
      icon: Target,
      description: t("perDelivery"),
      trend: earningsData?.averageTrend || 0,
      color: "text-blue-600"
    },
    {
      title: t("todayEarnings"),
      value: formatCurrency(realEarnings.todayEarnings),
      icon: Calendar,
      description: t("today"),
      trend: earningsData?.todayTrend || 0,
      color: "text-purple-600"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header avec sélection de période */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{t("title")}</h2>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>
        <Tabs value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <TabsList>
            <TabsTrigger value="week">{t("periods.week")}</TabsTrigger>
            <TabsTrigger value="month">{t("periods.month")}</TabsTrigger>
            <TabsTrigger value="year">{t("periods.year")}</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Cartes de gains */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {earningsCards.map((card, index) => {
          const Icon = card.icon;
          const isPositiveTrend = card.trend >= 0;
          
          return (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                <Icon className={`h-4 w-4 ${card.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
                <div className="flex items-center space-x-2 text-xs">
                  <span className="text-muted-foreground">{card.description}</span>
                  {card.trend !== 0 && (
                    <div className={`flex items-center space-x-1 ${isPositiveTrend ? 'text-green-600' : 'text-red-600'}`}>
                      {isPositiveTrend ? (
                        <ArrowUpRight className="h-3 w-3" />
                      ) : (
                        <ArrowDownRight className="h-3 w-3" />
                      )}
                      <span className="font-medium">{Math.abs(card.trend)}%</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Détails des gains */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Répartition mensuelle */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              {t("monthlyBreakdown")}
            </CardTitle>
            <CardDescription>{t("monthlyBreakdownDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {monthlyBreakdown && monthlyBreakdown.categories ? (
                Object.entries(monthlyBreakdown.categories).map(([category, amount]: [string, any]) => (
                  <div key={category} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{t(`categories.${category}`)}</span>
                      <span>{formatCurrency(amount)}</span>
                    </div>
                    <Progress 
                      value={(amount / (monthlyBreakdown.total || 1)) * 100} 
                      className="h-2"
                    />
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">{t("noBreakdownData")}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Paiements récents */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              {t("recentPayouts")}
            </CardTitle>
            <CardDescription>{t("recentPayoutsDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {payouts && payouts.length > 0 ? (
                payouts.map((payout: any) => (
                  <div key={payout.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        payout.status === "COMPLETED" ? "bg-green-500" :
                        payout.status === "PENDING" ? "bg-yellow-500" : "bg-red-500"
                      }`}></div>
                      <div>
                        <p className="text-sm font-medium">{t(`payoutStatus.${payout.status.toLowerCase()}`)}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(payout.createdAt), "dd MMM yyyy", { locale: fr })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{formatCurrency(payout.amount)}</p>
                      <p className="text-xs text-muted-foreground">{payout.method}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Wallet className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">{t("noPayouts")}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Objectifs et performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            {t("earningsGoal")}
          </CardTitle>
          <CardDescription>{t("earningsGoalDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm">{t("monthlyGoal")}</span>
              <span className="text-2xl font-bold">
                {formatCurrency(earnings.monthlyEarnings)} / {formatCurrency(earningsData?.goal || 1000)}€
              </span>
            </div>
            <Progress 
              value={earningsData?.goalProgress || 0} 
              className="h-3"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{earningsData?.goalProgress || 0}% {t("completed")}</span>
              <span>
                {earningsData?.remainingDays || 0} {t("daysLeft")}
              </span>
            </div>

            {(earningsData?.goalProgress || 0) >= 80 && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800">{t("goalAlmostReached")}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Actions rapides */}
      <div className="flex flex-wrap gap-3">
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          {t("actions.downloadReport")}
        </Button>
        <Button variant="outline" size="sm">
          <CreditCard className="h-4 w-4 mr-2" />
          {t("actions.requestPayout")}
        </Button>
        <Button variant="outline" size="sm">
          <Target className="h-4 w-4 mr-2" />
          {t("actions.setGoal")}
        </Button>
      </div>

      {/* Statut */}
      <div className="pt-2 text-center">
        <p className="text-xs text-muted-foreground">
          {earnings.completedTrips} livraisons terminées
        </p>
      </div>
    </div>
  );
}

// Export nommé pour les imports
export { EarningsWidget };
