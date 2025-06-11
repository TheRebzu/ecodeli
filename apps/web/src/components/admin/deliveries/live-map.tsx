'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, MapPin, Truck, Box, Layers } from 'lucide-react';
import { DeliveryStatus } from '@prisma/client';
import { api } from '@/trpc/react';
import { toast } from 'sonner';
import dynamic from 'next/dynamic';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

// Import dynamique de la carte Leaflet pour éviter les erreurs côté serveur
const MapComponent = dynamic(() => import('../../shared/maps/map-component'), {
  ssr: false,
  loading: () => <Skeleton className="w-full h-[500px] rounded-md" />,
});

interface Delivery {
  id: string;
  status: DeliveryStatus;
  trackingNumber: string;
  clientId: string;
  delivererId: string | null;
  pickupAddress: string;
  deliveryAddress: string;
  pickupLatitude: number | null;
  pickupLongitude: number | null;
  deliveryLatitude: number | null;
  deliveryLongitude: number | null;
  client: {
    name: string;
  };
  deliverer: {
    name: string;
  } | null;
  currentCoordinates?: {
    latitude: number;
    longitude: number;
    timestamp: Date;
  } | null;
}

interface DeliveryMarker {
  id: string;
  type: 'pickup' | 'delivery' | 'current';
  latitude: number;
  longitude: number;
  label: string;
  deliveryId: string;
  status: DeliveryStatus;
}

interface HeatmapPoint {
  lat: number;
  lng: number;
  intensity: number;
}

interface LiveMapProps {
  deliveries: Delivery[];
}

type MapMode = 'markers' | 'heatmap' | 'hybrid';

