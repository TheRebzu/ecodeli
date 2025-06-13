"use client";

import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  MapPin,
  Search,
  Navigation,
  Crosshair,
  Check,
  X,
  Loader2,
  Map,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/common";

interface AddressMapPickerProps {
  address: string;
  onAddressChange: (address: string) => void;
  onCoordinatesChange: (lat: number, lng: number) => void;
  latitude?: number;
  longitude?: number;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

interface AddressSuggestion {
  id: string;
  label: string;
  address: string;
  coordinates: { lat: number; lng: number };
  type: "address" | "poi" | "city";
  distance?: number;
}

export function AddressMapPicker({
  address,
  onAddressChange,
  onCoordinatesChange,
  latitude,
  longitude,
  className,
  placeholder = "Entrez une adresse...",
  disabled = false,
}: AddressMapPickerProps) {
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [selectedCoords, setSelectedCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(latitude && longitude ? { lat: latitude, lng: longitude } : null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(
    null,
  );

  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Utiliser une API réelle de géocodage
  const searchAddressesWithAPI = async (
    query: string,
  ): Promise<AddressSuggestion[]> => {
    try {
      // TODO: Intégrer avec une API réelle de géocodage (Nominatim, Google Maps, etc.)
      // Exemple avec Nominatim (OpenStreetMap)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=fr&limit=5`,
      );
      const data = await response.json();

      return data.map((item: any, index: number) => ({
        id: index.toString(),
        label: item.display_name.split(",")[0],
        address: item.display_name,
        coordinates: { lat: parseFloat(item.lat), lng: parseFloat(item.lon) },
        type:
          item.type === "house" || item.type === "residential"
            ? "address"
            : "poi",
      }));
    } catch (error) {
      console.error("Erreur lors de la recherche d'adresses:", error);
      return [];
    }
  };

  // Rechercher des adresses
  const searchAddresses = async (query: string) => {
    if (!query || query.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsSearching(true);

    try {
      // Utiliser l'API réelle de géocodage
      const suggestions = await searchAddressesWithAPI(query);
      setSuggestions(suggestions);
      setShowSuggestions(true);
    } catch (error) {
      toast.error("Erreur lors de la recherche d'adresses");
      setSuggestions([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Gérer les changements dans l'input de recherche
  const handleInputChange = (value: string) => {
    onAddressChange(value);

    // Debounce de la recherche
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    const timeout = setTimeout(() => {
      searchAddresses(value);
    }, 300);

    setSearchTimeout(timeout);
  };

  // Sélectionner une suggestion
  const selectSuggestion = (suggestion: AddressSuggestion) => {
    onAddressChange(suggestion.address);
    onCoordinatesChange(suggestion.coordinates.lat, suggestion.coordinates.lng);
    setSelectedCoords(suggestion.coordinates);
    setShowSuggestions(false);
    setSuggestions([]);

    toast.success("Adresse sélectionnée");
  };

  // Obtenir la position actuelle
  const getCurrentLocation = async () => {
    if (!navigator.geolocation) {
      toast.error("Géolocalisation non supportée");
      return;
    }

    setIsGettingLocation(true);

    try {
      const position = await new Promise<GeolocationPosition>(
        (resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000,
          });
        },
      );

      const { latitude, longitude } = position.coords;

      // Simuler une géocodage inverse pour obtenir l'adresse
      const reversedAddress = `Position actuelle (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;

      onAddressChange(reversedAddress);
      onCoordinatesChange(latitude, longitude);
      setSelectedCoords({ lat: latitude, lng: longitude });

      toast.success("Position actuelle utilisée");
    } catch (error) {
      toast.error("Impossible d'obtenir votre position");
    } finally {
      setIsGettingLocation(false);
    }
  };

  // Fermer les suggestions si on clique à l'extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Nettoyer le timeout à la destruction du composant
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTimeout]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "poi":
        return <MapPin className="h-3 w-3" />;
      case "address":
        return <Navigation className="h-3 w-3" />;
      default:
        return <Search className="h-3 w-3" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "poi":
        return "Point d'intérêt";
      case "address":
        return "Adresse";
      case "city":
        return "Ville";
      default:
        return "";
    }
  };

  return (
    <div className={cn("relative space-y-4", className)}>
      {/* Champ de recherche */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={address}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder={placeholder}
            className="pl-10 pr-20"
            disabled={disabled}
          />
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex gap-1">
            {isSearching && (
              <div className="flex items-center">
                <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
              </div>
            )}
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0"
              onClick={getCurrentLocation}
              disabled={disabled || isGettingLocation}
              title="Utiliser ma position actuelle"
            >
              {isGettingLocation ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Crosshair className="h-3 w-3" />
              )}
            </Button>
          </div>
        </div>

        {/* Liste des suggestions */}
        {showSuggestions && suggestions.length > 0 && (
          <Card
            ref={suggestionsRef}
            className="absolute top-full left-0 right-0 z-10 mt-1 max-h-60 overflow-auto shadow-lg"
          >
            <CardContent className="p-0">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion.id}
                  type="button"
                  className="w-full px-4 py-3 text-left hover:bg-muted/50 transition-colors border-b last:border-b-0 focus:outline-none focus:bg-muted/50"
                  onClick={() => selectSuggestion(suggestion)}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1 text-muted-foreground">
                      {getTypeIcon(suggestion.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm truncate">
                          {suggestion.label}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {getTypeLabel(suggestion.type)}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {suggestion.address}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Aucun résultat */}
        {showSuggestions &&
          suggestions.length === 0 &&
          !isSearching &&
          address.length >= 3 && (
            <Card className="absolute top-full left-0 right-0 z-10 mt-1 shadow-lg">
              <CardContent className="p-4 text-center">
                <Search className="h-8 w-8 mx-auto text-muted-foreground opacity-25 mb-2" />
                <p className="text-sm text-muted-foreground">
                  Aucune adresse trouvée
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Essayez avec des termes différents
                </p>
              </CardContent>
            </Card>
          )}
      </div>

      {/* Coordonnées sélectionnées */}
      {selectedCoords && (
        <Alert>
          <MapPin className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <div>
                <span className="font-medium">Position confirmée</span>
                <br />
                <span className="text-xs">
                  {selectedCoords.lat.toFixed(6)},{" "}
                  {selectedCoords.lng.toFixed(6)}
                </span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setSelectedCoords(null);
                  onAddressChange("");
                }}
                className="h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Carte simplifiée (placeholder) */}
      {selectedCoords && (
        <Card className="h-48">
          <CardContent className="p-0 h-full">
            <div className="relative h-full bg-gradient-to-br from-blue-50 to-green-50 dark:from-blue-950/20 dark:to-green-950/20 rounded-lg flex items-center justify-center">
              {/* Simulation d'une carte */}
              <div className="text-center">
                <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-2 shadow-lg">
                  <MapPin className="h-8 w-8 text-white" />
                </div>
                <p className="text-sm font-medium">Position sélectionnée</p>
                <p className="text-xs text-muted-foreground">
                  {selectedCoords.lat.toFixed(4)},{" "}
                  {selectedCoords.lng.toFixed(4)}
                </p>
              </div>

              {/* Grille de fond pour simulation de carte */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-10">
                <defs>
                  <pattern
                    id="grid"
                    width="20"
                    height="20"
                    patternUnits="userSpaceOnUse"
                  >
                    <path
                      d="M 20 0 L 0 0 0 20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1"
                    />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
              </svg>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <div className="text-xs text-muted-foreground space-y-1">
        <p>• Tapez au moins 3 caractères pour rechercher une adresse</p>
        <p>• Utilisez le bouton cible pour votre position actuelle</p>
        <p>• Sélectionnez une suggestion pour confirmer l'adresse</p>
      </div>
    </div>
  );
}

export default AddressMapPicker;
