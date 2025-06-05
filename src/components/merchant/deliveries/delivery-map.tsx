'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Delivery, DeliveryStatus } from '@prisma/client';
import { Skeleton } from '@/components/ui/skeleton';
import dynamic from 'next/dynamic';
import { cn } from '@/lib/utils';

// Dynamically import Leaflet-dependent components to avoid SSR issues
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), {
  ssr: false,
});

const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });

const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });

const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });

const Polyline = dynamic(() => import('react-leaflet').then(mod => mod.Polyline), { ssr: false });

// Leaflet icon setup (needs to be imported client-side)
const LeafletIconSetup = dynamic(
  () =>
    import('@/components/maps/leaflet-icon-setup').then(mod => {
      return mod.LeafletIconSetup;
    }),
  { ssr: false }
);

interface DeliveryWithCoords extends Delivery {
  pickupLatitude?: number;
  pickupLongitude?: number;
  deliveryLatitude?: number;
  deliveryLongitude?: number;
  deliverer?: {
    name: string;
  };
  announcement?: {
    title: string;
  };
}

interface DeliveryMapProps {
  deliveries?: DeliveryWithCoords[];
  selectedDelivery?: DeliveryWithCoords;
  isLoading?: boolean;
  height?: string;
  onSelectDelivery?: (delivery: DeliveryWithCoords) => void;
}

export function DeliveryMap({
  deliveries = [],
  selectedDelivery,
  isLoading = false,
  height = '500px',
  onSelectDelivery,
}: DeliveryMapProps) {
  const t = useTranslations('merchant.deliveries.map');

  // State for map readiness
  const [mapReady, setMapReady] = useState(false);

  // Default map center (Paris)
  const defaultCenter = [48.8566, 2.3522];
  const defaultZoom = 5;

  // Set map as ready after component mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setMapReady(true);
    }
  }, []);

  // Helper function to create a custom marker icon
  const createCustomIcon = (delivery: DeliveryWithCoords) => {
    if (typeof window === 'undefined' || !window.L) return undefined;

    const L = window.L;

    // Color based on delivery status
    let color = '#3B82F6'; // Blue default

    switch (delivery.status) {
      case 'PENDING':
        color = '#F59E0B'; // Amber
        break;
      case 'ASSIGNED':
        color = '#3B82F6'; // Blue
        break;
      case 'IN_PROGRESS':
        color = '#8B5CF6'; // Purple
        break;
      case 'DELIVERED':
      case 'COMPLETED':
        color = '#10B981'; // Green
        break;
      case 'CANCELLED':
        color = '#EF4444'; // Red
        break;
      case 'PROBLEM':
        color = '#F97316'; // Orange
        break;
    }

    return L.divIcon({
      className: 'custom-icon',
      html: `<div style="background-color: ${color}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white;"></div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });
  };

  // Helper function to handle delivery selection
  const handleDeliverySelect = (delivery: DeliveryWithCoords) => {
    if (onSelectDelivery) {
      onSelectDelivery(delivery);
    }
  };

  // Filter deliveries that have valid coordinates
  const mapDeliveries = deliveries.filter(
    d => d.pickupLatitude && d.pickupLongitude && d.deliveryLatitude && d.deliveryLongitude
  );

  // Calculate bounds to fit all markers
  const getBounds = () => {
    if (typeof window === 'undefined' || !window.L || mapDeliveries.length === 0) {
      return undefined;
    }

    const L = window.L;
    const bounds = L.latLngBounds([]);

    mapDeliveries.forEach(delivery => {
      if (delivery.pickupLatitude && delivery.pickupLongitude) {
        bounds.extend([delivery.pickupLatitude, delivery.pickupLongitude]);
      }
      if (delivery.deliveryLatitude && delivery.deliveryLongitude) {
        bounds.extend([delivery.deliveryLatitude, delivery.deliveryLongitude]);
      }
    });

    return bounds.isValid() ? bounds : undefined;
  };

  if (isLoading) {
    return <Skeleton className={`w-full`} style={{ height }} />;
  }

  if (mapDeliveries.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="pt-6 text-center">
          <p className="mt-2 text-lg font-medium">{t('noDeliveries')}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t('noDeliveriesDescription')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('overflow-hidden')}>
      <CardHeader className="pb-2">
        <CardTitle>{t('deliveryMap')}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {mapReady && (
          <>
            <LeafletIconSetup />
            <MapContainer
              center={defaultCenter as [number, number]}
              zoom={defaultZoom}
              style={{ height, width: '100%' }}
              bounds={getBounds()}
              boundsOptions={{ padding: [50, 50] }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {mapDeliveries.map(delivery => (
                <div key={delivery.id}>
                  {/* Pickup marker */}
                  <Marker
                    position={[delivery.pickupLatitude!, delivery.pickupLongitude!]}
                    icon={createCustomIcon(delivery)}
                    eventHandlers={{
                      click: () => handleDeliverySelect(delivery),
                    }}
                  >
                    <Popup>
                      <div className="text-sm">
                        <h3 className="font-bold mb-1">
                          {delivery.announcement?.title || t('untitled')}
                        </h3>
                        <p className="mb-1">{t('pickupPoint')}</p>
                        <p className="text-muted-foreground">{delivery.pickupAddress}</p>
                      </div>
                    </Popup>
                  </Marker>

                  {/* Delivery marker */}
                  <Marker
                    position={[delivery.deliveryLatitude!, delivery.deliveryLongitude!]}
                    icon={createCustomIcon(delivery)}
                    eventHandlers={{
                      click: () => handleDeliverySelect(delivery),
                    }}
                  >
                    <Popup>
                      <div className="text-sm">
                        <h3 className="font-bold mb-1">
                          {delivery.announcement?.title || t('untitled')}
                        </h3>
                        <p className="mb-1">{t('deliveryPoint')}</p>
                        <p className="text-muted-foreground">{delivery.deliveryAddress}</p>
                      </div>
                    </Popup>
                  </Marker>

                  {/* Line connecting pickup and delivery points */}
                  <Polyline
                    positions={[
                      [delivery.pickupLatitude!, delivery.pickupLongitude!],
                      [delivery.deliveryLatitude!, delivery.deliveryLongitude!],
                    ]}
                    color={
                      selectedDelivery && selectedDelivery.id === delivery.id
                        ? '#3B82F6'
                        : '#94A3B8'
                    }
                    weight={selectedDelivery && selectedDelivery.id === delivery.id ? 3 : 2}
                    opacity={selectedDelivery && selectedDelivery.id === delivery.id ? 1 : 0.7}
                    dashArray={delivery.status === 'COMPLETED' ? '' : '5,5'}
                  />
                </div>
              ))}
            </MapContainer>
          </>
        )}
      </CardContent>
    </Card>
  );
}
