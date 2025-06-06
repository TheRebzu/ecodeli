'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Marker, Popup, Polyline, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-rotatedmarker';
import { Truck, MapPin, Home, Store, Clock, Navigation, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils/common';
import { useTheme } from 'next-themes';
import LeafletMap, { MapBounds, MapPoint } from './leaflet-map';
import { useDeliveryLiveTracking } from '@/hooks/features/use-delivery-tracking';
import { useDeliveryETA } from '@/hooks/delivery/use-delivery-status';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DeliveryStatus } from '@prisma/client';

// Types
interface DeliveryTrackingMapProps {
  deliveryId: string;
  height?: string | number;
  width?: string | number;
  className?: string;
  showControls?: boolean;
  showEta?: boolean;
  onRouteClick?: () => void;
  interactiveDetails?: boolean;
  autoCenter?: boolean;
  showTraffic?: boolean;
}

// Types pour les objets de position
interface PositionPoint {
  latitude: number;
  longitude: number;
  timestamp?: string | Date;
}

// Couleurs pour les parcours
const COLORS = {
  plannedRoute: '#3b82f6', // blue-500
  actualRoute: '#8b5cf6', // violet-500
  deviation: '#ef4444', // red-500
  deliverer: '#8b5cf6', // violet-500
  pickup: '#10b981', // emerald-500
  delivery: '#3b82f6', // blue-500
  checkpoint: '#f59e0b', // amber-500
  issue: '#ef4444', // red-500
};

// Convertir un SVG en URL data pour les icônes
const svgToDataUrl = (svg: string) => {
  return `data:image/svg+xml;base64,${btoa(svg)}`;
};

// Créer un marqueur personnalisé avec un svg et une couleur
const createCustomMarker = (icon: React.ReactNode, color: string, size = 42) => {
  // Convertir le composant React en chaîne SVG
  const svgString = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}" fill="${color}" stroke="white" stroke-width="1">
      <path d="M12 0c-4.4 0-8 3.6-8 8 0 1.5.4 2.9 1.2 4.1.3.5.7 1.1 1.2 1.7l5.6 7.9 5.6-7.9c.5-.6.8-1.1 1.2-1.7.7-1.2 1.2-2.6 1.2-4.1 0-4.4-3.6-8-8-8zm0 11c-1.7 0-3-1.3-3-3s1.3-3 3-3 3 1.3 3 3-1.3 3-3 3z"/>
    </svg>
  `;

  // Créer une icône Leaflet
  return L.icon({
    iconUrl: svgToDataUrl(svgString),
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  });
};

// Créer un marqueur pour véhicule avec rotation
const createVehicleMarker = (size = 36) => {
  // SVG d'un camion simplifié
  const svgString = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}" fill="#8b5cf6" stroke="white" stroke-width="0.5">
      <path d="M1,11V3c0-1.1,0.9-2,2-2h9c1.1,0,2,0.9,2,2l0,0v8l0,0c0,1.1-0.9,2-2,2H3C1.9,13,1,12.1,1,11L1,11z M18,8h1.5
      c0.8,0,1.5,0.7,1.5,1.5V11h-3V8z M20.64,15H19v-2c0.64,0,1.4-1.08,1.64-2.56L20.64,15L20.64,15z M19,15H5
      c-1.1,0-2-0.9-2-2v4c0,1.1,0.9,2,2,2h14c1.1,0,2-0.9,2-2v-4C21,14.1,20.1,15,19,15z M7,17.5C7,18.33,6.33,19,5.5,19S4,18.33,4,17.5
      S4.67,16,5.5,16S7,16.67,7,17.5z M19,17.5c0,0.83-0.67,1.5-1.5,1.5s-1.5-0.67-1.5-1.5s0.67-1.5,1.5-1.5S19,16.67,19,17.5z"/>
    </svg>
  `;

  // Créer une icône Leaflet
  return L.icon({
    iconUrl: svgToDataUrl(svgString),
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
};

// Marqueurs personnalisés
const ICONS = {
  pickup: createCustomMarker(<Store />, COLORS.pickup),
  delivery: createCustomMarker(<Home />, COLORS.delivery),
  deliverer: createVehicleMarker(),
  checkpoint: createCustomMarker(<MapPin />, COLORS.checkpoint),
  issue: createCustomMarker(<AlertTriangle />, COLORS.issue),
};

// Composant pour centrer la carte automatiquement
const AutoCenterMap = ({
  delivererPosition,
  pickupPosition,
  deliveryPosition,
  enabled = true,
}: {
  delivererPosition?: MapPoint;
  pickupPosition?: MapPoint;
  deliveryPosition?: MapPoint;
  enabled?: boolean;
}) => {
  const map = useMap();

  useEffect(() => {
    if (!enabled) return;

    // Créer les limites à partir des positions disponibles
    const points: MapPoint[] = [];
    if (delivererPosition) points.push(delivererPosition);
    if (pickupPosition) points.push(pickupPosition);
    if (deliveryPosition) points.push(deliveryPosition);

    // S'il n'y a pas assez de points, ne pas faire de centrage
    if (points.length < 1) return;

    // S'il n'y a qu'un seul point, centrer sur celui-ci
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 15);
      return;
    }

    // Créer les limites et ajuster la vue
    const bounds = L.latLngBounds(points.map(p => L.latLng(p.lat, p.lng)));
    map.fitBounds(bounds, {
      padding: [50, 50],
      maxZoom: 16,
      animate: true,
    });
  }, [map, delivererPosition, pickupPosition, deliveryPosition, enabled]);

  return null;
};

