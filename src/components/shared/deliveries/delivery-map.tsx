'use client';

import React, { useMemo } from 'react';
import { Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { Home, Store, Clock, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import LeafletMap, { MapBounds, MapPoint } from '@/components/maps/leaflet-map';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// Types
interface DeliveryMapProps {
  delivery: {
    id: string;
    status: string;
    pickupAddress?: string;
    deliveryAddress?: string;
    pickupLat?: number;
    pickupLng?: number;
    deliveryLat?: number;
    deliveryLng?: number;
    estimatedDuration?: number; // en minutes
    distance?: number; // en mètres
    route?: Array<{ latitude: number; longitude: number }>;
  };
  height?: string | number;
  width?: string | number;
  className?: string;
  showInfo?: boolean;
  interactive?: boolean;
}

// Couleurs pour les parcours
const COLORS = {
  route: '#3b82f6', // blue-500
  pickup: '#10b981', // emerald-500
  delivery: '#8b5cf6', // violet-500
};

// Créer un marqueur personnalisé avec un svg et une couleur
const createCustomMarker = (color: string, size = 36) => {
  // Créer une icône Leaflet
  return L.divIcon({
    html: `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}" fill="${color}" stroke="white" stroke-width="1">
        <path d="M12 0c-4.4 0-8 3.6-8 8 0 1.5.4 2.9 1.2 4.1.3.5.7 1.1 1.2 1.7l5.6 7.9 5.6-7.9c.5-.6.8-1.1 1.2-1.7.7-1.2 1.2-2.6 1.2-4.1 0-4.4-3.6-8-8-8zm0 11c-1.7 0-3-1.3-3-3s1.3-3 3-3 3 1.3 3 3-1.3 3-3 3z"/>
      </svg>
    `,
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  });
};

// Marqueurs personnalisés
const ICONS = {
  pickup: createCustomMarker(COLORS.pickup),
  delivery: createCustomMarker(COLORS.delivery),
};

// Formater la durée en texte lisible
const formatDuration = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = Math.round(minutes % 60);

  if (remainingMinutes === 0) {
    return `${hours} h`;
  }

  return `${hours} h ${remainingMinutes} min`;
};

// Formater la distance en texte lisible
const formatDistance = (meters: number): string => {
  if (meters < 1000) {
    return `${meters} m`;
  }

  const km = (meters / 1000).toFixed(1);
  return `${km} km`;
};

// Carte statique de livraison
const DeliveryMap: React.FC<DeliveryMapProps> = ({
  delivery,
  height = '300px',
  width = '100%',
  className = '',
  showInfo = true,
  interactive = false,
}) => {
  // Points importants
  const pickupPosition = useMemo<MapPoint | undefined>(() => {
    if (delivery.pickupLat && delivery.pickupLng) {
      return { lat: delivery.pickupLat, lng: delivery.pickupLng };
    }
    return undefined;
  }, [delivery]);

  const deliveryPosition = useMemo<MapPoint | undefined>(() => {
    if (delivery.deliveryLat && delivery.deliveryLng) {
      return { lat: delivery.deliveryLat, lng: delivery.deliveryLng };
    }
    return undefined;
  }, [delivery]);

  // Centre initial de la carte
  const initialCenter = useMemo<MapPoint>(() => {
    if (pickupPosition && deliveryPosition) {
      // Centre entre les deux points
      return {
        lat: (pickupPosition.lat + deliveryPosition.lat) / 2,
        lng: (pickupPosition.lng + deliveryPosition.lng) / 2,
      };
    }

    if (pickupPosition) return pickupPosition;
    if (deliveryPosition) return deliveryPosition;

    // Position par défaut (Paris)
    return { lat: 48.8566, lng: 2.3522 };
  }, [pickupPosition, deliveryPosition]);

  // Limites de la carte pour le centrage automatique
  const mapBounds = useMemo<MapBounds | undefined>(() => {
    if (!pickupPosition || !deliveryPosition) return undefined;

    const lats = [pickupPosition.lat, deliveryPosition.lat];
    const lngs = [pickupPosition.lng, deliveryPosition.lng];

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
  }, [pickupPosition, deliveryPosition]);

  // Convertir l'itinéraire en format compatible avec Leaflet
  const routePositions = useMemo(() => {
    if (!delivery.route || delivery.route.length === 0) return [];

    return delivery.route.map(point => [point.latitude, point.longitude] as [number, number]);
  }, [delivery.route]);

  return (
    <div className={cn('relative', className)}>
      <LeafletMap
        center={initialCenter}
        zoom={13}
        height={height}
        width={width}
        className="rounded-lg shadow-sm"
        bounds={mapBounds}
        animate={false}
        touchZoom={interactive}
        scrollWheelZoom={interactive}
        dragging={interactive}
        showZoomControl={interactive}
      >
        {/* Marqueur du point de collecte */}
        {pickupPosition && (
          <Marker position={[pickupPosition.lat, pickupPosition.lng]} icon={ICONS.pickup}>
            <Popup>
              <div className="p-1.5">
                <h4 className="text-xs font-bold flex items-center">
                  <Store className="h-3 w-3 mr-1" />
                  Point de collecte
                </h4>
                <p className="text-xs mt-1">{delivery.pickupAddress}</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Marqueur du point de livraison */}
        {deliveryPosition && (
          <Marker position={[deliveryPosition.lat, deliveryPosition.lng]} icon={ICONS.delivery}>
            <Popup>
              <div className="p-1.5">
                <h4 className="text-xs font-bold flex items-center">
                  <Home className="h-3 w-3 mr-1" />
                  Point de livraison
                </h4>
                <p className="text-xs mt-1">{delivery.deliveryAddress}</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Tracé de l'itinéraire */}
        {routePositions.length > 0 && (
          <Polyline
            positions={routePositions}
            pathOptions={{
              color: COLORS.route,
              weight: 4,
              opacity: 0.7,
            }}
          />
        )}
      </LeafletMap>

      {/* Informations sur la livraison */}
      {showInfo && (delivery.estimatedDuration || delivery.distance) && (
        <Card className="absolute bottom-2 left-2 right-2 z-10 p-2 bg-background/95 backdrop-blur-sm rounded-md shadow-md max-w-xs mx-auto flex items-center justify-between text-xs">
          {delivery.status && (
            <Badge variant="outline" className="text-[10px] capitalize">
              {delivery.status.toLowerCase()}
            </Badge>
          )}

          <div className="flex gap-3">
            {delivery.estimatedDuration && (
              <div className="flex items-center">
                <Clock className="h-3 w-3 mr-1 text-muted-foreground" />
                <span>{formatDuration(delivery.estimatedDuration)}</span>
              </div>
            )}

            {delivery.distance && (
              <div className="flex items-center">
                <MapPin className="h-3 w-3 mr-1 text-muted-foreground" />
                <span>{formatDistance(delivery.distance)}</span>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};

export default DeliveryMap;
