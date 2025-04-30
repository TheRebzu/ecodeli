'use client';

import { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Icon } from 'leaflet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DeliveryStatus } from '@/types/delivery';
import { useTheme } from 'next-themes';
import { useTranslations } from 'next-intl';

// Définir les icônes pour les différents types de marqueurs
const createIcon = (iconUrl: string) => {
  return new Icon({
    iconUrl,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
  });
};

const deliveryIcons = {
  pickup: createIcon('/leaflet/marker-green.png'),
  delivery: createIcon('/leaflet/marker-red.png'),
  current: createIcon('/leaflet/marker-blue.png'),
};

// Composant pour centrer la carte sur les coordonnées actuelles
function MapUpdater({ position }: { position: [number, number] }) {
  const map = useMap();

  useEffect(() => {
    if (position) {
      map.setView(position, map.getZoom());
    }
  }, [map, position]);

  return null;
}

interface DeliveryTrackingMapProps {
  pickupAddress: string;
  deliveryAddress: string;
  pickupCoordinates?: [number, number];
  deliveryCoordinates?: [number, number];
  currentCoordinates?: [number, number];
  status: DeliveryStatus;
  lastUpdate?: Date;
  className?: string;
}

export default function DeliveryTrackingMap({
  pickupAddress,
  deliveryAddress,
  pickupCoordinates,
  deliveryCoordinates,
  currentCoordinates,
  status,
  lastUpdate,
  className = '',
}: DeliveryTrackingMapProps) {
  const t = useTranslations('deliveries');
  const { theme } = useTheme();
  const [mapCenter, setMapCenter] = useState<[number, number]>(
    currentCoordinates || pickupCoordinates || [48.8566, 2.3522] // Paris par défaut
  );

  const [mapKey, setMapKey] = useState(0);
  const darkModeUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
  const lightModeUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

  // Mettre à jour la carte quand le thème change
  useEffect(() => {
    setMapKey(prev => prev + 1);
  }, [theme]);

  // Mettre à jour le centre de la carte quand les coordonnées actuelles changent
  useEffect(() => {
    if (currentCoordinates) {
      setMapCenter(currentCoordinates);
    }
  }, [currentCoordinates]);

  const formatDateTime = useCallback((date?: Date) => {
    if (!date) return '';
    return new Intl.DateTimeFormat('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date instanceof Date ? date : new Date(date));
  }, []);

  return (
    <Card className={`overflow-hidden ${className}`}>
      <CardHeader className="p-4">
        <CardTitle>{t('tracking.map.title')}</CardTitle>
        {lastUpdate && (
          <p className="text-sm text-muted-foreground">
            {t('tracking.map.lastUpdate')}: {formatDateTime(lastUpdate)}
          </p>
        )}
      </CardHeader>
      <CardContent className="p-0">
        <div className="h-[400px] w-full">
          <MapContainer
            key={mapKey}
            center={mapCenter}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              url={theme === 'dark' ? darkModeUrl : lightModeUrl}
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />

            {pickupCoordinates && (
              <Marker position={pickupCoordinates} icon={deliveryIcons.pickup}>
                <Popup>
                  <div className="max-w-xs">
                    <h3 className="font-semibold">{t('tracking.map.pickupPoint')}</h3>
                    <p className="text-sm">{pickupAddress}</p>
                  </div>
                </Popup>
              </Marker>
            )}

            {deliveryCoordinates && (
              <Marker position={deliveryCoordinates} icon={deliveryIcons.delivery}>
                <Popup>
                  <div className="max-w-xs">
                    <h3 className="font-semibold">{t('tracking.map.deliveryPoint')}</h3>
                    <p className="text-sm">{deliveryAddress}</p>
                  </div>
                </Popup>
              </Marker>
            )}

            {currentCoordinates &&
              status !== DeliveryStatus.DELIVERED &&
              status !== DeliveryStatus.CONFIRMED && (
                <Marker position={currentCoordinates} icon={deliveryIcons.current}>
                  <Popup>
                    <div className="max-w-xs">
                      <h3 className="font-semibold">{t('tracking.map.currentPosition')}</h3>
                      <p className="text-sm">
                        {t('tracking.map.statusIs')}: {t(`statuses.${status}`)}
                      </p>
                      {lastUpdate && <p className="text-xs">{formatDateTime(lastUpdate)}</p>}
                    </div>
                  </Popup>
                </Marker>
              )}

            <MapUpdater position={mapCenter} />
          </MapContainer>
        </div>
      </CardContent>
    </Card>
  );
}
