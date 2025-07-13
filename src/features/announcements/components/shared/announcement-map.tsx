"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  GoogleMap,
  LoadScript,
  Marker,
  DirectionsRenderer,
  Polygon,
  InfoWindow,
} from "@react-google-maps/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Navigation, Truck, Clock, Euro } from "lucide-react";
import { useTranslations } from "next-intl";

interface MapLocation {
  lat: number;
  lng: number;
  title: string;
  type: "pickup" | "delivery" | "warehouse" | "deliverer";
  address?: string;
  info?: Record<string, any>;
}

interface MapRoute {
  waypoints: MapLocation[];
  color: string;
  strokeWeight: number;
  label?: string;
}

interface AnnouncementMapProps {
  // Localisation de base
  pickupLocation?: { lat: number; lng: number; address: string };
  deliveryLocation?: { lat: number; lng: number; address: string };

  // Localisations additionnelles
  warehouseLocations?: Array<{
    id: string;
    lat: number;
    lng: number;
    name: string;
    capacity: number;
    currentLoad: number;
  }>;

  delivererLocations?: Array<{
    id: string;
    lat: number;
    lng: number;
    name: string;
    vehicleType: string;
    status: "available" | "busy" | "offline";
    rating: number;
  }>;

  // Configuration carte
  showRoute?: boolean;
  showDeliverers?: boolean;
  showWarehouses?: boolean;
  showServiceZone?: boolean;
  serviceRadius?: number; // km

  // Interactivité
  onLocationClick?: (location: MapLocation) => void;
  onDelivererClick?: (delivererId: string) => void;
  onWarehouseClick?: (warehouseId: string) => void;

  // Style et taille
  height?: string;
  zoom?: number;
  className?: string;

  // Mode de la carte
  mode?: "view" | "select" | "track";

  // Tracking en temps réel
  trackingData?: {
    currentPosition: { lat: number; lng: number };
    estimatedPath: Array<{ lat: number; lng: number }>;
    eta: number; // minutes
  };
}

const libraries: ("places" | "geometry")[] = ["places", "geometry"];

