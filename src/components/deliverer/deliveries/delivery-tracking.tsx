'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  AlertCircle,
  Navigation,
  Maximize2,
  Minimize2,
  Map,
  LocateFixed,
  MapPin,
  Truck,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Déclaration pour étendre l'interface Leaflet avec Routing Machine
declare module 'leaflet' {
  namespace Routing {
    interface RoutingControlOptions {
      waypoints: L.LatLng[];
      lineOptions?: {
        styles?: {
          color?: string;
          weight?: number;
        }[];
        extendToWaypoints?: boolean;
        missingRouteTolerance?: number;
      };
      show?: boolean;
      addWaypoints?: boolean;
      routeWhileDragging?: boolean;
      fitSelectedRoutes?: boolean;
      showAlternatives?: boolean;
    }

    class Control extends L.Control {
      constructor(options: RoutingControlOptions);
      getPlan(): any;
      getWaypoints(): L.LatLng[];
      setWaypoints(waypoints: L.LatLng[]): this;
    }

    function control(options: RoutingControlOptions): Control;
  }
}

// Définir l'interface pour les coordonnées
interface Coordinates {
  lat: number;
  lng: number;
}

// Définir les props du composant
interface DeliveryTrackingMapProps {
  currentLocation?: Coordinates | null;
  origin?: Coordinates | null;
  destination: Coordinates;
  height?: string | number;
  width?: string | number;
  showDirections?: boolean;
  showControls?: boolean;
  interactive?: boolean;
  className?: string;
  onLocationUpdate?: (location: Coordinates) => void;
}

// Composant pour mettre à jour la vue de la carte
function SetViewOnChange({ center, zoom }: { center: L.LatLngExpression; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, map, zoom]);
  return null;
}

// Composant pour tracer l'itinéraire
function RoutingControl({
  origin,
  destination,
}: {
  origin: L.LatLngExpression;
  destination: L.LatLngExpression;
}) {
  const map = useMap();
  const routingControlRef = useRef<L.Routing.Control | null>(null);

  useEffect(() => {
    if (!map) return;

    // Supprimer la route précédente si elle existe
    if (routingControlRef.current) {
      map.removeControl(routingControlRef.current);
      routingControlRef.current = null;
    }

    // Créer une nouvelle route
    const control = L.Routing.control({
      waypoints: [L.latLng(origin), L.latLng(destination)],
      lineOptions: {
        styles: [{ color: '#6366F1', weight: 4 }],
        extendToWaypoints: true,
        missingRouteTolerance: 0,
      },
      show: false,
      addWaypoints: false,
      routeWhileDragging: false,
      fitSelectedRoutes: false,
      showAlternatives: false,
    }).addTo(map);

    routingControlRef.current = control;

    return () => {
      if (routingControlRef.current) {
        map.removeControl(routingControlRef.current);
      }
    };
  }, [map, origin, destination]);

  return null;
}

