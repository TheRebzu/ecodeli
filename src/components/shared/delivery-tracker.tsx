"use client";

import { useState, useEffect, useRef } from "react";
import { MapPin, Navigation, Clock, Truck, Phone, MessageCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useDeliveryUpdates, useSocket } from "@/components/providers/socket-provider";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface DeliveryTrackerProps {
  deliveryId: string;
  initialData?: {
    status: string;
    pickupAddress: string;
    deliveryAddress: string;
    delivererName?: string;
    delivererPhone?: string;
    estimatedArrival?: string;
  };
}

interface LocationUpdate {
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
  timestamp: string;
}

const STATUS_STEPS = [
  { key: "CREATED", label: "Annonce créée", progress: 10 },
  { key: "ASSIGNED", label: "Livreur assigné", progress: 25 },
  { key: "PICKED_UP", label: "Colis récupéré", progress: 40 },
  { key: "IN_TRANSIT", label: "En transit", progress: 60 },
  { key: "NEARBY", label: "À proximité", progress: 80 },
  { key: "ARRIVED", label: "Arrivé", progress: 90 },
  { key: "DELIVERED", label: "Livré", progress: 100 },
];

function getStatusColor(status: string): string {
  switch (status) {
    case "CREATED":
      return "bg-gray-500";
    case "ASSIGNED":
      return "bg-blue-500";
    case "PICKED_UP":
      return "bg-orange-500";
    case "IN_TRANSIT":
      return "bg-purple-500";
    case "NEARBY":
      return "bg-amber-500";
    case "ARRIVED":
      return "bg-green-500";
    case "DELIVERED":
      return "bg-emerald-500";
    case "CANCELLED":
      return "bg-red-500";
    default:
      return "bg-gray-400";
  }
}

function getProgressFromStatus(status: string): number {
  const step = STATUS_STEPS.find(s => s.key === status);
  return step?.progress || 0;
}

