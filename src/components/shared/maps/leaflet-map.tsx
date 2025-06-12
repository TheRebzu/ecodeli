'use client';

import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, useMap, ZoomControl, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { cn } from '@/lib/utils/common';

// Correction pour les icônes en SSR/CSR
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Fonction pour initialiser les icônes Leaflet côté client
const initializeLeafletIcons = () => {
  if (typeof window === 'undefined') return { defaultIcon: undefined, markerIcons: {} };

  // Éviter les erreurs côté serveur en vérifiant si window est défini
  delete (L.Icon.Default.prototype as any)._getIconUrl;

  // Configuration des icônes par défaut
  const iconOptions = {
    iconUrl: '/leaflet/marker-icon.png',
    iconRetinaUrl: '/leaflet/marker-icon-2x.png',
    shadowUrl: '/leaflet/marker-shadow.png',
    iconSize: [25, 41] as [number, number],
    iconAnchor: [12, 41] as [number, number],
    popupAnchor: [1, -34] as [number, number],
    tooltipAnchor: [16, -28] as [number, number],
    shadowSize: [41, 41] as [number, number],
  };

  // Configurer les icônes par défaut de Leaflet
  L.Icon.Default.mergeOptions(iconOptions);

  // Créer l'icône par défaut
  const defaultIcon = new L.Icon(iconOptions);

  // Créer les icônes spécialisées
  const markerIcons = {
    default: defaultIcon,
    pickup: new L.Icon({
      ...iconOptions,
      className: 'leaflet-marker-pickup',
    }),
    delivery: new L.Icon({
      ...iconOptions,
      className: 'leaflet-marker-delivery',
    }),
    current: new L.Icon({
      ...iconOptions,
      className: 'leaflet-marker-current',
    }),
  };

  return { defaultIcon, markerIcons };
};

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
  markers?: any[]; // Tableau d'objets de marqueurs
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
      // Vérifier que les coordonnées sont valides
      if (
        northEast?.lat !== undefined &&
        northEast?.lng !== undefined &&
        southWest?.lat !== undefined &&
        southWest?.lng !== undefined
      ) {
        const latLngBounds = L.latLngBounds(
          L.latLng(southWest.lat, southWest.lng),
          L.latLng(northEast.lat, northEast.lng)
        );

        map.fitBounds(latLngBounds, {
          animate,
          padding: [50, 50], // Ajouter un padding pour une meilleure visualisation
        });
      }
    } else if (center) {
      // Vérifier que les coordonnées sont valides
      if (center.lat !== undefined && center.lng !== undefined) {
        map.setView([center.lat, center.lng], zoom || map.getZoom(), { animate });
      }
    }
  }, [map, center, zoom, bounds, animate]);

  return null;
};

// Composant pour gérer les événements de la carte
const MapEventController = ({
  onMapReady,
  onMapClick,
  onMoveEnd,
}: {
  onMapReady?: (map: L.Map) => void;
  onMapClick?: (e: L.LeafletMouseEvent) => void;
  onMoveEnd?: (center: MapPoint, zoom: number) => void;
}) => {
  const map = useMap();
  const eventHandlersRef = useRef<{ [key: string]: any }>({});

  useEffect(() => {
    // Notifier que la carte est prête
    if (onMapReady) {
      onMapReady(map);
    }

    // Ajouter les gestionnaires d'événements avec références pour le nettoyage
    if (onMapClick) {
      eventHandlersRef.current.click = onMapClick;
      map.on('click', onMapClick);
    }

    if (onMoveEnd) {
      const moveEndHandler = () => {
        const center = map.getCenter();
        onMoveEnd({ lat: center.lat, lng: center.lng }, map.getZoom());
      };
      eventHandlersRef.current.moveend = moveEndHandler;
      map.on('moveend', moveEndHandler);
    }

    // Nettoyer lors du démontage
    return () => {
      // Vérifier si la carte et ses événements existent toujours avant d'essayer de les détacher
      try {
        // Vérifier multiple conditions pour s'assurer que la carte est valide
        if (
          map &&
          typeof map.off === 'function' &&
          (map as any)._leaflet_events &&
          !(map as any)._removed
        ) {
          Object.keys(eventHandlersRef.current).forEach(eventType => {
            const handler = eventHandlersRef.current[eventType];
            if (handler && typeof handler === 'function') {
              try {
                map.off(eventType as any, handler);
              } catch (eventError) {
                // Ignorer les erreurs spécifiques aux événements
                console.debug(
                  `Erreur lors du détachement de l'événement ${eventType}:`,
                  eventError
                );
              }
            }
          });
        }
      } catch (e) {
        // Ignorer les erreurs lors du démontage de la carte
        console.debug('Erreur lors du détachement des événements de la carte:', e);
      } finally {
        // Nettoyer les références dans tous les cas
        eventHandlersRef.current = {};
      }
    };
  }, [map, onMapReady, onMapClick, onMoveEnd]);

  return null;
};

