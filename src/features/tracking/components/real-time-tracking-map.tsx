"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  MapPin,
  Navigation,
  Clock,
  Truck,
  Package,
  RefreshCw,
  Phone,
  MessageCircle,
  AlertTriangle,
} from "lucide-react";

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: Date;
  speed?: number;
  heading?: number;
}

interface DeliveryInfo {
  id: string;
  trackingCode: string;
  status: string;
  pickupLocation: {
    address: string;
    coordinates?: { lat: number; lng: number };
  };
  deliveryLocation: {
    address: string;
    coordinates?: { lat: number; lng: number };
  };
  deliverer: {
    id: string;
    name: string;
    phone: string;
    vehicle: string;
  };
  estimatedArrival?: string;
  currentPosition?: LocationData;
}

interface TrackingMapProps {
  deliveryId: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function RealTimeTrackingMap({
  deliveryId,
  autoRefresh = true,
  refreshInterval = 30000,
}: TrackingMapProps) {
  const [delivery, setDelivery] = useState<DeliveryInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mapInitialized, setMapInitialized] = useState(false);

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadDeliveryInfo();

    if (autoRefresh) {
      intervalRef.current = setInterval(loadDeliveryInfo, refreshInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [deliveryId, autoRefresh, refreshInterval]);

  useEffect(() => {
    if (delivery && !mapInitialized) {
      initializeMap();
    }

    if (delivery && mapInitialized) {
      updateMapMarkers();
    }
  }, [delivery, mapInitialized]);

  const loadDeliveryInfo = async () => {
    try {
      setError(null);

      const response = await fetch(
        `/api/shared/deliveries/${deliveryId}/tracking`,
      );

      if (!response.ok) {
        throw new Error("Impossible de charger les informations de livraison");
      }

      const data = await response.json();
      setDelivery(data.delivery);
      setLastUpdate(new Date());
    } catch (error) {
      setError(error instanceof Error ? error.message : "Erreur de chargement");
    } finally {
      setIsLoading(false);
    }
  };

  const initializeMap = () => {
    if (!delivery || !mapRef.current || mapInitialized) return;

    // Initialisation de la carte (utilise l'API de maps disponible)
    // Ici on simule l'initialisation - en production, utiliser Google Maps, Mapbox, etc.
    const map = {
      center: delivery.currentPosition
        ? {
            lat: delivery.currentPosition.latitude,
            lng: delivery.currentPosition.longitude,
          }
        : { lat: 48.8566, lng: 2.3522 }, // Paris par défaut
      zoom: 13,
      markers: [],
    };

    mapInstanceRef.current = map;
    setMapInitialized(true);

    // Créer le contenu HTML de la carte
    if (mapRef.current) {
      mapRef.current.innerHTML = `
        <div class="w-full h-full bg-gray-100 rounded-lg flex items-center justify-center relative overflow-hidden">
          <div class="absolute inset-0 bg-gradient-to-br from-blue-50 to-green-50"></div>
          <div class="relative z-10 text-center p-4">
            <div class="mb-4">
              <div class="w-16 h-16 bg-blue-500 rounded-full mx-auto flex items-center justify-center mb-2">
                <svg class="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" />
                </svg>
              </div>
              <h3 class="font-semibold text-gray-900">Carte de suivi</h3>
              <p class="text-sm text-gray-600">Position en temps réel</p>
            </div>
            ${
              delivery.currentPosition
                ? `
              <div class="space-y-2 text-sm">
                <div class="bg-white/80 rounded-lg p-3">
                  <div class="font-medium">Position actuelle</div>
                  <div class="text-gray-600">
                    ${delivery.currentPosition.latitude.toFixed(6)}, ${delivery.currentPosition.longitude.toFixed(6)}
                  </div>
                  <div class="text-xs text-gray-500 mt-1">
                    Précision: ${delivery.currentPosition.accuracy}m
                    ${delivery.currentPosition.speed ? ` • Vitesse: ${Math.round(delivery.currentPosition.speed)}km/h` : ""}
                  </div>
                </div>
              </div>
            `
                : `
              <div class="bg-orange-100 rounded-lg p-3">
                <div class="text-orange-800 text-sm">
                  Position non disponible
                </div>
              </div>
            `
            }
          </div>
        </div>
      `;
    }
  };

  const updateMapMarkers = () => {
    if (!delivery || !mapInstanceRef.current) return;

    // Mettre à jour les marqueurs de la carte
    // En production, utiliser l'API de la carte pour mettre à jour les marqueurs
  };

  const getStatusInfo = (status: string) => {
    const statusConfig = {
      ACCEPTED: {
        label: "Accepté",
        color: "bg-blue-100 text-blue-800",
        icon: "✅",
      },
      PICKED_UP: {
        label: "Récupéré",
        color: "bg-yellow-100 text-yellow-800",
        icon: "📦",
      },
      IN_TRANSIT: {
        label: "En cours",
        color: "bg-green-100 text-green-800",
        icon: "🚛",
      },
      DELIVERED: {
        label: "Livré",
        color: "bg-gray-100 text-gray-800",
        icon: "🎉",
      },
    };

    return (
      statusConfig[status as keyof typeof statusConfig] || {
        label: status,
        color: "bg-gray-100 text-gray-800",
        icon: "📦",
      }
    );
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffMinutes < 1) return "À l'instant";
    if (diffMinutes < 60) return `Il y a ${diffMinutes}min`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24)
      return `Il y a ${diffHours}h${diffMinutes % 60 > 0 ? ` ${diffMinutes % 60}min` : ""}`;

