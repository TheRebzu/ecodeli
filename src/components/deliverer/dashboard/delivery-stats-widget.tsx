"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Package, 
  TrendingUp, 
  Clock, 
  CheckCircle,
  MapPin,
  Euro,
  Star,
  Target,
  Calendar
} from "lucide-react";
import { api } from "@/trpc/react";
import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";

export default function DeliveryStatsWidget() {
  const t = useTranslations("dashboard.deliverer.stats");
  
  // Récupération des vraies statistiques de livraison
  const { data: stats, isLoading, error } = api.deliverer.getDeliveryStats.useQuery();
  const { data: weeklyProgress } = api.deliverer.getWeeklyProgress.useQuery();
  const { data: recentDeliveries } = api.deliverer.getRecentDeliveries.useQuery({ limit: 3 });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
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
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-destructive">{t("error")}</p>
        </CardContent>
      </Card>
    );
  }

  const statCards = [
    {
      title: t("totalDeliveries"),
      value: stats?.totalDeliveries || 0,
      icon: Package,
      description: t("deliveriesDesc"),
      trend: stats?.deliveriesTrend || 0,
      color: "text-blue-600"
    },
    {
      title: t("completionRate"),
      value: `${stats?.completionRate || 0}%`,
      icon: CheckCircle,
      description: t("completionDesc"),
      trend: stats?.completionTrend || 0,
      color: "text-green-600"
    },
    {
      title: t("averageRating"),
      value: stats?.averageRating?.toFixed(1) || "0.0",
      icon: Star,
      description: t("ratingDesc"),
      trend: stats?.ratingTrend || 0,
      color: "text-yellow-600"
    },
    {
      title: t("totalEarnings"),
      value: `${stats?.totalEarnings?.toFixed(2) || "0.00"}€`,
      icon: Euro,
      description: t("earningsDesc"),
      trend: stats?.earningsTrend || 0,
      color: "text-purple-600"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Cartes de statistiques principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          const isPositiveTrend = stat.trend >= 0;
          
          return (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                  <span>{stat.description}</span>
                  {stat.trend !== 0 && (
                    <Badge 
                      variant={isPositiveTrend ? "default" : "destructive"}
                      className="text-xs"
                    >
                      {isPositiveTrend ? "+" : ""}{stat.trend}%
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Statistiques détaillées */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Progression hebdomadaire */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              {t("weeklyProgress")}
            </CardTitle>
            <CardDescription>{t("weeklyProgressDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm">{t("thisWeek")}</span>
                <span className="text-2xl font-bold">
                  {weeklyProgress?.completed || 0}/{weeklyProgress?.target || 0}
                </span>
              </div>
              <Progress 
                value={weeklyProgress?.progressPercentage || 0} 
                className="h-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{t("target")}: {weeklyProgress?.target || 0} {t("deliveries")}</span>
                <span>{weeklyProgress?.progressPercentage || 0}% {t("completed")}</span>
              </div>
              
              {weeklyProgress?.daysLeft && weeklyProgress.daysLeft > 0 && (
                <div className="text-sm text-muted-foreground">
                  {t("daysLeft", { days: weeklyProgress.daysLeft })}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Livraisons récentes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              {t("recentDeliveries")}
            </CardTitle>
            <CardDescription>{t("recentDeliveriesDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentDeliveries && recentDeliveries.length > 0 ? (
                recentDeliveries.map((delivery: any) => (
                  <div key={delivery.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <div>
                        <p className="text-sm font-medium">{delivery.announcement?.title || t("delivery")}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          <span>{delivery.announcement?.deliveryAddress}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{delivery.price?.toFixed(2)}€</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(delivery.completedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {t("noRecentDeliveries")}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Objectifs et performances */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Distance parcourue */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              {t("distanceTraveled")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.totalDistance?.toFixed(1) || "0.0"} km
            </div>
            <p className="text-xs text-muted-foreground">
              {t("thisMonth")}
            </p>
          </CardContent>
        </Card>

        {/* Temps moyen de livraison */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              {t("averageDeliveryTime")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.averageDeliveryTime || 0} min
            </div>
            <p className="text-xs text-muted-foreground">
              {t("averageTime")}
            </p>
          </CardContent>
        </Card>

        {/* Prochaine livraison */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {t("nextDelivery")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.nextDelivery ? (
              <div>
                <div className="text-lg font-bold">
                  {new Date(stats.nextDelivery.scheduledAt).toLocaleTimeString('fr-FR', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats.nextDelivery.address}
                </p>
              </div>
            ) : (
              <div>
                <div className="text-lg font-bold">{t("noScheduled")}</div>
                <p className="text-xs text-muted-foreground">{t("noScheduledDesc")}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Zone de performance */}
      {stats?.performanceLevel && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              {t("performanceLevel")}
            </CardTitle>
            <CardDescription>{t("performanceDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${
                  stats.performanceLevel === "EXCELLENT" ? "bg-green-500" :
                  stats.performanceLevel === "GOOD" ? "bg-blue-500" :
                  stats.performanceLevel === "AVERAGE" ? "bg-yellow-500" : "bg-red-500"
                }`}></div>
                <span className="font-medium">
                  {t(`performance.${stats.performanceLevel.toLowerCase()}`)}
                </span>
              </div>
              <Badge variant="outline">
                {stats.performanceScore}/100
              </Badge>
            </div>
            <Progress 
              value={stats.performanceScore} 
              className="mt-3 h-2"
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
