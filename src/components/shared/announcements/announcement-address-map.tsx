'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { MapPin, Search, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils/common';

// Type pour les coordonnées géographiques
interface GeoCoordinates {
  lat: number;
  lng: number;
}

interface AddressSearchResult {
  address: string;
  coordinates: GeoCoordinates;
}

interface AnnouncementAddressMapProps {
  address: string;
  latitude?: number;
  longitude?: number;
  onAddressChange: (address: string) => void;
  onCoordinatesChange: (latitude: number, longitude: number) => void;
  placeholder?: string;
  disabled?: boolean;
  mapHeight?: string;
}

export function AnnouncementAddressMap({
  address,
  latitude,
  longitude,
  onAddressChange,
  onCoordinatesChange,
  placeholder,
  disabled = false,
  mapHeight = '300px',
}: AnnouncementAddressMapProps) {
  const t = useTranslations('announcements');
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [marker, setMarker] = useState<google.maps.Marker | null>(null);
  const [searchResults, setSearchResults] = useState<AddressSearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [inputValue, setInputValue] = useState(address);
  const mapRef = useRef<HTMLDivElement>(null);
  const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesService = useRef<google.maps.places.PlacesService | null>(null);
  const geocoder = useRef<google.maps.Geocoder | null>(null);

  // Initialisation de la carte Google Maps
  useEffect(() => {
    // Vérifier si l'API Google Maps est chargée
    if (typeof window !== 'undefined' && window.google && window.google.maps) {
      if (mapRef.current && !map) {
        // Position par défaut (Paris)
        const defaultPosition = { lat: 48.8566, lng: 2.3522 };
        const position =
          latitude && longitude ? { lat: latitude, lng: longitude } : defaultPosition;

        // Créer la carte
        const mapInstance = new google.maps.Map(mapRef.current, {
          center: position,
          zoom: 13,
          disableDefaultUI: true,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          mapTypeId: google.maps.MapTypeId.ROADMAP,
        });

        // Créer le marqueur
        const markerInstance = new google.maps.Marker({
          position,
          map: mapInstance,
          draggable: !disabled,
          animation: google.maps.Animation.DROP,
        });

        // Gérer le déplacement du marqueur
        markerInstance.addListener('dragend', () => {
          const position = markerInstance.getPosition();
          if (position) {
            onCoordinatesChange(position.lat(), position.lng());
            reverseGeocode(position.lat(), position.lng());
          }
        });

        // Gérer le clic sur la carte
        mapInstance.addListener('click', (e: google.maps.MapMouseEvent) => {
          if (!disabled && e.latLng) {
            markerInstance.setPosition(e.latLng);
            onCoordinatesChange(e.latLng.lat(), e.latLng.lng());
            reverseGeocode(e.latLng.lat(), e.latLng.lng());
          }
        });

        // Initialiser les services
        autocompleteService.current = new google.maps.places.AutocompleteService();
        placesService.current = new google.maps.places.PlacesService(mapInstance);
        geocoder.current = new google.maps.Geocoder();

        setMap(mapInstance);
        setMarker(markerInstance);
      }
    }
  }, [map, latitude, longitude, disabled, onCoordinatesChange]);

  // Mettre à jour la position du marqueur lorsque les coordonnées changent
  useEffect(() => {
    if (map && marker && latitude && longitude) {
      const position = { lat: latitude, lng: longitude };
      marker.setPosition(position);
      map.panTo(position);
    }
  }, [map, marker, latitude, longitude]);

  // Fonction pour rechercher des adresses
  const searchAddress = async (query: string) => {
    if (!query || !autocompleteService.current) return;

    setIsSearching(true);
    try {
      autocompleteService.current.getPlacePredictions(
        {
          input: query,
          types: ['address'],
          componentRestrictions: { country: 'fr' }, // Restreindre à la France
        },
        (predictions, status) => {
          if (status !== google.maps.places.PlacesServiceStatus.OK || !predictions) {
            setSearchResults([]);
            setShowResults(false);
            setIsSearching(false);
            return;
          }

          const results = predictions.slice(0, 5).map(prediction => ({
            address: prediction.description,
            placeId: prediction.place_id,
          }));

          // Récupérer les coordonnées pour chaque résultat
          const resultPromises = results.map(async result => {
            if (!placesService.current) return null;

            return new Promise<AddressSearchResult | null>(resolve => {
              placesService.current!.getDetails(
                {
                  placeId: result.placeId,
                  fields: ['geometry', 'formatted_address'],
                },
                (place, detailsStatus) => {
                  if (
                    detailsStatus !== google.maps.places.PlacesServiceStatus.OK ||
                    !place ||
                    !place.geometry ||
                    !place.geometry.location
                  ) {
                    resolve(null);
                    return;
                  }

                  resolve({
                    address: place.formatted_address || result.address,
                    coordinates: {
                      lat: place.geometry.location.lat(),
                      lng: place.geometry.location.lng(),
                    },
                  });
                }
              );
            });
          });

          Promise.all(resultPromises).then(resolvedResults => {
            const validResults = resolvedResults.filter(
              (result): result is AddressSearchResult => result !== null
            );
            setSearchResults(validResults);
            setShowResults(validResults.length > 0);
            setIsSearching(false);
          });
        }
      );
    } catch (error) {
      console.error("Erreur lors de la recherche d'adresse:", error);
      setIsSearching(false);
    }
  };

  // Fonction pour géocoder une adresse (obtenir les coordonnées)
  const geocodeAddress = (address: string) => {
    if (!geocoder.current) return;

    setIsSearching(true);
    geocoder.current.geocode({ address }, (results, status) => {
      setIsSearching(false);
      if (status !== google.maps.GeocoderStatus.OK || !results || results.length === 0) {
        console.error('Erreur de géocodage:', status);
        return;
      }

      const location = results[0].geometry.location;
      onCoordinatesChange(location.lat(), location.lng());

      if (map && marker) {
        marker.setPosition(location);
        map.panTo(location);
      }
    });
  };

  // Fonction pour le géocodage inverse (obtenir l'adresse à partir des coordonnées)
  const reverseGeocode = (lat: number, lng: number) => {
    if (!geocoder.current) return;

    setIsSearching(true);
    geocoder.current.geocode({ location: { lat, lng } }, (results, status) => {
      setIsSearching(false);
      if (status !== google.maps.GeocoderStatus.OK || !results || results.length === 0) {
        console.error('Erreur de géocodage inverse:', status);
        return;
      }

      const address = results[0].formatted_address;
      setInputValue(address);
      onAddressChange(address);
    });
  };

  // Gérer le changement dans le champ de texte
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    setShowResults(true);
    searchAddress(value);
  };

  // Gérer la sélection d'un résultat
  const handleSelectResult = (result: AddressSearchResult) => {
    setInputValue(result.address);
    setShowResults(false);
    onAddressChange(result.address);
    onCoordinatesChange(result.coordinates.lat, result.coordinates.lng);

    if (map && marker) {
      const position = {
        lat: result.coordinates.lat,
        lng: result.coordinates.lng,
      };
      marker.setPosition(position);
      map.panTo(position);
    }
  };

  // Gérer la soumission du formulaire
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowResults(false);
    geocodeAddress(inputValue);
  };

  // Utiliser la géolocalisation du navigateur
  const useCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        position => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          onCoordinatesChange(lat, lng);
          reverseGeocode(lat, lng);

          if (map && marker) {
            const pos = { lat, lng };
            marker.setPosition(pos);
            map.panTo(pos);
          }
        },
        error => {
          console.error('Erreur de géolocalisation:', error);
        }
      );
    }
  };

  return (
    <div className="space-y-2">
      <form onSubmit={handleSubmit} className="relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              value={inputValue}
              onChange={handleInputChange}
              placeholder={placeholder || t('searchAddress')}
              disabled={disabled}
              className="pr-10"
            />
            {isSearching ? (
              <Loader2 className="h-4 w-4 animate-spin absolute top-3 right-3 text-muted-foreground" />
            ) : (
              <Search className="h-4 w-4 absolute top-3 right-3 text-muted-foreground" />
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={useCurrentLocation}
            disabled={disabled}
            title={t('useCurrentLocation')}
          >
            <MapPin className="h-4 w-4" />
          </Button>
        </div>

        {showResults && searchResults.length > 0 && (
          <Card className="absolute z-50 w-full mt-1">
            <CardContent className="p-1">
              <ul className="divide-y divide-border">
                {searchResults.map((result, index) => (
                  <li
                    key={index}
                    className="p-2 hover:bg-accent cursor-pointer truncate"
                    onClick={() => handleSelectResult(result)}
                  >
                    <div className="flex items-start">
                      <MapPin className="h-4 w-4 mr-2 mt-1 flex-shrink-0" />
                      <span className="text-sm">{result.address}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </form>

      <div
        ref={mapRef}
        className={cn(
          'w-full rounded-md border border-input overflow-hidden',
          disabled && 'opacity-70'
        )}
        style={{ height: mapHeight }}
      />

      {latitude && longitude && (
        <p className="text-xs text-muted-foreground">
          {t('coordinates')}: {latitude.toFixed(6)}, {longitude.toFixed(6)}
        </p>
      )}
    </div>
  );
}
