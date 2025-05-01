'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DeliveryStatus } from '@/types/delivery';
import { useTheme } from 'next-themes';
import { useTranslations } from 'next-intl';
import type { LeafletMapProps } from '@/components/maps/leaflet-map';

// Import dynamique du composant de carte qui gère tout Leaflet
// Cette approche isole tous les imports liés à Leaflet dans un composant client uniquement
const LeafletMap = dynamic<LeafletMapProps>(() => import('@/components/maps/leaflet-map'), {
  ssr: false,
  loading: () => (
    <div className="h-[400px] w-full flex items-center justify-center bg-muted">
      <p>Chargement de la carte...</p>
    </div>
  ),
});

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

  // État pour vérifier que le composant est bien monté côté client
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Préparation des markers pour la carte
  const mapMarkers = [
    ...(pickupCoordinates
      ? [
          {
            position: pickupCoordinates,
            type: 'pickup' as const,
            popup: {
              title: t('tracking.map.pickupPoint'),
              content: pickupAddress,
            },
          },
        ]
      : []),
    ...(deliveryCoordinates
      ? [
          {
            position: deliveryCoordinates,
            type: 'delivery' as const,
            popup: {
              title: t('tracking.map.deliveryPoint'),
              content: deliveryAddress,
            },
          },
        ]
      : []),
    ...(currentCoordinates &&
    status !== DeliveryStatus.DELIVERED &&
    status !== DeliveryStatus.CONFIRMED
      ? [
          {
            position: currentCoordinates,
            type: 'current' as const,
            popup: {
              title: t('tracking.map.currentPosition'),
              content: `${t('tracking.map.statusIs')}: ${t(`statuses.${status}`)}`,
            },
          },
        ]
      : []),
  ];

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
          {isClient && <LeafletMap center={mapCenter} theme={theme} markers={mapMarkers} />}
        </div>
      </CardContent>
    </Card>
  );
}
