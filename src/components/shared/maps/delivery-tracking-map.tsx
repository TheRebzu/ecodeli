"use client";

import { useEffect, useState, useRef } from "react";
import { MapContainer as LeafletMapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import { Icon, LatLngBounds } from "leaflet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import { useSocket } from '@/hooks/system/use-socket';
import {
  MapPin,
  Navigation,
  Truck,
  Clock,
  Route,
  Maximize2,
  Minimize2,
  RotateCcw,
  Zap,
} from "lucide-react";

// Import des styles Leaflet
import "leaflet/dist/leaflet.css";

// Interface pour les positions de livraison
interface DeliveryLocation {
  lat: number;
  lng: number;
  type: "pickup" | "delivery" | "current";
  address?: string;
  timestamp?: Date;
}

// Interface pour les propriétés du composant
interface DeliveryTrackingMapProps {
  deliveryId: string;
  height?: string | number;
  showControls?: boolean;
  showEta?: boolean;
  autoCenter?: boolean;
  className?: string;
}

// Interface pour la position actuelle
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

// Configuration des icônes Leaflet personnalisées
const createCustomIcon = (color: string, iconClass: string) => {
  return new Icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="${color}">
        <circle cx="12" cy="12" r="10" stroke="white" stroke-width="2"/>
        <path d="M12 2v20M2 12h20" stroke="white" stroke-width="1"/>
      </svg>
    `)}`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });
};

// Icônes personnalisées pour chaque type de point
const icons = {
  pickup: createCustomIcon("#3B82F6", "pickup"),
  delivery: createCustomIcon("#10B981", "delivery"),
  current: createCustomIcon("#EF4444", "current"),
};

