'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';

// Importation des marqueurs personnalisés
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Fix pour les images de marqueurs dans Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon.src,
  iconRetinaUrl: markerIcon2x.src,
  shadowUrl: markerShadow.src,
});

// Styles des marqueurs par type
const pickupIcon = new L.Icon({
  iconUrl: '/images/pickup-marker.png', // À remplacer par l'image réelle
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: markerShadow.src,
  shadowSize: [41, 41],
});

const deliveryIcon = new L.Icon({
  iconUrl: '/images/delivery-marker.png', // À remplacer par l'image réelle
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: markerShadow.src,
  shadowSize: [41, 41],
});

const currentIcon = new L.Icon({
  iconUrl: '/images/current-marker.png', // À remplacer par l'image réelle
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: markerShadow.src,
  shadowSize: [41, 41],
});

// Types
interface DeliveryMarker {
  id: string;
  type: 'pickup' | 'delivery' | 'current';
  latitude: number;
  longitude: number;
  label: string;
  deliveryId: string;
  status: string;
}

interface HeatmapPoint {
  lat: number;
  lng: number;
  intensity?: number;
}

interface MapComponentProps {
  markers: DeliveryMarker[];
  heatmapEnabled?: boolean;
  heatmapPoints?: HeatmapPoint[];
  bounds?: [[number, number], [number, number]] | null;
  selectedDeliveryId?: string | null;
  onMarkerClick?: (markerId: string) => void;
}

export default function MapComponent({
  markers,
  heatmapEnabled = false,
  heatmapPoints = [],
  bounds = null,
  selectedDeliveryId = null,
  onMarkerClick,
}: MapComponentProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const heatLayerRef = useRef<any | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Initialiser la carte
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialiser la carte si elle n'existe pas
    if (!mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current).setView([48.856614, 2.3522219], 13);

      // Ajouter le fond de carte
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors',
      }).addTo(mapRef.current);

      // Créer le groupe de couches pour les marqueurs
      markersLayerRef.current = L.layerGroup().addTo(mapRef.current);
    }

    // Nettoyage
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markersLayerRef.current = null;
        heatLayerRef.current = null;
      }
    };
  }, []);

  // Mettre à jour les marqueurs quand ils changent
  useEffect(() => {
    if (!mapRef.current || !markersLayerRef.current) return;

    // Vider les marqueurs existants
    markersLayerRef.current.clearLayers();

    // Ajouter les nouveaux marqueurs
    markers.forEach(marker => {
      const { id, type, latitude, longitude, label, deliveryId, status } = marker;

      let icon;
      switch (type) {
        case 'pickup':
          icon = pickupIcon;
          break;
        case 'delivery':
          icon = deliveryIcon;
          break;
        case 'current':
          icon = currentIcon;
          break;
        default:
          icon = new L.Icon.Default();
      }

      const markerInstance = L.marker([latitude, longitude], { icon })
        .addTo(markersLayerRef.current!)
        .bindPopup(label);

      // Ajouter une classe spéciale pour les marqueurs sélectionnés
      if (selectedDeliveryId === deliveryId) {
        markerInstance.setZIndexOffset(1000); // Mettre en avant
        const el = markerInstance.getElement();
        if (el) {
          el.classList.add('selected-marker');
        }
      }

      // Gestion des clics sur les marqueurs
      if (onMarkerClick) {
        markerInstance.on('click', () => {
          onMarkerClick(id);
        });
      }
    });

    // Ajuster les limites de la carte si nécessaire
    if (bounds && markers.length > 0) {
      mapRef.current.fitBounds(bounds);
    } else if (markers.length > 0) {
      // Si pas de limites spécifiées mais des marqueurs existent
      const group = L.featureGroup(markers.map(m => L.marker([m.latitude, m.longitude])));
      mapRef.current.fitBounds(group.getBounds(), { padding: [50, 50] });
    }
  }, [markers, selectedDeliveryId, bounds, onMarkerClick]);

  // Gestion de la carte thermique
  useEffect(() => {
    if (!mapRef.current) return;

    // Supprimer la couche thermique existante si elle existe
    if (heatLayerRef.current) {
      mapRef.current.removeLayer(heatLayerRef.current);
      heatLayerRef.current = null;
    }

    // Ajouter la nouvelle couche thermique si activée et points disponibles
    if (heatmapEnabled && heatmapPoints.length > 0) {
      const heatData = heatmapPoints.map(point => {
        return [point.lat, point.lng, point.intensity || 0.5];
      });

      // Configuration de la carte thermique
      heatLayerRef.current = (L as any)
        .heatLayer(heatData, {
          radius: 25,
          blur: 15,
          maxZoom: 17,
          gradient: {
            0.4: 'blue',
            0.6: 'lime',
            0.7: 'yellow',
            0.8: 'orange',
            1.0: 'red',
          },
        })
        .addTo(mapRef.current);
    }
  }, [heatmapEnabled, heatmapPoints]);

  return <div ref={mapContainerRef} className="w-full h-full rounded-md overflow-hidden" />;
}
