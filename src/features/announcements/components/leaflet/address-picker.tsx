"use client";

import React, { useState, useEffect, useCallback } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import { Icon, LatLng } from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix pour les icônes Leaflet en Next.js
const createIcon = (color: string) =>
  new Icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" width="24" height="24">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
    </svg>
  `)}`,
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -24],
  });

const pickupIcon = createIcon("#3B82F6"); // Bleu
const deliveryIcon = createIcon("#EF4444"); // Rouge

interface AddressPickerProps {
  pickupAddress?: string;
  deliveryAddress?: string;
  pickupCoordinates?: { lat: number; lng: number };
  deliveryCoordinates?: { lat: number; lng: number };
  onPickupSelect?: (
    address: string,
    coordinates: { lat: number; lng: number },
  ) => void;
  onDeliverySelect?: (
    address: string,
    coordinates: { lat: number; lng: number },
  ) => void;
  mode?: "pickup" | "delivery" | "both";
  className?: string;
  height?: string;
}

export const AddressPicker: React.FC<AddressPickerProps> = ({
  pickupAddress = "",
  deliveryAddress = "",
  pickupCoordinates,
  deliveryCoordinates,
  onPickupSelect,
  onDeliverySelect,
  mode = "both",
  className = "",
  height = "400px",
}) => {
  const [map, setMap] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeMode, setActiveMode] = useState<"pickup" | "delivery">("pickup");

  // Position par défaut (Paris)
  const defaultCenter: [number, number] = [48.8566, 2.3522];

  // Geocoding avec Nominatim
  const searchAddress = useCallback(async (query: string) => {
    if (!query || query.length < 3) return [];

    try {
      setIsSearching(true);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?` +
          `q=${encodeURIComponent(query)}&` +
          `format=json&` +
          `limit=5&` +
          `countrycodes=fr&` +
          `addressdetails=1`,
      );
      const results = await response.json();

      return results.map((result: any) => ({
        display_name: result.display_name,
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon),
        address_parts: result.address,
      }));
    } catch (error) {
      console.error("Erreur geocoding:", error);
      return [];
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Géocodage inversé (coordonnées → adresse)
  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?` +
          `lat=${lat}&` +
          `lon=${lng}&` +
          `format=json&` +
          `addressdetails=1`,
      );
      const result = await response.json();
      return result.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    } catch (error) {
      console.error("Erreur reverse geocoding:", error);
      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }
  }, []);

  // Recherche d'adresses avec debounce
  useEffect(() => {
    if (!searchQuery) {
      setSearchResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      const results = await searchAddress(searchQuery);
      setSearchResults(results);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, searchAddress]);

  // Composant pour gérer les clics sur la carte
  const MapClickHandler = () => {
    useMapEvents({
      click: async (e) => {
        const { lat, lng } = e.latlng;
        const address = await reverseGeocode(lat, lng);

        if (activeMode === "pickup" && onPickupSelect) {
          onPickupSelect(address, { lat, lng });
        } else if (activeMode === "delivery" && onDeliverySelect) {
          onDeliverySelect(address, { lat, lng });
        }
      },
    });
    return null;
  };

  // Sélectionner une adresse depuis les résultats de recherche
  const selectAddress = (result: any) => {
    const coordinates = { lat: result.lat, lng: result.lng };

    if (activeMode === "pickup" && onPickupSelect) {
      onPickupSelect(result.display_name, coordinates);
    } else if (activeMode === "delivery" && onDeliverySelect) {
      onDeliverySelect(result.display_name, coordinates);
    }

    // Centrer la carte sur la nouvelle position
    if (map) {
      map.setView([result.lat, result.lng], 15);
    }

    setSearchQuery("");
    setSearchResults([]);
  };

  // Calculer le centre de la carte
  const getMapCenter = (): [number, number] => {
    if (pickupCoordinates && deliveryCoordinates) {
      // Centre entre les deux points
      return [
        (pickupCoordinates.lat + deliveryCoordinates.lat) / 2,
        (pickupCoordinates.lng + deliveryCoordinates.lng) / 2,
      ];
    }

    if (pickupCoordinates)
      return [pickupCoordinates.lat, pickupCoordinates.lng];
    if (deliveryCoordinates)
      return [deliveryCoordinates.lat, deliveryCoordinates.lng];

    return defaultCenter;
  };

  return (
    <div className={`address-picker ${className}`}>
      {/* Contrôles de mode si mode 'both' */}
      {mode === "both" && (
        <div className="mb-4 flex gap-2">
          <button
            type="button"
            onClick={() => setActiveMode("pickup")}
            className={`px-4 py-2 rounded font-medium transition-colors ${
              activeMode === "pickup"
                ? "bg-blue-500 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            📦 Point de récupération
          </button>
          <button
            type="button"
            onClick={() => setActiveMode("delivery")}
            className={`px-4 py-2 rounded font-medium transition-colors ${
              activeMode === "delivery"
                ? "bg-red-500 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            🏠 Point de livraison
          </button>
        </div>
      )}

      {/* Barre de recherche */}
      <div className="mb-4 relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={`Rechercher une adresse pour ${
            activeMode === "pickup" ? "la récupération" : "la livraison"
          }...`}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />

        {isSearching && (
          <div className="absolute right-3 top-3">
            <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          </div>
        )}

        {/* Résultats de recherche */}
        {searchResults.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {searchResults.map((result, index) => (
              <button
                key={index}
                type="button"
                onClick={() => selectAddress(result)}
                className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
              >
                <div className="font-medium text-gray-900 truncate">
                  {result.display_name}
                </div>
                <div className="text-sm text-gray-500">
                  Cliquer pour sélectionner
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Adresses sélectionnées */}
      <div className="mb-4 space-y-2">
        {(mode === "pickup" || mode === "both") && pickupAddress && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
              <span className="text-blue-600">📦</span>
              <div>
                <div className="font-medium text-blue-900">Récupération</div>
                <div className="text-sm text-blue-700">{pickupAddress}</div>
              </div>
            </div>
          </div>
        )}

        {(mode === "delivery" || mode === "both") && deliveryAddress && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-2">
              <span className="text-red-600">🏠</span>
              <div>
                <div className="font-medium text-red-900">Livraison</div>
                <div className="text-sm text-red-700">{deliveryAddress}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Carte Leaflet */}
      <div
        className="relative border border-gray-300 rounded-lg overflow-hidden"
        style={{ height }}
      >
        <MapContainer
          center={getMapCenter()}
          zoom={13}
          style={{ height: "100%", width: "100%" }}
          ref={setMap}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapClickHandler />

          {/* Marqueur de récupération */}
          {pickupCoordinates && (mode === "pickup" || mode === "both") && (
            <Marker
              position={[pickupCoordinates.lat, pickupCoordinates.lng]}
              icon={pickupIcon}
            />
          )}

          {/* Marqueur de livraison */}
          {deliveryCoordinates && (mode === "delivery" || mode === "both") && (
            <Marker
              position={[deliveryCoordinates.lat, deliveryCoordinates.lng]}
              icon={deliveryIcon}
            />
          )}
        </MapContainer>

        {/* Instructions en overlay */}
        <div className="absolute top-2 left-2 bg-white bg-opacity-90 p-2 rounded shadow text-xs text-gray-600 max-w-48">
          {mode === "both"
            ? `🔍 Recherchez ou cliquez sur la carte pour placer le point ${activeMode === "pickup" ? "de récupération" : "de livraison"}`
            : "🔍 Recherchez ou cliquez sur la carte pour sélectionner une adresse"}
        </div>
      </div>
    </div>
  );
};

export default AddressPicker;
