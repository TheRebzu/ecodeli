"use client";

import { useEffect, useState } from "react";
import { LeafletMap, MapMarker, MapRoute } from "./leaflet-map";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, MapPin, Package, Truck, Clock } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface TrackingData {
  deliveryId: string;
  status: string;
  currentLocation?: {
    latitude: number;
    longitude: number;
  };
  pickupLocation: {
    latitude: number;
    longitude: number;
    address: string;
  };
  deliveryLocation: {
    latitude: number;
    longitude: number;
    address: string;
  };
  deliverer?: {
    id: string;
    firstName: string;
    lastName: string;
    phone?: string;
  };
  estimatedDeliveryTime?: string;
  trackingHistory: Array<{
    id: string;
    location: {
      latitude: number;
      longitude: number;
    };
    timestamp: string;
    status: string;
  }>;
  progress: number;
}

interface DeliveryTrackingMapProps {
  deliveryId: string;
  refreshInterval?: number;
  height?: string;
  showDetails?: boolean;
  className?: string;
}

export function DeliveryTrackingMap({
  deliveryId,
  refreshInterval = 30000, // 30 seconds
  height = "500px",
  showDetails = true,
  className,
}: DeliveryTrackingMapProps) {
  const [trackingData, setTrackingData] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTracking = async () => {
      try {
        const response = await fetch(
          `/api/client/deliveries/${deliveryId}/tracking`,
        );
        if (!response.ok) throw new Error("Failed to fetch tracking data");

        const data = await response.json();
        setTrackingData(data);
        setError(null);
      } catch (err) {
        setError("Impossible de charger les données de suivi");
        console.error("Tracking error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTracking();
    const interval = setInterval(fetchTracking, refreshInterval);
    return () => clearInterval(interval);
  }, [deliveryId, refreshInterval]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error || !trackingData) {
    return (
      <div className="text-center p-8 text-red-500">
        {error || "Aucune donnée de suivi disponible"}
      </div>
    );
  }

  // Prepare markers
  const markers: MapMarker[] = [
    {
      id: "pickup",
      position: [
        trackingData.pickupLocation.latitude,
        trackingData.pickupLocation.longitude,
      ],
      type: "pickup",
      popup: `<strong>Point de retrait</strong><br/>${trackingData.pickupLocation.address}`,
      label: "Retrait",
    },
    {
      id: "delivery",
      position: [
        trackingData.deliveryLocation.latitude,
        trackingData.deliveryLocation.longitude,
      ],
      type: "delivery",
      popup: `<strong>Point de livraison</strong><br/>${trackingData.deliveryLocation.address}`,
      label: "Livraison",
    },
  ];

  // Add deliverer marker if available
  if (trackingData.currentLocation && trackingData.deliverer) {
    markers.push({
      id: "deliverer",
      position: [
        trackingData.currentLocation.latitude,
        trackingData.currentLocation.longitude,
      ],
      type: "deliverer",
      popup: `<strong>${trackingData.deliverer.firstName} ${trackingData.deliverer.lastName}</strong><br/>Livreur`,
      label: "Livreur",
    });
  }

  // Prepare route
  const routes: MapRoute[] = [];
  if (trackingData.trackingHistory.length > 1) {
    const routePoints = trackingData.trackingHistory.map(
      (point) =>
        [point.location.latitude, point.location.longitude] as [number, number],
    );

    routes.push({
      id: "tracking-route",
      points: routePoints,
      color: getStatusColor(trackingData.status),
      weight: 5,
      opacity: 0.7,
    });
  }

  // Calculate center
  const center = trackingData.currentLocation
    ? ([
        trackingData.currentLocation.latitude,
        trackingData.currentLocation.longitude,
      ] as [number, number])
    : ([
        trackingData.pickupLocation.latitude,
        trackingData.pickupLocation.longitude,
      ] as [number, number]);

  return (
    <div className={className}>
      {showDetails && (
        <Card className="mb-4 p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Truck className="h-5 w-5" />
              <h3 className="text-lg font-semibold">Suivi de livraison</h3>
            </div>
            <Badge variant={getStatusVariant(trackingData.status)}>
              {getStatusLabel(trackingData.status)}
            </Badge>
          </div>

          <Progress value={trackingData.progress} className="mb-4" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-blue-500" />
                <span className="text-muted-foreground">De:</span>
                <span className="font-medium">
                  {trackingData.pickupLocation.address}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Package className="h-4 w-4 text-green-500" />
                <span className="text-muted-foreground">À:</span>
                <span className="font-medium">
                  {trackingData.deliveryLocation.address}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              {trackingData.deliverer && (
                <div className="flex items-center gap-2 text-sm">
                  <Truck className="h-4 w-4 text-orange-500" />
                  <span className="text-muted-foreground">Livreur:</span>
                  <span className="font-medium">
                    {trackingData.deliverer.firstName}{" "}
                    {trackingData.deliverer.lastName}
                  </span>
                </div>
              )}
              {trackingData.estimatedDeliveryTime && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-purple-500" />
                  <span className="text-muted-foreground">
                    Livraison prévue:
                  </span>
                  <span className="font-medium">
                    {format(
                      new Date(trackingData.estimatedDeliveryTime),
                      "HH:mm",
                      { locale: fr },
                    )}
                  </span>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      <LeafletMap
        center={center}
        zoom={13}
        height={height}
        markers={markers}
        routes={routes}
        enableGeolocation
        className="rounded-lg overflow-hidden shadow-lg"
      />
    </div>
  );
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: "#6B7280",
    assigned: "#F59E0B",
    picked_up: "#3B82F6",
    in_transit: "#8B5CF6",
    delivered: "#10B981",
    cancelled: "#EF4444",
  };
  return colors[status] || "#6B7280";
}

function getStatusVariant(
  status: string,
): "default" | "destructive" | "outline" | "secondary" {
  const variants: Record<
    string,
    "default" | "destructive" | "outline" | "secondary"
  > = {
    delivered: "default",
    cancelled: "destructive",
    pending: "secondary",
    default: "outline",
  };
  return variants[status] || variants.default;
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: "En attente",
    assigned: "Assignée",
    picked_up: "Retirée",
    in_transit: "En transit",
    delivered: "Livrée",
    cancelled: "Annulée",
  };
  return labels[status] || status;
}
