"use client";

import { useSession } from "next-auth/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { EmptyState } from "@/components/ui/empty-state";
import {
  BarChart3,
  Calendar,
  Euro,
  Package,
  Leaf,
  Award,
  TrendingUp,
  Clock,
  MapPin,
  Target} from "lucide-react";
import { api } from "@/trpc/react";

type ClientStorageStatsProps = {
  className?: string;
  showDetails?: boolean;
};

export function ClientStorageStats({
  className = "",
  showDetails = true}: ClientStorageStatsProps) {
  const { data } = useSession();

  // Récupération des statistiques
  const {
    data: stats,
    isLoading,
    error} = api.storage.getMyStorageStats.useQuery(undefined, {
    enabled: !!session?.user?.id,
    refetchOnWindowFocus: false});

  if (!session?.user?.id) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <p className="text-muted-foreground">
            Connectez-vous pour voir vos statistiques
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Mes statistiques de stockage
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <LoadingSpinner />
        </CardContent>
      </Card>
    );
  }

  if (error || !stats) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Mes statistiques de stockage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={BarChart3}
            title="Erreur de chargement"
            description="Impossible de charger vos statistiques pour le moment."
          />
        </CardContent>
      </Card>
    );
  }

  // Calcul du niveau d'expérience
  const getExperienceLevel = (totalReservations: number) => {
    if (totalReservations >= 50)
      return { level: "Expert", color: "text-purple-600", badge: "purple" };
    if (totalReservations >= 20)
      return { level: "Avancé", color: "text-blue-600", badge: "blue" };
    if (totalReservations >= 10)
      return { level: "Régulier", color: "text-green-600", badge: "green" };
    if (totalReservations >= 5)
      return {
        level: "Intermédiaire",
        color: "text-yellow-600",
        badge: "yellow"};
    return { level: "Débutant", color: "text-gray-600", badge: "gray" };
  };

  const experienceLevel = getExperienceLevel(stats.totalReservations);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Vue d'ensemble */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Mes statistiques de stockage
          </CardTitle>
          <CardDescription>
            Votre activité et impact environnemental
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Réservations totales */}
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Package className="h-8 w-8 text-primary" />
              </div>
              <div className="text-2xl font-bold">
                {stats.totalReservations}
              </div>
              <div className="text-sm text-muted-foreground">Réservations</div>
            </div>

            {/* Jours utilisés */}
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Calendar className="h-8 w-8 text-blue-500" />
              </div>
              <div className="text-2xl font-bold">{stats.totalDaysUsed}</div>
              <div className="text-sm text-muted-foreground">
                Jours utilisés
              </div>
            </div>

            {/* Dépenses totales */}
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Euro className="h-8 w-8 text-green-500" />
              </div>
              <div className="text-2xl font-bold">
                {stats.totalSpent.toFixed(0)}€
              </div>
              <div className="text-sm text-muted-foreground">Dépensés</div>
            </div>

            {/* Niveau */}
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Award className={`h-8 w-8 ${experienceLevel.color}`} />
              </div>
              <div className="text-2xl font-bold">{experienceLevel.level}</div>
              <div className="text-sm text-muted-foreground">Niveau</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {showDetails && (
        <>
          {/* Impact environnemental */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Leaf className="h-5 w-5 text-green-600" />
                Impact environnemental
              </CardTitle>
              <CardDescription>
                Votre contribution à la durabilité
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* CO2 économisé */}
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-3xl font-bold text-green-600 mb-1">
                    {stats.sustainability.co2Saved.toFixed(1)}kg
                  </div>
                  <div className="text-sm text-green-700 mb-2">
                    CO₂ économisé
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Équivalent à{" "}
                    {Math.round(stats.sustainability.co2Saved / 2.3)} km en
                    voiture
                  </div>
                </div>

                {/* Déchets évités */}
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-3xl font-bold text-blue-600 mb-1">
                    {stats.sustainability.wasteReduced.toFixed(1)}kg
                  </div>
                  <div className="text-sm text-blue-700 mb-2">
                    Déchets évités
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Emballages réutilisés grâce au stockage
                  </div>
                </div>

                {/* Score durabilité */}
                <div className="text-center p-4 bg-amber-50 rounded-lg">
                  <div className="text-3xl font-bold text-amber-600 mb-1">
                    {stats.sustainability.sustainabilityScore}/100
                  </div>
                  <div className="text-sm text-amber-700 mb-2">Score éco</div>
                  <Progress
                    value={stats.sustainability.sustainabilityScore}
                    className="w-full mt-2"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Réservations actives */}
          {stats.activeReservations > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-orange-500" />
                  Réservations en cours
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold">
                      {stats.activeReservations}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Box actuellement réservée
                      {stats.activeReservations > 1 ? "s" : ""}
                    </div>
                  </div>
                  <Badge variant="secondary">En cours</Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Box favorites */}
          {stats.favoriteBoxes && stats.favoriteBoxes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-purple-500" />
                  Vos box favorites
                </CardTitle>
                <CardDescription>
                  Les box que vous utilisez le plus souvent
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats.favoriteBoxes.slice(0, 3).map((favorite, index) => (
                    <div
                      key={favorite.box?.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-sm font-bold">
                          #{index + 1}
                        </div>
                        <div>
                          <div className="font-medium">
                            {favorite.box?.name}
                          </div>
                          <div className="text-sm text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {favorite.box?.warehouse?.name}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">
                          {favorite.usageCount} fois
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {favorite.box?.boxType}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Métriques avancées */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-indigo-500" />
                Métriques avancées
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">
                      Valeur moyenne par réservation
                    </span>
                    <Euro className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="text-2xl font-bold">
                    {stats.averageReservationValue.toFixed(0)}€
                  </div>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">
                      Réservations terminées
                    </span>
                    <Package className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="text-2xl font-bold">
                    {stats.completedReservations}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {stats.totalReservations > 0
                      ? Math.round(
                          (stats.completedReservations /
                            stats.totalReservations) *
                            100,
                        )
                      : 0}
                    % de succès
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
