'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Icon, IconOptions } from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Interface pour le prototype de l'icône Leaflet
interface LeafletIconDefaultPrototype {
  _getIconUrl?: unknown;
}

// Définir les icônes pour les différents types de marqueurs
const createIcon = (iconUrl: string) => {
  const iconOptions: IconOptions = {
    iconUrl,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
  };
  return new Icon(iconOptions);
};

// Type pour les types de marqueurs
type MarkerType = 'pickup' | 'delivery' | 'current';

// Définition des icônes avec typage correct
const deliveryIcons: Record<MarkerType, Icon> = {
  pickup: createIcon('/leaflet/marker-icon.png'),
  delivery: createIcon('/leaflet/marker-icon.png'),
  current: createIcon('/leaflet/marker-icon.png'),
};

// Composant pour centrer la carte sur les coordonnées actuelles
function MapUpdater({ position }: { position: [number, number] }) {
  const map = useMap();

  useEffect(() => {
    if (position) {
      map.setView(position, map.getZoom());
    }
  }, [map, position]);

  return null;
}

// Interface pour les données de marqueur
interface MarkerData {
  position: [number, number];
  type: MarkerType;
  popup: {
    title: string;
    content: string;
  };
}

// Interface pour les props du composant LeafletMap
export interface LeafletMapProps {
  center: [number, number];
  theme?: string;
  markers: MarkerData[];
}

export default function LeafletMap({ center, theme, markers }: LeafletMapProps) {
  const [mapKey, setMapKey] = useState(0);
  const darkModeUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
  const lightModeUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

  // Mettre à jour la carte quand le thème change
  useEffect(() => {
    setMapKey(prev => prev + 1);
  }, [theme]);

  // Configurer les icônes de Leaflet
  useEffect(() => {
    // Corriger le problème des icônes par défaut de Leaflet
    delete (Icon.Default.prototype as LeafletIconDefaultPrototype)._getIconUrl;
    Icon.Default.mergeOptions({
      iconRetinaUrl: '/leaflet/marker-icon-2x.png',
      iconUrl: '/leaflet/marker-icon.png',
      shadowUrl: '/leaflet/marker-shadow.png',
    });
  }, []);

  return (
    <MapContainer key={mapKey} center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
      <TileLayer
        url={theme === 'dark' ? darkModeUrl : lightModeUrl}
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />

      {markers.map((marker, index) => (
        <Marker
          key={`${marker.type}-${index}`}
          position={marker.position}
          icon={deliveryIcons[marker.type]}
        >
          <Popup>
            <div className="max-w-xs">
              <h3 className="font-semibold">{marker.popup.title}</h3>
              <p className="text-sm">{marker.popup.content}</p>
            </div>
          </Popup>
        </Marker>
      ))}

      <MapUpdater position={center} />
    </MapContainer>
  );
}
