"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";

// Vérification côté client
const useIsClient = () => {
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  return isClient;
};

// Import dynamique de Leaflet seulement côté client
const LeafletMapComponent = dynamic(
  () => import("./leaflet-map-client"),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 bg-gray-200 animate-pulse rounded-lg flex items-center justify-center">
        Chargement de la carte...
      </div>
    ),
  }
);

export interface MapMarker {
  id: string;
  position: [number, number];
  type:
    | "pickup"
    | "delivery"
    | "deliverer"
    | "warehouse"
    | "storage"
    | "custom";
  label?: string;
  popup?: string;
  icon?: any; // Utilisation d'any pour éviter les problèmes de type avec L.Icon | L.DivIcon
}

export interface MapRoute {
  id: string;
  points: [number, number][];
  color?: string;
  weight?: number;
  opacity?: number;
}

interface LeafletMapProps {
  center?: [number, number];
  zoom?: number;
  height?: string;
  markers?: MapMarker[];
  routes?: MapRoute[];
  enableGeolocation?: boolean;
  enableDrawing?: boolean;
  onMarkerClick?: (marker: MapMarker) => void;
  onMapClick?: (lat: number, lng: number) => void;
  className?: string;
}

export function LeafletMap(props: LeafletMapProps) {
  const isClient = useIsClient();
  
  if (!isClient) {
    return (
      <div className="h-64 bg-gray-200 animate-pulse rounded-lg flex items-center justify-center">
        Chargement de la carte...
      </div>
    );
  }
  
  return <LeafletMapComponent {...props} />;
}
