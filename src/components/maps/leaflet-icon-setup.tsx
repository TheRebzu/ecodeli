'use client';

import L from 'leaflet';
import { useEffect } from 'react';

// Define custom icon types
export type LeafletIconType = 'default' | 'pickup' | 'delivery' | 'courier';

// Export component that sets up Leaflet icons
export const LeafletIconSetup = () => {
  useEffect(() => {
    // Fix for default icons in Next.js
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    
    L.Icon.Default.mergeOptions({
      iconUrl: '/leaflet/marker-icon.png',
      iconRetinaUrl: '/leaflet/marker-icon-2x.png',
      shadowUrl: '/leaflet/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    });
  }, []);

  return null; // This component doesn't render anything
};

// Export a function to get custom icons by type
export const getLeafletIcon = (type: LeafletIconType = 'default'): L.Icon => {
  switch (type) {
    case 'pickup':
      return new L.Icon({
        iconUrl: '/leaflet/marker-icon.png', // You can replace with custom pickup icon
        iconRetinaUrl: '/leaflet/marker-icon-2x.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowUrl: '/leaflet/marker-shadow.png',
        shadowSize: [41, 41],
        className: 'leaflet-marker-pickup', // For custom styling
      });
    case 'delivery':
      return new L.Icon({
        iconUrl: '/leaflet/marker-icon.png', // You can replace with custom delivery icon
        iconRetinaUrl: '/leaflet/marker-icon-2x.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowUrl: '/leaflet/marker-shadow.png',
        shadowSize: [41, 41],
        className: 'leaflet-marker-delivery', // For custom styling
      });
    case 'courier':
      return new L.Icon({
        iconUrl: '/leaflet/marker-icon.png', // You can replace with custom courier icon
        iconRetinaUrl: '/leaflet/marker-icon-2x.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowUrl: '/leaflet/marker-shadow.png',
        shadowSize: [41, 41],
        className: 'leaflet-marker-courier', // For custom styling
      });
    default:
      return new L.Icon.Default();
  }
};
