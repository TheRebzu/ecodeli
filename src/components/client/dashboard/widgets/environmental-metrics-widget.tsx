"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Leaf, 
  Recycle, 
  Zap, 
  Droplets, 
  TreePine, 
  Award,
  TrendingUp,
  RefreshCw,
  AlertCircle,
  Target,
  BarChart3
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";

interface EnvironmentalMetrics {
  co2Saved: {
    current: number;
    monthly: number;
    yearly: number;
    goal: number;
    unit: "kg";
  };
  ecoScore: {
    current: number;
    level: string;
    nextLevel: string;
    pointsToNext: number;
    maxPoints: number;
  };
  recyclingRate: {
    percentage: number;
    itemsCount: number;
    goal: number;
  };
  energySaved: {
    current: number;
    unit: "kWh";
    equivalent: string;
  };
  waterSaved: {
    current: number;
    unit: "L";
    equivalent: string;
  };
  achievements: Array<{
    id: string;
    title: string;
    description: string;
    icon: string;
    earnedAt: Date;
    category: "eco" | "delivery" | "service";
  }>;
  trends: {
    co2Trend: Array<{ period: string; value: number }>;
    scoreTrend: Array<{ period: string; value: number }>;
  };
}

interface EnvironmentalMetricsWidgetProps {
  className?: string;
}

