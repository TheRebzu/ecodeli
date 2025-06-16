"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Leaf,
  TreePine,
  Recycle,
  TrendingUp,
  TrendingDown,
  Award,
  Target,
  Calendar,
  BarChart3,
  Zap,
  Globe,
  Heart,
} from "lucide-react";
import { cn } from "@/lib/utils/common";
import { api } from "@/trpc/react";

interface EnvironmentalMetrics {
  co2Saved: number;
  co2Goal: number;
  packagingReused: number;
  totalDeliveries: number;
  ecoScore: number;
  currentLevel: string;
  nextLevel: string;
  pointsToNextLevel: number;
  monthlyProgress: Array<{
    month: string;
    co2Saved: number;
    deliveries: number;
  }>;
  achievements: Array<{
    id: string;
    title: string;
    description: string;
    unlockedAt: Date;
    icon: string;
  }>;
  comparisonData: {
    traditionalCo2: number;
    ecoDeliCo2: number;
    savings: number;
    savingsPercentage: number;
  };
}

interface EnvironmentalMetricsWidgetProps {
  className?: string;
}

export function EnvironmentalMetricsWidget({ className }: EnvironmentalMetricsWidgetProps) {
  const [activeTab, setActiveTab] = useState("overview");
  
  // Récupérer les métriques environnementales
  const { 
    data: metrics, 
    isLoading,
    error 
  } = api.client.getEnvironmentalMetrics.useQuery();

  // Données simulées en attendant l'API
  const mockMetrics: EnvironmentalMetrics = {
    co2Saved: 47.5,
    co2Goal: 100,
    packagingReused: 23,
    totalDeliveries: 15,
    ecoScore: 875,
    currentLevel: "Eco-Citoyen",
    nextLevel: "Champion Durable",
    pointsToNextLevel: 125,
    monthlyProgress: [
      { month: "Jan", co2Saved: 12.3, deliveries: 4 },
      { month: "Fév", co2Saved: 18.7, deliveries: 6 },
      { month: "Mar", co2Saved: 16.5, deliveries: 5 },
    ],
    achievements: [
      {
        id: "1",
        title: "Premier pas",
        description: "Première livraison écologique",
        unlockedAt: new Date("2024-01-15"),
        icon: "🌱",
      },
      {
        id: "2", 
        title: "Eco-Warrior",
        description: "10 livraisons éco-responsables",
        unlockedAt: new Date("2024-02-20"),
        icon: "🏆",
      },
    ],
    comparisonData: {
      traditionalCo2: 120,
      ecoDeliCo2: 47.5,
      savings: 72.5,
      savingsPercentage: 60.4,
    },
  };

  const activeMetrics = metrics || mockMetrics;
  const co2Progress = (activeMetrics.co2Saved / activeMetrics.co2Goal) * 100;
  const levelProgress = ((1000 - activeMetrics.pointsToNextLevel) / 1000) * 100;

  const getEcoScoreColor = (score: number) => {
    if (score >= 800) return "text-green-600";
    if (score >= 600) return "text-yellow-600";
    return "text-orange-600";
  };

  const getEcoScoreBadge = (level: string) => {
    const colors = {
      "Débutant Vert": "bg-green-100 text-green-800",
      "Eco-Citoyen": "bg-blue-100 text-blue-800", 
      "Champion Durable": "bg-purple-100 text-purple-800",
      "EcoWarrior": "bg-yellow-100 text-yellow-800",
    };
    return colors[level as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-slate-200 rounded w-1/2"></div>
            <div className="h-32 bg-slate-200 rounded"></div>
            <div className="h-4 bg-slate-200 rounded w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950 dark:to-blue-950">
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-green-600" />
          Impact Environnemental
          <Badge variant="secondary" className="ml-auto">
            <Heart className="h-3 w-3 mr-1" />
            {activeMetrics.ecoScore} pts
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="p-0">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="progress">Progression</TabsTrigger>
            <TabsTrigger value="achievements">Succès</TabsTrigger>
          </TabsList>

          <div className="p-6">
            <TabsContent value="overview" className="space-y-6 mt-0">
              {/* Niveau actuel et progression */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">Niveau actuel</h3>
                    <Badge className={getEcoScoreBadge(activeMetrics.currentLevel)}>
                      {activeMetrics.currentLevel}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">Prochain niveau</div>
                    <div className="font-medium">{activeMetrics.nextLevel}</div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progression vers {activeMetrics.nextLevel}</span>
                    <span>{activeMetrics.pointsToNextLevel} pts restants</span>
                  </div>
                  <Progress value={levelProgress} className="h-2" />
                </div>
              </div>

              {/* Métriques principales */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Leaf className="h-4 w-4" />
                    CO2 économisé
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-green-600">
                        {activeMetrics.co2Saved}
                      </span>
                      <span className="text-sm text-muted-foreground">kg</span>
                    </div>
                    <Progress value={co2Progress} className="h-2" />
                    <div className="text-xs text-muted-foreground">
                      Objectif: {activeMetrics.co2Goal}kg
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Recycle className="h-4 w-4" />
                    Emballages réutilisés
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-blue-600">
                        {activeMetrics.packagingReused}
                      </span>
                      <span className="text-sm text-muted-foreground">unités</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Sur {activeMetrics.totalDeliveries} livraisons
                    </div>
                  </div>
                </div>
              </div>

              {/* Comparaison traditionnelle vs EcoDeli */}
              <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Impact vs livraison traditionnelle
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Livraison traditionnelle</span>
                    <span className="text-red-600 font-medium">
                      {activeMetrics.comparisonData.traditionalCo2}kg CO2
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Avec EcoDeli</span>
                    <span className="text-green-600 font-medium">
                      {activeMetrics.comparisonData.ecoDeliCo2}kg CO2
                    </span>
                  </div>
                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Économie réalisée</span>
                      <div className="flex items-center gap-2">
                        <TrendingDown className="h-4 w-4 text-green-600" />
                        <span className="text-green-600 font-bold">
                          -{activeMetrics.comparisonData.savingsPercentage}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="progress" className="space-y-6 mt-0">
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Évolution mensuelle
                </h3>
                
                <div className="space-y-3">
                  {activeMetrics.monthlyProgress.map((month, index) => (
                    <div key={month.month} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                      <div>
                        <div className="font-medium">{month.month}</div>
                        <div className="text-sm text-muted-foreground">
                          {month.deliveries} livraisons
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-green-600">
                          {month.co2Saved}kg CO2
                        </div>
                        <div className="text-xs text-muted-foreground">
                          économisés
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="h-4 w-4 text-blue-600" />
                    <span className="font-medium">Objectif du mois</span>
                  </div>
                  <div className="text-sm text-muted-foreground mb-2">
                    Économiser 25kg de CO2 supplémentaires
                  </div>
                  <Progress value={65} className="h-2" />
                  <div className="text-xs text-muted-foreground mt-1">
                    65% de l'objectif atteint
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="achievements" className="space-y-6 mt-0">
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Award className="h-4 w-4" />
                  Succès débloqués
                </h3>
                
                <div className="space-y-3">
                  {activeMetrics.achievements.map((achievement) => (
                    <div key={achievement.id} className="flex items-start gap-3 p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                      <div className="text-2xl">{achievement.icon}</div>
                      <div className="flex-1">
                        <div className="font-medium">{achievement.title}</div>
                        <div className="text-sm text-muted-foreground">
                          {achievement.description}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Débloqué le {achievement.unlockedAt.toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="h-4 w-4 text-purple-600" />
                    <span className="font-medium">Prochain succès</span>
                  </div>
                  <div className="text-sm mb-2">
                    <strong>Eco-Master</strong> - Économiser 100kg de CO2
                  </div>
                  <Progress value={47} className="h-2" />
                  <div className="text-xs text-muted-foreground mt-1">
                    47/100kg - Plus que 53kg !
                  </div>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
}