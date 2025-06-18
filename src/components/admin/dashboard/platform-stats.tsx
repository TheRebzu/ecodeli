"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  Users, 
  TruckIcon, 
  Store,
  Wrench,
  Euro,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Activity,
  Package,
  MapPin,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Star,
  Target
} from "lucide-react";
import { api } from "@/trpc/react";
import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function PlatformStats() {
  const t = useTranslations("admin.dashboard.platformStats");
  const [selectedPeriod, setSelectedPeriod] = useState("month");
  
  // Récupération des données
  const { data: platformStats, isLoading } = api.admin.getPlatformStats.useQuery({
    period: selectedPeriod
  });
  const { data: userStats } = api.admin.getUserStats.useQuery();
  const { data: transactionStats } = api.admin.getTransactionStats.useQuery({ period: selectedPeriod });
  const { data: performanceMetrics } = api.admin.getPerformanceMetrics.useQuery();

  if (isLoading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((j) => (
              <Card key={j}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-8 w-16" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-2 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ))}
      </div>
    );
  }

  const mainStats = [
    {
      title: t("totalUsers"),
      value: userStats?.totalUsers || 0,
      icon: Users,
      description: t("activeAccounts"),
      trend: userStats?.userGrowth || 0,
      color: "text-blue-600",
      bgColor: "bg-blue-100"
    },
    {
      title: t("activeDeliverers"),
      value: userStats?.deliverers || 0,
      icon: TruckIcon,
      description: t("verifiedDeliverers"),
      trend: userStats?.delivererGrowth || 0,
      color: "text-green-600",
      bgColor: "bg-green-100"
    },
    {
      title: t("activeMerchants"),
      value: userStats?.merchants || 0,
      icon: Store,
      description: t("registeredMerchants"),
      trend: userStats?.merchantGrowth || 0,
      color: "text-purple-600",
      bgColor: "bg-purple-100"
    },
    {
      title: t("activeProviders"),
      value: userStats?.providers || 0,
      icon: Wrench,
      description: t("serviceProviders"),
      trend: userStats?.providerGrowth || 0,
      color: "text-orange-600",
      bgColor: "bg-orange-100"
    }
  ];

  const revenueStats = [
    {
      title: t("totalRevenue"),
      value: `${transactionStats?.totalRevenue?.toFixed(2) || "0.00"}€`,
      icon: Euro,
      description: t("thisMonth"),
      trend: transactionStats?.revenueTrend || 0,
      color: "text-emerald-600"
    },
    {
      title: t("transactions"),
      value: transactionStats?.transactionCount || 0,
      icon: Activity,
      description: t("completedTransactions"),
      trend: transactionStats?.transactionTrend || 0,
      color: "text-blue-600"
    },
    {
      title: t("averageOrderValue"),
      value: `${transactionStats?.averageOrderValue?.toFixed(2) || "0.00"}€`,
      icon: BarChart3,
      description: t("perTransaction"),
      trend: transactionStats?.aovTrend || 0,
      color: "text-violet-600"
    },
    {
      title: t("commissionEarned"),
      value: `${transactionStats?.commissionEarned?.toFixed(2) || "0.00"}€`,
      icon: Target,
      description: t("platformCommission"),
      trend: transactionStats?.commissionTrend || 0,
      color: "text-indigo-600"
    }
  ];

  const StatusCard = ({ title, value, icon: Icon, description, trend, color, bgColor }: any) => {
    const isPositiveTrend = trend >= 0;
    
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <div className={`w-8 h-8 rounded-lg ${bgColor} flex items-center justify-center`}>
            <Icon className={`h-4 w-4 ${color}`} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{value}</div>
          <div className="flex items-center justify-between text-xs mt-1">
            <span className="text-muted-foreground">{description}</span>
            {trend !== 0 && (
              <div className={`flex items-center space-x-1 ${isPositiveTrend ? 'text-green-600' : 'text-red-600'}`}>
                {isPositiveTrend ? (
                  <ArrowUpRight className="h-3 w-3" />
                ) : (
                  <ArrowDownRight className="h-3 w-3" />
                )}
                <span className="font-medium">{Math.abs(trend)}%</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">{t("title")}</h2>
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

      {/* Statistiques principales des utilisateurs */}
      <div>
        <h3 className="text-lg font-semibold mb-4">{t("userStatistics")}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {mainStats.map((stat, index) => (
            <StatusCard key={index} {...stat} />
          ))}
        </div>
      </div>

      {/* Statistiques financières */}
      <div>
        <h3 className="text-lg font-semibold mb-4">{t("financialMetrics")}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {revenueStats.map((stat, index) => (
            <StatusCard key={index} {...stat} />
          ))}
        </div>
      </div>

      {/* Métriques de performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              {t("platformHealth")}
            </CardTitle>
            <CardDescription>{t("keyPerformanceIndicators")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{t("systemUptime")}</span>
                <span className="font-medium">{performanceMetrics?.uptime || 99.9}%</span>
              </div>
              <Progress value={performanceMetrics?.uptime || 99.9} className="h-2" />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{t("averageResponseTime")}</span>
                <span className="font-medium">{performanceMetrics?.responseTime || 0}ms</span>
              </div>
              <Progress value={Math.min((performanceMetrics?.responseTime || 0) / 10, 100)} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{t("userSatisfaction")}</span>
                <span className="font-medium">{performanceMetrics?.satisfaction || 0}/5</span>
              </div>
              <Progress value={(performanceMetrics?.satisfaction || 0) * 20} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              {t("operationalMetrics")}
            </CardTitle>
            <CardDescription>{t("dailyOperations")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">{t("activeDeliveries")}</p>
                <p className="text-2xl font-bold">{platformStats?.activeDeliveries || 0}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">{t("completedToday")}</p>
                <p className="text-2xl font-bold">{platformStats?.completedToday || 0}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">{t("pendingOrders")}</p>
                <p className="text-2xl font-bold text-orange-600">{platformStats?.pendingOrders || 0}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">{t("issuesReported")}</p>
                <p className="text-2xl font-bold text-red-600">{platformStats?.issuesReported || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alertes et notifications */}
      {platformStats?.alerts && platformStats.alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              {t("systemAlerts")}
            </CardTitle>
            <CardDescription>{t("requiresAttention")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {platformStats.alerts.map((alert: any, index: number) => (
                <div key={index} className="flex items-start space-x-3 p-3 border rounded-lg">
                  <div className={`w-2 h-2 rounded-full mt-2 ${
                    alert.severity === "high" ? "bg-red-500" :
                    alert.severity === "medium" ? "bg-yellow-500" : "bg-blue-500"
                  }`}></div>
                  <div className="flex-1">
                    <h4 className="font-medium">{alert.title}</h4>
                    <p className="text-sm text-muted-foreground">{alert.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(alert.createdAt), "dd MMM yyyy HH:mm", { locale: fr })}
                    </p>
                  </div>
                  <Badge variant={
                    alert.severity === "high" ? "destructive" :
                    alert.severity === "medium" ? "secondary" : "outline"
                  }>
                    {t(`severity.${alert.severity}`)}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Objectifs de la plateforme */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            {t("platformGoals")}
          </CardTitle>
          <CardDescription>{t("monthlyTargets")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">{t("revenueGoal")}</span>
                <span className="text-sm font-medium">
                  {transactionStats?.totalRevenue?.toFixed(0) || 0}€ / {platformStats?.revenueGoal?.toFixed(0) || 50000}€
                </span>
              </div>
              <Progress value={platformStats?.revenueProgress || 0} className="h-2" />
              <p className="text-xs text-muted-foreground">{platformStats?.revenueProgress || 0}% {t("completed")}</p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">{t("userGrowthGoal")}</span>
                <span className="text-sm font-medium">
                  {userStats?.newUsersThisMonth || 0} / {platformStats?.userGrowthGoal || 500}
                </span>
              </div>
              <Progress value={platformStats?.userGrowthProgress || 0} className="h-2" />
              <p className="text-xs text-muted-foreground">{platformStats?.userGrowthProgress || 0}% {t("completed")}</p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">{t("satisfactionGoal")}</span>
                <span className="text-sm font-medium">
                  {performanceMetrics?.satisfaction || 0}/5.0
                </span>
              </div>
              <Progress value={(performanceMetrics?.satisfaction || 0) * 20} className="h-2" />
              <p className="text-xs text-muted-foreground">{((performanceMetrics?.satisfaction || 0) * 20).toFixed(0)}% {t("completed")}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