export function DeliveryTracker({ deliveryId, initialData }: DeliveryTrackerProps) {
  const { isConnected } = useSocket();
  const deliveryUpdates = useDeliveryUpdates(deliveryId);
  const [currentLocation, setCurrentLocation] = useState<LocationUpdate | null>(null);
  const [eta, setEta] = useState<string | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [currentStatus, setCurrentStatus] = useState(initialData?.status || "CREATED");
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const mapRef = useRef<HTMLDivElement>(null);

  // Écouter les mises à jour de position GPS
  useEffect(() => {
    const handleLocationUpdate = (event: CustomEvent) => {
      const data = event.detail;
      if (data.deliveryId === deliveryId) {
        setCurrentLocation(data.location);
        setLastUpdate(new Date());
        
        if (data.eta) {
          setEta(data.eta);
        }
        if (data.distance !== undefined) {
          setDistance(data.distance);
        }
      }
    };

    const handleETAUpdate = (event: CustomEvent) => {
      const data = event.detail;
      if (data.deliveryId === deliveryId) {
        setEta(data.eta.estimatedArrival);
        setLastUpdate(new Date());
      }
    };

    window.addEventListener("delivery-location", handleLocationUpdate as EventListener);
    window.addEventListener("eta-update", handleETAUpdate as EventListener);

    return () => {
      window.removeEventListener("delivery-location", handleLocationUpdate as EventListener);
      window.removeEventListener("eta-update", handleETAUpdate as EventListener);
    };
  }, [deliveryId]);

  // Mettre à jour le statut basé sur les updates WebSocket
  useEffect(() => {
    const latestUpdate = deliveryUpdates[0];
    if (latestUpdate) {
      setCurrentStatus(latestUpdate.status);
      setLastUpdate(new Date(latestUpdate.timestamp));
    }
  }, [deliveryUpdates]);

  // Initialiser une carte simple (placeholder pour une vraie intégration carte)
  useEffect(() => {
    if (mapRef.current && currentLocation) {
      // Ici on intégrerait une vraie carte (Google Maps, Mapbox, etc.)
      // Contenu par défaut en attente des données
      mapRef.current.innerHTML = `
        <div class="flex items-center justify-center h-full bg-muted rounded-lg">
          <div class="text-center">
            <MapPin class="h-8 w-8 mx-auto mb-2 text-primary" />
            <p class="text-sm font-medium">Position du livreur</p>
            <p class="text-xs text-muted-foreground">
              ${currentLocation.latitude.toFixed(6)}, ${currentLocation.longitude.toFixed(6)}
            </p>
            <p class="text-xs text-muted-foreground mt-1">
              Dernière mise à jour: ${formatDistanceToNow(new Date(currentLocation.timestamp), { 
                addSuffix: true, 
                locale: fr 
              })}
            </p>
          </div>
        </div>
      `;
    }
  }, [currentLocation]);

  const progress = getProgressFromStatus(currentStatus);
  const isDelivered = currentStatus === "DELIVERED";
  const isCancelled = currentStatus === "CANCELLED";

  return (
    <div className="space-y-6">
      {/* Statut principal */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Suivi de livraison
            </CardTitle>
            <div className="flex items-center gap-2">
              {isConnected ? (
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  <div className="h-2 w-2 bg-green-500 rounded-full mr-1" />
                  Temps réel
                </Badge>
              ) : (
                <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                  <div className="h-2 w-2 bg-orange-500 rounded-full mr-1" />
                  Déconnecté
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Barre de progression */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Progression</span>
              <span className="text-sm text-muted-foreground">{progress}%</span>
            </div>
            <Progress 
              value={progress} 
              className={`h-2 ${isCancelled ? 'bg-red-100' : ''}`}
            />
          </div>

          {/* Statut actuel */}
          <div className="flex items-center gap-3">
            <div className={`h-3 w-3 rounded-full ${getStatusColor(currentStatus)}`} />
            <div>
              <p className="font-medium">
                {STATUS_STEPS.find(s => s.key === currentStatus)?.label || currentStatus}
              </p>
              <p className="text-sm text-muted-foreground">
                Dernière mise à jour: {formatDistanceToNow(lastUpdate, { 
                  addSuffix: true, 
                  locale: fr 
                })}
              </p>
            </div>
          </div>

          {/* Informations en temps réel */}
          {(eta || distance !== null) && (
            <>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                {eta && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Arrivée prévue</p>
                      <p className="text-xs text-muted-foreground">{eta}</p>
                    </div>
                  </div>
                )}
                {distance !== null && (
                  <div className="flex items-center gap-2">
                    <Navigation className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Distance restante</p>
                      <p className="text-xs text-muted-foreground">
                        {distance < 1000 
                          ? `${Math.round(distance)} m` 
                          : `${(distance / 1000).toFixed(1)} km`
                        }
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Actions disponibles */}
          {(currentStatus === "NEARBY" || currentStatus === "ARRIVED") && initialData?.delivererPhone && (
            <>
              <Separator />
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1">
                  <Phone className="h-4 w-4 mr-2" />
                  Appeler le livreur
                </Button>
                <Button size="sm" variant="outline" className="flex-1">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Envoyer un message
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Carte en temps réel */}
      {currentLocation && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Position en temps réel</CardTitle>
          </CardHeader>
          <CardContent>
            <div ref={mapRef} className="h-64 bg-muted rounded-lg"></div>
          </CardContent>
        </Card>
      )}

      {/* Historique des mises à jour */}
      {deliveryUpdates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Historique des mises à jour</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {deliveryUpdates.slice(0, 5).map((update, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className={`h-2 w-2 rounded-full mt-2 ${getStatusColor(update.status)}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">
                        {STATUS_STEPS.find(s => s.key === update.status)?.label || update.status}
                      </p>
                      <time className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(update.timestamp), {
                          addSuffix: true,
                          locale: fr
                        })}
                      </time>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {update.message}
                    </p>
                    {update.location && (
                      <p className="text-xs text-muted-foreground">
                        📍 {update.location.address}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Composant pour afficher l'ETA en temps réel
export function LiveETA({ deliveryId }: { deliveryId: string }) {
  const [eta, setEta] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number>(0);

  useEffect(() => {
    const handleETAUpdate = (event: CustomEvent) => {
      const data = event.detail;
      if (data.deliveryId === deliveryId) {
        setEta(data.eta.estimatedArrival);
        setConfidence(data.eta.confidence || 0);
      }
    };

    window.addEventListener("eta-update", handleETAUpdate as EventListener);
    return () => {
      window.removeEventListener("eta-update", handleETAUpdate as EventListener);
    };
  }, [deliveryId]);

  if (!eta) return null;

  return (
    <Card className="border-dashed">
      <CardContent className="pt-4">
        <div className="flex items-center gap-3">
          <Clock className="h-5 w-5 text-primary" />
          <div>
            <p className="text-sm font-medium">Arrivée estimée</p>
            <p className="text-lg font-semibold">{eta}</p>
            <div className="flex items-center gap-2 mt-1">
              <div className="h-1 w-16 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${confidence}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground">
                {confidence}% de confiance
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Composant de carte GPS en temps réel
export function LiveDeliveryMap({ deliveryId, destination }: {
  deliveryId: string;
  destination: { latitude: number; longitude: number; address: string };
}) {
  const [delivererPosition, setDelivererPosition] = useState<{
    latitude: number;
    longitude: number;
    timestamp: string;
  } | null>(null);
  
  useEffect(() => {
    const handleLocationUpdate = (event: CustomEvent) => {
      const data = event.detail;
      if (data.deliveryId === deliveryId) {
        setDelivererPosition({
          latitude: data.location.latitude,
          longitude: data.location.longitude,
          timestamp: data.location.timestamp || new Date().toISOString()
        });
      }
    };

    window.addEventListener("delivery-location", handleLocationUpdate as EventListener);
    return () => {
      window.removeEventListener("delivery-location", handleLocationUpdate as EventListener);
    };
  }, [deliveryId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Position du livreur
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64 bg-muted rounded-lg relative overflow-hidden">
          {delivererPosition ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="relative mb-4">
                  <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mx-auto">
                    <Truck className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full animate-pulse" />
                </div>
                <p className="font-medium">Livreur en mouvement</p>
                <p className="text-xs text-muted-foreground">
                  {delivererPosition.latitude.toFixed(6)}, {delivererPosition.longitude.toFixed(6)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Dernière mise à jour: {formatDistanceToNow(new Date(delivererPosition.timestamp), {
                    addSuffix: true,
                    locale: fr
                  })}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <MapPin className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  En attente de la position du livreur...
                </p>
              </div>
            </div>
          )}
          
          {/* Indicateur de destination */}
          <div className="absolute bottom-2 left-2 bg-background/90 backdrop-blur-sm rounded-lg p-2 border">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full" />
              <span className="text-xs font-medium">Destination</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1 max-w-40 truncate">
              {destination.address}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}