"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Bell,
  RefreshCw,
  AlertCircle,
  Settings,
  TrendingUp,
  MapPin,
  Clock,
  Filter,
  CheckCircle,
  X,
  MessageCircle} from "lucide-react";
import { useRoleProtection } from "@/hooks/auth/use-role-protection";
import { toast } from "sonner";
import { AnnouncementMatchingDisplay } from "@/components/shared/announcements/announcement-matching-display";
import { api } from "@/trpc/react";

// Types pour les matches (adaptés des données réelles)
interface AnnouncementMatch {
  id: string;
  announcement: {
    id: string;
    title: string;
    description: string;
    type: string;
    pickupAddress: string;
    deliveryAddress: string;
    pickupDate?: Date;
    deliveryDate?: Date;
    suggestedPrice: number;
    weight?: number;
    isFragile: boolean;
    needsCooling: boolean;
    client: {
      id: string;
      name: string;
      image?: string;
      rating: number;
      completedDeliveries: number;
    };
  };
  route: {
    id: string;
    title: string;
    departureAddress: string;
    arrivalAddress: string;
    departureDate?: Date;
    arrivalDate?: Date;
    deliverer: {
      id: string;
      name: string;
      image?: string;
      rating: number;
      completedDeliveries: number;
    };
  };
  matching: {
    routeId: string;
    announcementId: string;
    compatibilityScore: number;
    reasons: string[];
    distance: number;
    detourPercentage: number;
    priceEstimate: number;
    estimatedDuration: string;
    matchingPoints: {
      pickup: { latitude: number; longitude: number; address: string };
      delivery: { latitude: number; longitude: number; address: string };
    };
  };
  createdAt: Date;
  notified: boolean;
}

