'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Search } from 'lucide-react';
import { toast } from 'sonner';
import dynamic from 'next/dynamic';

// Types pour éviter les erreurs avec les imports dynamiques
interface MapProps {
  center: [number, number];
  zoom: number;
  style: React.CSSProperties;
  children: React.ReactNode;
}

interface TileLayerProps {
  attribution: string;
  url: string;
}

interface MarkerProps {
  position: [number, number];
  children?: React.ReactNode;
}

interface PopupProps {
  children: React.ReactNode;
}

// Import dynamique de Leaflet pour éviter les problèmes de SSR
const MapContainer = dynamic<MapProps>(
  () => import('react-leaflet').then(mod => mod.MapContainer),
  { ssr: false }
);

const TileLayer = dynamic<TileLayerProps>(
  () => import('react-leaflet').then(mod => mod.TileLayer),
  { ssr: false }
);

const Marker = dynamic<MarkerProps>(() => import('react-leaflet').then(mod => mod.Marker), {
  ssr: false,
});

const Popup = dynamic<PopupProps>(() => import('react-leaflet').then(mod => mod.Popup), {
  ssr: false,
});

// Définir une interface pour l'événement de clic sur la carte
interface MapClickEvent {
  latlng: {
    lat: number;
    lng: number;
  };
}

// Composant MapEvents pour gérer les clics sur la carte
const MapEvents = dynamic<{ onClick: (e: MapClickEvent) => void }>(
  () =>
    import('react-leaflet').then(mod => {
      // Création d'un composant wrapper pour useMapEvents
      const EventsComponent = ({ onClick }: { onClick: (e: MapClickEvent) => void }) => {
        mod.useMapEvents({
          click: onClick,
        });
        return null;
      };
      return EventsComponent;
    }),
  { ssr: false }
);

// Import dynamique de l'icône Leaflet
const IconSetup = dynamic(
  () =>
    import('leaflet').then(L => {
      // Configurer le chemin des icônes Leaflet
      delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;

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

interface AddressMapPickerProps {
  initialAddress?: string;
  initialLatitude?: number;
  initialLongitude?: number;
  onAddressChange: (address: string, latitude: number, longitude: number) => void;
  label: string;
  placeholder?: string;
}

export function AddressMapPicker({
  initialAddress = '',
  initialLatitude,
  initialLongitude,
  onAddressChange,
  label,
  placeholder,
}: AddressMapPickerProps) {
  const t = useTranslations('announcements');
  const [address, setAddress] = useState(initialAddress);
  const [latitude, setLatitude] = useState<number>(initialLatitude || 48.8566);
  const [longitude, setLongitude] = useState<number>(initialLongitude || 2.3522);
  const [isMapReady, setIsMapReady] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // Référence au timeout pour la recherche d'adresse
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  // Effet pour initialiser la carte une fois le composant monté
  useEffect(() => {
    setIsMapReady(true);
    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
  }, []);

  // Effet pour mettre à jour la position sur la carte si les valeurs initiales changent
  useEffect(() => {
    if (initialLatitude && initialLongitude) {
      setLatitude(initialLatitude);
      setLongitude(initialLongitude);
    }
    if (initialAddress) {
      setAddress(initialAddress);
    }
  }, [initialAddress, initialLatitude, initialLongitude]);

  // Recherche d'adresse avec géocodage
  const searchAddress = async () => {
    if (!address.trim()) return;

    try {
      setIsSearching(true);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`
      );

      if (!response.ok) {
        throw new Error(t('addressSearchError'));
      }

      const data = await response.json();

      if (data && data.length > 0) {
        const result = data[0];
        const newLat = parseFloat(result.lat);
        const newLng = parseFloat(result.lon);

        setLatitude(newLat);
        setLongitude(newLng);
        setAddress(result.display_name);

        onAddressChange(result.display_name, newLat, newLng);
      } else {
        toast.error(t('addressNotFound'));
      }
    } catch (error) {
      console.error("Erreur de recherche d'adresse:", error);
      toast.error(t('addressSearchError'));
    } finally {
      setIsSearching(false);
    }
  };

  // Gestion de la sélection d'une position sur la carte
  const handleMapClick = async (e: { latlng: { lat: number; lng: number } }) => {
    const { lat, lng } = e.latlng;
    setLatitude(lat);
    setLongitude(lng);

    // Géocodage inverse pour obtenir l'adresse
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );

      if (!response.ok) {
        throw new Error();
      }

      const data = await response.json();

      if (data && data.display_name) {
        setAddress(data.display_name);
        onAddressChange(data.display_name, lat, lng);
      }
    } catch (error) {
      console.error('Erreur de géocodage inverse:', error);
      // Mettre à jour avec uniquement les coordonnées
      onAddressChange(address, lat, lng);
    }
  };

  // Gérer la recherche d'adresse avec un délai
  const handleAddressChange = (value: string) => {
    setAddress(value);

    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    if (value.trim().length > 3) {
      searchTimeout.current = setTimeout(() => {
        searchAddress();
      }, 1000);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col space-y-2">
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          {label}
        </label>
        <div className="flex w-full items-center space-x-2">
          <Input
            type="text"
            value={address}
            onChange={e => handleAddressChange(e.target.value)}
            placeholder={placeholder || t('enterAddress')}
            className="flex-1"
          />
          <Button
            type="button"
            size="icon"
            onClick={searchAddress}
            disabled={isSearching || !address.trim()}
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>
        <div className="text-xs text-muted-foreground">
          {latitude.toFixed(6)}, {longitude.toFixed(6)}
        </div>
      </div>

      {isMapReady && (
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="h-[300px] w-full">
              <IconSetup>
                <MapContainer
                  center={[latitude, longitude]}
                  zoom={13}
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <Marker position={[latitude, longitude]}>
                    <Popup>{address}</Popup>
                  </Marker>
                  <MapEvents onClick={handleMapClick} />
                </MapContainer>
              </IconSetup>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
