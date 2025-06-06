'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Search, MapPin, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils/common';
import debounce from 'lodash/debounce';
import dynamic from 'next/dynamic';
import { useGeocoding } from '@/hooks/system/use-geocoding';

// Import dynamique de la carte pour éviter les erreurs côté serveur
const Map = dynamic(() => import('@/components/maps/leaflet-map'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[300px] bg-muted/20">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  ),
});

// Types de marqueurs
export type MarkerType = 'pickup' | 'delivery' | 'current';

// Props du composant
interface AddressMapPickerProps {
  address: string;
  onAddressChange: (address: string) => void;
  onCoordinatesChange: (latitude: number, longitude: number) => void;
  latitude?: number;
  longitude?: number;
  markerType?: MarkerType;
  className?: string;
  placeholder?: string;
}

/**
 * Composant de sélection d'adresse avec carte intégrée
 */
export function AddressMapPicker({
  address = '',
  onAddressChange,
  onCoordinatesChange,
  latitude,
  longitude,
  markerType = 'pickup',
  className,
  placeholder,
}: AddressMapPickerProps) {
  const t = useTranslations('maps');
  const { searchAddress: geocodeAddress, reverseGeocode } = useGeocoding();
  const [inputValue, setInputValue] = useState(address || '');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showPopover, setShowPopover] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>(
    [latitude || 48.8566, longitude || 2.3522] // Paris par défaut
  );
  const [selectedCoordinates, setSelectedCoordinates] = useState<[number, number] | null>(
    latitude && longitude ? [latitude, longitude] : null
  );

  // Créer des marqueurs pour la carte
  const markers = selectedCoordinates
    ? [
        {
          position: selectedCoordinates,
          type: markerType,
          popup: {
            title: markerType === 'pickup' ? t('pickupAddress') : t('deliveryAddress'),
            content: address || '',
          },
        },
      ]
    : [];

  // Mettre à jour les coordonnées dans le parent quand elles changent
  useEffect(() => {
    if (selectedCoordinates) {
      onCoordinatesChange(selectedCoordinates[0], selectedCoordinates[1]);
    }
  }, [selectedCoordinates, onCoordinatesChange]);

  // Mettre à jour l'adresse dans le parent
  useEffect(() => {
    if (address !== inputValue) {
      setInputValue(address || '');
    }
  }, [address]);

  // Mettre à jour les coordonnées quand latitude/longitude changent
  useEffect(() => {
    if (latitude && longitude) {
      setSelectedCoordinates([latitude, longitude]);
      setMapCenter([latitude, longitude]);
    }
  }, [latitude, longitude]);

  // Recherche d'adresse avec tRPC et Nominatim
  const searchAddress = useCallback(
    async (query: string) => {
      if (query.length < 3) {
        setSuggestions([]);
        return;
      }

      setIsLoading(true);
      try {
        const data = await geocodeAddress(query, 5);
        setSuggestions(data);
      } catch (error) {
        console.error("Erreur de recherche d'adresse:", error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    },
    [geocodeAddress]
  );

  // Fonction debounce pour éviter trop d'appels API
  const debouncedSearch = useCallback(
    debounce((query: string) => {
      searchAddress(query);
    }, 500),
    [searchAddress]
  );

  // Gérer le changement d'adresse dans l'input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    setShowPopover(value.length >= 3);
    debouncedSearch(value);
  };

  // Sélectionner une suggestion
  const handleSelectSuggestion = (suggestion: any) => {
    const address = suggestion.display_name;
    const lat = parseFloat(suggestion.lat);
    const lon = parseFloat(suggestion.lon);

    setInputValue(address);
    setSelectedCoordinates([lat, lon]);
    setMapCenter([lat, lon]);
    onAddressChange(address);
    setShowPopover(false);
  };

  // Gérer le clic sur la carte
  const handleMapClick = (e: L.LeafletMouseEvent) => {
    const { lat, lng } = e.latlng;
    setSelectedCoordinates([lat, lng]);
    fetchAddressFromCoordinates(lat, lng);
  };

  // Recherche d'adresse à partir de coordonnées (géocodage inverse) avec tRPC
  const fetchAddressFromCoordinates = async (lat: number, lng: number) => {
    try {
      const data = await reverseGeocode(lat, lng, 18);
      const address = data.display_name;

      setInputValue(address);
      onAddressChange(address);
    } catch (error) {
      console.error('Erreur de géocodage inverse:', error);
    }
  };

  return (
    <div className={cn('space-y-3', className)}>
      <Popover open={showPopover && suggestions.length > 0} onOpenChange={setShowPopover}>
        <PopoverTrigger asChild>
          <div className="relative">
            <MapPin className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder={placeholder || t('searchAddress')}
              value={inputValue}
              onChange={handleInputChange}
              className="pl-9 pr-10"
            />
            {isLoading && (
              <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <div className="max-h-[300px] overflow-auto">
            {suggestions.map((suggestion, index) => (
              <Button
                key={index}
                variant="ghost"
                className="w-full justify-start p-2 text-xs"
                onClick={() => handleSelectSuggestion(suggestion)}
              >
                <MapPin className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                <div className="w-full overflow-hidden text-left">
                  <div className="truncate">{suggestion.display_name}</div>
                </div>
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      <Card className="overflow-hidden border">
        <CardContent className="p-0">
          <div className="h-[300px] w-full">
            <Map
              center={{
                lat: mapCenter[0],
                lng: mapCenter[1],
              }}
              markers={markers.length > 0 ? markers : undefined}
              onMapClick={handleMapClick}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default AddressMapPicker;