export function LiveMap({ deliveries }: LiveMapProps) {
  const t = useTranslations('admin.deliveries');
  const [selectedDelivery, setSelectedDelivery] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [markers, setMarkers] = useState<DeliveryMarker[]>([]);
  const [heatmapPoints, setHeatmapPoints] = useState<HeatmapPoint[]>([]);
  const [bounds, setBounds] = useState<[[number, number], [number, number]] | null>(null);
  const [mapMode, setMapMode] = useState<MapMode>('markers');
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Mutation pour rafraîchir les coordonnées en temps réel
  const refreshCoordinatesMutation = api.delivery.getLatestCoordinates.useMutation({
    onSuccess: data => {
      if (data && data.length > 0) {
        // Mise à jour des marqueurs avec les nouvelles coordonnées
        updateMarkersWithCoordinates(data);
      }
    },
    onError: error => {
      toast.error(t('errors.coordinatesRefresh', { error: error.message }));
    },
  });

  // Récupération des données pour la carte thermique
  const heatmapQuery = api.delivery.getHeatmapData.useQuery(
    {
      startDate: undefined,
      endDate: undefined,
    },
    {
      enabled: mapMode === 'heatmap' || mapMode === 'hybrid',
      onSuccess: data => {
        if (data) {
          // Transformer les données pour la carte thermique
          const points: HeatmapPoint[] = data.map(point => ({
            lat: point.latitude,
            lng: point.longitude,
            intensity: point.count / Math.max(...data.map(p => p.count)),
          }));
          setHeatmapPoints(points);
        }
      },
      onError: error => {
        toast.error(t('errors.heatmapDataFetch', { error: error.message }));
      },
    }
  );

  // Préparation des marqueurs à partir des livraisons
  useEffect(() => {
    if (deliveries.length > 0) {
      const newMarkers: DeliveryMarker[] = [];
      const coordinates: [number, number][] = [];

      deliveries.forEach(delivery => {
        // Marqueur de point de départ
        if (delivery.pickupLatitude && delivery.pickupLongitude) {
          newMarkers.push({
            id: `pickup-${delivery.id}`,
            type: 'pickup',
            latitude: delivery.pickupLatitude,
            longitude: delivery.pickupLongitude,
            label: t('map.pickupPoint'),
            deliveryId: delivery.id,
            status: delivery.status,
          });
          coordinates.push([delivery.pickupLatitude, delivery.pickupLongitude]);
        }

        // Marqueur de point de livraison
        if (delivery.deliveryLatitude && delivery.deliveryLongitude) {
          newMarkers.push({
            id: `delivery-${delivery.id}`,
            type: 'delivery',
            latitude: delivery.deliveryLatitude,
            longitude: delivery.deliveryLongitude,
            label: t('map.deliveryPoint'),
            deliveryId: delivery.id,
            status: delivery.status,
          });
          coordinates.push([delivery.deliveryLatitude, delivery.deliveryLongitude]);
        }

        // Marqueur de position actuelle (si en transit)
        if (
          delivery.currentCoordinates &&
          delivery.status === 'IN_TRANSIT' &&
          delivery.currentCoordinates.latitude &&
          delivery.currentCoordinates.longitude
        ) {
          newMarkers.push({
            id: `current-${delivery.id}`,
            type: 'current',
            latitude: delivery.currentCoordinates.latitude,
            longitude: delivery.currentCoordinates.longitude,
            label: `${t('map.delivererPosition')}: ${delivery.deliverer?.name || ''}`,
            deliveryId: delivery.id,
            status: delivery.status,
          });
          coordinates.push([
            delivery.currentCoordinates.latitude,
            delivery.currentCoordinates.longitude,
          ]);
        }
      });

      setMarkers(newMarkers);

      // Calculer les limites de la carte
      if (coordinates.length > 0) {
        const lats = coordinates.map(c => c[0]);
        const lngs = coordinates.map(c => c[1]);
        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);
        const minLng = Math.min(...lngs);
        const maxLng = Math.max(...lngs);
        setBounds([
          [minLat - 0.05, minLng - 0.05],
          [maxLat + 0.05, maxLng + 0.05],
        ]);
      } else {
        setBounds(null);
      }
    }
  }, [deliveries, t]);

  // Mettre à jour la carte avec les dernières coordonnées
  const updateMarkersWithCoordinates = (
    coordinatesData: Array<{
      deliveryId: string;
      latitude: number;
      longitude: number;
      timestamp: Date;
    }>
  ) => {
    setMarkers(prevMarkers => {
      const newMarkers = [...prevMarkers];

      coordinatesData.forEach(coord => {
        // Supprimer l'ancien marqueur de position actuelle s'il existe
        const currentMarkerIndex = newMarkers.findIndex(
          m => m.type === 'current' && m.deliveryId === coord.deliveryId
        );

        if (currentMarkerIndex >= 0) {
          newMarkers.splice(currentMarkerIndex, 1);
        }

        // Ajouter le nouveau marqueur avec les coordonnées mises à jour
        const delivery = deliveries.find(d => d.id === coord.deliveryId);
        if (delivery && delivery.status === 'IN_TRANSIT') {
          newMarkers.push({
            id: `current-${delivery.id}-${new Date().getTime()}`,
            type: 'current',
            latitude: coord.latitude,
            longitude: coord.longitude,
            label: `${t('map.delivererPosition')}: ${delivery.deliverer?.name || ''}`,
            deliveryId: delivery.id,
            status: delivery.status,
          });
        }
      });

      return newMarkers;
    });
  };

  // Activer/désactiver le rafraîchissement automatique
  useEffect(() => {
    // Démarrer le rafraîchissement automatique
    startAutoRefresh();

    // Nettoyage lors du démontage du composant
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);

  const startAutoRefresh = () => {
    // Rafraîchir toutes les 30 secondes
    refreshIntervalRef.current = setInterval(() => {
      const inTransitDeliveries = deliveries.filter(d => d.status === 'IN_TRANSIT').map(d => d.id);

      if (inTransitDeliveries.length > 0) {
        refreshCoordinatesMutation.mutate({ deliveryIds: inTransitDeliveries });
      }
    }, 30000);
  };

  const handleRefresh = () => {
    setIsLoading(true);

    const inTransitDeliveries = deliveries.filter(d => d.status === 'IN_TRANSIT').map(d => d.id);

    if (inTransitDeliveries.length > 0) {
      refreshCoordinatesMutation.mutate(
        { deliveryIds: inTransitDeliveries },
        {
          onSettled: () => {
            setIsLoading(false);
          },
        }
      );
    } else {
      setIsLoading(false);
    }

    // Rafraîchir les données de la carte thermique si nécessaire
    if (mapMode === 'heatmap' || mapMode === 'hybrid') {
      heatmapQuery.refetch();
    }
  };

  const handleSelectDelivery = (deliveryId: string) => {
    setSelectedDelivery(deliveryId === selectedDelivery ? null : deliveryId);
  };

  const renderStatusBadge = (status: DeliveryStatus) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="outline">{t('status.pending')}</Badge>;
      case 'PICKED_UP':
        return <Badge variant="secondary">{t('status.pickedUp')}</Badge>;
      case 'IN_TRANSIT':
        return <Badge variant="secondary">{t('status.inTransit')}</Badge>;
      case 'DELIVERED':
        return <Badge variant="success">{t('status.delivered')}</Badge>;
      case 'CONFIRMED':
        return <Badge variant="success">{t('status.confirmed')}</Badge>;
      case 'CANCELLED':
        return <Badge variant="destructive">{t('status.cancelled')}</Badge>;
      case 'PROBLEM':
        return <Badge variant="destructive">{t('status.problem')}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Changement du mode de carte
  const handleMapModeChange = (value: string) => {
    setMapMode(value as MapMode);
    if (value === 'heatmap' || value === 'hybrid') {
      heatmapQuery.refetch();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row justify-between gap-4 mb-4">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
          <Button onClick={handleRefresh} variant="outline" size="sm" disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            {t('map.refreshPositions')}
          </Button>

          <ToggleGroup
            type="single"
            value={mapMode}
            onValueChange={value => value && handleMapModeChange(value)}
            className="flex-shrink-0"
          >
            <ToggleGroupItem value="markers" aria-label="Afficher les marqueurs">
              <MapPin className="h-4 w-4 mr-2" />
              {t('map.markers')}
            </ToggleGroupItem>
            <ToggleGroupItem value="heatmap" aria-label="Afficher la carte thermique">
              <Layers className="h-4 w-4 mr-2" />
              {t('map.heatmap')}
            </ToggleGroupItem>
            <ToggleGroupItem value="hybrid" aria-label="Afficher le mode hybride">
              <Truck className="h-4 w-4 mr-2" />
              {t('map.hybrid')}
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          {/* Composant de carte avec support pour la carte thermique */}
          <div className="bg-card rounded-md border h-[500px] relative">
            <MapComponent
              markers={mapMode === 'markers' || mapMode === 'hybrid' ? markers : []}
              heatmapEnabled={mapMode === 'heatmap' || mapMode === 'hybrid'}
              heatmapPoints={heatmapPoints}
              bounds={bounds}
              selectedDeliveryId={selectedDelivery}
              onMarkerClick={(markerId: string) => {
                const marker = markers.find(m => m.id === markerId);
                if (marker) {
                  handleSelectDelivery(marker.deliveryId);
                }
              }}
            />
          </div>
        </div>

        <div>
          <Card className="h-[500px]">
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3">{t('map.deliveries')}</h3>
              <ScrollArea className="h-[450px] pr-4">
                {deliveries.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64">
                    <Box className="h-12 w-12 text-muted-foreground mb-2" />
                    <p className="text-center text-muted-foreground">{t('map.noDeliveries')}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {deliveries.map(delivery => (
                      <div
                        key={delivery.id}
                        className={`p-3 rounded-md border cursor-pointer ${
                          selectedDelivery === delivery.id
                            ? 'bg-accent border-accent-foreground'
                            : 'hover:bg-accent/50'
                        }`}
                        onClick={() => handleSelectDelivery(delivery.id)}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium">{delivery.trackingNumber}</span>
                          {renderStatusBadge(delivery.status)}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {delivery.deliveryAddress}
                        </p>
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-xs">{delivery.client.name}</span>
                          {delivery.deliverer && (
                            <span className="text-xs text-muted-foreground">
                              {delivery.deliverer.name}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Légende de la carte thermique */}
      {(mapMode === 'heatmap' || mapMode === 'hybrid') && (
        <div className="flex items-center justify-center gap-8 mt-2 p-2 border rounded-md bg-background">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-green-500/30"></div>
            <span className="text-xs">{t('map.lowDensity')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-yellow-500/60"></div>
            <span className="text-xs">{t('map.mediumDensity')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-red-500/80"></div>
            <span className="text-xs">{t('map.highDensity')}</span>
          </div>
        </div>
      )}
    </div>
  );
}