export function EnvironmentalMetricsWidget({ className }: EnvironmentalMetricsWidgetProps) {
  const [timeframe, setTimeframe] = useState<"week" | "month" | "year">("month");

  // Récupération des vraies données environnementales depuis l'API
  const { data: metrics, isLoading, error, refetch } = useQuery({
    queryKey: ["client-environmental-metrics", timeframe],
    queryFn: async () => {
      const response = await api.client.dashboard.getEnvironmentalMetrics.query({
        timeframe
      });
      return response;
    },
    refetchInterval: 300000, // Actualise toutes les 5 minutes
    staleTime: 60000, // Données périmées après 1 minute
  });

  const getEcoLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case "débutant":
        return "text-gray-600 bg-gray-100";
      case "eco-conscient":
        return "text-green-600 bg-green-100";
      case "eco-citoyen":
        return "text-blue-600 bg-blue-100";
      case "eco-héros":
        return "text-purple-600 bg-purple-100";
      case "eco-champion":
        return "text-yellow-600 bg-yellow-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const formatNumber = (value: number, decimals = 1) => {
    return value.toLocaleString("fr-FR", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  const timeframeOptions = [
    { value: "week", label: "Semaine" },
    { value: "month", label: "Mois" },
    { value: "year", label: "Année" },
  ];

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Leaf className="w-5 h-5" />
            Métriques environnementales
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-center justify-between mb-2">
                  <div className="h-4 bg-slate-200 rounded w-1/3"></div>
                  <div className="h-4 bg-slate-200 rounded w-1/4"></div>
                </div>
                <div className="h-2 bg-slate-200 rounded w-full"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Leaf className="w-5 h-5" />
            Métriques environnementales
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500 opacity-50" />
            <p className="text-sm text-red-600 mb-2">
              Erreur lors du chargement des métriques
            </p>
            <p className="text-xs text-gray-500 mb-4">
              Impossible de récupérer les données environnementales
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="text-xs"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Réessayer
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!metrics) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Leaf className="w-5 h-5" />
            Métriques environnementales
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <TreePine className="w-12 h-12 mx-auto mb-4 text-gray-400 opacity-50" />
            <p className="text-sm text-gray-500 mb-2">
              Aucune donnée environnementale disponible
            </p>
            <p className="text-xs text-gray-400">
              Commencez à utiliser nos services pour voir votre impact écologique
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Leaf className="w-5 h-5 text-green-600" />
            Métriques environnementales
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className={cn("h-3 w-3", isLoading && "animate-spin")} />
          </Button>
        </div>

        {/* Sélecteur de période */}
        <div className="flex gap-1 mt-3">
          {timeframeOptions.map((option) => (
            <Button
              key={option.value}
              variant={timeframe === option.value ? "default" : "outline"}
              size="sm"
              onClick={() => setTimeframe(option.value as any)}
              className="text-xs"
            >
              {option.label}
            </Button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* EcoScore principal */}
        <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Award className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold text-green-800 dark:text-green-200">
              Niveau EcoScore
            </h3>
          </div>
          <div className="text-3xl font-bold text-green-600 mb-1">
            {formatNumber(metrics.ecoScore.current, 0)}
          </div>
          <Badge className={cn("mb-3", getEcoLevelColor(metrics.ecoScore.level))}>
            {metrics.ecoScore.level}
          </Badge>
          
          {/* Progression vers le niveau suivant */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                Vers {metrics.ecoScore.nextLevel}
              </span>
              <span className="font-medium">
                {metrics.ecoScore.pointsToNext} points restants
              </span>
            </div>
            <Progress 
              value={(metrics.ecoScore.current / metrics.ecoScore.maxPoints) * 100} 
              className="h-2"
            />
          </div>
        </div>

        {/* Métriques principales */}
        <div className="grid grid-cols-1 gap-4">
          {/* CO2 économisé */}
          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Leaf className="w-4 h-4 text-green-600" />
                <span className="font-medium">CO2 économisé</span>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-green-600">
                  {formatNumber(metrics.co2Saved.current)} {metrics.co2Saved.unit}
                </div>
                <div className="text-xs text-muted-foreground">
                  ce {timeframe === "week" ? "semaine" : timeframe === "month" ? "mois" : "année"}
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  Objectif {timeframe === "month" ? "mensuel" : "annuel"}
                </span>
                <span className="font-medium">
                  {formatNumber(metrics.co2Saved.goal)} {metrics.co2Saved.unit}
                </span>
              </div>
              <Progress 
                value={(metrics.co2Saved.current / metrics.co2Saved.goal) * 100} 
                className="h-2"
              />
            </div>
          </div>

          {/* Taux de recyclage */}
          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Recycle className="w-4 h-4 text-blue-600" />
                <span className="font-medium">Recyclage</span>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-blue-600">
                  {formatNumber(metrics.recyclingRate.percentage, 0)}%
                </div>
                <div className="text-xs text-muted-foreground">
                  {metrics.recyclingRate.itemsCount} articles
                </div>
              </div>
            </div>
            
            <Progress 
              value={metrics.recyclingRate.percentage} 
              className="h-2"
            />
          </div>

          {/* Énergie économisée */}
          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-600" />
                <span className="font-medium">Énergie économisée</span>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-yellow-600">
                  {formatNumber(metrics.energySaved.current)} {metrics.energySaved.unit}
                </div>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              {metrics.energySaved.equivalent}
            </div>
          </div>

          {/* Eau économisée */}
          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Droplets className="w-4 h-4 text-cyan-600" />
                <span className="font-medium">Eau économisée</span>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-cyan-600">
                  {formatNumber(metrics.waterSaved.current)} {metrics.waterSaved.unit}
                </div>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              {metrics.waterSaved.equivalent}
            </div>
          </div>
        </div>

        {/* Tendances */}
        {metrics.trends && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium text-sm">Tendances</span>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {metrics.trends.co2Trend && metrics.trends.co2Trend.length > 0 && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="text-xs text-muted-foreground mb-2">CO2 économisé</div>
                  <div className="flex items-end gap-1 h-8">
                    {metrics.trends.co2Trend.map((point, index) => {
                      const maxValue = Math.max(...metrics.trends.co2Trend.map(p => p.value));
                      const height = (point.value / maxValue) * 100;
                      
                      return (
                        <div
                          key={point.period}
                          className="flex-1 bg-green-200 rounded-sm relative"
                          style={{ height: `${Math.max(height, 10)}%` }}
                        >
                          <div
                            className="absolute bottom-0 left-0 right-0 bg-green-600 rounded-sm"
                            style={{ height: `${height}%` }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {metrics.trends.scoreTrend && metrics.trends.scoreTrend.length > 0 && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="text-xs text-muted-foreground mb-2">EcoScore</div>
                  <div className="flex items-end gap-1 h-8">
                    {metrics.trends.scoreTrend.map((point, index) => {
                      const maxValue = Math.max(...metrics.trends.scoreTrend.map(p => p.value));
                      const height = (point.value / maxValue) * 100;
                      
                      return (
                        <div
                          key={point.period}
                          className="flex-1 bg-blue-200 rounded-sm relative"
                          style={{ height: `${Math.max(height, 10)}%` }}
                        >
                          <div
                            className="absolute bottom-0 left-0 right-0 bg-blue-600 rounded-sm"
                            style={{ height: `${height}%` }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Réalisations récentes */}
        {metrics.achievements && metrics.achievements.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium text-sm">Réalisations récentes</span>
            </div>
            
            <div className="space-y-2">
              {metrics.achievements.slice(0, 3).map((achievement) => (
                <div
                  key={achievement.id}
                  className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg"
                >
                  <div className="text-lg">{achievement.icon}</div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{achievement.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {achievement.description}
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {achievement.category}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}