"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  TrendingDown,
  Package,
  Euro,
  Calendar,
  Clock,
  Target,
  Award,
  Truck,
  Leaf,
  ShoppingBag,
  CreditCard,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils/common";
import { api } from "@/trpc/react";
import { type DashboardStat } from "@/types/client/dashboard";

// Icon mapping helper
const iconMap = {
  Package,
  Euro,
  Calendar,
  Truck,
  Leaf,
  Award,
  Target,
  Activity,
  ShoppingBag,
  CreditCard,
  BarChart3,
};

interface DashboardStatsWidgetProps {
  className?: string;
}

export function DashboardStatsWidget({ className }: DashboardStatsWidgetProps) {
  const [timeframe, setTimeframe] = useState<"week" | "month" | "year">("month");

  // Récupération des statistiques du dashboard
  const { data: stats, isLoading, error } = api.client.dashboard.getStats.useQuery(
    { timeframe },
    {
      refetchInterval: 60000, // Actualise chaque minute
      staleTime: 30000, // Considère les données comme périmées après 30s
    }
  );

  const getChangeIcon = (changeType: DashboardStat["changeType"]) => {
    switch (changeType) {
      case "increase":
        return ArrowUpRight;
      case "decrease":
        return ArrowDownRight;
      default:
        return Activity;
    }
  };

  const getChangeColor = (changeType: DashboardStat["changeType"]) => {
    switch (changeType) {
      case "increase":
        return "text-green-600";
      case "decrease":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const formatValue = (value: number, unit?: string) => {
    if (unit === "€") return `${value.toFixed(2)}€`;
    if (unit === "kg") return `${value}kg`;
    if (unit === "pts") return `${value} pts`;
    return value.toString();
  };

  const calculateProgress = (value: number, goal?: number) => {
    if (!goal) return 0;
    return Math.min((value / goal) * 100, 100);
  };

  const timeframeOptions = [
    { value: "week", label: "Semaine" },
    { value: "month", label: "Mois" },
    { value: "year", label: "Année" },
  ];

  if (isLoading) {
    return (
      <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4", className)}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                <div className="h-8 bg-slate-200 rounded w-3/4"></div>
                <div className="h-2 bg-slate-200 rounded w-full"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("space-y-6", className)}>
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-red-600">
              <p className="text-sm">Erreur lors du chargement des statistiques</p>
              <p className="text-xs text-gray-500 mt-1">
                Veuillez vérifier votre connexion et réessayer
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!stats || !Array.isArray(stats) || stats.length === 0) {
    return (
      <div className={cn("space-y-6", className)}>
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm">Aucune donnée disponible</p>
              <p className="text-xs mt-1">
                Les statistiques apparaîtront après vos premières activités
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Sélecteur de période */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Statistiques</h3>
        <div className="flex gap-1">
          {timeframeOptions.map((option) => (
            <Button
              key={option.value}
              variant={timeframe === option.value ? "default" : "outline"}
              size="sm"
              onClick={() => setTimeframe(option.value as any)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Grille des statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.isArray(stats) && stats.map((stat) => {
          const ChangeIcon = getChangeIcon(stat.changeType);
          const changeColor = getChangeColor(stat.changeType);
          const IconComponent = iconMap[stat.icon as keyof typeof iconMap] || Package;
          const progress = calculateProgress(stat.value, 0);

          return (
            <Card key={stat.id} className="overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center justify-between space-y-0 pb-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </p>
                  <div className={cn("p-2 rounded-lg", stat.bgColor)}>
                    <IconComponent className={cn("h-4 w-4", stat.color)} />
                  </div>
                </div>
                
                <div className="flex items-baseline justify-between">
                  <div>
                    <div className="text-2xl font-bold">
                      {formatValue(stat.value, stat.unit)}
                    </div>
                    {stat.description && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {stat.description}
                      </p>
                    )}
                  </div>
                  
                  {stat.change !== undefined && (
                    <div className={cn("flex items-center space-x-1", changeColor)}>
                      <ChangeIcon className="h-3 w-3" />
                      <span className="text-xs font-medium">
                        {Math.abs(stat.change)}%
                      </span>
                    </div>
                  )}
                </div>

                {/* Barre de progression pour les objectifs - temporairement désactivée */}
                {false && (
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Objectif</span>
                      <span className="font-medium">
                        {/* Goal formatting */}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {progress.toFixed(0)}% de l'objectif atteint
                    </div>
                  </div>
                )}

                {/* Tendance simplifiée */}
                {stat.trend && stat.trend.length > 0 && (
                  <div className="mt-4 flex items-center space-x-2">
                    <TrendingUp className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      Tendance sur {stat.trend.length} périodes
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Résumé global */}
      <Card className="bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-950 dark:to-green-950">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold mb-2">Résumé du mois</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Total dépensé</div>
                  <div className="font-medium">127,50€</div>
                </div>
                <div>
                  <div className="text-muted-foreground">CO2 économisé</div>
                  <div className="font-medium text-green-600">47,5kg</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Livraisons</div>
                  <div className="font-medium">15 complétées</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Niveau</div>
                  <div className="font-medium">Eco-Citoyen</div>
                </div>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-2">
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                <TrendingUp className="h-3 w-3 mr-1" />
                Excellent mois !
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}