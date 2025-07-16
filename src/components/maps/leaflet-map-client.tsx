"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { cn } from "@/lib/utils";

// Fix Leaflet default icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: "/leaflet/marker-icon.png",
  iconRetinaUrl: "/leaflet/marker-icon-2x.png",
  shadowUrl: "/leaflet/marker-shadow.png",
});

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
  icon?: L.Icon;
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

export default function LeafletMapClient({
  center = [48.8566, 2.3522], // Paris by default
  zoom = 13,
  height = "400px",
  markers = [],
  routes = [],
  enableGeolocation = false,
  enableDrawing = false,
  onMarkerClick,
  onMapClick,
  className,
}: LeafletMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const routesRef = useRef<Map<string, L.Polyline>>(new Map());
  const [userLocation, setUserLocation] = useState<[number, number] | null>(
    null,
  );

  // Initialize map
  useEffect(() => {
    if (!mapRef.current) {
      const map = L.map("leaflet-map").setView(center, zoom);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
      }).addTo(map);

      if (onMapClick) {
        map.on("click", (e) => {
          onMapClick(e.latlng.lat, e.latlng.lng);
        });
      }

      mapRef.current = map;
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update center and zoom
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setView(center, zoom);
    }
  }, [center, zoom]);

  // Handle markers
  useEffect(() => {
    if (!mapRef.current) return;

    // Remove old markers
    markersRef.current.forEach((marker) => {
      marker.remove();
    });
    markersRef.current.clear();

    // Add new markers
    markers.forEach((markerData) => {
      const icon = markerData.icon || createIcon(markerData.type);
      const marker = L.marker(markerData.position, { icon });

      if (markerData.popup) {
        marker.bindPopup(markerData.popup);
      }

      if (markerData.label) {
        marker.bindTooltip(markerData.label, { permanent: false });
      }

      if (onMarkerClick) {
        marker.on("click", () => onMarkerClick(markerData));
      }

      marker.addTo(mapRef.current!);
      markersRef.current.set(markerData.id, marker);
    });
  }, [markers, onMarkerClick]);

  // Handle routes
  useEffect(() => {
    if (!mapRef.current) return;

    // Remove old routes
    routesRef.current.forEach((route) => {
      route.remove();
    });
    routesRef.current.clear();

    // Add new routes
    routes.forEach((routeData) => {
      const polyline = L.polyline(routeData.points, {
        color: routeData.color || "#3B82F6",
        weight: routeData.weight || 4,
        opacity: routeData.opacity || 0.8,
      });

      polyline.addTo(mapRef.current!);
      routesRef.current.set(routeData.id, polyline);
    });
  }, [routes]);

  // Handle geolocation (temporairement désactivé pour éviter les erreurs de compilation)
  useEffect(() => {
    if (!mapRef.current || !enableGeolocation) return;

    // Géolocalisation simple sans contrôle personnalisé
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const userPos: [number, number] = [latitude, longitude];
          setUserLocation(userPos);
          mapRef.current?.setView(userPos, 15);

          // Add user marker
          L.marker(userPos, {
            icon: createIcon("custom", "#10B981"),
          })
            .bindPopup("Vous êtes ici")
            .addTo(mapRef.current!);
        },
        (error) => {
          console.error("Geolocation error:", error);
        },
      );
    }
  }, [enableGeolocation]);

  return (
    <div
      id="leaflet-map"
      className={cn("w-full", className)}
      style={{ height }}
    />
  );
}

// Helper function to create custom icons
function createIcon(type: string, color?: string): L.Icon | L.DivIcon {
  const colors = {
    pickup: "#3B82F6",
    delivery: "#10B981",
    deliverer: "#F59E0B",
    warehouse: "#6366F1",
    storage: "#8B5CF6",
    custom: color || "#6B7280",
  };

  const svgIcon = `
    <svg width="25" height="41" viewBox="0 0 25 41" xmlns="http://www.w3.org/2000/svg">
      <path d="M12.5 0C5.6 0 0 5.6 0 12.5C0 19.4 12.5 41 12.5 41S25 19.4 25 12.5C25 5.6 19.4 0 12.5 0Z" fill="${colors[type as keyof typeof colors] || colors.custom}"/>
      <circle cx="12.5" cy="12.5" r="6" fill="white"/>
    </svg>
  `;

  return L.divIcon({
    html: svgIcon,
    iconSize: [25, 41],
    iconAnchor: [12.5, 41],
    popupAnchor: [0, -35],
    className: "custom-div-icon",
  });
} 