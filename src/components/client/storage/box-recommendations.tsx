"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Sparkles,
  Package,
  Clock,
  Euro,
  MapPin,
  TrendingUp,
  Star,
  Lightbulb,
} from "lucide-react";
import { api } from "@/trpc/react";

type RecommendationFilters = {
  warehouseId?: string;
  maxPrice?: number;
  startDate?: Date;
  endDate?: Date;
};

type BoxRecommendationsProps = {
  filters?: RecommendationFilters;
  onBoxSelect?: (boxId: string) => void;
  className?: string;
  maxRecommendations?: number;
};

export function BoxRecommendations({
  filters = {},
  onBoxSelect,
  className = "",
  maxRecommendations = 6,
}: BoxRecommendationsProps) {
  const { data: session } = useSession();
  const [isExpanded, setIsExpanded] = useState(false);

  // Récupération des recommandations
  const {
    data: recommendationsData,
    isLoading,
    error,
  } = api.storage.getBoxRecommendations.useQuery(filters, {
    enabled: !!session?.user?.id,
    refetchOnWindowFocus: false,
  });

  if (!session?.user?.id) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <p className="text-muted-foreground">
            Connectez-vous pour voir vos recommandations
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
            <Sparkles className="h-5 w-5 text-primary" />
            Recommandations personnalisées
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <LoadingSpinner />
        </CardContent>
      </Card>
    );
  }

  if (error || !recommendationsData) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Recommandations personnalisées
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={Package}
            title="Erreur de chargement"
            description="Impossible de charger les recommandations pour le moment."
          />
        </CardContent>
      </Card>
    );
  }

  const { recommendations, preferences, total } = recommendationsData;

  const displayedRecommendations = isExpanded
    ? recommendations
    : recommendations.slice(0, maxRecommendations);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* En-tête avec préférences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Recommandations personnalisées
          </CardTitle>
          <CardDescription>
            Basées sur votre historique et vos préférences d'utilisation
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Insights sur les préférences */}
          {preferences && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                <span className="font-medium">Vos préférences détectées :</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                {preferences.preferredBoxTypes?.length > 0 && (
                  <div>
                    <p className="font-medium mb-1">Types favoris</p>
                    <div className="flex flex-wrap gap-1">
                      {preferences.preferredBoxTypes
                        .slice(0, 2)
                        .map((type, index) => (
                          <Badge
                            key={index}
                            variant="secondary"
                            className="text-xs"
                          >
                            {type}
                          </Badge>
                        ))}
                    </div>
                  </div>
                )}

                {preferences.preferredSizeRange && (
                  <div>
                    <p className="font-medium mb-1">Taille préférée</p>
                    <p className="text-muted-foreground">
                      {Math.round(preferences.preferredSizeRange.min)}m² -{" "}
                      {Math.round(preferences.preferredSizeRange.max)}m²
                    </p>
                  </div>
                )}

                {preferences.averageReservationDuration && (
                  <div>
                    <p className="font-medium mb-1">Durée moyenne</p>
                    <p className="text-muted-foreground">
                      {preferences.averageReservationDuration} jours
                    </p>
                  </div>
                )}
              </div>

              <Separator />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Liste des recommandations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Box recommandées
            </span>
            <Badge variant="outline">
              {total} suggestion{total > 1 ? "s" : ""}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recommendations.length === 0 ? (
            <EmptyState
              icon={Package}
              title="Aucune recommandation"
              description="Nous n'avons pas trouvé de box correspondant à vos critères pour le moment."
            />
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {displayedRecommendations.map((box, index) => (
                  <div
                    key={box.id}
                    className="p-4 border rounded-lg hover:border-primary/50 transition-colors cursor-pointer"
                    onClick={() => onBoxSelect?.(box.id)}
                  >
                    {/* Badge de recommandation */}
                    {index < 3 && (
                      <div className="flex items-center gap-1 mb-2">
                        <Star className="h-3 w-3 text-amber-500 fill-current" />
                        <span className="text-xs font-medium text-amber-600">
                          Top {index + 1}
                        </span>
                      </div>
                    )}

                    {/* Informations de la box */}
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="font-semibold">{box.name}</h4>
                      <Badge variant="outline" className="text-xs">
                        {box.boxType}
                      </Badge>
                    </div>

                    {/* Détails */}
                    <div className="space-y-2 text-sm text-muted-foreground mb-3">
                      <div className="flex items-center justify-between">
                        <span>Taille: {box.size}m²</span>
                        <div className="flex items-center gap-1">
                          <Euro className="h-3 w-3" />
                          <span className="font-medium">
                            {box.pricePerDay}€/jour
                          </span>
                        </div>
                      </div>

                      {box.warehouse && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          <span>{box.warehouse.name}</span>
                        </div>
                      )}
                    </div>

                    {/* Caractéristiques */}
                    {box.features && box.features.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {box.features.slice(0, 3).map((feature, idx) => (
                          <Badge
                            key={idx}
                            variant="secondary"
                            className="text-xs"
                          >
                            {feature}
                          </Badge>
                        ))}
                        {box.features.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{box.features.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Pourquoi recommandé */}
                    <div className="bg-muted/50 p-2 rounded text-xs mb-3">
                      <div className="flex items-center gap-1 mb-1">
                        <TrendingUp className="h-3 w-3 text-primary" />
                        <span className="font-medium">
                          Pourquoi cette box ?
                        </span>
                      </div>
                      <p className="text-muted-foreground">
                        {index === 0 &&
                          "Correspond parfaitement à vos préférences habituelles"}
                        {index === 1 &&
                          "Excellent rapport qualité-prix selon votre historique"}
                        {index === 2 &&
                          "Emplacement privilégié basé sur vos précédentes réservations"}
                        {index > 2 &&
                          "Box similaire à celles que vous avez déjà utilisées"}
                      </p>
                    </div>

                    <Button
                      size="sm"
                      className="w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        onBoxSelect?.(box.id);
                      }}
                    >
                      Sélectionner cette box
                    </Button>
                  </div>
                ))}
              </div>

              {/* Bouton voir plus */}
              {!isExpanded && recommendations.length > maxRecommendations && (
                <div className="text-center">
                  <Button variant="outline" onClick={() => setIsExpanded(true)}>
                    Voir {recommendations.length - maxRecommendations} autres
                    suggestions
                  </Button>
                </div>
              )}

              {isExpanded && recommendations.length > maxRecommendations && (
                <div className="text-center">
                  <Button
                    variant="outline"
                    onClick={() => setIsExpanded(false)}
                  >
                    Voir moins
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
