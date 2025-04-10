"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Loader2 } from "lucide-react";

interface RouteMapProps {
  origin: { lat: number; lng: number } | null;
  destination: { lat: number; lng: number } | null;
  route: Array<{ lat: number; lng: number }> | null;
  height?: number;
  className?: string;
}

export function RouteMap({
  origin,
  destination,
  route,
  height = 400,
  className = "",
}: RouteMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  
  // Initialiser la carte et l'itinéraire
  useEffect(() => {
    // Si les éléments nécessaires ne sont pas présents, ne rien faire
    if (!mapRef.current || !origin || !destination) {
      return;
    }
    
    // Charger la bibliothèque Leaflet
    const loadLeaflet = async () => {
      // Si une carte existe déjà, la détruire pour éviter les fuites de mémoire
      if (leafletMap.current) {
        leafletMap.current.remove();
      }
      
      // Créer une nouvelle carte
      const map = L.map(mapRef.current).setView([origin.lat, origin.lng], 13);
      
      // Ajouter la couche de tuiles OpenStreetMap
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);
      
      // Ajouter un marqueur pour l'origine
      const originIcon = L.icon({
        iconUrl: "/icons/origin-marker.svg",
        iconSize: [30, 30],
        iconAnchor: [15, 30],
        popupAnchor: [0, -30],
      });
      
      L.marker([origin.lat, origin.lng], { icon: originIcon })
        .addTo(map)
        .bindPopup("Point de départ")
        .openPopup();
      
      // Ajouter un marqueur pour la destination
      const destinationIcon = L.icon({
        iconUrl: "/icons/destination-marker.svg",
        iconSize: [30, 30],
        iconAnchor: [15, 30],
        popupAnchor: [0, -30],
      });
      
      L.marker([destination.lat, destination.lng], { icon: destinationIcon })
        .addTo(map)
        .bindPopup("Point d'arrivée");
      
      // Ajouter l'itinéraire s'il est disponible
      if (route && route.length > 0) {
        const routeLatLngs = route.map((point) => [point.lat, point.lng] as [number, number]);
        
        L.polyline(routeLatLngs, {
          color: "#3b82f6",
          weight: 5,
          opacity: 0.7,
        }).addTo(map);
      } else {
        // S'il n'y a pas d'itinéraire, tracer une ligne droite
        L.polyline(
          [
            [origin.lat, origin.lng],
            [destination.lat, destination.lng],
          ],
          {
            color: "#3b82f6",
            weight: 5,
            opacity: 0.7,
            dashArray: "10, 10",
          }
        ).addTo(map);
      }
      
      // Ajuster la vue pour inclure l'origine et la destination
      const bounds = L.latLngBounds(
        [origin.lat, origin.lng],
        [destination.lat, destination.lng]
      );
      map.fitBounds(bounds, { padding: [30, 30] });
      
      // Stocker la référence pour la nettoyer plus tard
      leafletMap.current = map;
    };
    
    loadLeaflet();
    
    // Nettoyer la carte lors du démontage du composant
    return () => {
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
      }
    };
  }, [origin, destination, route]);
  
  // Si aucune coordonnée n'est disponible, afficher un message
  if (!origin || !destination) {
    return (
      <div
        className={`flex items-center justify-center bg-muted ${className}`}
        style={{ height: `${height}px` }}
      >
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            En attente des coordonnées...
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div
      ref={mapRef}
      className={`w-full ${className}`}
      style={{ height: `${height}px` }}
    />
  );
}