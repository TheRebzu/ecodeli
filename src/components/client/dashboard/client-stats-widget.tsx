"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Package, 
  TrendingUp, 
  Calendar, 
  MapPin, 
  CreditCard, 
  Star,
  Clock,
  CheckCircle
} from "lucide-react";
import { api } from "@/trpc/react";
import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";

export default function ClientStatsWidget() {
  const t = useTranslations("dashboard.client.stats");
  
  // Récupération des vraies statistiques client
  const { data: stats, isLoading, error } = api.client.getStats.useQuery();
  const { data: recentDeliveries } = api.client.getRecentDeliveries.useQuery({ limit: 3 });
  const { data: monthlySpending } = api.client.getMonthlySpending.useQuery();

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
      title: t("activeAnnouncements"),
      value: stats?.activeAnnouncements || 0,
      icon: TrendingUp,
      description: t("announcementsDesc"),
      trend: stats?.announcementsTrend || 0,
      color: "text-green-600"
    },
    {
      title: t("serviceBookings"),
      value: stats?.serviceBookings || 0,
      icon: Calendar,
      description: t("bookingsDesc"),
      trend: stats?.bookingsTrend || 0,
      color: "text-purple-600"
    },
    {
      title: t("storageBoxes"),
      value: stats?.storageBoxes || 0,
      icon: MapPin,
      description: t("storageDesc"),
      trend: stats?.storageTrend || 0,
      color: "text-orange-600"
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
        {/* Dépenses mensuelles */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              {t("monthlySpending")}
            </CardTitle>
            <CardDescription>{t("monthlySpendingDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm">{t("currentMonth")}</span>
                <span className="text-2xl font-bold">
                  {monthlySpending?.current?.toFixed(2) || "0.00"}€
                </span>
              </div>
              <Progress 
                value={monthlySpending?.percentageOfBudget || 0} 
                className="h-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{t("budget")}: {monthlySpending?.budget?.toFixed(2) || "0.00"}€</span>
                <span>{monthlySpending?.percentageOfBudget || 0}% utilisé</span>
              </div>
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
                  <div key={delivery.id} className="flex items-center justify-between p-2 border rounded">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <div>
                        <p className="text-sm font-medium">{delivery.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(delivery.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline">{delivery.status}</Badge>
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

      {/* Note de satisfaction */}
      {stats?.averageRating && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              {t("satisfactionRating")}
            </CardTitle>
            <CardDescription>{t("satisfactionDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-5 w-5 ${
                      star <= (stats.averageRating || 0)
                        ? "text-yellow-400 fill-current"
                        : "text-gray-300"
                    }`}
                  />
                ))}
                <span className="text-lg font-semibold">
                  {stats.averageRating.toFixed(1)}/5
                </span>
              </div>
              <Badge variant="secondary">
                {stats.totalRatings} {t("reviews")}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
