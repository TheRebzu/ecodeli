"use client";

import React, { useState, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Popup,
} from "react-leaflet";
import { Icon, LatLngBounds, LatLng } from "leaflet";
import "leaflet/dist/leaflet.css";

// Icônes
const createIcon = (color: string, emoji: string) =>
  new Icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28">
      <circle cx="14" cy="14" r="13" fill="${color}" stroke="white" stroke-width="2"/>
      <text x="14" y="18" text-anchor="middle" font-size="14" fill="white">${emoji}</text>
    </svg>
  `)}`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28],
  });

const pickupIcon = createIcon("#3B82F6", "📦");
const deliveryIcon = createIcon("#EF4444", "🏠");

interface RoutePreviewProps {
  pickupAddress: string;
  deliveryAddress: string;
  pickupCoordinates: { lat: number; lng: number };
  deliveryCoordinates: { lat: number; lng: number };
  route?: {
    polyline: [number, number][];
    distance: number;
    duration: number;
    instructions?: string[];
  };
  pricing?: {
    basePrice: number;
    distancePrice: number;
    urgentSurcharge?: number;
    subscriptionDiscount?: number;
    finalPrice: number;
    currency: string;
  };
  onRouteCalculated?: (route: any) => void;
  showPricing?: boolean;
  showInstructions?: boolean;
  className?: string;
  height?: string;
}

