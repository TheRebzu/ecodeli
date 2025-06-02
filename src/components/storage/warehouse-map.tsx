'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Package, Clock, Euro } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

// Import dynamique de Leaflet pour éviter les erreurs SSR
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });

type Box = {
  id: string;
  name: string;
  size: number;
  pricePerDay: number;
  boxType: string;
  isOccupied: boolean;
  locationDescription?: string;
  floorLevel?: number;
  features?: string[];
};

type Warehouse = {
  id: string;
  name: string;
  address: string;
  lat?: number;
  lng?: number;
  description?: string;
  contactPhone?: string;
  openingHours?: string;
};

type WarehouseMapProps = {
  warehouses?: Warehouse[];
  selectedWarehouseId?: string;
  onWarehouseSelect?: (warehouseId: string) => void;
  showBoxes?: boolean;
  boxes?: Box[];
  onBoxSelect?: (box: Box) => void;
  className?: string;
};

export function WarehouseMap({ 
  warehouses = [], 
  selectedWarehouseId, 
  onWarehouseSelect,
  showBoxes = false,
  boxes = [],
  onBoxSelect,
  className = ''
}: WarehouseMapProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [mapCenter, setMapCenter] = useState<[number, number]>([48.8566, 2.3522]); // Paris par défaut

  useEffect(() => {
    // Centrer la carte sur les entrepôts ou garder Paris par défaut
    if (warehouses.length > 0) {
      const validWarehouses = warehouses.filter(w => w.lat && w.lng);
      if (validWarehouses.length > 0) {
        const avgLat = validWarehouses.reduce((sum, w) => sum + (w.lat || 0), 0) / validWarehouses.length;
        const avgLng = validWarehouses.reduce((sum, w) => sum + (w.lng || 0), 0) / validWarehouses.length;
        setMapCenter([avgLat, avgLng]);
      }
    }
    setIsLoading(false);
  }, [warehouses]);

  const selectedWarehouse = warehouses.find(w => w.id === selectedWarehouseId);

  // Si on n'a pas de données géographiques, afficher une vue liste
  if (warehouses.length === 0 || warehouses.every(w => !w.lat || !w.lng)) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Entrepôts disponibles
          </CardTitle>
          <CardDescription>
            Sélectionnez un entrepôt pour voir les box disponibles
          </CardDescription>
        </CardHeader>
        <CardContent>
          {warehouses.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Aucun entrepôt disponible pour le moment
            </div>
          ) : (
            <div className="space-y-3">
              {warehouses.map((warehouse) => (
                <div
                  key={warehouse.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedWarehouseId === warehouse.id
                      ? 'border-primary bg-primary/5'
                      : 'hover:border-primary/50'
                  }`}
                  onClick={() => onWarehouseSelect?.(warehouse.id)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold">{warehouse.name}</h3>
                    {selectedWarehouseId === warehouse.id && (
                      <Badge variant="default">Sélectionné</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {warehouse.address}
                  </p>
                  {warehouse.description && (
                    <p className="text-sm">{warehouse.description}</p>
                  )}
                  {warehouse.openingHours && (
                    <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {warehouse.openingHours}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-64">
          <LoadingSpinner />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Carte */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Carte des entrepôts
          </CardTitle>
          <CardDescription>
            Cliquez sur un entrepôt pour voir ses détails
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full rounded-lg overflow-hidden">
            <MapContainer
              center={mapCenter}
              zoom={12}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {warehouses.map((warehouse) => {
                if (!warehouse.lat || !warehouse.lng) return null;
                
                return (
                  <Marker
                    key={warehouse.id}
                    position={[warehouse.lat, warehouse.lng]}
                  >
                    <Popup>
                      <div className="p-2 min-w-48">
                        <h3 className="font-semibold mb-1">{warehouse.name}</h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          {warehouse.address}
                        </p>
                        {warehouse.description && (
                          <p className="text-sm mb-2">{warehouse.description}</p>
                        )}
                        <Button
                          size="sm"
                          onClick={() => onWarehouseSelect?.(warehouse.id)}
                          className="w-full"
                        >
                          Voir les box
                        </Button>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>
        </CardContent>
      </Card>

      {/* Détails de l'entrepôt sélectionné */}
      {selectedWarehouse && (
        <Card>
          <CardHeader>
            <CardTitle>{selectedWarehouse.name}</CardTitle>
            <CardDescription>{selectedWarehouse.address}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {selectedWarehouse.contactPhone && (
                <div>
                  <h4 className="font-medium mb-1">Contact</h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedWarehouse.contactPhone}
                  </p>
                </div>
              )}
              {selectedWarehouse.openingHours && (
                <div>
                  <h4 className="font-medium mb-1">Horaires</h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedWarehouse.openingHours}
                  </p>
                </div>
              )}
            </div>
            
            {selectedWarehouse.description && (
              <div className="mt-4">
                <h4 className="font-medium mb-1">Description</h4>
                <p className="text-sm text-muted-foreground">
                  {selectedWarehouse.description}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Box disponibles dans l'entrepôt sélectionné */}
      {showBoxes && selectedWarehouseId && boxes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Box disponibles
            </CardTitle>
            <CardDescription>
              {boxes.filter(b => !b.isOccupied).length} box disponible(s) sur {boxes.length}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {boxes
                .filter(box => !box.isOccupied)
                .map((box) => (
                <div
                  key={box.id}
                  className="p-4 border rounded-lg cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => onBoxSelect?.(box)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold">{box.name}</h4>
                    <Badge variant="outline">{box.boxType}</Badge>
                  </div>
                  
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <div>Taille: {box.size}m²</div>
                    <div className="flex items-center gap-1">
                      <Euro className="h-3 w-3" />
                      {box.pricePerDay}€/jour
                    </div>
                    {box.locationDescription && (
                      <div>Emplacement: {box.locationDescription}</div>
                    )}
                    {box.floorLevel && (
                      <div>Étage: {box.floorLevel}</div>
                    )}
                  </div>
                  
                  {box.features && box.features.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {box.features.slice(0, 3).map((feature, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                      {box.features.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{box.features.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                  
                  <Button size="sm" className="w-full mt-3">
                    Sélectionner cette box
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
