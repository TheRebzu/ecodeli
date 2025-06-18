"use client";

import React, { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  Route,
  MapPin,
  Clock,
  Fuel,
  Navigation,
  RefreshCw,
  Play,
  Pause,
  CheckCircle,
  AlertCircle,
  Zap,
  Calendar,
  Distance,
  Truck,
} from "lucide-react";

import { api } from "@/trpc/react";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils/common";

interface DeliveryPoint {
  id: string;
  deliveryId: string;
  address: string;
  latitude: number;
  longitude: number;
  clientName: string;
  phoneNumber: string;
  estimatedDuration: number; // en minutes
  priority: "HIGH" | "MEDIUM" | "LOW";
  timeWindow?: {
    start: string;
    end: string;
  };
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
  specialInstructions?: string;
}

interface OptimizedRoute {
  id: string;
  deliveryPoints: DeliveryPoint[];
  totalDistance: number; // en km
  totalDuration: number; // en minutes
  totalFuelCost: number; // en euros
  optimizationScore: number; // pourcentage d'optimisation
  startTime: Date;
  estimatedEndTime: Date;
  status: "DRAFT" | "ACTIVE" | "COMPLETED" | "CANCELLED";
}

export default function RouteOptimization() {
  const t = useTranslations("deliverer.routing");
  const { toast } = useToast();
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<OptimizedRoute | null>(null);

  // Récupérer les livraisons en attente
  const { data: pendingDeliveries, isLoading: isLoadingDeliveries } = 
    api.deliverer.getPendingDeliveries.useQuery();

  // Récupérer les itinéraires optimisés
  const { data: optimizedRoutes, isLoading: isLoadingRoutes, refetch } = 
    api.deliverer.getOptimizedRoutes.useQuery();

  // Mutations pour gérer les itinéraires
  const optimizeRouteMutation = api.deliverer.optimizeRoute.useMutation({
    onSuccess: (data) => {
      toast({
        title: t("routeOptimized"),
        description: t("routeOptimizedDescription"),
      });
      setIsOptimizing(false);
      refetch();
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: t("optimizationError"),
        description: error.message,
      });
      setIsOptimizing(false);
    },
  });

  const startRouteMutation = api.deliverer.startRoute.useMutation({
    onSuccess: () => {
      toast({
        title: t("routeStarted"),
        description: t("routeStartedDescription"),
      });
      refetch();
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: t("error"),
        description: error.message,
      });
    },
  });

  // Optimiser l'itinéraire
  const handleOptimizeRoute = async () => {
    if (!pendingDeliveries || pendingDeliveries.length === 0) {
      toast({
        variant: "destructive",
        title: t("noDeliveries"),
        description: t("noDeliveriesDescription"),
      });
      return;
    }

    setIsOptimizing(true);
    optimizeRouteMutation.mutate({
      deliveryIds: pendingDeliveries.map(d => d.id),
      optimizationCriteria: "DISTANCE_TIME", // ou "TIME", "FUEL"
    });
  };

  // Démarrer un itinéraire
  const handleStartRoute = (routeId: string) => {
    startRouteMutation.mutate({ routeId });
  };

  // Calculer l'économie d'optimisation
  const calculateOptimizationSavings = (route: OptimizedRoute) => {
    const baseDistance = route.deliveryPoints.length * 5; // Distance moyenne sans optimisation
    const savedDistance = baseDistance - route.totalDistance;
    const savedTime = savedDistance * 2; // 2 minutes par km économisé
    const savedFuel = savedDistance * 0.1; // 0.1L par km

    return {
      distance: savedDistance,
      time: savedTime,
      fuel: savedFuel,
      cost: savedFuel * 1.5, // 1.5€ par litre
    };
  };

  // Obtenir la couleur de priorité
  const getPriorityColor = (priority: DeliveryPoint['priority']) => {
    switch (priority) {
      case "HIGH":
        return "bg-red-100 text-red-800";
      case "MEDIUM":
        return "bg-yellow-100 text-yellow-800";
      case "LOW":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Obtenir l'icône de statut
  const getStatusIcon = (status: DeliveryPoint['status']) => {
    switch (status) {
      case "COMPLETED":
        return CheckCircle;
      case "IN_PROGRESS":
        return Play;
      case "FAILED":
        return AlertCircle;
      default:
        return Clock;
    }
  };

  if (isLoadingDeliveries || isLoadingRoutes) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Route className="h-5 w-5" />
              <Skeleton className="h-6 w-48" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Skeleton className="h-10 w-40" />
                <Skeleton className="h-10 w-32" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardContent className="pt-6">
                      <Skeleton className="h-6 w-full mb-2" />
                      <Skeleton className="h-4 w-3/4" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Route className="h-5 w-5 text-primary" />
              {t("title")}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isOptimizing}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                {t("refresh")}
              </Button>
              <Button
                onClick={handleOptimizeRoute}
                disabled={isOptimizing || !pendingDeliveries?.length}
              >
                {isOptimizing ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4 mr-2" />
                )}
                {t("optimize")}
              </Button>
            </div>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {t("description")}
          </p>
        </CardHeader>
        <CardContent>
          {/* Statistiques des livraisons en attente */}
          {pendingDeliveries && pendingDeliveries.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {pendingDeliveries.length}
                </div>
                <p className="text-sm text-muted-foreground">{t("pendingDeliveries")}</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {pendingDeliveries.filter(d => d.priority === "HIGH").length}
                </div>
                <p className="text-sm text-muted-foreground">{t("highPriority")}</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {pendingDeliveries.reduce((sum, d) => sum + d.estimatedDuration, 0)}
                </div>
                <p className="text-sm text-muted-foreground">{t("totalMinutes")}</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {pendingDeliveries.filter(d => d.timeWindow).length}
                </div>
                <p className="text-sm text-muted-foreground">{t("timeConstraints")}</p>
              </div>
            </div>
          )}

          <Separator className="my-6" />

          {/* Itinéraires optimisés */}
          {optimizedRoutes && optimizedRoutes.length > 0 ? (
            <div className="space-y-4">
              <h3 className="font-medium flex items-center gap-2">
                <Navigation className="h-4 w-4" />
                {t("optimizedRoutes")}
              </h3>
              <div className="grid grid-cols-1 gap-4">
                {optimizedRoutes.map((route) => {
                  const savings = calculateOptimizationSavings(route);
                  return (
                    <Card key={route.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h4 className="font-medium">
                              {t("route")} #{route.id.slice(-6)}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              {route.deliveryPoints.length} {t("deliveryPoints")}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={route.status === "ACTIVE" ? "default" : "outline"}>
                              {t(`status.${route.status.toLowerCase()}`)}
                            </Badge>
                            <Badge variant="secondary">
                              {route.optimizationScore}% {t("optimized")}
                            </Badge>
                          </div>
                        </div>

                        {/* Métriques de l'itinéraire */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div className="flex items-center gap-2">
                            <Distance className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium">{route.totalDistance.toFixed(1)} km</div>
                              <div className="text-xs text-green-600">
                                -{savings.distance.toFixed(1)} km
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium">{Math.round(route.totalDuration / 60)}h {route.totalDuration % 60}min</div>
                              <div className="text-xs text-green-600">
                                -{Math.round(savings.time)}min
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Fuel className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium">{route.totalFuelCost.toFixed(2)}€</div>
                              <div className="text-xs text-green-600">
                                -{savings.cost.toFixed(2)}€
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium">
                                {new Date(route.estimatedEndTime).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {t("estimatedEnd")}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Points de livraison */}
                        <div className="space-y-2 mb-4">
                          <h5 className="text-sm font-medium">{t("deliverySequence")}</h5>
                          <div className="space-y-1 max-h-40 overflow-y-auto">
                            {route.deliveryPoints.map((point, index) => {
                              const StatusIcon = getStatusIcon(point.status);
                              return (
                                <div
                                  key={point.id}
                                  className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50"
                                >
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                                      {index + 1}
                                    </div>
                                    <StatusIcon className="h-4 w-4 text-muted-foreground" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm truncate">
                                      {point.clientName}
                                    </p>
                                    <p className="text-xs text-muted-foreground truncate">
                                      {point.address}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Badge size="sm" className={getPriorityColor(point.priority)}>
                                      {t(`priority.${point.priority.toLowerCase()}`)}
                                    </Badge>
                                    {point.timeWindow && (
                                      <Badge variant="outline" size="sm">
                                        <Clock className="h-3 w-3 mr-1" />
                                        {point.timeWindow.start}-{point.timeWindow.end}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          {route.status === "DRAFT" && (
                            <Button
                              size="sm"
                              onClick={() => handleStartRoute(route.id)}
                              disabled={startRouteMutation.isLoading}
                            >
                              <Play className="h-4 w-4 mr-2" />
                              {t("startRoute")}
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedRoute(route)}
                          >
                            <MapPin className="h-4 w-4 mr-2" />
                            {t("viewOnMap")}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Route className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {pendingDeliveries?.length 
                  ? t("noOptimizedRoutes")
                  : t("noDeliveries")
                }
              </p>
              {pendingDeliveries?.length > 0 && (
                <p className="text-sm text-muted-foreground mt-2">
                  {t("clickOptimizeToStart")}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
