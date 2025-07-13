"use client";

import { useState, useEffect } from "react";
import { LeafletMap, MapMarker, MapRoute } from "./leaflet-map";
import { AddressPicker } from "./address-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Navigation,
  Plus,
  Trash2,
  Route,
  Clock,
  Euro,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

interface RoutePoint {
  id: string;
  address: string;
  latitude: number;
  longitude: number;
  type: "start" | "waypoint" | "end";
}

interface RouteInfo {
  distance: number;
  duration: number;
  price: number;
}

interface RoutePlannerProps {
  onRouteSelect?: (route: {
    points: RoutePoint[];
    info: RouteInfo;
    polyline: [number, number][];
  }) => void;
  initialRoute?: RoutePoint[];
  enablePricing?: boolean;
  pricePerKm?: number;
}

export function RoutePlanner({
  onRouteSelect,
  initialRoute = [],
  enablePricing = true,
  pricePerKm = 0.5,
}: RoutePlannerProps) {
  const [routePoints, setRoutePoints] = useState<RoutePoint[]>(initialRoute);
  const [routePolyline, setRoutePolyline] = useState<[number, number][]>([]);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [showAddressPickerFor, setShowAddressPickerFor] = useState<
    string | null
  >(null);

  // Calculate route using OSRM
  const calculateRoute = async () => {
    if (routePoints.length < 2) {
      toast.error("Ajoutez au moins 2 points pour calculer un itinéraire");
      return;
    }

    setIsCalculating(true);
    try {
      // Build coordinates string for OSRM
      const coordinates = routePoints
        .map((point) => `${point.longitude},${point.latitude}`)
        .join(";");

      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson`,
      );

      if (!response.ok) throw new Error("Erreur de calcul d'itinéraire");

      const data = await response.json();
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];

        // Extract polyline
        const polyline = route.geometry.coordinates.map(
          (coord: [number, number]) => [coord[1], coord[0]] as [number, number],
        );
        setRoutePolyline(polyline);

        // Calculate route info
        const distance = route.distance / 1000; // Convert to km
        const duration = route.duration / 60; // Convert to minutes
        const price = enablePricing ? distance * pricePerKm : 0;

        const info: RouteInfo = {
          distance: Math.round(distance * 10) / 10,
          duration: Math.round(duration),
          price: Math.round(price * 100) / 100,
        };
        setRouteInfo(info);

        // Notify parent
        if (onRouteSelect) {
          onRouteSelect({
            points: routePoints,
            info,
            polyline,
          });
        }

        toast.success("Itinéraire calculé avec succès");
      }
    } catch (error) {
      console.error("Route calculation error:", error);
      toast.error("Impossible de calculer l'itinéraire");
    } finally {
      setIsCalculating(false);
    }
  };

  // Add a new waypoint
  const addWaypoint = () => {
    const newPoint: RoutePoint = {
      id: Date.now().toString(),
      address: "",
      latitude: 0,
      longitude: 0,
      type: routePoints.length === 0 ? "start" : "waypoint",
    };
    setRoutePoints([...routePoints, newPoint]);
    setShowAddressPickerFor(newPoint.id);
  };

  // Update a route point
  const updateRoutePoint = (
    id: string,
    address: {
      address: string;
      latitude: number;
      longitude: number;
    },
  ) => {
    setRoutePoints((points) =>
      points.map((point) =>
        point.id === id ? { ...point, ...address } : point,
      ),
    );
    setShowAddressPickerFor(null);
  };

  // Remove a route point
  const removeRoutePoint = (id: string) => {
    setRoutePoints((points) => {
      const filtered = points.filter((p) => p.id !== id);
      // Update types
      return filtered.map((p, index) => ({
        ...p,
        type:
          index === 0
            ? "start"
            : index === filtered.length - 1
              ? "end"
              : "waypoint",
      }));
    });
  };

  // Auto-calculate when points change
  useEffect(() => {
    if (
      routePoints.length >= 2 &&
      routePoints.every((p) => p.latitude && p.longitude)
    ) {
      calculateRoute();
    }
  }, [routePoints]);

  // Prepare markers for map
  const markers: MapMarker[] = routePoints
    .filter((point) => point.latitude && point.longitude)
    .map((point) => ({
      id: point.id,
      position: [point.latitude, point.longitude],
      type:
        point.type === "start"
          ? "pickup"
          : point.type === "end"
            ? "delivery"
            : "warehouse",
      label:
        point.type === "start"
          ? "Départ"
          : point.type === "end"
            ? "Arrivée"
            : "Étape",
      popup: point.address,
    }));

  // Prepare route for map
  const routes: MapRoute[] =
    routePolyline.length > 0
      ? [
          {
            id: "planned-route",
            points: routePolyline,
            color: "#3B82F6",
            weight: 5,
          },
        ]
      : [];

  return (
    <div className="space-y-4">
      {/* Route Points Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Points de passage</span>
            <Button size="sm" variant="outline" onClick={addWaypoint}>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un point
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {routePoints.map((point, index) => (
              <div key={point.id} className="flex items-center gap-2">
                <Badge
                  variant={
                    point.type === "start"
                      ? "default"
                      : point.type === "end"
                        ? "secondary"
                        : "outline"
                  }
                  className="min-w-[80px] justify-center"
                >
                  {point.type === "start"
                    ? "Départ"
                    : point.type === "end"
                      ? "Arrivée"
                      : `Étape ${index}`}
                </Badge>

                {showAddressPickerFor === point.id ? (
                  <div className="flex-1">
                    <AddressPicker
                      onAddressSelect={(addr) =>
                        updateRoutePoint(point.id, addr)
                      }
                      initialAddress={point.address}
                      height="300px"
                    />
                  </div>
                ) : (
                  <>
                    <div
                      className="flex-1 p-2 border rounded-md cursor-pointer hover:bg-accent"
                      onClick={() => setShowAddressPickerFor(point.id)}
                    >
                      {point.address || "Cliquez pour sélectionner une adresse"}
                    </div>

                    {routePoints.length > 2 && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeRoutePoint(point.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </>
                )}
              </div>
            ))}

            {routePoints.length === 0 && (
              <p className="text-center text-muted-foreground py-4">
                Ajoutez des points pour créer votre itinéraire
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Route Information */}
      {routeInfo && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <Route className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Distance</p>
                  <p className="font-semibold">{routeInfo.distance} km</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Durée estimée</p>
                  <p className="font-semibold">
                    {Math.floor(routeInfo.duration / 60)}h{" "}
                    {routeInfo.duration % 60}min
                  </p>
                </div>
              </div>

              {enablePricing && (
                <div className="flex items-center gap-2">
                  <Euro className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Prix estimé</p>
                    <p className="font-semibold">{routeInfo.price}€</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Map Display */}
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Navigation className="h-5 w-5" />
            Visualisation de l'itinéraire
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <LeafletMap
            center={
              markers.length > 0 ? markers[0].position : [48.8566, 2.3522]
            }
            zoom={markers.length > 0 ? 12 : 10}
            height="500px"
            markers={markers}
            routes={routes}
            enableGeolocation={true}
          />
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-2 justify-end">
        <Button
          variant="outline"
          onClick={() => {
            setRoutePoints([]);
            setRoutePolyline([]);
            setRouteInfo(null);
          }}
        >
          Réinitialiser
        </Button>

        <Button
          onClick={calculateRoute}
          disabled={routePoints.length < 2 || isCalculating}
        >
          {isCalculating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Calcul en cours...
            </>
          ) : (
            <>
              <Route className="h-4 w-4 mr-2" />
              Calculer l'itinéraire
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