export default function DelivererMatchingPage() {
  useRoleProtection(["DELIVERER"]);
  const t = useTranslations("matching");
  const [enableNotifications, setEnableNotifications] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [minCompatibility, setMinCompatibility] = useState(60);
  const [maxDistance, setMaxDistance] = useState(25);

  // Récupérer les matches via tRPC
  const {
    data: matchingData,
    isLoading,
    error} = api.matching.getDelivererMatches.useQuery({ minCompatibility,
    maxDistance });

  const matches = matchingData?.matches || [];

  // Charger les matches au montage et configurer le rafraîchissement automatique
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        // Le hook tRPC se chargera automatiquement du rafraîchissement
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  // Filtrer les matches selon les critères
  const filteredMatches = matches.filter(
    (match) =>
      match.matching.compatibilityScore >= minCompatibility &&
      match.matching.distance <= maxDistance,
  );

  // Gérer les actions sur les matches
  const handleApply = async (matchId: string) => {
    try {
      // Utiliser l'API tRPC pour postuler
      await api.matching.applyToMatch.mutate({ matchId  });
      toast.success("Candidature envoyée avec succès");
    } catch (error) {
      toast.error("Erreur lors de l'envoi de la candidature");
    }
  };

  const handleReject = async (matchId: string) => {
    try {
      // Utiliser l'API tRPC pour rejeter
      await api.matching.rejectMatch.mutate({ matchId  });
      toast.success("Match rejeté");
    } catch (error) {
      toast.error("Erreur lors du rejet");
    }
  };

  const toggleNotifications = () => {
    setEnableNotifications(!enableNotifications);
    toast.success(
      enableNotifications
        ? "Notifications désactivées"
        : "Notifications activées",
    );
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <RefreshCw className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erreur</AlertTitle>
          <AlertDescription>
            {error.message || "Erreur lors du chargement des correspondances"}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t("title", "Correspondances d'annonces")}
          </h1>
          <p className="text-muted-foreground">
            {t("subtitle") ||
              "Trouvez des livraisons compatibles avec vos trajets planifiés"}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Bell
              className={`h-4 w-4 ${enableNotifications ? "text-blue-600" : "text-gray-400"}`}
            />
            <Switch
              checked={enableNotifications}
              onCheckedChange={toggleNotifications}
              aria-label="Activer les notifications"
            />
          </div>

          <div className="flex items-center gap-2">
            <RefreshCw
              className={`h-4 w-4 ${autoRefresh ? "text-green-600" : "text-gray-400"}`}
            />
            <Switch
              checked={autoRefresh}
              onCheckedChange={setAutoRefresh}
              aria-label="Actualisation automatique"
            />
          </div>
        </div>
      </div>

      {/* Filtres */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Critères de correspondance
          </CardTitle>
          <CardDescription>
            Ajustez les paramètres pour affiner vos correspondances
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <label className="text-sm font-medium">
              Score de compatibilité minimum: {minCompatibility}%
            </label>
            <Slider
              value={[minCompatibility]}
              onValueChange={(value) => setMinCompatibility(value[0])}
              max={100}
              min={0}
              step={5}
              className="mt-2"
            />
          </div>

          <div>
            <label className="text-sm font-medium">
              Distance maximum: {maxDistance} km
            </label>
            <Slider
              value={[maxDistance]}
              onValueChange={(value) => setMaxDistance(value[0])}
              max={50}
              min={5}
              step={5}
              className="mt-2"
            />
          </div>
        </CardContent>
      </Card>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="flex items-center gap-2 p-4">
            <TrendingUp className="h-4 w-4 text-green-600" />
            <div>
              <div className="text-2xl font-bold">{filteredMatches.length}</div>
              <div className="text-xs text-muted-foreground">
                Correspondances
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-2 p-4">
            <MapPin className="h-4 w-4 text-blue-600" />
            <div>
              <div className="text-2xl font-bold">
                {
                  filteredMatches.filter(
                    (m) => m.matching.compatibilityScore >= 80,
                  ).length
                }
              </div>
              <div className="text-xs text-muted-foreground">Score ≥ 80%</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-2 p-4">
            <Clock className="h-4 w-4 text-orange-600" />
            <div>
              <div className="text-2xl font-bold">
                {filteredMatches.filter((m) => !m.notified).length}
              </div>
              <div className="text-xs text-muted-foreground">Nouvelles</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-2 p-4">
            <MessageCircle className="h-4 w-4 text-purple-600" />
            <div>
              <div className="text-2xl font-bold">
                {Math.round(
                  filteredMatches.reduce(
                    (acc, m) => acc + m.matching.compatibilityScore,
                    0,
                  ) / filteredMatches.length,
                ) || 0}
                %
              </div>
              <div className="text-xs text-muted-foreground">Score moyen</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Liste des correspondances */}
      <div className="space-y-4">
        {filteredMatches.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                Aucune correspondance trouvée
              </h3>
              <p className="text-muted-foreground text-center">
                Aucune annonce ne correspond à vos critères actuels.
                <br />
                Essayez d'ajuster les filtres pour voir plus de résultats.
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredMatches.map((match) => (
            <Card key={match.id} className="relative">
              {!match.notified && (
                <div className="absolute top-2 right-2">
                  <Badge
                    variant="secondary"
                    className="bg-blue-100 text-blue-800"
                  >
                    Nouveau
                  </Badge>
                </div>
              )}

              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-2">
                      {match.announcement.title}
                    </h3>
                    <p className="text-muted-foreground mb-2">
                      {match.announcement.description}
                    </p>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {match.matching.distance.toFixed(1)} km
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {match.matching.estimatedDuration}
                      </span>
                      <Badge
                        variant={
                          match.matching.compatibilityScore >= 80
                            ? "default"
                            : "secondary"
                        }
                        className={
                          match.matching.compatibilityScore >= 80
                            ? "bg-green-100 text-green-800"
                            : ""
                        }
                      >
                        {match.matching.compatibilityScore}% compatible
                      </Badge>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-600">
                      {match.matching.priceEstimate}€
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Estimation
                    </div>
                  </div>
                </div>

                <Separator className="my-4" />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <h4 className="font-medium mb-2">Détails du pickup</h4>
                    <p className="text-sm text-muted-foreground">
                      {match.announcement.pickupAddress}
                    </p>
                    {match.announcement.pickupDate && (
                      <p className="text-sm text-muted-foreground">
                        {match.announcement.pickupDate.toLocaleDateString(
                          "fr-FR",
                        )}
                      </p>
                    )}
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">
                      Détails de la livraison
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {match.announcement.deliveryAddress}
                    </p>
                    {match.announcement.deliveryDate && (
                      <p className="text-sm text-muted-foreground">
                        {match.announcement.deliveryDate.toLocaleDateString(
                          "fr-FR",
                        )}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="text-sm">
                      <span className="font-medium">
                        {match.announcement.client.name}
                      </span>
                      <span className="text-muted-foreground ml-2">
                        ⭐ {match.announcement.client.rating} (
                        {match.announcement.client.completedDeliveries}{" "}
                        livraisons)
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReject(match.id)}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Rejeter
                    </Button>
                    <Button size="sm" onClick={() => handleApply(match.id)}>
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Postuler
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
