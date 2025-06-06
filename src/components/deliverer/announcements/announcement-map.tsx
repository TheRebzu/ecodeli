'use client';

import { useEffect, useState } from 'react';
import { Announcement } from '@/types/announcements/announcement';
import { useAnnouncement } from '@/hooks/delivery/use-announcement';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/common';
import dynamic from 'next/dynamic';

// Import dynamique de Leaflet (sans SSR)
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), {
  ssr: false,
});
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });
const Tooltip = dynamic(() => import('react-leaflet').then(mod => mod.Tooltip), { ssr: false });
const Polyline = dynamic(() => import('react-leaflet').then(mod => mod.Polyline), { ssr: false });

// Interface pour le prototype de l'icône Leaflet
interface LeafletIconDefaultPrototype {
  _getIconUrl?: unknown;
}

// Import dynamique de l'icône Leaflet
const IconSetup = dynamic(
  () =>
    import('leaflet').then(L => {
      // Configurer le chemin des icônes Leaflet
      delete (L.Icon.Default.prototype as LeafletIconDefaultPrototype)._getIconUrl;

      L.Icon.Default.mergeOptions({
        iconRetinaUrl: '/leaflet/marker-icon-2x.png',
        iconUrl: '/leaflet/marker-icon.png',
        shadowUrl: '/leaflet/marker-shadow.png',
      });

      // Composant avec un nom d'affichage
      const LeafletIconSetup = ({ children }: { children: React.ReactNode }) => <>{children}</>;
      LeafletIconSetup.displayName = 'LeafletIconSetup';
      return LeafletIconSetup;
    }),
  { ssr: false }
);

type AnnouncementMapProps = {
  announcements?: Announcement[];
  selectedAnnouncement?: Announcement;
  isLoading?: boolean;
  height?: string;
  onSelectAnnouncement?: (announcement: Announcement) => void;
};

