"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useSocket } from "@/hooks/system/use-socket";
import { api } from "@/trpc/react";
import {
  MapPin,
  Navigation,
  Truck,
  Clock,
  Phone,
  MessageCircle,
  Route,
  Maximize2,
  Minimize2,
  RefreshCw,
  AlertTriangle,
  Target,
  Navigation2,
} from "lucide-react";
import { cn } from "@/lib/utils/common";

interface DeliveryLocation {
  lat: number;
  lng: number;
  type: "pickup" | "delivery" | "current";
  address?: string;
  timestamp?: Date;
}

interface DeliveryTrackingMapProps {
  deliveryId: string;
  height?: string | number;
  showControls?: boolean;
  showEta?: boolean;
  autoCenter?: boolean;
  className?: string;
}

interface DeliveryPosition {
  deliveryId: string;
  position: {
    lat: number;
    lng: number;
  };
  heading?: number;
  speed?: number;
  accuracy?: number;
  timestamp: Date;
}

// Composant simulé de carte (à remplacer par une vraie intégration de carte)
const MapContainer = ({
  locations,
  currentPosition,
  onLocationClick,
  height = "100%",
  autoCenter = false,
}: {
  locations: DeliveryLocation[];
  currentPosition?: DeliveryPosition;
  onLocationClick?: (location: DeliveryLocation) => void;
  height?: string | number;
  autoCenter?: boolean;
}) => {
  const [isSimulating, setIsSimulating] = useState(false);

  // Simulation du mouvement pour la démo
  useEffect(() => {
    if (currentPosition && !isSimulating) {
      setIsSimulating(true);
      const timer = setTimeout(() => setIsSimulating(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [currentPosition, isSimulating]);

  return (
    <div
      className="relative bg-muted/20 rounded-lg border flex items-center justify-center overflow-hidden"
      style={{ height }}
    >
      {/* Fond de carte stylisé */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-green-50 dark:from-blue-950/20 dark:to-green-950/20" />

      {/* Éléments de la carte */}
      <div className="relative w-full h-full p-4">
        {/* Points de livraison */}
        <div className="absolute top-4 left-4 space-y-2">
          {locations.map((location, index) => (
            <div
              key={index}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg backdrop-blur-sm cursor-pointer transition-all hover:scale-105",
                location.type === "pickup" &&
                  "bg-blue-100/80 dark:bg-blue-900/50",
                location.type === "delivery" &&
                  "bg-green-100/80 dark:bg-green-900/50",
                location.type === "current" &&
                  "bg-red-100/80 dark:bg-red-900/50",
              )}
              onClick={() => onLocationClick?.(location)}
            >
              {location.type === "pickup" && (
                <MapPin className="h-4 w-4 text-blue-600" />
              )}
              {location.type === "delivery" && (
                <Navigation className="h-4 w-4 text-green-600" />
              )}
              {location.type === "current" && (
                <Truck className="h-4 w-4 text-red-600" />
              )}
              <span className="text-xs font-medium">
                {location.type === "pickup" && "Récupération"}
                {location.type === "delivery" && "Livraison"}
                {location.type === "current" && "Position actuelle"}
              </span>
            </div>
          ))}
        </div>

        {/* Position actuelle du livreur (animée) */}
        {currentPosition && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div
              className={cn(
                "relative flex items-center justify-center w-8 h-8 bg-red-500 rounded-full border-2 border-white shadow-lg transition-all duration-300",
                isSimulating && "animate-pulse scale-110",
              )}
            >
              <Truck className="h-4 w-4 text-white" />

              {/* Cercle de précision */}
              <div className="absolute inset-0 border-2 border-red-300 rounded-full animate-ping opacity-75" />
            </div>

            {/* Vitesse */}
            {currentPosition.speed && (
              <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                {Math.round(currentPosition.speed)} km/h
              </div>
            )}
          </div>
        )}

        {/* Trajet (ligne pointillée) */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          <defs>
            <pattern
              id="dashed"
              patternUnits="userSpaceOnUse"
              width="8"
              height="8"
            >
              <line
                x1="0"
                y1="4"
                x2="8"
                y2="4"
                stroke="currentColor"
                strokeWidth="2"
                strokeDasharray="3,3"
              />
            </pattern>
          </defs>
          <path
            d="M 20,50 Q 150,20 280,50 Q 350,80 400,120"
            fill="none"
            stroke="url(#dashed)"
            strokeWidth="2"
            className="text-primary opacity-60"
          />
        </svg>

        {/* Légende */}
        <div className="absolute bottom-4 right-4 bg-white/90 dark:bg-gray-900/90 rounded-lg p-3 space-y-1 text-xs backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full" />
            <span>Point de récupération</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full" />
            <span>Point de livraison</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full" />
            <span>Position actuelle</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function DeliveryTrackingMap({
  deliveryId,
  height = "400px",
  showControls = true,
  showEta = true,
  autoCenter = true,
  className,
}: DeliveryTrackingMapProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedLocation, setSelectedLocation] =
    useState<DeliveryLocation | null>(null);
  const [currentPosition, setCurrentPosition] =
    useState<DeliveryPosition | null>(null);
  const { socket } = useSocket();

  // Récupération des données de livraison
  const {
    data: delivery,
    isLoading,
    refetch,
  } = api.delivery.getTrackingInfo.useQuery(
    { deliveryId },
    {
      refetchInterval: 30000, // Actualisation toutes les 30 secondes
    },
  );

  // Écoute des mises à jour temps réel via Socket.io
  useEffect(() => {
    if (!socket || !deliveryId) return;

    const handlePositionUpdate = (data: DeliveryPosition) => {
      if (data.deliveryId === deliveryId) {
        setCurrentPosition(data);
      }
    };

    const handleDeliveryStatusUpdate = () => {
      refetch();
    };

    socket.on("delivery:position:update", handlePositionUpdate);
    socket.on("delivery:status:update", handleDeliveryStatusUpdate);

    // Rejoindre la room de tracking
    socket.emit("delivery:join_tracking", { deliveryId });

    return () => {
      socket.off("delivery:position:update", handlePositionUpdate);
      socket.off("delivery:status:update", handleDeliveryStatusUpdate);
      socket.emit("delivery:leave_tracking", { deliveryId });
    };
  }, [socket, deliveryId, refetch]);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Route className="h-5 w-5" />
            Suivi en temps réel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="w-full" style={{ height }} />
        </CardContent>
      </Card>
    );
  }

  if (!delivery) {
    return (
      <Alert variant="destructive" className={className}>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Impossible de charger les informations de suivi pour cette livraison.
          <Button
            variant="link"
            className="p-0 h-auto ml-2"
            onClick={() => refetch()}
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Réessayer
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // Préparation des locations pour la carte
  const locations: DeliveryLocation[] = [
    {
      lat: delivery.pickupLatitude || 0,
      lng: delivery.pickupLongitude || 0,
      type: "pickup",
      address: delivery.pickupAddress,
    },
    {
      lat: delivery.deliveryLatitude || 0,
      lng: delivery.deliveryLongitude || 0,
      type: "delivery",
      address: delivery.deliveryAddress,
    },
  ];

  if (currentPosition) {
    locations.push({
      lat: currentPosition.position.lat,
      lng: currentPosition.position.lng,
      type: "current",
      timestamp: currentPosition.timestamp,
    });
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-100 text-yellow-800";
      case "ACCEPTED":
        return "bg-blue-100 text-blue-800";
      case "PICKED_UP":
        return "bg-purple-100 text-purple-800";
      case "IN_TRANSIT":
        return "bg-orange-100 text-orange-800";
      case "DELIVERED":
        return "bg-green-100 text-green-800";
      case "CANCELLED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      PENDING: "En attente",
      ACCEPTED: "Acceptée",
      PICKED_UP: "Récupérée",
      IN_TRANSIT: "En transit",
      DELIVERED: "Livrée",
      CANCELLED: "Annulée",
    };
    return labels[status] || status;
  };

  const calculateETA = () => {
    if (
      !currentPosition ||
      !delivery.deliveryLatitude ||
      !delivery.deliveryLongitude
    ) {
      return null;
    }

    // Calcul simple de distance (à remplacer par un calcul de route réel)
    const distanceKm =
      Math.sqrt(
        Math.pow(delivery.deliveryLatitude - currentPosition.position.lat, 2) +
          Math.pow(
            delivery.deliveryLongitude - currentPosition.position.lng,
            2,
          ),
      ) * 111; // Approximation en km

    const speed = currentPosition.speed || 30; // 30 km/h par défaut
    const etaMinutes = Math.round((distanceKm / speed) * 60);

    return etaMinutes;
  };

  const eta = calculateETA();

  return (
    <Card
      className={cn(
        className,
        isFullscreen && "fixed inset-0 z-50 rounded-none",
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Route className="h-5 w-5" />
            Suivi en temps réel
            {delivery.trackingCode && (
              <Badge variant="outline" className="ml-2">
                #{delivery.trackingCode}
              </Badge>
            )}
          </CardTitle>

          <div className="flex items-center gap-2">
            <Badge className={getStatusColor(delivery.status)}>
              {getStatusLabel(delivery.status)}
            </Badge>

            {showControls && (
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => refetch()}
                  className="h-8 w-8 p-0"
                >
                  <RefreshCw className="h-3 w-3" />
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="h-8 w-8 p-0"
                >
                  {isFullscreen ? (
                    <Minimize2 className="h-3 w-3" />
                  ) : (
                    <Maximize2 className="h-3 w-3" />
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* ETA et informations */}
        {showEta && (
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {eta && (
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>ETA: {eta} min</span>
              </div>
            )}

            {currentPosition?.timestamp && (
              <div className="flex items-center gap-1">
                <Target className="h-4 w-4" />
                <span>
                  Dernière position:{" "}
                  {new Date(currentPosition.timestamp).toLocaleTimeString()}
                </span>
              </div>
            )}

            {delivery.deliverer && (
              <div className="flex items-center gap-1">
                <Truck className="h-4 w-4" />
                <span>Livreur: {delivery.deliverer.name}</span>
              </div>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="p-0">
        <MapContainer
          locations={locations}
          currentPosition={currentPosition}
          onLocationClick={setSelectedLocation}
          height={isFullscreen ? "calc(100vh - 180px)" : height}
          autoCenter={autoCenter}
        />

        {/* Actions de contact (si en transit) */}
        {delivery.status === "IN_TRANSIT" && delivery.deliverer && (
          <div className="p-4 border-t bg-muted/20">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Contact livreur</span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline">
                  <Phone className="h-4 w-4 mr-2" />
                  Appeler
                </Button>
                <Button size="sm" variant="outline">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Message
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>

      {/* Modal d'information sur la location sélectionnée */}
      {selectedLocation && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-4 z-10">
          <div className="bg-background rounded-lg p-4 max-w-sm w-full">
            <h3 className="font-medium mb-2">
              {selectedLocation.type === "pickup" && "Point de récupération"}
              {selectedLocation.type === "delivery" && "Point de livraison"}
              {selectedLocation.type === "current" && "Position actuelle"}
            </h3>

            {selectedLocation.address && (
              <p className="text-sm text-muted-foreground mb-3">
                {selectedLocation.address}
              </p>
            )}

            {selectedLocation.timestamp && (
              <p className="text-xs text-muted-foreground mb-3">
                {new Date(selectedLocation.timestamp).toLocaleString()}
              </p>
            )}

            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="flex-1">
                <Navigation2 className="h-4 w-4 mr-2" />
                Itinéraire
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedLocation(null)}
              >
                Fermer
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