export function AnnouncementMap({
  pickupLocation,
  deliveryLocation,
  warehouseLocations = [],
  delivererLocations = [],
  showRoute = false,
  showDeliverers = false,
  showWarehouses = false,
  showServiceZone = false,
  serviceRadius = 10,
  onLocationClick,
  onDelivererClick,
  onWarehouseClick,
  height = "400px",
  zoom = 11,
  className = "",
  mode = "view",
  trackingData,
}: AnnouncementMapProps) {
  const t = useTranslations("map");

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [directions, setDirections] =
    useState<google.maps.DirectionsResult | null>(null);
  const [selectedMarker, setSelectedMarker] = useState<MapLocation | null>(
    null,
  );
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Centre de la carte calculé automatiquement
  const mapCenter = useMemo(() => {
    if (trackingData?.currentPosition) {
      return trackingData.currentPosition;
    }

    if (pickupLocation && deliveryLocation) {
      return {
        lat: (pickupLocation.lat + deliveryLocation.lat) / 2,
        lng: (pickupLocation.lng + deliveryLocation.lng) / 2,
      };
    }

    if (pickupLocation) return pickupLocation;
    if (deliveryLocation) return deliveryLocation;

    // Paris par défaut
    return { lat: 48.8566, lng: 2.3522 };
  }, [pickupLocation, deliveryLocation, trackingData]);

  // Options de style de la carte
  const mapOptions = useMemo(
    () => ({
      disableDefaultUI: false,
      zoomControl: true,
      streetViewControl: false,
      mapTypeControl: false,
      fullscreenControl: true,
      styles: [
        {
          featureType: "poi",
          elementType: "labels",
          stylers: [{ visibility: "off" }],
        },
      ],
    }),
    [],
  );

  // Géolocalisation utilisateur
  useEffect(() => {
    if (navigator.geolocation && mode === "select") {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => console.log("Geolocation error:", error),
      );
    }
  }, [mode]);

  // Calculer l'itinéraire
  useEffect(() => {
    if (showRoute && pickupLocation && deliveryLocation && map) {
      const directionsService = new google.maps.DirectionsService();

      directionsService.route(
        {
          origin: pickupLocation,
          destination: deliveryLocation,
          travelMode: google.maps.TravelMode.DRIVING,
          optimizeWaypoints: true,
          // Ajouter des waypoints si entrepôts
          waypoints: warehouseLocations.slice(0, 8).map((w) => ({
            // Max 8 waypoints
            location: { lat: w.lat, lng: w.lng },
            stopover: true,
          })),
        },
        (result, status) => {
          if (status === google.maps.DirectionsStatus.OK && result) {
            setDirections(result);
          }
        },
      );
    }
  }, [showRoute, pickupLocation, deliveryLocation, warehouseLocations, map]);

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
    setIsLoading(false);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  // Gérer les clics sur les marqueurs
  const handleMarkerClick = (location: MapLocation) => {
    setSelectedMarker(location);
    onLocationClick?.(location);
  };

  // Icônes personnalisées pour les marqueurs
  const getMarkerIcon = (type: string, status?: string) => {
    const baseUrl = "/icons/map/";
    switch (type) {
      case "pickup":
        return `${baseUrl}pickup-pin.png`;
      case "delivery":
        return `${baseUrl}delivery-pin.png`;
      case "warehouse":
        return `${baseUrl}warehouse-pin.png`;
      case "deliverer":
        return status === "available"
          ? `${baseUrl}deliverer-available.png`
          : status === "busy"
            ? `${baseUrl}deliverer-busy.png`
            : `${baseUrl}deliverer-offline.png`;
      default:
        return undefined;
    }
  };

  // Zone de service (cercle)
  const serviceZoneOptions = useMemo(
    () => ({
      fillColor: "#4F46E5",
      fillOpacity: 0.1,
      strokeColor: "#4F46E5",
      strokeOpacity: 0.8,
      strokeWeight: 2,
      clickable: false,
      draggable: false,
      editable: false,
      visible: showServiceZone,
      zIndex: 1,
    }),
    [showServiceZone],
  );

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            {t("title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="w-full h-96" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          {t("title")}
          {trackingData && (
            <Badge variant="outline" className="ml-2">
              <Clock className="h-3 w-3 mr-1" />
              ETA: {trackingData.eta}min
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div style={{ height }} className="relative">
          <LoadScript
            googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""}
            libraries={libraries}
          >
            <GoogleMap
              mapContainerStyle={{ width: "100%", height: "100%" }}
              center={mapCenter}
              zoom={zoom}
              options={mapOptions}
              onLoad={onLoad}
              onUnmount={onUnmount}
            >
              {/* Marqueur pickup */}
              {pickupLocation && (
                <Marker
                  position={pickupLocation}
                  icon={getMarkerIcon("pickup")}
                  title={t("pickup")}
                  onClick={() =>
                    handleMarkerClick({
                      lat: pickupLocation.lat,
                      lng: pickupLocation.lng,
                      title: t("pickup"),
                      type: "pickup",
                      address: pickupLocation.address,
                    })
                  }
                />
              )}

              {/* Marqueur delivery */}
              {deliveryLocation && (
                <Marker
                  position={deliveryLocation}
                  icon={getMarkerIcon("delivery")}
                  title={t("delivery")}
                  onClick={() =>
                    handleMarkerClick({
                      lat: deliveryLocation.lat,
                      lng: deliveryLocation.lng,
                      title: t("delivery"),
                      type: "delivery",
                      address: deliveryLocation.address,
                    })
                  }
                />
              )}

              {/* Marqueurs entrepôts */}
              {showWarehouses &&
                warehouseLocations.map((warehouse) => (
                  <Marker
                    key={warehouse.id}
                    position={{ lat: warehouse.lat, lng: warehouse.lng }}
                    icon={getMarkerIcon("warehouse")}
                    title={warehouse.name}
                    onClick={() => {
                      handleMarkerClick({
                        lat: warehouse.lat,
                        lng: warehouse.lng,
                        title: warehouse.name,
                        type: "warehouse",
                        info: warehouse,
                      });
                      onWarehouseClick?.(warehouse.id);
                    }}
                  />
                ))}

              {/* Marqueurs livreurs */}
              {showDeliverers &&
                delivererLocations.map((deliverer) => (
                  <Marker
                    key={deliverer.id}
                    position={{ lat: deliverer.lat, lng: deliverer.lng }}
                    icon={getMarkerIcon("deliverer", deliverer.status)}
                    title={`${deliverer.name} (${deliverer.vehicleType})`}
                    onClick={() => {
                      handleMarkerClick({
                        lat: deliverer.lat,
                        lng: deliverer.lng,
                        title: deliverer.name,
                        type: "deliverer",
                        info: deliverer,
                      });
                      onDelivererClick?.(deliverer.id);
                    }}
                  />
                ))}

              {/* Position utilisateur actuelle */}
              {userLocation && (
                <Marker
                  position={userLocation}
                  icon={{
                    url: "/icons/map/user-location.png",
                    scaledSize: new google.maps.Size(20, 20),
                  }}
                  title={t("yourLocation")}
                />
              )}

              {/* Position temps réel du livreur */}
              {trackingData?.currentPosition && (
                <Marker
                  position={trackingData.currentPosition}
                  icon={{
                    url: "/icons/map/truck-moving.png",
                    scaledSize: new google.maps.Size(32, 32),
                  }}
                  title={t("delivererCurrentPosition")}
                />
              )}

              {/* Itinéraire */}
              {directions && (
                <DirectionsRenderer
                  directions={directions}
                  options={{
                    polylineOptions: {
                      strokeColor: "#4F46E5",
                      strokeWeight: 4,
                      strokeOpacity: 0.8,
                    },
                    suppressMarkers: true, // On utilise nos propres marqueurs
                  }}
                />
              )}

              {/* Zone de service */}
              {showServiceZone && pickupLocation && (
                <Polygon
                  paths={[
                    ...Array.from({ length: 32 }, (_, i) => {
                      const angle = (i / 32) * 2 * Math.PI;
                      const radius = serviceRadius / 111.32; // Conversion km vers degrés approximative
                      return {
                        lat: pickupLocation.lat + radius * Math.cos(angle),
                        lng: pickupLocation.lng + radius * Math.sin(angle),
                      };
                    }),
                  ]}
                  options={serviceZoneOptions}
                />
              )}

              {/* InfoWindow pour marqueur sélectionné */}
              {selectedMarker && (
                <InfoWindow
                  position={{
                    lat: selectedMarker.lat,
                    lng: selectedMarker.lng,
                  }}
                  onCloseClick={() => setSelectedMarker(null)}
                >
                  <div className="p-2 max-w-xs">
                    <h4 className="font-semibold mb-1">
                      {selectedMarker.title}
                    </h4>
                    {selectedMarker.address && (
                      <p className="text-sm text-gray-600 mb-2">
                        {selectedMarker.address}
                      </p>
                    )}

                    {selectedMarker.type === "deliverer" &&
                      selectedMarker.info && (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Truck className="h-4 w-4" />
                            <span className="text-sm">
                              {selectedMarker.info.vehicleType}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm">
                              ⭐ {selectedMarker.info.rating}/5
                            </span>
                            <Badge
                              variant={
                                selectedMarker.info.status === "available"
                                  ? "default"
                                  : "secondary"
                              }
                              className="text-xs"
                            >
                              {t(`status.${selectedMarker.info.status}`)}
                            </Badge>
                          </div>
                        </div>
                      )}

                    {selectedMarker.type === "warehouse" &&
                      selectedMarker.info && (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">
                              Capacité: {selectedMarker.info.currentLoad}/
                              {selectedMarker.info.capacity}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{
                                width: `${(selectedMarker.info.currentLoad / selectedMarker.info.capacity) * 100}%`,
                              }}
                            />
                          </div>
                        </div>
                      )}
                  </div>
                </InfoWindow>
              )}
            </GoogleMap>
          </LoadScript>
        </div>

        {/* Contrôles de la carte */}
        <div className="flex gap-2 mt-4">
          {mode === "view" && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDirections(null)}
                disabled={!directions}
              >
                <Navigation className="h-4 w-4 mr-2" />
                {t("clearRoute")}
              </Button>

              {pickupLocation && deliveryLocation && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (map) {
                      const bounds = new google.maps.LatLngBounds();
                      bounds.extend(pickupLocation);
                      bounds.extend(deliveryLocation);
                      map.fitBounds(bounds);
                    }
                  }}
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  {t("centerOnRoute")}
                </Button>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