export function AnnouncementMap({
  announcements,
  selectedAnnouncement,
  isLoading = false,
  height = '500px',
  onSelectAnnouncement,
}: AnnouncementMapProps) {
  const t = useTranslations('announcements');
  const { myAnnouncements, getAnnouncementTypeLabel } = useAnnouncement();

  // État pour le chargement de la carte
  const [mapReady, setMapReady] = useState(false);

  // Utiliser les annonces fournies en props ou celles du hook
  const displayAnnouncements = announcements || myAnnouncements?.announcements;

  // Marquer la carte comme prête après le chargement des composants
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setMapReady(true);
    }
  }, []);

  // Position par défaut de la carte (Paris)
  const defaultCenter = [48.8566, 2.3522];
  const defaultZoom = 5;

  // Fonction pour créer une icône de marqueur personnalisée
  const createCustomIcon = (announcement: Announcement) => {
    if (typeof window === 'undefined' || !window.L) return undefined;

    // Import de L depuis la fenêtre globale
    const L = window.L;

    // Couleur en fonction du type d'annonce
    let color = '#3B82F6'; // Bleu par défaut

    switch (announcement.type) {
      case 'PACKAGE':
        color = '#3B82F6'; // Bleu
        break;
      case 'GROCERIES':
        color = '#10B981'; // Vert
        break;
      case 'DOCUMENTS':
        color = '#F59E0B'; // Orange
        break;
      case 'MEAL':
        color = '#EF4444'; // Rouge
        break;
      case 'FURNITURE':
        color = '#8B5CF6'; // Violet
        break;
      default:
        color = '#6B7280'; // Gris
    }

    // Icône personnalisée
    return L.divIcon({
      className: 'bg-transparent',
      iconSize: [30, 30],
      iconAnchor: [15, 30],
      popupAnchor: [0, -30],
      html: `
        <div class="${cn(
          'relative flex items-center justify-center w-8 h-8 rounded-full',
          selectedAnnouncement?.id === announcement.id
            ? 'text-white bg-primary transform scale-125 shadow-lg'
            : `text-white shadow-md`
        )}" style="background-color: ${color}">
          <div class="relative z-10 text-xs font-bold">${announcement.id.slice(0, 2)}</div>
          <div class="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 w-3 h-3 bg-white rotate-45"></div>
        </div>
      `,
    });
  };

  // Fonction pour gérer le clic sur un marqueur
  const handleMarkerClick = (announcement: Announcement) => {
    if (onSelectAnnouncement) {
      onSelectAnnouncement(announcement);
    }
  };

  // Rendu de l'état de chargement
  if (isLoading || !mapReady) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{t('deliveryMap')}</CardTitle>
          <CardDescription>{t('deliveryMapDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center" style={{ height }}>
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{t('loadingMap')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Si aucune annonce n'est disponible
  if (!displayAnnouncements || displayAnnouncements.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{t('deliveryMap')}</CardTitle>
          <CardDescription>{t('deliveryMapDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center" style={{ height }}>
          <div className="text-center">
            <p className="text-muted-foreground">{t('noAnnouncementsToDisplay')}</p>
            <Button className="mt-4" size="sm" onClick={() => window.location.reload()}>
              {t('refresh')}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{t('deliveryMap')}</CardTitle>
        <CardDescription>{t('deliveryMapDescription')}</CardDescription>
      </CardHeader>
      <CardContent style={{ height, padding: 0, overflow: 'hidden' }}>
        {mapReady && typeof window !== 'undefined' && window.L && (
          <IconSetup>
            <MapContainer
              center={defaultCenter as [number, number]}
              zoom={defaultZoom}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {/* Afficher les marqueurs pour les points de départ et d'arrivée */}
              {displayAnnouncements.map(announcement => {
                if (
                  !announcement.pickupLatitude ||
                  !announcement.pickupLongitude ||
                  !announcement.deliveryLatitude ||
                  !announcement.deliveryLongitude
                ) {
                  return null;
                }

                const icon = createCustomIcon(announcement);

                return (
                  <div key={announcement.id}>
                    {/* Marqueur de départ */}
                    <Marker
                      position={[announcement.pickupLatitude, announcement.pickupLongitude]}
                      icon={icon}
                      eventHandlers={{
                        click: () => handleMarkerClick(announcement),
                      }}
                    >
                      <Tooltip direction="top" offset={[0, -20]} opacity={0.7}>
                        <div>
                          <p className="font-semibold">{announcement.title}</p>
                          <p>{t('pickupPoint')}</p>
                          <p className="text-xs text-muted-foreground">
                            {announcement.pickupAddress}
                          </p>
                        </div>
                      </Tooltip>
                      <Popup>
                        <div className="p-1">
                          <h3 className="font-semibold">{announcement.title}</h3>
                          <p className="text-sm">{getAnnouncementTypeLabel(announcement.type)}</p>
                          <div className="mt-2">
                            <p className="text-xs font-medium">{t('pickupAddress')}:</p>
                            <p className="text-xs">{announcement.pickupAddress}</p>
                          </div>
                          <div className="mt-1">
                            <p className="text-xs font-medium">{t('deliveryAddress')}:</p>
                            <p className="text-xs">{announcement.deliveryAddress}</p>
                          </div>
                          {onSelectAnnouncement && (
                            <Button
                              size="sm"
                              className="mt-2 w-full text-xs"
                              onClick={() => handleMarkerClick(announcement)}
                            >
                              {t('viewDetails')}
                            </Button>
                          )}
                        </div>
                      </Popup>
                    </Marker>

                    {/* Marqueur d'arrivée */}
                    <Marker
                      position={[announcement.deliveryLatitude, announcement.deliveryLongitude]}
                      icon={icon}
                      eventHandlers={{
                        click: () => handleMarkerClick(announcement),
                      }}
                    >
                      <Tooltip direction="top" offset={[0, -20]} opacity={0.7}>
                        <div>
                          <p className="font-semibold">{announcement.title}</p>
                          <p>{t('deliveryPoint')}</p>
                          <p className="text-xs text-muted-foreground">
                            {announcement.deliveryAddress}
                          </p>
                        </div>
                      </Tooltip>
                      <Popup>
                        <div className="p-1">
                          <h3 className="font-semibold">{announcement.title}</h3>
                          <p className="text-sm">{getAnnouncementTypeLabel(announcement.type)}</p>
                          <div className="mt-2">
                            <p className="text-xs font-medium">{t('pickupAddress')}:</p>
                            <p className="text-xs">{announcement.pickupAddress}</p>
                          </div>
                          <div className="mt-1">
                            <p className="text-xs font-medium">{t('deliveryAddress')}:</p>
                            <p className="text-xs">{announcement.deliveryAddress}</p>
                          </div>
                          {onSelectAnnouncement && (
                            <Button
                              size="sm"
                              className="mt-2 w-full text-xs"
                              onClick={() => handleMarkerClick(announcement)}
                            >
                              {t('viewDetails')}
                            </Button>
                          )}
                        </div>
                      </Popup>
                    </Marker>

                    {/* Ligne reliant les points */}
                    <Polyline
                      positions={[
                        [announcement.pickupLatitude, announcement.pickupLongitude],
                        [announcement.deliveryLatitude, announcement.deliveryLongitude],
                      ]}
                      color={selectedAnnouncement?.id === announcement.id ? '#0284c7' : '#94a3b8'}
                      weight={selectedAnnouncement?.id === announcement.id ? 3 : 2}
                      opacity={selectedAnnouncement?.id === announcement.id ? 0.8 : 0.5}
                      dashArray={selectedAnnouncement?.id === announcement.id ? '' : '5, 5'}
                    />
                  </div>
                );
              })}
            </MapContainer>
          </IconSetup>
        )}
      </CardContent>
    </Card>
  );
}