export const RoutePreview: React.FC<RoutePreviewProps> = ({
  pickupAddress,
  deliveryAddress,
  pickupCoordinates,
  deliveryCoordinates,
  route,
  pricing,
  onRouteCalculated,
  showPricing = true,
  showInstructions = false,
  className = "",
  height = "400px",
}) => {
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [localRoute, setLocalRoute] = useState(route);

  // Calculer la route automatiquement si pas fournie
  useEffect(() => {
    if (
      !route &&
      pickupCoordinates &&
      deliveryCoordinates &&
      onRouteCalculated
    ) {
      calculateRoute();
    }
  }, [pickupCoordinates, deliveryCoordinates, route, onRouteCalculated]);

  const calculateRoute = async () => {
    setIsCalculatingRoute(true);
    setRouteError(null);

    try {
      // Utiliser OSRM pour calculer la route
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/` +
          `${pickupCoordinates.lng},${pickupCoordinates.lat};` +
          `${deliveryCoordinates.lng},${deliveryCoordinates.lat}` +
          `?overview=full&geometries=geojson&steps=true`,
      );

      if (!response.ok) {
        throw new Error("Service de routing temporairement indisponible");
      }

      const data = await response.json();

      if (data.routes && data.routes.length > 0) {
        const osrmRoute = data.routes[0];

        // Convertir la géométrie en polyline Leaflet
        const polyline: [number, number][] = osrmRoute.geometry.coordinates.map(
          (coord: [number, number]) => [coord[1], coord[0]], // Inverser lng,lat vers lat,lng
        );

        // Extraire les instructions
        const instructions =
          osrmRoute.legs?.[0]?.steps?.map(
            (step: any) => step.maneuver?.instruction || "Continuer",
          ) || [];

        const calculatedRoute = {
          polyline,
          distance: osrmRoute.distance, // en mètres
          duration: osrmRoute.duration, // en secondes
          instructions,
        };

        setLocalRoute(calculatedRoute);
        onRouteCalculated?.(calculatedRoute);
      } else {
        // Fallback: ligne droite
        const fallbackRoute = {
          polyline: [
            [pickupCoordinates.lat, pickupCoordinates.lng],
            [deliveryCoordinates.lat, deliveryCoordinates.lng],
          ] as [number, number][],
          distance:
            calculateHaversineDistance(
              pickupCoordinates.lat,
              pickupCoordinates.lng,
              deliveryCoordinates.lat,
              deliveryCoordinates.lng,
            ) * 1000, // en mètres
          duration: 0,
          instructions: ["Ligne droite (route détaillée indisponible)"],
        };

        setLocalRoute(fallbackRoute);
        onRouteCalculated?.(fallbackRoute);
      }
    } catch (error) {
      console.error("Erreur calcul route:", error);
      setRouteError(error instanceof Error ? error.message : "Erreur inconnue");

      // Fallback en cas d'erreur
      const fallbackRoute = {
        polyline: [
          [pickupCoordinates.lat, pickupCoordinates.lng],
          [deliveryCoordinates.lat, deliveryCoordinates.lng],
        ] as [number, number][],
        distance:
          calculateHaversineDistance(
            pickupCoordinates.lat,
            pickupCoordinates.lng,
            deliveryCoordinates.lat,
            deliveryCoordinates.lng,
          ) * 1000,
        duration: 0,
        instructions: [],
      };

      setLocalRoute(fallbackRoute);
    } finally {
      setIsCalculatingRoute(false);
    }
  };

  // Calcul distance haversine (approximation)
  const calculateHaversineDistance = (
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number => {
    const R = 6371; // Rayon de la Terre en km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Calculer les bounds pour la carte
  const getMapBounds = () => {
    const points = [
      new LatLng(pickupCoordinates.lat, pickupCoordinates.lng),
      new LatLng(deliveryCoordinates.lat, deliveryCoordinates.lng),
    ];

    if (localRoute?.polyline) {
      localRoute.polyline.forEach((point) => {
        points.push(new LatLng(point[0], point[1]));
      });
    }

    return new LatLngBounds(points);
  };

  const currentRoute = localRoute || route;

  return (
    <div className={`route-preview ${className}`}>
      {/* Informations de la route */}
      <div className="mb-4 space-y-3">
        {/* Adresses */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <span className="text-blue-600 text-xl">📦</span>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-blue-900 mb-1">Récupération</h4>
              <p className="text-sm text-blue-700 break-words">
                {pickupAddress}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
            <span className="text-red-600 text-xl">🏠</span>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-red-900 mb-1">Livraison</h4>
              <p className="text-sm text-red-700 break-words">
                {deliveryAddress}
              </p>
            </div>
          </div>
        </div>

        {/* Informations de distance et temps */}
        {currentRoute && (
          <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex gap-6 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-gray-500">📏</span>
                <span className="font-medium text-gray-900">
                  {(currentRoute.distance / 1000).toFixed(1)} km
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500">⏱️</span>
                <span className="font-medium text-gray-900">
                  {Math.round(currentRoute.duration / 60)} min
                </span>
              </div>
            </div>

            {isCalculatingRoute && (
              <div className="flex items-center gap-2 text-blue-600">
                <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                <span className="text-sm">Calcul...</span>
              </div>
            )}

            {routeError && (
              <div className="text-red-600 text-sm">⚠️ {routeError}</div>
            )}
          </div>
        )}

        {/* Tarification */}
        {showPricing && pricing && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <h4 className="font-medium text-green-900 mb-3">💰 Tarification</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-green-700">Prix de base:</span>
                <span className="font-medium text-green-900">
                  {pricing.basePrice.toFixed(2)} {pricing.currency}
                </span>
              </div>

              {currentRoute && (
                <div className="flex justify-between">
                  <span className="text-green-700">
                    Distance ({(currentRoute.distance / 1000).toFixed(1)} km):
                  </span>
                  <span className="font-medium text-green-900">
                    {pricing.distancePrice.toFixed(2)} {pricing.currency}
                  </span>
                </div>
              )}

              {pricing.urgentSurcharge && pricing.urgentSurcharge > 0 && (
                <div className="flex justify-between">
                  <span className="text-orange-700">Supplément urgent:</span>
                  <span className="font-medium text-orange-900">
                    +{pricing.urgentSurcharge.toFixed(2)} {pricing.currency}
                  </span>
                </div>
              )}

              {pricing.subscriptionDiscount &&
                pricing.subscriptionDiscount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-blue-700">Remise abonnement:</span>
                    <span className="font-medium text-blue-900">
                      -{pricing.subscriptionDiscount.toFixed(2)}{" "}
                      {pricing.currency}
                    </span>
                  </div>
                )}

              <hr className="border-green-300" />
              <div className="flex justify-between text-base font-semibold">
                <span className="text-green-800">Total:</span>
                <span className="text-green-900">
                  {pricing.finalPrice.toFixed(2)} {pricing.currency}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Carte */}
      <div
        className="border border-gray-300 rounded-lg overflow-hidden"
        style={{ height }}
      >
        <MapContainer
          bounds={getMapBounds()}
          style={{ height: "100%", width: "100%" }}
          zoomControl={true}
          attributionControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Route polyline */}
          {currentRoute?.polyline && currentRoute.polyline.length > 1 && (
            <Polyline
              positions={currentRoute.polyline}
              color="#3B82F6"
              weight={4}
              opacity={0.7}
              dashArray={currentRoute.duration === 0 ? "10, 10" : undefined}
            />
          )}

          {/* Marqueur récupération */}
          <Marker
            position={[pickupCoordinates.lat, pickupCoordinates.lng]}
            icon={pickupIcon}
          >
            <Popup>
              <div className="p-2 max-w-xs">
                <h4 className="font-semibold mb-1">📦 Point de récupération</h4>
                <p className="text-sm text-gray-600 break-words">
                  {pickupAddress}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {pickupCoordinates.lat.toFixed(6)},{" "}
                  {pickupCoordinates.lng.toFixed(6)}
                </p>
              </div>
            </Popup>
          </Marker>

          {/* Marqueur livraison */}
          <Marker
            position={[deliveryCoordinates.lat, deliveryCoordinates.lng]}
            icon={deliveryIcon}
          >
            <Popup>
              <div className="p-2 max-w-xs">
                <h4 className="font-semibold mb-1">🏠 Point de livraison</h4>
                <p className="text-sm text-gray-600 break-words">
                  {deliveryAddress}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {deliveryCoordinates.lat.toFixed(6)},{" "}
                  {deliveryCoordinates.lng.toFixed(6)}
                </p>
              </div>
            </Popup>
          </Marker>
        </MapContainer>
      </div>

      {/* Instructions de navigation */}
      {showInstructions &&
        currentRoute?.instructions &&
        currentRoute.instructions.length > 0 && (
          <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-3">
              🧭 Instructions de navigation
            </h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {currentRoute.instructions.map((instruction, index) => (
                <div key={index} className="flex items-start gap-3 text-sm">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">
                    {index + 1}
                  </span>
                  <span className="text-gray-700">{instruction}</span>
                </div>
              ))}
            </div>
          </div>
        )}
    </div>
  );
};

export default RoutePreview;
