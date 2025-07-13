"use client";

import { useEffect, useState } from "react";
import { LeafletMap, MapMarker } from "./leaflet-map";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, MapPin, Clock, Euro, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useApi } from "@/hooks/use-api";

interface StorageBox {
  id: string;
  name: string;
  location: {
    latitude: number;
    longitude: number;
    address: string;
  };
  type: "small" | "medium" | "large";
  capacity: number;
  availableSpots: number;
  pricePerDay: number;
  features: string[];
  status: "available" | "full" | "maintenance";
  operatingHours: {
    open: string;
    close: string;
  };
  distance?: number;
}

interface StorageBoxesMapProps {
  userLocation?: {
    latitude: number;
    longitude: number;
  };
  onBoxSelect?: (box: StorageBox) => void;
  showSearch?: boolean;
  maxDistance?: number;
}

export function StorageBoxesMap({
  userLocation,
  onBoxSelect,
  showSearch = true,
  maxDistance = 10,
}: StorageBoxesMapProps) {
  const { get } = useApi();
  const [storageBoxes, setStorageBoxes] = useState<StorageBox[]>([]);
  const [filteredBoxes, setFilteredBoxes] = useState<StorageBox[]>([]);
  const [selectedBox, setSelectedBox] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStorageBoxes = async () => {
    try {
      const params = new URLSearchParams();
      if (userLocation) {
        params.append("lat", userLocation.latitude.toString());
        params.append("lng", userLocation.longitude.toString());
        params.append("radius", maxDistance.toString());
      }

      const response = await get(
        `/api/client/storage-boxes?${params.toString()}`,
      );
      if (response.data) {
        setStorageBoxes(response.data.boxes || []);
        setFilteredBoxes(response.data.boxes || []);
      }
    } catch (err) {
      setError("Impossible de charger les box de stockage");
      console.error("Storage boxes error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStorageBoxes();
  }, [userLocation, maxDistance]);

  useEffect(() => {
    if (!searchQuery) {
      setFilteredBoxes(storageBoxes);
    } else {
      const filtered = storageBoxes.filter(
        (box) =>
          box.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          box.location.address
            .toLowerCase()
            .includes(searchQuery.toLowerCase()),
      );
      setFilteredBoxes(filtered);
    }
  }, [searchQuery, storageBoxes]);

  const handleBoxClick = (box: StorageBox) => {
    setSelectedBox(box.id);
    if (onBoxSelect) {
      onBoxSelect(box);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-96">
          <div className="text-center text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Prepare markers
  const markers: MapMarker[] = filteredBoxes.map((box) => ({
    id: box.id,
    position: [box.location.latitude, box.location.longitude],
    type: "storage",
    label: box.name,
    popup: `
      <div>
        <strong>${box.name}</strong><br/>
        ${box.location.address}<br/>
        ${box.availableSpots}/${box.capacity} places disponibles<br/>
        ${box.pricePerDay}€/jour
      </div>
    `,
  }));

  // Add user location marker if available
  if (userLocation) {
    markers.push({
      id: "user-location",
      position: [userLocation.latitude, userLocation.longitude],
      type: "custom",
      label: "Ma position",
      popup: "Vous êtes ici",
    });
  }

  const mapCenter = userLocation
    ? ([userLocation.latitude, userLocation.longitude] as [number, number])
    : filteredBoxes.length > 0
      ? ([
          filteredBoxes[0].location.latitude,
          filteredBoxes[0].location.longitude,
        ] as [number, number])
      : ([48.8566, 2.3522] as [number, number]);

  return (
    <div className="space-y-4">
      {/* Search */}
      {showSearch && (
        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Rechercher une box ou une adresse..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Storage Boxes List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Box disponibles</span>
                <Badge variant="outline">{filteredBoxes.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredBoxes.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">
                    Aucune box trouvée
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Modifiez votre recherche ou votre position
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {filteredBoxes.map((box) => (
                    <Card
                      key={box.id}
                      className={`cursor-pointer transition-colors ${
                        selectedBox === box.id ? "border-primary" : ""
                      }`}
                      onClick={() => handleBoxClick(box)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium">{box.name}</h4>
                          <Badge
                            variant={
                              box.status === "available"
                                ? "default"
                                : box.status === "full"
                                  ? "destructive"
                                  : "secondary"
                            }
                          >
                            {box.status === "available"
                              ? "Disponible"
                              : box.status === "full"
                                ? "Complet"
                                : "Maintenance"}
                          </Badge>
                        </div>

                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span className="truncate">
                              {box.location.address}
                            </span>
                          </div>

                          {box.distance && (
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">
                                Distance:
                              </span>
                              <span>{box.distance.toFixed(1)} km</span>
                            </div>
                          )}

                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-muted-foreground" />
                            <span>
                              {box.availableSpots}/{box.capacity} places
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <Euro className="h-4 w-4 text-muted-foreground" />
                            <span>{box.pricePerDay}€/jour</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span>
                              {box.operatingHours.open} -{" "}
                              {box.operatingHours.close}
                            </span>
                          </div>
                        </div>

                        {box.features.length > 0 && (
                          <div className="mt-3">
                            <div className="flex flex-wrap gap-1">
                              {box.features
                                .slice(0, 2)
                                .map((feature, index) => (
                                  <Badge
                                    key={index}
                                    variant="outline"
                                    className="text-xs"
                                  >
                                    {feature}
                                  </Badge>
                                ))}
                              {box.features.length > 2 && (
                                <Badge variant="outline" className="text-xs">
                                  +{box.features.length - 2}
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}

                        <div className="mt-3 flex gap-2">
                          <Button size="sm" className="flex-1">
                            Réserver
                          </Button>
                          <Button size="sm" variant="outline">
                            Détails
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Map */}
        <div className="lg:col-span-2">
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Localisation des box
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <LeafletMap
                center={mapCenter}
                zoom={userLocation ? 13 : 11}
                height="500px"
                markers={markers}
                onMarkerClick={(marker) => {
                  const box = filteredBoxes.find((b) => b.id === marker.id);
                  if (box) {
                    handleBoxClick(box);
                  }
                }}
                enableGeolocation={!userLocation}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