// Composant pour initialiser les icônes Leaflet
const LeafletIconInitializer = () => {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      initializeLeafletIcons();
    }
  }, []);

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

  // Styles pour la carte
  const mapStyle = {
    height: typeof height === 'number' ? `${height}px` : height,
    width: typeof width === 'number' ? `${width}px` : width,
  };

  // Vérifier que les coordonnées du centre sont valides
  const validCenter =
    center?.lat !== undefined && center?.lng !== undefined
      ? [center.lat, center.lng]
      : [48.8566, 2.3522]; // Paris par défaut si les coordonnées sont invalides

  // Fonction pour rendre les marqueurs React à partir des objets de marqueurs
  const renderMarkers = () => {
    if (!markers || !Array.isArray(markers) || typeof window === 'undefined') return null;

    // Initialiser les icônes
    const { defaultIcon, markerIcons } = initializeLeafletIcons();

    return markers.map((marker, index) => {
      if (!marker || !marker.position) return null;

      const position: [number, number] = Array.isArray(marker.position)
        ? marker.position
        : [marker.position.lat, marker.position.lng];

      // Vérifier que la position est valide
      if (
        !position ||
        position.length !== 2 ||
        typeof position[0] !== 'number' ||
        typeof position[1] !== 'number'
      ) {
        console.warn(`Marker ${index} has invalid position:`, position);
        return null;
      }

      // Toujours fournir une icône valide pour éviter l'erreur "iconUrl not set"
      let icon: L.Icon | undefined;
      if (defaultIcon) {
        // Utiliser l'icône correspondant au type ou l'icône par défaut
        const markerType = marker.type as keyof typeof markerIcons;
        icon = markerType && markerIcons[markerType] ? markerIcons[markerType] : defaultIcon; // Utiliser notre icône par défaut
      }

      // Si aucune icône n'est disponible, ne pas rendre le marker
      if (!icon) {
        console.warn(`No icon available for marker ${index}`);
        return null;
      }

      return (
        <Marker key={`marker-${index}`} position={position} icon={icon}>
          {marker.popup && (
            <Popup>
              {marker.popup.title && <h3 className="font-medium text-sm">{marker.popup.title}</h3>}
              {marker.popup.content && <p className="text-xs">{marker.popup.content}</p>}
            </Popup>
          )}
        </Marker>
      );
    });
  };

  // Gestionnaire pour mettre à jour l'état mapReady quand la carte est prête
  const handleMapReady = (map: L.Map) => {
    mapRef.current = map;
    setMapReady(true);
  };

  // Ne pas rendre la carte côté serveur
  if (typeof window === 'undefined') {
    return (
      <div
        className={cn(
          'relative overflow-hidden rounded-lg bg-gray-200 flex items-center justify-center',
          className
        )}
        style={mapStyle}
      >
        <p className="text-gray-500 text-sm">Chargement de la carte...</p>
      </div>
    );
  }

  return (
    <div className={cn('relative overflow-hidden rounded-lg', className)} style={mapStyle}>
      <LeafletIconInitializer />
      <MapContainer
        center={validCenter as [number, number]}
        zoom={zoom}
        minZoom={minZoom}
        maxZoom={maxZoom}
        style={{ height: '100%', width: '100%' }}
        touchZoom={touchZoom}
        scrollWheelZoom={scrollWheelZoom}
        dragging={dragging}
        zoomControl={false} // Gérer manuellement pour mieux positionner
      >
        {/* TileLayer par défaut */}
        <TileLayer attribution={attribution} url={tileLayerUrl} />

        {/* Contrôles personnalisés */}
        {showZoomControl && <ZoomControl position="bottomright" />}

        {/* Gestionnaire de centrage */}
        <MapCenterController center={center} zoom={zoom} bounds={bounds} animate={animate} />

        {/* Gestionnaire d'événements */}
        <MapEventController
          onMapReady={map => {
            handleMapReady(map);
            if (onMapReady) onMapReady(map);
          }}
          onMapClick={onMapClick}
          onMoveEnd={onMoveEnd}
        />

        {/* Éléments de la carte */}
        {mapReady && (
          <>
            {renderMarkers()}
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
