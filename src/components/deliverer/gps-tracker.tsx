"use client";

import { useState, useEffect } from "react";
import { MapPin, Navigation, Clock, AlertTriangle, CheckCircle2, Play, Pause, Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { useDelivererTracking } from "@/hooks/use-gps-tracking";
import { toast } from "@/components/ui/use-toast";

interface GPSTrackerProps {
  deliveryId: string;
  destination: {
    latitude: number;
    longitude: number;
    address: string;
  };
  onStatusUpdate?: (status: string) => void;
}

function formatDistance(distance: number): string {
  if (distance < 1000) {
    return `${Math.round(distance)} m`;
  }
  return `${(distance / 1000).toFixed(1)} km`;
}

function getAccuracyColor(accuracy: number): string {
  if (accuracy <= 10) return "text-green-600";
  if (accuracy <= 30) return "text-yellow-600";
  return "text-red-600";
}

function getAccuracyLabel(accuracy: number): string {
  if (accuracy <= 10) return "Excellente";
  if (accuracy <= 30) return "Bonne";
  if (accuracy <= 50) return "Moyenne";
  return "Faible";
}

export function GPSTracker({ deliveryId, destination, onStatusUpdate }: GPSTrackerProps) {
  const tracking = useDelivererTracking(deliveryId, destination);
  const [deliveryStatus, setDeliveryStatus] = useState<string>("IN_TRANSIT");

  // Gérer les notifications de proximité
  useEffect(() => {
    if (tracking.isNearDestination && deliveryStatus === "IN_TRANSIT") {
      toast({
        title: "🎯 Destination proche",
        description: "Vous êtes arrivé près de votre destination",
        duration: 5000,
      });
      
      setDeliveryStatus("NEARBY");
      onStatusUpdate?.("NEARBY");
    }
  }, [tracking.isNearDestination, deliveryStatus, onStatusUpdate]);

  // Gérer les erreurs GPS
  useEffect(() => {
    if (tracking.error) {
      toast({
        title: "❌ Erreur GPS",
        description: tracking.error,
        variant: "destructive",
        duration: 5000,
      });
    }
  }, [tracking.error]);

  const handleStatusChange = async (newStatus: string) => {
    setDeliveryStatus(newStatus);
    await tracking.markDeliveryStatus(newStatus);
    onStatusUpdate?.(newStatus);

    toast({
      title: "✅ Statut mis à jour",
      description: `Statut changé vers: ${getStatusLabel(newStatus)}`,
      duration: 3000,
    });
  };

  const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      "PICKED_UP": "Colis récupéré",
      "IN_TRANSIT": "En transit",
      "NEARBY": "À proximité",
      "ARRIVED": "Arrivé",
      "DELIVERED": "Livré"
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      "PICKED_UP": "bg-blue-500",
      "IN_TRANSIT": "bg-purple-500",
      "NEARBY": "bg-amber-500",
      "ARRIVED": "bg-green-500",
      "DELIVERED": "bg-emerald-500"
    };
    return colors[status] || "bg-gray-500";
  };

  return (
    <div className="space-y-4">
      {/* Contrôles de tracking */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Tracking GPS
            </CardTitle>
            <div className="flex gap-2">
              {!tracking.isTracking ? (
                <Button 
                  onClick={tracking.startTracking}
                  disabled={!tracking.isSupported}
                  size="sm"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Démarrer
                </Button>
              ) : (
                <Button 
                  onClick={tracking.stopTracking}
                  variant="outline"
                  size="sm"
                >
                  <Pause className="h-4 w-4 mr-2" />
                  Arrêter
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Statut des permissions */}
          {!tracking.permissions.granted && (
            <Alert variant={tracking.permissions.denied ? "destructive" : "default"}>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {tracking.permissions.denied 
                  ? "Permission de géolocalisation refusée. Veuillez l'activer dans les paramètres de votre navigateur."
                  : "Permission de géolocalisation requise pour le tracking en temps réel."
                }
              </AlertDescription>
            </Alert>
          )}

          {/* Informations de position */}
          {tracking.currentPosition && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">Position actuelle</p>
                <p className="text-xs text-muted-foreground font-mono">
                  {tracking.currentPosition.latitude.toFixed(6)}, {tracking.currentPosition.longitude.toFixed(6)}
                </p>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant="outline" 
                    className={`${getAccuracyColor(tracking.currentPosition.accuracy)}`}
                  >
                    ±{Math.round(tracking.currentPosition.accuracy)}m
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {getAccuracyLabel(tracking.currentPosition.accuracy)}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Vitesse actuelle</p>
                <p className="text-lg font-semibold">
                  {tracking.currentPosition.speed 
                    ? `${Math.round(tracking.currentPosition.speed * 3.6)} km/h`
                    : "0 km/h"
                  }
                </p>
                {tracking.distanceToDestination && (
                  <p className="text-xs text-muted-foreground">
                    Distance: {formatDistance(tracking.distanceToDestination)}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ETA */}
          {tracking.currentETA && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Arrivée estimée</p>
                  <Badge variant={tracking.currentETA.confidence > 70 ? "default" : "secondary"}>
                    {tracking.currentETA.confidence}% confiance
                  </Badge>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-lg font-semibold">
                      {tracking.currentETA.estimatedArrival}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Navigation className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {tracking.currentETA.estimatedMinutes} min
                    </span>
                  </div>
                </div>
                
                {tracking.currentETA.confidence < 50 && (
                  <Alert variant="default">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      ETA peu fiable. Vérifiez votre signal GPS.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Contrôles de statut de livraison */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Statut de livraison
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Statut actuel */}
          <div className="flex items-center gap-3">
            <div className={`h-3 w-3 rounded-full ${getStatusColor(deliveryStatus)}`} />
            <span className="font-medium">{getStatusLabel(deliveryStatus)}</span>
          </div>

          {/* Destination */}
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm font-medium mb-1">Destination</p>
            <p className="text-xs text-muted-foreground">{destination.address}</p>
          </div>

          {/* Actions de statut */}
          <div className="grid grid-cols-2 gap-2">
            {deliveryStatus === "IN_TRANSIT" && tracking.isNearDestination && (
              <Button 
                onClick={() => handleStatusChange("ARRIVED")}
                className="w-full"
                size="sm"
              >
                Marquer comme arrivé
              </Button>
            )}
            
            {deliveryStatus === "ARRIVED" && (
              <Button 
                onClick={() => handleStatusChange("DELIVERED")}
                className="w-full"
                size="sm"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Livraison effectuée
              </Button>
            )}

            <Button 
              onClick={() => tracking.calculateETA()}
              variant="outline"
              className="w-full"
              size="sm"
            >
              Recalculer ETA
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      {tracking.notifications.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Notifications</CardTitle>
              <Button 
                onClick={tracking.clearNotifications}
                variant="ghost" 
                size="sm"
              >
                Effacer
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {tracking.notifications.slice(-3).map((notification, index) => (
                <Alert key={index} variant="default">
                  <AlertDescription className="text-xs">
                    {notification}
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Informations de debug en mode développement */}
      {process.env.NODE_ENV === "development" && tracking.positionHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Debug GPS</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-xs font-mono">
              <p>Historique positions: {tracking.positionHistory.length}</p>
              <p>Précision moyenne: {
                Math.round(
                  tracking.positionHistory.reduce((sum, pos) => sum + pos.accuracy, 0) / 
                  tracking.positionHistory.length
                )
              }m</p>
              <p>Dernière mise à jour: {
                tracking.currentPosition ? 
                new Date(tracking.currentPosition.timestamp).toLocaleTimeString() : 
                "N/A"
              }</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}