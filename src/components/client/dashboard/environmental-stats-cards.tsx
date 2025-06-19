"use client";

import { api } from "@/trpc/react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Globe, Box, Sparkles } from "lucide-react";

// Composant de loading pour les cartes statistiques
const StatCardSkeleton = () => (
  <Card>
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-20" />
        </div>
        <Skeleton className="h-12 w-12 rounded-full" />
      </div>
      <div className="mt-4">
        <Skeleton className="h-6 w-24" />
      </div>
    </CardContent>
  </Card>
);

export function EnvironmentalStatsCards() {
  // Récupérer les métriques environnementales réelles
  const { data: environmentalMetrics, isLoading, error } = 
    api.client.legacyDashboard.getEnvironmentalMetrics.useQuery(undefined, {
      refetchInterval: 60000, // Actualise toutes les minutes
    });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>
    );
  }

  if (error || !environmentalMetrics) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Fallback avec données par défaut en cas d'erreur */}
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  CO2 économisé ce mois
                </p>
                <p className="text-2xl font-bold text-green-600">--</p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
                <Globe className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div className="mt-4">
              <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                Données non disponibles
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Emballages réutilisés
                </p>
                <p className="text-2xl font-bold text-blue-600">--</p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
                <Box className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-4">
              <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                Données non disponibles
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Niveau EcoScore
                </p>
                <p className="text-2xl font-bold text-purple-600">--</p>
              </div>
              <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-full">
                <Sparkles className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <div className="mt-4">
              <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                Données non disponibles
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Formater les valeurs avec les données réelles
  const carbonSavedDisplay = `${environmentalMetrics.carbonSaved}kg`;
  const carbonTrendDisplay = environmentalMetrics.monthlyComparison.carbonSavedDiff >= 0 
    ? `+${Math.round(environmentalMetrics.monthlyComparison.carbonSavedDiff)}%`
    : `${Math.round(environmentalMetrics.monthlyComparison.carbonSavedDiff)}%`;
  const carbonTrendColor = environmentalMetrics.monthlyComparison.carbonSavedDiff >= 0
    ? "bg-green-100 text-green-800"
    : "bg-red-100 text-red-800";

  const packagesReuseDisplay = `${Math.round(environmentalMetrics.reuseRate)}%`;
  const packagesTrendDisplay = environmentalMetrics.monthlyComparison.packagesReusedDiff >= 0 
    ? `+${Math.round(environmentalMetrics.monthlyComparison.packagesReusedDiff)}%`
    : `${Math.round(environmentalMetrics.monthlyComparison.packagesReusedDiff)}%`;
  const packagesTrendColor = environmentalMetrics.monthlyComparison.packagesReusedDiff >= 0
    ? "bg-blue-100 text-blue-800"
    : "bg-red-100 text-red-800";

  const ecoScoreDiff = environmentalMetrics.monthlyComparison.ecoScoreDiff;
  const ecoScoreTrendDisplay = ecoScoreDiff >= 0 
    ? `+${Math.round(ecoScoreDiff)}%`
    : `${Math.round(ecoScoreDiff)}%`;
  const ecoScoreTrendColor = ecoScoreDiff >= 0
    ? "bg-purple-100 text-purple-800"
    : "bg-red-100 text-red-800";

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Carte CO2 économisé */}
      <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                CO2 économisé ce mois
              </p>
              <p className="text-2xl font-bold text-green-600">
                {carbonSavedDisplay}
              </p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
              <Globe className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4">
            <Badge variant="secondary" className={carbonTrendColor}>
              {carbonTrendDisplay} vs mois dernier
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Carte Emballages réutilisés */}
      <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Emballages réutilisés
              </p>
              <p className="text-2xl font-bold text-blue-600">
                {environmentalMetrics.packagesReused}
              </p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
              <Box className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4">
            <Badge variant="secondary" className={packagesTrendColor}>
              {packagesReuseDisplay} de réutilisation
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Carte EcoScore */}
      <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Niveau EcoScore
              </p>
              <p className="text-2xl font-bold text-purple-600">
                {environmentalMetrics.ecoScore}
              </p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-full">
              <Sparkles className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-4">
            <Badge variant="secondary" className={ecoScoreTrendColor}>
              {environmentalMetrics.ecoLevel}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}