// Carte de suivi de livraison en temps réel
const DeliveryTrackingMap: React.FC<DeliveryTrackingMapProps> = ({
  deliveryId,
  height = '400px',
  width = '100%',
  className = '',
  showControls = true,
  showEta = true,
  onRouteClick,
  interactiveDetails = true,
  autoCenter = true,
  showTraffic = false,
}) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const [map, setMap] = useState<L.Map | null>(null);

  // Récupérer les données de suivi
  const { delivery, deliveryInfo, currentPosition, isLoading, startTracking, refresh } =
    useDeliveryLiveTracking(deliveryId);

  // Récupérer l'ETA
  const { formatETA, remainingDistance, completionPercentage } = useDeliveryETA(deliveryId);

  // Convertir les adresses en points de carte (si pas de géocodage déjà fait)
  const pickupPosition = useMemo<MapPoint | undefined>(() => {
    if (!delivery) return undefined;

    if (delivery.pickupLat && delivery.pickupLng) {
      return { lat: delivery.pickupLat, lng: delivery.pickupLng };
    }

    return undefined;
  }, [delivery]);

  const deliveryPosition = useMemo<MapPoint | undefined>(() => {
    if (!delivery) return undefined;

    if (delivery.deliveryLat && delivery.deliveryLng) {
      return { lat: delivery.deliveryLat, lng: delivery.deliveryLng };
    }

    return undefined;
  }, [delivery]);

  // Position actuelle du livreur
  const delivererPosition = useMemo<MapPoint | undefined>(() => {
    if (currentPosition) {
      return {
        lat: currentPosition.latitude,
        lng: currentPosition.longitude,
      };
    }

    if (deliveryInfo?.currentLat && deliveryInfo?.currentLng) {
      return {
        lat: deliveryInfo.currentLat,
        lng: deliveryInfo.currentLng,
      };
    }

    return undefined;
  }, [currentPosition, deliveryInfo]);

  // Direction du livreur (pour la rotation du marqueur)
  const delivererHeading = useMemo<number | undefined>(() => {
    if (currentPosition?.heading !== undefined) {
      return currentPosition.heading;
    }
    return undefined;
  }, [currentPosition]);

  // Historique du parcours réel
  const positionHistory = useMemo(() => {
    // Données provenant du store
    if (
      deliveryInfo &&
      'positionHistory' in deliveryInfo &&
      Array.isArray(deliveryInfo.positionHistory) &&
      deliveryInfo.positionHistory.length > 0
    ) {
      return deliveryInfo.positionHistory.map(
        (p: PositionPoint) => [p.latitude, p.longitude] as [number, number]
      );
    }

    // Données provenant de l'API
    if (
      delivery &&
      'positionHistory' in delivery &&
      Array.isArray(delivery.positionHistory) &&
      delivery.positionHistory.length > 0
    ) {
      return delivery.positionHistory.map(
        (p: PositionPoint) => [p.latitude, p.longitude] as [number, number]
      );
    }

    return [];
  }, [deliveryInfo, delivery]);

  // Parcours planifié
  const plannedRoute = useMemo(() => {
    if (
      delivery &&
      'plannedRoute' in delivery &&
      Array.isArray(delivery.plannedRoute) &&
      delivery.plannedRoute.length > 0
    ) {
      return delivery.plannedRoute.map(
        (p: PositionPoint) => [p.latitude, p.longitude] as [number, number]
      );
    }
    return [];
  }, [delivery]);

  // Points de passage
  const checkpoints = useMemo(() => {
    if (
      delivery &&
      'checkpoints' in delivery &&
      Array.isArray(delivery.checkpoints) &&
      delivery.checkpoints.length > 0
    ) {
      return delivery.checkpoints.map((c: any) => ({
        position: [c.latitude, c.longitude] as [number, number],
        label: c.label || 'Point de passage',
        type: c.type || 'checkpoint',
        timestamp: c.timestamp,
      }));
    }
    return [];
  }, [delivery]);

  // Problèmes signalés
  const issues = useMemo(() => {
    if (
      delivery &&
      'issues' in delivery &&
      Array.isArray(delivery.issues) &&
      delivery.issues.length > 0
    ) {
      return delivery.issues.map((i: any) => ({
        position: [i.latitude, i.longitude] as [number, number],
        label: i.description || 'Problème',
        type: i.type || 'issue',
        timestamp: i.timestamp,
      }));
    }
    return [];
  }, [delivery]);

  // Centre initial de la carte
  const initialCenter = useMemo<MapPoint>(() => {
    if (delivererPosition) return delivererPosition;
    if (deliveryPosition) return deliveryPosition;
    if (pickupPosition) return pickupPosition;

    // Position par défaut (Paris)
    return { lat: 48.8566, lng: 2.3522 };
  }, [delivererPosition, deliveryPosition, pickupPosition]);

  // Limites de la carte pour le centrage automatique
  const mapBounds = useMemo<MapBounds | undefined>(() => {
    const points: MapPoint[] = [];

    if (delivererPosition) points.push(delivererPosition);
    if (pickupPosition) points.push(pickupPosition);
    if (deliveryPosition) points.push(deliveryPosition);

    if (points.length < 2) return undefined;

    // Trouver les limites des points
    const lats = points.map(p => p.lat);
    const lngs = points.map(p => p.lng);

    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    // Ajouter une marge
    const latMargin = (maxLat - minLat) * 0.2;
    const lngMargin = (maxLng - minLng) * 0.2;

    return {
      northEast: { lat: maxLat + latMargin, lng: maxLng + lngMargin },
      southWest: { lat: minLat - latMargin, lng: minLng - lngMargin },
    };
  }, [delivererPosition, pickupPosition, deliveryPosition]);

  // URL du tile layer selon le thème
  const tileLayerUrl = useMemo(() => {
    if (isDark) {
      return 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
    }
    return 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  }, [isDark]);

  // Attribution selon le tile layer
  const attribution = useMemo(() => {
    if (isDark) {
      return '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';
    }
    return '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
  }, [isDark]);

  // Gérer le clic sur la carte
  const handleMapClick = (e: L.LeafletMouseEvent) => {
    console.log('Map clicked at:', e.latlng.lat, e.latlng.lng);
  };

  // État de livraison formaté
  const formattedStatus = useMemo(() => {
    if (!deliveryInfo?.status) return 'Inconnu';

    const statusMap: Record<string, string> = {
      [DeliveryStatus.PENDING]: 'En attente',
      [DeliveryStatus.ACCEPTED]: 'Acceptée',
      [DeliveryStatus.PICKED_UP]: 'Collectée',
      [DeliveryStatus.IN_TRANSIT]: 'En transit',
      [DeliveryStatus.DELIVERED]: 'Livrée',
      [DeliveryStatus.CONFIRMED]: 'Confirmée',
      [DeliveryStatus.CANCELLED]: 'Annulée',
    };

    return statusMap[deliveryInfo.status] || deliveryInfo.status;
  }, [deliveryInfo]);

  // Rafraîchir la carte quand le centrage automatique est activé
  useEffect(() => {
    if (map && delivererPosition && autoCenter) {
      map.setView([delivererPosition.lat, delivererPosition.lng], map.getZoom());
    }
  }, [map, delivererPosition, autoCenter]);

  // Commencer le suivi au chargement
  useEffect(() => {
    startTracking();
  }, [startTracking]);

  return (
    <div className={cn('relative flex flex-col', className)}>
      {/* Carte Leaflet */}
      <LeafletMap
        center={initialCenter}
        zoom={14}
        height={height}
        width={width}
        className="z-0 rounded-lg shadow-md"
        onMapReady={setMap}
        onMapClick={handleMapClick}
        tileLayerUrl={tileLayerUrl}
        attribution={attribution}
        bounds={mapBounds}
        animate={true}
        touchZoom={true}
        scrollWheelZoom={true}
        dragging={true}
        showZoomControl={true}
      >
        {/* Auto-centrage */}
        <AutoCenterMap
          delivererPosition={delivererPosition}
          pickupPosition={pickupPosition}
          deliveryPosition={deliveryPosition}
          enabled={autoCenter && !isLoading}
        />

        {/* Marqueurs de points importants */}
        {pickupPosition && (
          <Marker position={[pickupPosition.lat, pickupPosition.lng]} icon={ICONS.pickup}>
            <Popup>
              <div className="p-2">
                <h3 className="font-bold text-sm">Point de collecte</h3>
                <p className="text-xs">{delivery?.pickupAddress}</p>
              </div>
            </Popup>
          </Marker>
        )}

        {deliveryPosition && (
          <Marker position={[deliveryPosition.lat, deliveryPosition.lng]} icon={ICONS.delivery}>
            <Popup>
              <div className="p-2">
                <h3 className="font-bold text-sm">Point de livraison</h3>
                <p className="text-xs">{delivery?.deliveryAddress}</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Parcours planifié */}
        {plannedRoute.length > 0 && (
          <Polyline
            positions={plannedRoute}
            color={COLORS.plannedRoute}
            weight={4}
            opacity={0.6}
            dashArray="10, 10"
            onClick={onRouteClick}
          />
        )}

        {/* Parcours réel */}
        {positionHistory.length > 0 && (
          <Polyline
            positions={positionHistory}
            color={COLORS.actualRoute}
            weight={4}
            opacity={0.8}
          />
        )}

        {/* Points de passage */}
        {checkpoints.map((checkpoint, index) => (
          <Marker
            key={`checkpoint-${index}`}
            position={checkpoint.position}
            icon={ICONS.checkpoint}
          >
            <Popup>
              <div className="p-2">
                <h3 className="font-bold text-sm">{checkpoint.label}</h3>
                {checkpoint.timestamp && (
                  <p className="text-xs">{new Date(checkpoint.timestamp).toLocaleTimeString()}</p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Problèmes signalés */}
        {issues.map((issue, index) => (
          <Marker key={`issue-${index}`} position={issue.position} icon={ICONS.issue}>
            <Popup>
              <div className="p-2">
                <h3 className="font-bold text-sm text-red-500">{issue.label}</h3>
                {issue.timestamp && (
                  <p className="text-xs">{new Date(issue.timestamp).toLocaleTimeString()}</p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Position actuelle du livreur avec cercle de précision */}
        {delivererPosition && (
          <>
            <Marker
              position={[delivererPosition.lat, delivererPosition.lng]}
              icon={ICONS.deliverer}
              rotationAngle={delivererHeading}
              rotationOrigin="center center"
            >
              <Popup>
                <div className="p-2">
                  <h3 className="font-bold text-sm">Position du livreur</h3>
                  {deliveryInfo?.deliverer?.name && (
                    <p className="text-xs mb-1">{deliveryInfo.deliverer.name}</p>
                  )}
                  <p className="text-xs">{new Date().toLocaleTimeString()}</p>
                </div>
              </Popup>
            </Marker>

            {/* Cercle de précision */}
            {currentPosition?.accuracy && (
              <Circle
                center={[delivererPosition.lat, delivererPosition.lng]}
                radius={currentPosition.accuracy}
                color={COLORS.deliverer}
                fillColor={COLORS.deliverer}
                fillOpacity={0.1}
                weight={1}
              />
            )}
          </>
        )}
      </LeafletMap>

      {/* Contrôles et informations */}
      {showControls && !isLoading && deliveryInfo && (
        <Card className="absolute bottom-4 left-4 right-4 z-10 p-3 bg-background/90 backdrop-blur-sm rounded-lg shadow-lg max-w-sm mx-auto">
          <div className="flex flex-col space-y-2">
            {/* Statut et ETA */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-primary/20 rounded-full">
                  <Truck className="h-4 w-4 text-primary" />
                </div>
                <span className="text-sm font-medium">{formattedStatus}</span>
              </div>

              {showEta && (
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{formatETA()}</span>
                </div>
              )}
            </div>

            {/* Barre de progression */}
            {typeof completionPercentage === 'number' && (
              <div className="w-full bg-muted rounded-full h-1.5 mt-1">
                <div
                  className="bg-primary h-1.5 rounded-full"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
            )}

            {/* Boutons d'action */}
            <div className="flex justify-between mt-2">
              <Button
                variant="outline"
                size="sm"
                className="text-xs px-2"
                onClick={() => refresh()}
              >
                Rafraîchir
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="text-xs px-2"
                onClick={() =>
                  map?.setView([initialCenter.lat, initialCenter.lng], 14, { animate: true })
                }
              >
                <Navigation className="h-3.5 w-3.5 mr-1" />
                Recentrer
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default DeliveryTrackingMap;