// Composant de géolocalisation de l'utilisateur
function UserLocation({
  onLocationUpdate,
}: {
  onLocationUpdate?: (location: Coordinates) => void;
}) {
  const map = useMap();
  const [userPosition, setUserPosition] = useState<Coordinates | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  const handleLocate = () => {
    setIsLocating(true);
    map.locate({
      setView: true,
      maxZoom: 16,
      enableHighAccuracy: true,
      watch: true,
      timeout: 10000,
    });
  };

  useEffect(() => {
    // Fonction pour gérer la détection de la position
    const onLocationFound = (e: L.LocationEvent) => {
      const { lat, lng } = e.latlng;
      setUserPosition({ lat, lng });
      setIsLocating(false);

      if (onLocationUpdate) {
        onLocationUpdate({ lat, lng });
      }
    };

    // Fonction pour gérer les erreurs de localisation
    const onLocationError = (e: L.ErrorEvent) => {
      console.error('Erreur de géolocalisation:', e.message);
      setIsLocating(false);
    };

    // Ajouter les gestionnaires d'événements
    map.on('locationfound', onLocationFound);
    map.on('locationerror', onLocationError);

    // Initier la localisation au montage
    handleLocate();

    // Nettoyer les gestionnaires d'événements à la destruction
    return () => {
      map.off('locationfound', onLocationFound);
      map.off('locationerror', onLocationError);
      map.stopLocate();
    };
  }, [map, onLocationUpdate]);

  // Retourner un marqueur pour la position de l'utilisateur
  return userPosition ? (
    <Marker
      position={[userPosition.lat, userPosition.lng]}
      icon={L.divIcon({
        className: 'custom-div-icon',
        html: `
          <div class="relative">
            <div class="absolute -top-3 -left-3 w-6 h-6 rounded-full bg-blue-500 border-2 border-white shadow-lg flex items-center justify-center">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span class="relative inline-block w-2 h-2 rounded-full bg-white"></span>
            </div>
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      })}
    >
      <Popup>Votre position actuelle</Popup>
    </Marker>
  ) : null;
}

// Icônes personnalisées pour les marqueurs
const createMapIcon = (iconUrl: string, className?: string) => {
  return L.divIcon({
    className: cn('custom-div-icon', className),
    html: `<div class="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-md">${iconUrl}</div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
};

// Icônes pour les différents points
const originIcon = createMapIcon(
  `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-package-open"><path d="M20.5 7.28V14a2 2 0 0 1-2 2H5.5a2 2 0 0 1-2-2V7.28a2 2 0 0 1 1.36-1.9L11.5 2a2 2 0 0 1 .73-.1h.54a2 2 0 0 1 .73.1l6.64 3.38a2 2 0 0 1 1.36 1.9Z"/><path d="M11.62 16 7 13.28V7.72L11.62 5"/><path d="M12.38 5 17 7.72v5.56L12.38 16"/><path d="M7 8l5 3"/><path d="M12 11l5-3"/></svg>`
);
const destinationIcon = createMapIcon(
  `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#E11D48" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-map-pin"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`
);
const delivererIcon = createMapIcon(
  `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16A34A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-truck"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18h2a1 1 0 0 0 1-1v-3M4 14h12"/><circle cx="7" cy="18" r="2"/><path d="M13 18h.01"/><circle cx="18" cy="18" r="2"/><path d="M20 15v-3a2 2 0 0 0-2-2h-1"/></svg>`
);

export default function DeliveryTrackingMap({
  currentLocation,
  origin,
  destination,
  height = '400px',
  width = '100%',
  showDirections = true,
  showControls = true,
  interactive = true,
  className,
  onLocationUpdate,
}: DeliveryTrackingMapProps) {
  const t = useTranslations('deliveries.tracking');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Gérer le passage en plein écran
  const toggleFullscreen = () => {
    if (!mapContainerRef.current) return;

    try {
      if (!document.fullscreenElement) {
        mapContainerRef.current.requestFullscreen().then(() => {
          setIsFullscreen(true);
        });
      } else {
        document.exitFullscreen().then(() => {
          setIsFullscreen(false);
        });
      }
    } catch (err) {
      setError('Votre navigateur ne prend pas en charge le mode plein écran');
    }
  };

  // Gérer l'événement de changement de plein écran
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Vérifier la disponibilité de la géolocalisation
  useEffect(() => {
    if (!navigator.geolocation) {
      setError("La géolocalisation n'est pas disponible sur votre appareil");
    }
  }, []);

  if (!destination) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{t('errorTitle')}</AlertTitle>
        <AlertDescription>{t('missingDestination')}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div
      ref={mapContainerRef}
      className={cn(
        'relative rounded-lg overflow-hidden border',
        isFullscreen && 'fixed inset-0 z-50 rounded-none border-none',
        className
      )}
      style={{ height, width }}
    >
      {!isMapLoaded && <Skeleton className="absolute inset-0 z-10" />}

      {error && (
        <Alert variant="destructive" className="absolute inset-0 z-20 m-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t('errorTitle')}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <MapContainer
        center={[destination.lat, destination.lng]}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        attributionControl={false}
        zoomControl={false}
        dragging={interactive}
        touchZoom={interactive}
        doubleClickZoom={interactive}
        scrollWheelZoom={interactive}
        whenReady={() => setIsMapLoaded(true)}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Marqueur pour l'origine (point de retrait) */}
        {origin && (
          <Marker position={[origin.lat, origin.lng]} icon={originIcon}>
            <Popup>{t('originPoint')}</Popup>
          </Marker>
        )}

        {/* Marqueur pour la destination (point de livraison) */}
        <Marker position={[destination.lat, destination.lng]} icon={destinationIcon}>
          <Popup>{t('destinationPoint')}</Popup>
        </Marker>

        {/* Marqueur pour la position actuelle du livreur */}
        {currentLocation && (
          <Marker position={[currentLocation.lat, currentLocation.lng]} icon={delivererIcon}>
            <Popup>{t('currentPosition')}</Popup>
          </Marker>
        )}

        {/* Géolocalisation automatique */}
        <UserLocation onLocationUpdate={onLocationUpdate} />

        {/* Traçage de l'itinéraire */}
        {showDirections && currentLocation && destination && (
          <RoutingControl
            origin={[currentLocation.lat, currentLocation.lng]}
            destination={[destination.lat, destination.lng]}
          />
        )}

        {/* Polyline simple si on ne veut pas utiliser le routing control */}
        {!showDirections && currentLocation && destination && (
          <Polyline
            positions={[
              [currentLocation.lat, currentLocation.lng],
              [destination.lat, destination.lng],
            ]}
            color="#6366F1"
            weight={4}
          />
        )}

        {/* Centrer la carte sur la position ou destination */}
        <SetViewOnChange
          center={
            currentLocation
              ? [currentLocation.lat, currentLocation.lng]
              : [destination.lat, destination.lng]
          }
          zoom={13}
        />
      </MapContainer>

      {/* Contrôles de la carte */}
      {showControls && (
        <div className="absolute right-2 bottom-2 z-10 flex flex-col gap-2">
          <Button
            variant="secondary"
            size="icon"
            className="h-10 w-10 rounded-full shadow-md bg-white hover:bg-gray-100 text-black"
            onClick={toggleFullscreen}
          >
            {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
          </Button>
          {interactive && (
            <Button
              variant="secondary"
              size="icon"
              className="h-10 w-10 rounded-full shadow-md bg-white hover:bg-gray-100 text-black"
              onClick={() => {
                if (destination) {
                  const url = `https://www.google.com/maps/dir/?api=1&destination=${destination.lat},${destination.lng}`;
                  window.open(url, '_blank');
                }
              }}
            >
              <Navigation className="h-5 w-5" />
            </Button>
          )}
        </div>
      )}

      {/* Indicateur mode navigation */}
      {showDirections && currentLocation && (
        <div className="absolute left-2 bottom-2 z-10">
          <Badge variant="secondary" className="bg-white text-black shadow-md">
            <Truck className="h-3 w-3 mr-1" /> {t('navigationMode')}
          </Badge>
        </div>
      )}

      {/* Légende de la carte - visible uniquement en mode plein écran */}
      {isFullscreen && (
        <Card className="absolute left-2 top-2 z-10 p-2 bg-white/90 shadow-md">
          <div className="text-sm font-medium mb-2">{t('legend')}</div>
          <div className="flex flex-col gap-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span>{t('yourPosition')}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span>{t('pickupPoint')}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span>{t('deliveryPoint')}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-1 bg-indigo-500"></div>
              <span>{t('route')}</span>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
