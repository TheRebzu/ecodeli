"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Navigation, Clock, Wifi, WifiOff, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

interface DeliveryInfo {
  id: string;
  status: string;
  deliverer?: {
    id: string;
    name: string;
    phone: string;
    vehicle: string;
  };
  pickupLocation: {
    address: string;
    coordinates: { lat: number; lng: number } | null;
  };
  deliveryLocation: {
    address: string;
    coordinates: { lat: number; lng: number } | null;
  };
  currentLocation?: {
    latitude: number;
    longitude: number;
    timestamp: string;
  } | null;
  estimatedArrival?: string | null;
  trackingHistory: Array<{
    id: string;
    location: {
      latitude: number;
      longitude: number;
      address?: string;
    };
    timestamp: string;
    status: string;
  }>;
  progress: number;
}

interface TrackingMapProps {
  deliveryId: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
  onLocationUpdate?: (location: any) => void;
}

// Configuration pour le suivi temps réel robuste
const TRACKING_CONFIG = {
  intervals: {
    active: 10000,      // 10 secondes quand livraison en cours
    background: 30000,  // 30 secondes en arrière plan
    retry: 5000,        // 5 secondes entre tentatives
  },
  retries: {
    maxAttempts: 5,
    backoffMultiplier: 1.5,
  },
  timeouts: {
    fetch: 15000,       // 15 secondes pour les requêtes
    connection: 30000,  // 30 secondes pour la connexion
  }
};

