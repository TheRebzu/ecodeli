"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Loader2 } from "lucide-react";

interface MapViewProps {
  pickupCoordinates?: { lat: number; lng: number } | null;
  deliveryCoordinates?: { lat: number; lng: number } | null;
  announcements?: any[];
  height?: number;
  className?: string;
}

export function MapView({
  pickupCoordinates,
  deliveryCoordinates,
  announcements,
  height = 400,
  className = "",
}: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  
  // Initialiser la carte
  useEffect(() => {
    // Si l'élément n'est pas présent, ne rien faire
    if (!mapRef.current) {
      return;
    }
    
    // Charger la bibliothèque Leaflet
    const loadLeaflet = async () => {
      // Si une carte existe déjà, la détruire pour éviter les fuites de mémoire
      if (leafletMap.current) {
        leafletMap.current.remove();
      }
      
      // Déterminer la vue initiale
      let initialLat = 48.866667; // Paris par défaut
      let initialLng = 2.333333;
      let initialZoom = 5; // Zoom France
      
      if (pickupCoordinates && deliveryCoordinates) {
        // Si on a à la fois un point de départ et d'arrivée, centrer entre les deux
        initialLat = (pickupCoordinates.lat + deliveryCoordinates.lat) / 2;
        initialLng = (pickupCoordinates.lng + deliveryCoordinates.lng) / 2;
        initialZoom = 10; // Zoom plus précis
      } else if (pickupCoordinates) {
        // Si on a seulement un point de départ
        initialLat = pickupCoordinates.lat;
        initialLng = pickupCoordinates.lng;
        initialZoom = 13; // Zoom très précis
      } else if (deliveryCoordinates) {
        // Si on a seulement un point d'arrivée
        initialLat = deliveryCoordinates.lat;
        initialLng = deliveryCoordinates.lng;
        initialZoom = 13; // Zoom très précis
      } else if (announcements && announcements.length > 0) {
        // Si on a des annonces, essayer de centrer sur elles
        const validAnnouncements = announcements.filter(
          a => a.pickupCoordinates && a.deliveryCoordinates
        );
        
        if (validAnnouncements.length > 0) {
          // Calculer le centre des annonces
          let totalLat = 0;
          let totalLng = 0;
          
          validAnnouncements.forEach(a => {
            totalLat += (a.pickupCoordinates.lat + a.deliveryCoordinates.lat) / 2;
            totalLng += (a.pickupCoordinates.lng + a.deliveryCoordinates.lng) / 2;
          });
          
          initialLat = totalLat / validAnnouncements.length;
          initialLng = totalLng / validAnnouncements.length;
          initialZoom = 8; // Zoom intermédiaire
        }
      }
      
      // Créer une nouvelle carte
      const map = L.map(mapRef.current).setView([initialLat, initialLng], initialZoom);
      
      // Ajouter la couche de tuiles OpenStreetMap
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);
      
      // Ajouter des marqueurs et lignes si on a des points
      if (pickupCoordinates && deliveryCoordinates) {
        // Ajouter un marqueur pour le point de départ
        const originIcon = L.icon({
          iconUrl: "/icons/origin-marker.svg",
          iconSize: [30, 30],
          iconAnchor: [15, 30],
          popupAnchor: [0, -30],
        });
        
        L.marker([pickupCoordinates.lat, pickupCoordinates.lng], { icon: originIcon })
          .addTo(map)
          .bindPopup("Point de départ")
          .openPopup();
        
        // Ajouter un marqueur pour le point d'arrivée
        const destinationIcon = L.icon({
          iconUrl: "/icons/destination-marker.svg",
          iconSize: [30, 30],
          iconAnchor: [15, 30],
          popupAnchor: [0, -30],
        });
        
        L.marker([deliveryCoordinates.lat, deliveryCoordinates.lng], { icon: destinationIcon })
          .addTo(map)
          .bindPopup("Point d'arrivée");
        
        // Tracer une ligne droite entre les deux points
        L.polyline(
          [
            [pickupCoordinates.lat, pickupCoordinates.lng],
            [deliveryCoordinates.lat, deliveryCoordinates.lng],
          ],
          {
            color: "#3b82f6",
            weight: 3,
            opacity: 0.7,
            dashArray: "10, 5",
          }
        ).addTo(map);
        
        // Ajuster la vue pour inclure les deux points
        const bounds = L.latLngBounds(
          [pickupCoordinates.lat, pickupCoordinates.lng],
          [deliveryCoordinates.lat, deliveryCoordinates.lng]
        );
        map.fitBounds(bounds, { padding: [30, 30] });
      } else if (announcements && announcements.length > 0) {
        // Ajouter les annonces sur la carte
        const bounds = L.latLngBounds([]);
        
        announcements.forEach(announcement => {
          if (
            announcement.pickupCoordinates &&
            announcement.deliveryCoordinates
          ) {
            // Point de départ
            const pickupIcon = L.icon({
              iconUrl: "/icons/origin-marker.svg",
              iconSize: [20, 20],
              iconAnchor: [10, 20],
              popupAnchor: [0, -20],
            });
            
            const pickupMarker = L.marker(
              [announcement.pickupCoordinates.lat, announcement.pickupCoordinates.lng], 
              { icon: pickupIcon }
            )
              .addTo(map)
              .bindPopup(`
                <strong>${announcement.title}</strong><br/>
                Point de départ<br/>
                ${announcement.pickupCity}, ${announcement.pickupPostalCode}
              `);
            
            // Point d'arrivée
            const deliveryIcon = L.icon({
              iconUrl: "/icons/destination-marker.svg",
              iconSize: [20, 20],
              iconAnchor: [10, 20],
              popupAnchor: [0, -20],
            });
            
            const deliveryMarker = L.marker(
              [announcement.deliveryCoordinates.lat, announcement.deliveryCoordinates.lng], 
              { icon: deliveryIcon }
            )
              .addTo(map)
              .bindPopup(`
                <strong>${announcement.title}</strong><br/>
                Point d'arrivée<br/>
                ${announcement.deliveryCity}, ${announcement.deliveryPostalCode}
              `);
            
            // Ligne reliant les deux points
            L.polyline(
              [
                [announcement.pickupCoordinates.lat, announcement.pickupCoordinates.lng],
                [announcement.deliveryCoordinates.lat, announcement.deliveryCoordinates.lng],
              ],
              {
                color: "#3b82f6",
                weight: 2,
                opacity: 0.5,
                dashArray: "5, 5",
              }
            ).addTo(map);
            
            // Étendre les limites pour inclure ces points
            bounds.extend([announcement.pickupCoordinates.lat, announcement.pickupCoordinates.lng]);
            bounds.extend([announcement.deliveryCoordinates.lat, announcement.deliveryCoordinates.lng]);
          }
        });
        
        // Ajuster la vue pour inclure toutes les annonces
        if (!bounds.isEmpty()) {
          map.fitBounds(bounds, { padding: [30, 30] });
        }
      }
      
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
  }, [pickupCoordinates, deliveryCoordinates, announcements]);
  
  // Si les données ne sont pas encore disponibles
  const isLoading = !mapRef.current || 
    (!pickupCoordinates && !deliveryCoordinates && (!announcements || announcements.length === 0));
  
  if (isLoading) {
    return (
      <div
        className={`flex items-center justify-center bg-muted ${className}`}
        style={{ height: `${height}px` }}
      >
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Chargement de la carte...
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