    return date.toLocaleDateString("fr-FR");
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Suivi en temps réel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !delivery) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            Erreur de suivi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {error || "Impossible de charger les informations de suivi"}
            </AlertDescription>
          </Alert>
          <Button onClick={loadDeliveryInfo} variant="outline" className="mt-4">
            <RefreshCw className="w-4 h-4 mr-2" />
            Réessayer
          </Button>
        </CardContent>
      </Card>
    );
  }

  const statusInfo = getStatusInfo(delivery.status);

  return (
    <div className="space-y-6">
      {/* En-tête avec informations principales */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Suivi {delivery.trackingCode}
            </CardTitle>
            <Badge className={statusInfo.color}>
              {statusInfo.icon} {statusInfo.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Informations du livreur */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                <Truck className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="font-medium">{delivery.deliverer.name}</div>
                <div className="text-sm text-gray-600">
                  {delivery.deliverer.vehicle}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline">
                <Phone className="w-4 h-4 mr-2" />
                Appeler
              </Button>
              <Button size="sm" variant="outline">
                <MessageCircle className="w-4 h-4 mr-2" />
                Message
              </Button>
            </div>
          </div>

          {/* Estimation d'arrivée */}
          {delivery.estimatedArrival && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
              <Clock className="w-5 h-5 text-blue-600" />
              <div>
                <div className="font-medium text-blue-900">
                  Arrivée estimée :{" "}
                  {new Date(delivery.estimatedArrival).toLocaleTimeString(
                    "fr-FR",
                    {
                      hour: "2-digit",
                      minute: "2-digit",
                    },
                  )}
                </div>
                <div className="text-sm text-blue-700">
                  Dans environ{" "}
                  {Math.round(
                    (new Date(delivery.estimatedArrival).getTime() -
                      Date.now()) /
                      (1000 * 60),
                  )}{" "}
                  minutes
                </div>
              </div>
            </div>
          )}

          {/* Dernière mise à jour */}
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>Dernière mise à jour :</span>
            <div className="flex items-center gap-2">
              <span>{lastUpdate ? formatTimeAgo(lastUpdate) : "Jamais"}</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={loadDeliveryInfo}
                disabled={isLoading}
              >
                <RefreshCw
                  className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
                />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Carte */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Navigation className="w-5 h-5" />
            Position en temps réel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div ref={mapRef} className="w-full h-96 rounded-lg border" />
        </CardContent>
      </Card>

      {/* Étapes du trajet */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Étapes de livraison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Point de collecte */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                <Package className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <div className="font-medium">Point de collecte</div>
                <div className="text-sm text-gray-600">
                  {delivery.pickupLocation.address}
                </div>
                <Badge variant="outline" className="mt-1">
                  {delivery.status === "ACCEPTED" ? "En attente" : "Terminé"}
                </Badge>
              </div>
            </div>

            {/* Ligne de connexion */}
            <div className="ml-4 w-0.5 h-8 bg-gray-200"></div>

            {/* Point de livraison */}
            <div className="flex items-start gap-3">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  delivery.status === "DELIVERED"
                    ? "bg-green-500"
                    : "bg-gray-300"
                }`}
              >
                <MapPin className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <div className="font-medium">Point de livraison</div>
                <div className="text-sm text-gray-600">
                  {delivery.deliveryLocation.address}
                </div>
                <Badge variant="outline" className="mt-1">
                  {delivery.status === "DELIVERED" ? "Livré" : "En cours"}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
