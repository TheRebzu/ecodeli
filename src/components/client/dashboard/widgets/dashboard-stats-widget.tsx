"use client";

import { useState, useEffect } from "react";
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

interface DashboardStat {
  id: string;
  title: string;
  value: string | number;
  previousValue?: string | number;
  change?: number;
  changeType: "increase" | "decrease" | "neutral";
  trend: Array<{ period: string; value: number }>;
  unit?: string;
  goal?: number;
  icon: any;
  color: string;
  bgColor: string;
  description?: string;
}

interface DashboardStatsWidgetProps {
  className?: string;
}

export function DashboardStatsWidget({ className }: DashboardStatsWidgetProps) {
  const [timeframe, setTimeframe] = useState<"week" | "month" | "year">("month");

  // Récupérer les statistiques du dashboard
  const {
    data: stats,
    isLoading,
    refetch,
  } = api.client.getDashboardStats.useQuery(
    { timeframe },
    { 
      refetchInterval: 60000, // Actualise chaque minute
      staleTime: 30000, // Considère les données comme périmées après 30s
    }
  );

  // Données simulées en attendant l'API
  const mockStats: DashboardStat[] = [
    {
      id: "deliveries",
      title: "Livraisons",
      value: 15,
      previousValue: 12,
      change: 25,
      changeType: "increase",
      trend: [
        { period: "S1", value: 3 },
        { period: "S2", value: 5 },
        { period: "S3", value: 4 },
        { period: "S4", value: 3 },
      ],
      unit: "livraisons",
      goal: 20,
      icon: Package,
      color: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-950",
      description: "Ce mois-ci",
    },
    {
      id: "spent",
      title: "Dépenses",
      value: 127.50,
      previousValue: 145.20,
      change: -12.2,
      changeType: "decrease",
      trend: [
        { period: "S1", value: 45 },
        { period: "S2", value: 32 },
        { period: "S3", value: 28 },
        { period: "S4", value: 22.5 },
      ],
      unit: "€",
      icon: Euro,
      color: "text-green-600",
      bgColor: "bg-green-50 dark:bg-green-950",
      description: "Économies réalisées",
    },
    {
      id: "co2_saved",
      title: "CO2 économisé",
      value: 47.5,
      previousValue: 32.1,
      change: 48,
      changeType: "increase",
      trend: [
        { period: "S1", value: 8.5 },
        { period: "S2", value: 12.3 },
        { period: "S3", value: 14.2 },
        { period: "S4", value: 12.5 },
      ],
      unit: "kg",
      goal: 100,
      icon: Leaf,
      color: "text-green-600",
      bgColor: "bg-green-50 dark:bg-green-950",
      description: "Impact environnemental",
    },
    {
      id: "eco_score",
      title: "EcoScore",
      value: 875,
      previousValue: 720,
      change: 21.5,
      changeType: "increase",
      trend: [
        { period: "S1", value: 720 },
        { period: "S2", value: 780 },
        { period: "S3", value: 820 },
        { period: "S4", value: 875 },
      ],
      unit: "points",
      goal: 1000,
      icon: Award,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50 dark:bg-yellow-950",
      description: "Niveau Eco-Citoyen",
    },
    {
      id: "services",
      title: "Services utilisés",
      value: 8,
      previousValue: 5,
      change: 60,
      changeType: "increase",
      trend: [
        { period: "S1", value: 2 },
        { period: "S2", value: 3 },
        { period: "S3", value: 2 },
        { period: "S4", value: 1 },
      ],
      unit: "services",
      icon: Calendar,
      color: "text-purple-600",
      bgColor: "bg-purple-50 dark:bg-purple-950",
      description: "Prestations réservées",
    },
    {
      id: "avg_delivery_time",
      title: "Temps moyen",
      value: "1h 23min",
      previousValue: "1h 45min",
      change: -21,
      changeType: "decrease",
      trend: [
        { period: "S1", value: 120 },
        { period: "S2", value: 95 },
        { period: "S3", value: 88 },
        { period: "S4", value: 83 },
      ],
      icon: Clock,
      color: "text-orange-600",
      bgColor: "bg-orange-50 dark:bg-orange-950",
      description: "Livraison plus rapide",
    },
  ];

  const currentStats = stats || mockStats;

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

  const formatValue = (value: string | number, unit?: string) => {
    if (typeof value === "string") return value;
    if (unit === "€") return `${value.toFixed(2)}€`;
    if (unit === "kg") return `${value}kg`;
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

      {/* Grille de statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {currentStats.map((stat) => {
          const Icon = stat.icon;
          const ChangeIcon = getChangeIcon(stat.changeType);
          const progress = typeof stat.value === "number" ? calculateProgress(stat.value, stat.goal) : 0;

          return (
            <Card key={stat.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <CardContent className="p-0">
                {/* En-tête coloré */}
                <div className={cn("p-4", stat.bgColor)}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        {stat.title}
                      </p>
                      <p className="text-2xl font-bold">
                        {formatValue(stat.value, stat.unit)}
                      </p>
                    </div>
                    <div className={cn("p-3 rounded-full bg-background/50", stat.color)}>
                      <Icon className="h-6 w-6" />
                    </div>
                  </div>

                  {/* Changement par rapport à la période précédente */}
                  {stat.change !== undefined && (
                    <div className="flex items-center gap-1 mt-2">
                      <ChangeIcon className={cn("h-4 w-4", getChangeColor(stat.changeType))} />
                      <span className={cn("text-sm font-medium", getChangeColor(stat.changeType))}>
                        {stat.changeType === "decrease" ? "" : "+"}{stat.change}%
                      </span>
                      <span className="text-xs text-muted-foreground">
                        vs période précédente
                      </span>
                    </div>
                  )}
                </div>

                {/* Contenu principal */}
                <div className="p-4 space-y-4">
                  {/* Description */}
                  {stat.description && (
                    <p className="text-xs text-muted-foreground">
                      {stat.description}
                    </p>
                  )}

                  {/* Progression vers l'objectif */}
                  {stat.goal && typeof stat.value === "number" && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span>Objectif: {formatValue(stat.goal, stat.unit)}</span>
                        <span>{progress.toFixed(0)}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>
                  )}

                  {/* Mini graphique de tendance */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Tendance</span>
                      <BarChart3 className="h-3 w-3" />
                    </div>
                    <div className="flex items-end gap-1 h-8">
                      {stat.trend.map((point, index) => {
                        const maxValue = Math.max(...stat.trend.map(p => p.value));
                        const height = (point.value / maxValue) * 100;
                        
                        return (
                          <div
                            key={point.period}
                            className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-sm relative"
                            style={{ height: `${Math.max(height, 10)}%` }}
                          >
                            <div
                              className={cn("absolute bottom-0 left-0 right-0 rounded-sm", stat.color.replace("text-", "bg-"))}
                              style={{ height: `${height}%` }}
                            />
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      {stat.trend.map((point) => (
                        <span key={point.period}>{point.period}</span>
                      ))}
                    </div>
                  </div>
                </div>
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