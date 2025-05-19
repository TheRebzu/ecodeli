'use client';

import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, useMap, ZoomControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { cn } from '@/lib/utils';

// Correction pour les icônes en SSR/CSR
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Types de base pour la carte
export type MapPoint = {
  lat: number;
  lng: number;
  label?: string;
};

export type MapBounds = {
  northEast: MapPoint;
  southWest: MapPoint;
};

export type LeafletMapProps = {
  center?: MapPoint;
  zoom?: number;
  minZoom?: number;
  maxZoom?: number;
  height?: string | number;
  width?: string | number;
  className?: string;
  markers?: React.ReactNode;
  polylines?: React.ReactNode;
  polygons?: React.ReactNode;
  circles?: React.ReactNode;
  overlays?: React.ReactNode;
  controls?: React.ReactNode;
  bounds?: MapBounds;
  children?: React.ReactNode;
  onMapReady?: (map: L.Map) => void;
  onMapClick?: (e: L.LeafletMouseEvent) => void;
  onMoveEnd?: (center: MapPoint, zoom: number) => void;
  attribution?: string;
  tileLayerUrl?: string;
  touchZoom?: boolean;
  scrollWheelZoom?: boolean | 'center';
  dragging?: boolean;
  animate?: boolean;
  showZoomControl?: boolean;
};

// Fonction pour fixer les icônes Leaflet
const fixLeafletIcons = () => {
  // Fix pour les icônes Leaflet en SSR/CSR
  const DefaultIcon = L.icon({
    iconUrl: markerIcon.src,
    iconRetinaUrl: markerIcon2x.src,
    shadowUrl: markerShadow.src,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    tooltipAnchor: [16, -28],
    shadowSize: [41, 41],
  });
  L.Marker.prototype.options.icon = DefaultIcon;
};

// Composant qui gère le centrage de la carte
const MapCenterController = ({
  center,
  zoom,
  bounds,
  animate = true,
}: {
  center?: MapPoint;
  zoom?: number;
  bounds?: MapBounds;
  animate?: boolean;
}) => {
  const map = useMap();

  useEffect(() => {
    if (bounds) {
      const { northEast, southWest } = bounds;
      const latLngBounds = L.latLngBounds(
        L.latLng(southWest.lat, southWest.lng),
        L.latLng(northEast.lat, northEast.lng)
      );

      map.fitBounds(latLngBounds, {
        animate,
        padding: [50, 50], // Ajouter un padding pour une meilleure visualisation
      });
    } else if (center) {
      map.setView([center.lat, center.lng], zoom || map.getZoom(), { animate });
    }
  }, [map, center, zoom, bounds, animate]);

  return null;
};

// Composant de carte Leaflet de base
const LeafletMap = ({
  center = { lat: 48.8566, lng: 2.3522 }, // Paris par défaut
  zoom = 13,
  minZoom = 3,
  maxZoom = 18,
  height = '400px',
  width = '100%',
  className = '',
  markers,
  polylines,
  polygons,
  circles,
  overlays,
  controls,
  bounds,
  children,
  onMapReady,
  onMapClick,
  onMoveEnd,
  attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  tileLayerUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  touchZoom = true,
  scrollWheelZoom = true,
  dragging = true,
  animate = true,
  showZoomControl = true,
}: LeafletMapProps) => {
  const [mapReady, setMapReady] = useState(false);
  const mapRef = useRef<L.Map | null>(null);

  // Fix pour les icônes Leaflet
  useEffect(() => {
    fixLeafletIcons();
  }, []);

  // Gestion des événements de la carte
  const handleMapReady = (map: L.Map) => {
    mapRef.current = map;
    setMapReady(true);

    if (onMapReady) {
      onMapReady(map);
    }

    if (onMapClick) {
      map.on('click', onMapClick);
    }

    if (onMoveEnd) {
      map.on('moveend', () => {
        const center = map.getCenter();
        onMoveEnd({ lat: center.lat, lng: center.lng }, map.getZoom());
      });
    }

    // Ajouter d'autres gestionnaires d'événements si nécessaire

    // Nettoyer lors du démontage
    return () => {
      if (onMapClick) map.off('click', onMapClick);
      if (onMoveEnd) map.off('moveend');
    };
  };

  // Styles pour la carte
  const mapStyle = {
    height: typeof height === 'number' ? `${height}px` : height,
    width: typeof width === 'number' ? `${width}px` : width,
  };

  return (
    <div className={cn('relative overflow-hidden rounded-lg', className)} style={mapStyle}>
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={zoom}
        minZoom={minZoom}
        maxZoom={maxZoom}
        style={{ height: '100%', width: '100%' }}
        touchZoom={touchZoom}
        scrollWheelZoom={scrollWheelZoom}
        dragging={dragging}
        zoomControl={false} // Gérer manuellement pour mieux positionner
        whenReady={e => handleMapReady(e.target)}
      >
        {/* TileLayer par défaut */}
        <TileLayer attribution={attribution} url={tileLayerUrl} />

        {/* Contrôles personnalisés */}
        {showZoomControl && <ZoomControl position="bottomright" />}

        {/* Gestionnaire de centrage */}
        <MapCenterController center={center} zoom={zoom} bounds={bounds} animate={animate} />

        {/* Éléments de la carte */}
        {mapReady && (
          <>
            {markers}
            {polylines}
            {polygons}
            {circles}
            {overlays}
            {controls}
            {children}
          </>
        )}
      </MapContainer>
    </div>
  );
};

export default LeafletMap;
