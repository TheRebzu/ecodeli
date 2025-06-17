"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { 
  Truck, 
  Package, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  TrendingUp, 
  TrendingDown,
  Calendar,
  MapPin
} from "lucide-react";

import { api } from "@/trpc/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils/common";

interface DeliveryStats {
  totalDeliveries: number;
  completedDeliveries: number;
  pendingDeliveries: number;
  inProgressDeliveries: number;
  cancelledDeliveries: number;
  averageDeliveryTime: number; // en minutes
  onTimeDeliveryRate: number; // en pourcentage
  customerSatisfactionRate: number; // en pourcentage
  totalRevenue: number;
  recentDeliveries: Array<{
    id: string;
    deliveryCode: string;
    status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
    clientName: string;
    delivererName?: string;
    createdAt: Date;
    completedAt?: Date;
    estimatedDeliveryTime: number;
    actualDeliveryTime?: number;
  }>;
  monthlyTrend: {
    direction: "up" | "down" | "stable";
    percentage: number;
  };
}

export default function DeliveryStatsWidget() {
  const t = useTranslations("merchant.delivery");

  // Récupérer les statistiques de livraison du commerçant
  const { data: deliveryStats, isLoading } = api.merchant.getDeliveryStats.useQuery();

  // Calculer les pourcentages
  const getCompletionRate = () => {
    if (!deliveryStats || deliveryStats.totalDeliveries === 0) return 0;
    return (deliveryStats.completedDeliveries / deliveryStats.totalDeliveries) * 100;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "text-green-600 bg-green-100";
      case "IN_PROGRESS":
        return "text-blue-600 bg-blue-100";
      case "PENDING":
        return "text-yellow-600 bg-yellow-100";
      case "CANCELLED":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return CheckCircle;
      case "IN_PROGRESS":
        return Truck;
      case "PENDING":
        return Clock;
      case "CANCELLED":
        return AlertCircle;
      default:
        return Package;
    }
  };

  const formatDeliveryTime = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}min` : `${hours}h`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            <Skeleton className="h-6 w-40" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Statistiques principales */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="text-center">
                <Skeleton className="h-8 w-16 mx-auto mb-2" />
                <Skeleton className="h-4 w-20 mx-auto" />
              </div>
            ))}
          </div>

          {/* Taux de réussite */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-12" />
            </div>
            <Skeleton className="h-2 w-full" />
          </div>

          {/* Livraisons récentes */}
          <div className="space-y-3">
            <Skeleton className="h-5 w-40" />
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
                <Skeleton className="h-6 w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!deliveryStats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            {t("title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">{t("noDeliveries")}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" />
            {t("title")}
          </div>
          <Badge variant={deliveryStats.monthlyTrend.direction === "up" ? "default" : "destructive"}>
            {deliveryStats.monthlyTrend.direction === "up" ? (
              <TrendingUp className="h-3 w-3 mr-1" />
            ) : (
              <TrendingDown className="h-3 w-3 mr-1" />
            )}
            {deliveryStats.monthlyTrend.percentage.toFixed(1)}%
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Statistiques principales */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">
              {deliveryStats.totalDeliveries}
            </div>
            <p className="text-sm text-muted-foreground">{t("totalDeliveries")}</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {deliveryStats.completedDeliveries}
            </div>
            <p className="text-sm text-muted-foreground">{t("completed")}</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {deliveryStats.inProgressDeliveries}
            </div>
            <p className="text-sm text-muted-foreground">{t("inProgress")}</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {deliveryStats.pendingDeliveries}
            </div>
            <p className="text-sm text-muted-foreground">{t("pending")}</p>
          </div>
        </div>

        {/* Taux de réussite */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">{t("completionRate")}</span>
            <span className="text-sm text-muted-foreground">
              {getCompletionRate().toFixed(1)}%
            </span>
          </div>
          <Progress value={getCompletionRate()} className="h-2" />
        </div>

        {/* Métriques de performance */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{t("avgDeliveryTime")}</span>
            </div>
            <div className="text-lg font-semibold">
              {formatDeliveryTime(deliveryStats.averageDeliveryTime)}
            </div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{t("onTimeRate")}</span>
            </div>
            <div className="text-lg font-semibold text-green-600">
              {deliveryStats.onTimeDeliveryRate.toFixed(1)}%
            </div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{t("satisfaction")}</span>
            </div>
            <div className="text-lg font-semibold text-blue-600">
              {deliveryStats.customerSatisfactionRate.toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Livraisons récentes */}
        {deliveryStats.recentDeliveries.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {t("recentDeliveries")}
            </h4>
            <div className="space-y-2">
              {deliveryStats.recentDeliveries.slice(0, 5).map((delivery) => {
                const StatusIcon = getStatusIcon(delivery.status);
                return (
                  <div
                    key={delivery.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn("p-2 rounded-full", getStatusColor(delivery.status))}>
                        <StatusIcon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">
                          #{delivery.deliveryCode}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {delivery.clientName}
                          {delivery.delivererName && ` • ${delivery.delivererName}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className={getStatusColor(delivery.status)}>
                        {t(`status.${delivery.status.toLowerCase()}`)}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(delivery.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