export function RealTimeTrackingMap({
  deliveryId,
  autoRefresh = true,
  refreshInterval = TRACKING_CONFIG.intervals.active,
  onLocationUpdate,
}: TrackingMapProps) {
  const [delivery, setDelivery] = useState<DeliveryInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected' | 'error'>('connecting');
  const [retryCount, setRetryCount] = useState(0);
  const [mapInitialized, setMapInitialized] = useState(false);

  // Refs pour la gestion des timers et map
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isActiveRef = useRef(true);

  // Fonction de chargement avec retry et timeout
  const loadDeliveryInfo = useCallback(async (isRetry = false) => {
    if (!isActiveRef.current) return;

    try {
      // Annuler la requête précédente si en cours
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();
      const timeoutId = setTimeout(() => {
        abortControllerRef.current?.abort();
      }, TRACKING_CONFIG.timeouts.fetch);

      setError(null);
      if (!isRetry) {
        setConnectionStatus('connecting');
      }

      const response = await fetch(
        `/api/shared/deliveries/${deliveryId}/tracking`,
        {
          signal: abortControllerRef.current.signal,
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
          },
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success && data.delivery) {
        setDelivery(data.delivery);
        setLastUpdate(new Date());
        setConnectionStatus('connected');
        setRetryCount(0);

        // Notifier de la mise à jour de position
        if (onLocationUpdate && data.delivery.currentLocation) {
          onLocationUpdate(data.delivery.currentLocation);
        }

        // Ajuster l'intervalle selon le statut
        const newInterval = data.delivery.status === 'IN_TRANSIT' 
          ? TRACKING_CONFIG.intervals.active 
          : TRACKING_CONFIG.intervals.background;
        
        if (intervalRef.current && autoRefresh) {
          clearInterval(intervalRef.current);
          scheduleNextUpdate(newInterval);
        }
      } else {
        throw new Error('Données de livraison invalides');
      }

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // Requête annulée, pas d'erreur
        return;
      }

      const errorMessage = error instanceof Error ? error.message : 'Erreur de chargement';
      console.warn('Erreur chargement tracking:', errorMessage);
      
      setConnectionStatus('error');
      setError(errorMessage);

      // Retry automatique avec backoff exponentiel
      if (retryCount < TRACKING_CONFIG.retries.maxAttempts) {
        const retryDelay = TRACKING_CONFIG.intervals.retry * 
          Math.pow(TRACKING_CONFIG.retries.backoffMultiplier, retryCount);
        
        setRetryCount(prev => prev + 1);
        
        retryTimeoutRef.current = setTimeout(() => {
          if (isActiveRef.current) {
            loadDeliveryInfo(true);
          }
        }, retryDelay);
      } else {
        setConnectionStatus('disconnected');
        
        // Retry plus tard avec un délai plus long
        setTimeout(() => {
          if (isActiveRef.current) {
            setRetryCount(0);
            loadDeliveryInfo();
          }
        }, TRACKING_CONFIG.intervals.background);
      }
    } finally {
      setIsLoading(false);
    }
  }, [deliveryId, autoRefresh, onLocationUpdate, retryCount]);

  // Programmation de la prochaine mise à jour
  const scheduleNextUpdate = useCallback((interval: number) => {
    if (!autoRefresh || !isActiveRef.current) return;

    intervalRef.current = setTimeout(() => {
      if (isActiveRef.current) {
        loadDeliveryInfo();
      }
    }, interval);
  }, [autoRefresh, loadDeliveryInfo]);

  // Rafraîchissement manuel
  const handleManualRefresh = useCallback(async () => {
    if (isLoading) return;
    
    setRetryCount(0);
    setError(null);
    await loadDeliveryInfo();
  }, [isLoading, loadDeliveryInfo]);

  // Initialisation et démarrage du tracking
  useEffect(() => {
    isActiveRef.current = true;
    loadDeliveryInfo();

    if (autoRefresh) {
      scheduleNextUpdate(refreshInterval);
    }

    return () => {
      isActiveRef.current = false;
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [deliveryId, autoRefresh, refreshInterval, loadDeliveryInfo, scheduleNextUpdate]);

  // Gestion de la visibilité de la page pour optimiser les requêtes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page cachée, ralentir les mises à jour
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          scheduleNextUpdate(TRACKING_CONFIG.intervals.background);
        }
      } else {
        // Page visible, reprendre le rythme normal
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          scheduleNextUpdate(TRACKING_CONFIG.intervals.active);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [scheduleNextUpdate]);

  // Initialisation de la carte (optionnel - peut être remplacé par Google Maps ou autre)
  const initializeMap = useCallback(() => {
    if (!delivery || mapInitialized || !mapRef.current) return;

    // Ici vous pouvez initialiser votre carte (Leaflet, Google Maps, etc.)
    // Pour l'instant, on simule juste l'initialisation
    setMapInitialized(true);
  }, [delivery, mapInitialized]);

  useEffect(() => {
    if (delivery && !mapInitialized) {
      initializeMap();
    }
  }, [delivery, mapInitialized, initializeMap]);

  // Calcul de la distance et ETA
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371; // Rayon de la Terre en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Rendu du statut de connexion
  const renderConnectionStatus = () => {
    const statusConfig = {
      connecting: { icon: RefreshCw, color: 'text-yellow-500', text: 'Connexion...', bgColor: 'bg-yellow-50' },
      connected: { icon: Wifi, color: 'text-green-500', text: 'Connecté', bgColor: 'bg-green-50' },
      disconnected: { icon: WifiOff, color: 'text-gray-500', text: 'Hors ligne', bgColor: 'bg-gray-50' },
      error: { icon: AlertCircle, color: 'text-red-500', text: 'Erreur', bgColor: 'bg-red-50' },
    };

    const { icon: Icon, color, text, bgColor } = statusConfig[connectionStatus];

    return (
      <div className={`flex items-center gap-2 p-2 rounded-md ${bgColor}`}>
        <Icon className={`h-4 w-4 ${color} ${connectionStatus === 'connecting' ? 'animate-spin' : ''}`} />
        <span className={`text-sm ${color}`}>{text}</span>
        {lastUpdate && connectionStatus === 'connected' && (
          <span className="text-xs text-gray-500 ml-auto">
            {lastUpdate.toLocaleTimeString()}
          </span>
        )}
        {retryCount > 0 && (
          <Badge variant="outline" className="text-xs">
            Tentative {retryCount}/{TRACKING_CONFIG.retries.maxAttempts}
          </Badge>
        )}
      </div>
    );
  };

  // Rendu des informations de livraison
  const renderDeliveryInfo = () => {
    if (!delivery) return null;

    const distance = delivery.currentLocation && delivery.deliveryLocation.coordinates
      ? calculateDistance(
          delivery.currentLocation.latitude,
          delivery.currentLocation.longitude,
          delivery.deliveryLocation.coordinates.lat,
          delivery.deliveryLocation.coordinates.lng
        )
      : null;

    return (
      <div className="space-y-4">
        {/* Statut et progression */}
        <div className="flex items-center justify-between">
          <Badge variant={delivery.status === 'IN_TRANSIT' ? 'default' : 'secondary'}>
            {delivery.status}
          </Badge>
          <span className="text-sm text-gray-600">{delivery.progress}% complété</span>
        </div>

        {/* Informations livreur */}
        {delivery.deliverer && (
          <div className="p-3 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900">Livreur</h4>
            <p className="text-sm text-blue-800">{delivery.deliverer.name}</p>
            <p className="text-xs text-blue-600">{delivery.deliverer.vehicle}</p>
          </div>
        )}

        {/* Position actuelle */}
        {delivery.currentLocation && (
          <div className="p-3 bg-green-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="h-4 w-4 text-green-600" />
              <span className="font-medium text-green-900">Position actuelle</span>
            </div>
            <p className="text-sm text-green-800">
              Lat: {delivery.currentLocation.latitude.toFixed(6)}, 
              Lng: {delivery.currentLocation.longitude.toFixed(6)}
            </p>
            {distance && (
              <p className="text-xs text-green-600">
                Distance restante: ~{distance.toFixed(1)} km
              </p>
            )}
          </div>
        )}

        {/* ETA */}
        {delivery.estimatedArrival && (
          <div className="flex items-center gap-2 p-3 bg-orange-50 rounded-lg">
            <Clock className="h-4 w-4 text-orange-600" />
            <div>
              <span className="font-medium text-orange-900">Arrivée estimée</span>
              <p className="text-sm text-orange-800">
                {new Date(delivery.estimatedArrival).toLocaleString()}
              </p>
            </div>
          </div>
        )}

        {/* Adresses */}
        <div className="space-y-2">
          <div className="text-sm">
            <span className="font-medium text-gray-700">Récupération:</span>
            <p className="text-gray-600">{delivery.pickupLocation.address}</p>
          </div>
          <div className="text-sm">
            <span className="font-medium text-gray-700">Livraison:</span>
            <p className="text-gray-600">{delivery.deliveryLocation.address}</p>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading && !delivery) {
    return (
      <div className="p-6 text-center">
        <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
        <p className="text-gray-600">Chargement du suivi...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Statut de connexion */}
      {renderConnectionStatus()}

      {/* Messages d'erreur */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleManualRefresh}
              disabled={isLoading}
            >
              Réessayer
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Carte */}
      <div 
        ref={mapRef} 
        className="w-full h-80 bg-gray-100 rounded-lg border"
        style={{ minHeight: '320px' }}
      >
        {/* Ici sera rendue la carte interactive */}
        <div className="flex items-center justify-center h-full text-gray-500">
          <div className="text-center">
            <Navigation className="h-12 w-12 mx-auto mb-2" />
            <p>Carte interactive en cours de développement</p>
            <p className="text-sm">Position mise à jour en temps réel</p>
          </div>
        </div>
      </div>

      {/* Informations de livraison */}
      {renderDeliveryInfo()}

      {/* Contrôles */}
      <div className="flex gap-2">
        <Button 
          variant="outline" 
          onClick={handleManualRefresh}
          disabled={isLoading}
          className="flex-1"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Actualiser
        </Button>
        
        {autoRefresh && (
          <Button 
            variant="outline" 
            onClick={() => window.location.reload()}
            className="flex-1"
          >
            <Navigation className="mr-2 h-4 w-4" />
            Recharger
          </Button>
        )}
      </div>

      {/* Historique des positions (optionnel) */}
      {delivery?.trackingHistory && delivery.trackingHistory.length > 0 && (
        <div className="mt-6">
          <h4 className="font-medium mb-3">Historique du trajet</h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {delivery.trackingHistory.slice(-5).reverse().map((update) => (
              <div key={update.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded text-sm">
                <MapPin className="h-3 w-3 text-gray-400" />
                <div className="flex-1">
                  <span className="text-gray-600">
                    {new Date(update.timestamp).toLocaleTimeString()}
                  </span>
                  <p className="text-xs text-gray-500">
                    {update.location.address || `${update.location.latitude.toFixed(4)}, ${update.location.longitude.toFixed(4)}`}
                  </p>
                </div>
                <Badge variant="outline" className="text-xs">
                  {update.status}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