// Composant principal de la carte de livraison
export default function DeliveryTrackingMap({
  deliveryId,
  height = "400px",
  showControls = true,
  showEta = true,
  autoCenter = true,
  className
}: DeliveryTrackingMapProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<DeliveryLocation | null>(null);
  const [currentPosition, setCurrentPosition] = useState<DeliveryPosition | null>(null);
  const [mapBounds, setMapBounds] = useState<LatLngBounds | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const mapRef = useRef<any>(null);
  const { socket } = useSocket();

  // Récupération des données de livraison
  const {
    data: delivery,
    isLoading,
    refetch,
  } = api.deliveryTracking.getTrackingInfo.useQuery(
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
        
        // Centrer la carte sur la nouvelle position si autoCenter est activé
        if (autoCenter && mapRef.current && data.position) {
          mapRef.current.setView([data.position.lat, data.position.lng], 14);
        }
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
  }, [socket, deliveryId, refetch, autoCenter]);

  if (isLoading) {
    return (
      <Card className={cn("w-full", className)}>
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Chargement de la carte...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!delivery) {
    return (
      <Card className={cn("w-full", className)}>
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center">
            <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Aucune information de livraison disponible</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Préparation des points de livraison
  const locations: DeliveryLocation[] = [
    {
      lat: delivery.pickupLocation.latitude,
      lng: delivery.pickupLocation.longitude,
      type: "pickup",
      address: delivery.pickupLocation.address,
    },
    {
      lat: delivery.deliveryLocation.latitude,
      lng: delivery.deliveryLocation.longitude,
      type: "delivery",
      address: delivery.deliveryLocation.address,
    },
  ];

  // Ajouter la position actuelle si disponible
  if (currentPosition) {
    locations.push({
      lat: currentPosition.position.lat,
      lng: currentPosition.position.lng,
      type: "current",
      timestamp: currentPosition.timestamp,
    });
  }

  // Calcul de l'ETA
  const calculateETA = () => {
    if (!currentPosition || !delivery.estimatedArrival) return null;
    
    const now = new Date();
    const eta = new Date(delivery.estimatedArrival);
    const diffMs = eta.getTime() - now.getTime();
    const diffMinutes = Math.ceil(diffMs / (1000 * 60));
    
    return diffMinutes > 0 ? diffMinutes : 0;
  };

  // Fonction pour obtenir la couleur du statut
  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-100 text-yellow-800";
      case "CONFIRMED":
        return "bg-blue-100 text-blue-800";
      case "PICKUP":
        return "bg-orange-100 text-orange-800";
      case "IN_TRANSIT":
        return "bg-purple-100 text-purple-800";
      case "DELIVERED":
        return "bg-green-100 text-green-800";
      case "CANCELLED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Fonction pour obtenir le libellé du statut
  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      PENDING: "En attente",
      CONFIRMED: "Confirmé",
      PICKUP: "Récupération",
      IN_TRANSIT: "En cours",
      DELIVERED: "Livré",
      CANCELLED: "Annulé",
    };
    return labels[status] || status;
  };

  // Trajet (polyline) entre les points
  const routeCoordinates = locations
    .filter(loc => loc.type !== "current")
    .map(loc => [loc.lat, loc.lng] as [number, number]);

  // Ajouter la position actuelle au trajet si disponible
  if (currentPosition) {
    routeCoordinates.splice(1, 0, [currentPosition.position.lat, currentPosition.position.lng]);
  }

  const eta = calculateETA();

  return (
    <div className={cn("w-full space-y-4", className)}>
      {/* Informations de statut */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Suivi de livraison</CardTitle>
            <Badge className={getStatusColor(delivery.status)}>
              {getStatusLabel(delivery.status)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-blue-600" />
              <div className="text-sm">
                <p className="font-medium">Récupération</p>
                <p className="text-muted-foreground truncate">{delivery.pickupLocation.address}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Navigation className="h-4 w-4 text-green-600" />
              <div className="text-sm">
                <p className="font-medium">Livraison</p>
                <p className="text-muted-foreground truncate">{delivery.deliveryLocation.address}</p>
              </div>
            </div>
            {showEta && eta !== null && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-purple-600" />
                <div className="text-sm">
                  <p className="font-medium">ETA</p>
                  <p className="text-muted-foreground">{eta} min</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Carte interactive */}
      <Card>
        <CardContent className="p-0">
          <div 
            className={cn(
              "relative overflow-hidden rounded-lg",
              isFullscreen && "fixed inset-0 z-50 rounded-none"
            )}
            style={{ height: isFullscreen ? "100vh" : height }}
          >
            <LeafletMapContainer
              ref={mapRef}
              center={[locations[0]?.lat || 48.8566, locations[0]?.lng || 2.3522]}
              zoom={13}
              style={{ height: "100%", width: "100%" }}
              whenReady={() => setIsMapReady(true)}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              {/* Marqueurs pour chaque point */}
              {locations.map((location, index) => (
                <Marker
                  key={index}
                  position={[location.lat, location.lng]}
                  icon={icons[location.type]}
                  eventHandlers={{
                    click: () => setSelectedLocation(location),
                  }}
                >
                  <Popup>
                    <div className="p-2">
                      <div className="flex items-center gap-2 mb-2">
                        {location.type === "pickup" && <MapPin className="h-4 w-4 text-blue-600" />}
                        {location.type === "delivery" && <Navigation className="h-4 w-4 text-green-600" />}
                        {location.type === "current" && <Truck className="h-4 w-4 text-red-600" />}
                        <span className="font-medium">
                          {location.type === "pickup" && "Point de récupération"}
                          {location.type === "delivery" && "Point de livraison"}
                          {location.type === "current" && "Position actuelle"}
                        </span>
                      </div>
                      {location.address && (
                        <p className="text-sm text-gray-600">{location.address}</p>
                      )}
                      {location.timestamp && (
                        <p className="text-xs text-gray-500 mt-1">
                          Dernière mise à jour: {location.timestamp.toLocaleTimeString()}
                        </p>
                      )}
                      {location.type === "current" && currentPosition?.speed && (
                        <p className="text-xs text-gray-500">
                          Vitesse: {Math.round(currentPosition.speed)} km/h
                        </p>
                      )}
                    </div>
                  </Popup>
                </Marker>
              ))}

              {/* Trajet */}
              {routeCoordinates.length > 1 && (
                <Polyline
                  positions={routeCoordinates}
                  color="#8B5CF6"
                  weight={3}
                  opacity={0.7}
                  dashArray="10, 10"
                />
              )}
            </LeafletMapContainer>

            {/* Contrôles de la carte */}
            {showControls && (
              <div className="absolute top-4 right-4 flex flex-col gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-white/90 backdrop-blur-sm"
                  onClick={() => setIsFullscreen(!isFullscreen)}
                >
                  {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-white/90 backdrop-blur-sm"
                  onClick={() => refetch()}
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Informations en temps réel */}
            {currentPosition && (
              <div className="absolute bottom-4 left-4 right-4">
                <Card className="bg-white/90 backdrop-blur-sm">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        <span className="text-sm font-medium">En direct</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {currentPosition.speed && (
                          <div className="flex items-center gap-1">
                            <Zap className="h-3 w-3" />
                            <span>{Math.round(currentPosition.speed)} km/h</span>
                          </div>
                        )}
                        <span>
                          Dernière position: {currentPosition.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
