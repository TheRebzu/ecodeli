"use client";

import { useEffect, useState } from "react";

interface MapComponentProps {
  pickup: string;
  delivery: string;
  currentLocation?: {
    lat: number;
    lng: number;
  };
  delivererName: string;
}

export default function MapComponent({
  pickup,
  delivery,
  currentLocation,
  delivererName,
}: MapComponentProps) {
  const [mapError, setMapError] = useState(false);

  useEffect(() => {
    // Simuler le chargement d'une carte
    // Dans un vrai projet, vous intégreriez Google Maps, Mapbox, ou Leaflet
    const timer = setTimeout(() => {
      setMapError(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (mapError) {
    return (
      <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-400 text-lg mb-2">🗺️</div>
          <p className="text-gray-600 text-sm">
            Carte temporairement indisponible
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-64 bg-gradient-to-br from-green-50 to-blue-50 rounded-lg relative overflow-hidden">
      {/* Simulation d'une carte */}
      <div className="absolute inset-0 bg-gray-100 opacity-50"></div>

      {/* Points de repère */}
      <div className="absolute top-4 left-4 bg-white rounded-lg p-3 shadow-sm max-w-xs">
        <div className="flex items-center space-x-2 mb-2">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <span className="text-sm font-medium">Collecte</span>
        </div>
        <p className="text-xs text-gray-600 truncate">{pickup}</p>
      </div>

      <div className="absolute top-4 right-4 bg-white rounded-lg p-3 shadow-sm max-w-xs">
        <div className="flex items-center space-x-2 mb-2">
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          <span className="text-sm font-medium">Livraison</span>
        </div>
        <p className="text-xs text-gray-600 truncate">{delivery}</p>
      </div>

      {/* Position actuelle du livreur */}
      {currentLocation && (
        <div className="absolute bottom-4 left-4 bg-blue-600 text-white rounded-lg p-3 shadow-sm">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-blue-300 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium">{delivererName}</span>
          </div>
          <p className="text-xs opacity-90">Position actuelle</p>
        </div>
      )}

      {/* Ligne de trajet simulée */}
      <svg className="absolute inset-0 w-full h-full">
        <defs>
          <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#EF4444" />
          </linearGradient>
        </defs>
        <path
          d="M 50 80 Q 150 40 250 200"
          stroke="url(#routeGradient)"
          strokeWidth="3"
          fill="none"
          strokeDasharray="5,5"
          className="animate-pulse"
        />
      </svg>

      {/* Indicateur de temps réel */}
      <div className="absolute bottom-4 right-4 bg-white rounded-full p-2 shadow-sm">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
      </div>

      <div className="absolute bottom-12 right-4 bg-white rounded-lg px-2 py-1 shadow-sm">
        <span className="text-xs text-gray-600">Live</span>
      </div>
    </div>
  );
}
