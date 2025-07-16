import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, MapPin, Wifi, WifiOff, Package } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { GeolocationStatus, useGeolocationStatus } from '@/components/ui/geolocation-status';

interface DeliveryTrackingSenderProps {
  deliveryId: string;
  onTrackingStart?: () => void;
  onTrackingStop?: () => void;
  onTrackingError?: (error: string) => void;
}

// Configuration pour géolocalisation robuste
const GEO_CONFIG = {
  highAccuracy: {
    enableHighAccuracy: true,
    timeout: 30000, // 30 secondes
    maximumAge: 5000, // 5 secondes max
  },
  lowAccuracy: {
    enableHighAccuracy: false,
    timeout: 15000, // 15 secondes
    maximumAge: 10000, // 10 secondes max
  },
  fallback: {
    enableHighAccuracy: false,
    timeout: 10000, // 10 secondes
    maximumAge: 30000, // 30 secondes max
  },
};

const TRACKING_INTERVAL = 15000; // 15 secondes entre envois
const RETRY_INTERVAL = 5000; // 5 secondes entre tentatives
const MAX_RETRY_ATTEMPTS = 3;

export const DeliveryTrackingSender: React.FC<DeliveryTrackingSenderProps> = ({
  deliveryId,
  onTrackingStart,
  onTrackingStop,
  onTrackingError,
}) => {
  const [trackingActive, setTrackingActive] = useState(false);
  const [permissionRequested, setPermissionRequested] = useState(false);
  const [deliveryStatus, setDeliveryStatus] = useState<string | null>(null);
  const [lastSent, setLastSent] = useState<Date | null>(null);

  // Utilisation du hook de statut de géolocalisation
  const {
    status: geoStatus,
    error: geoError,
    accuracy,
    lastUpdate,
    retryCount,
    updateStatus,
    incrementRetry,
    resetRetry
  } = useGeolocationStatus();

  // Refs pour la gestion des timers et positions
  const watchId = useRef<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastPosition = useRef<GeolocationPosition | null>(null);
  const isRetrying = useRef(false);

  // Vérifie le statut de la livraison
  const fetchDeliveryStatus = async () => {
    try {
      const response = await fetch(`/api/deliveries/${deliveryId}`);
      if (response.ok) {
        const data = await response.json();
        const status = data.delivery?.status;
        setDeliveryStatus(status);
        
        // Arrêter le tracking si livraison terminée
        if (status === 'DELIVERED' || status === 'CANCELLED') {
          stopTracking();
        }
      }
    } catch (error) {
      console.warn('Erreur vérification statut livraison:', error);
    }
  };

  // Envoie la position à l'API avec retry
  const sendPosition = async (position: GeolocationPosition, retryAttempt = 0): Promise<boolean> => {
    try {
      const body = {
        status: 'IN_TRANSIT',
        message: `Position en temps réel (précision: ${Math.round(position.coords.accuracy)}m)`,
        location: {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          speed: position.coords.speed,
          heading: position.coords.heading,
          timestamp: new Date(position.timestamp).toISOString(),
        },
        isAutomatic: true,
      };

      const res = await fetch(`/api/deliveries/${deliveryId}/tracking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setLastSent(new Date());
        resetRetry();
        return true;
      } else if (retryAttempt < MAX_RETRY_ATTEMPTS) {
        // Retry après délai
        setTimeout(() => {
          sendPosition(position, retryAttempt + 1);
        }, RETRY_INTERVAL);
        return false;
      }
    } catch (error) {
      if (retryAttempt < MAX_RETRY_ATTEMPTS) {
        setTimeout(() => {
          sendPosition(position, retryAttempt + 1);
        }, RETRY_INTERVAL);
        return false;
      }
    }
    return false;
  };

  // Démarre le tracking avec stratégie de fallback
  const startGeolocationTracking = () => {
    if (!navigator.geolocation) {
      updateStatus('error', 'La géolocalisation n\'est pas supportée par votre navigateur.');
      return;
    }

    updateStatus('requesting');
    isRetrying.current = false;

    // Fonction pour essayer différentes configurations
    const tryGeolocation = (configKey: keyof typeof GEO_CONFIG, fallbackKey?: keyof typeof GEO_CONFIG) => {
      const config = GEO_CONFIG[configKey];
      
      watchId.current = navigator.geolocation.watchPosition(
        (position) => {
          // Succès !
          lastPosition.current = position;
          resetRetry();
          
          // Déterminer la qualité du signal et mettre à jour le statut
          if (position.coords.accuracy <= 50) {
            updateStatus('active', undefined, position.coords.accuracy);
          } else {
            updateStatus('degraded', undefined, position.coords.accuracy);
          }
          
          // Premier envoi immédiat
          sendPosition(position);
        },
        (error) => {
          console.warn(`Erreur géolocalisation (${configKey}):`, error.message);
          
          // Nettoyer le watch actuel
          if (watchId.current !== null) {
            navigator.geolocation.clearWatch(watchId.current);
            watchId.current = null;
          }
          
          // Déterminer le type d'erreur et essayer le fallback
          if (fallbackKey && !isRetrying.current) {
            isRetrying.current = true;
            incrementRetry();
            
            retryTimeoutRef.current = setTimeout(() => {
              console.log(`Tentative fallback: ${fallbackKey}`);
              tryGeolocation(fallbackKey);
            }, RETRY_INTERVAL);
          } else {
            // Plus de fallback disponible
            handleGeolocationError(error);
          }
        },
        config
      );
    };

    // Essayer d'abord la haute précision, puis fallback
    tryGeolocation('highAccuracy', 'lowAccuracy');
  };

  // Gestion des erreurs de géolocalisation
  const handleGeolocationError = (error: GeolocationPositionError) => {
    let errorMessage = '';
    let statusType: 'error' | 'timeout' = 'error';
    
    switch (error.code) {
      case error.PERMISSION_DENIED:
        errorMessage = 'Permission refusée. Veuillez autoriser l\'accès à votre position.';
        break;
      case error.POSITION_UNAVAILABLE:
        errorMessage = 'Position non disponible. Vérifiez votre GPS ou connexion.';
        break;
      case error.TIMEOUT:
        errorMessage = 'Délai dépassé. Le GPS met trop de temps à répondre.';
        statusType = 'timeout';
        
        // Retry automatique après timeout
        if (retryCount < MAX_RETRY_ATTEMPTS) {
          retryTimeoutRef.current = setTimeout(() => {
            incrementRetry();
            startGeolocationTracking();
          }, RETRY_INTERVAL);
          return;
        }
        break;
      default:
        errorMessage = `Erreur GPS: ${error.message}`;
    }
    
    updateStatus(statusType, errorMessage);
    if (onTrackingError) {
      onTrackingError(errorMessage);
    }
  };

  // Démarre le tracking complet
  const startTracking = () => {
    setPermissionRequested(true);
    setTrackingActive(true);
    
    // Démarrer la géolocalisation
    startGeolocationTracking();
    
    // Vérifier le statut initial
    fetchDeliveryStatus();
    
    // Intervalle pour envois périodiques et vérifications
    intervalRef.current = setInterval(() => {
      if (lastPosition.current) {
        sendPosition(lastPosition.current);
      }
      fetchDeliveryStatus();
    }, TRACKING_INTERVAL);
    
    if (onTrackingStart) {
      onTrackingStart();
    }
  };

  // Arrête le tracking
  const stopTracking = () => {
    setTrackingActive(false);
    updateStatus('inactive');
    
    // Nettoyer tous les timers et watches
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    
    if (onTrackingStop) {
      onTrackingStop();
    }
  };

  // Fonction pour gérer le retry depuis le composant de statut
  const handleRetry = () => {
    resetRetry();
    startGeolocationTracking();
  };

  // Fonction pour ouvrir les paramètres/aide
  const handleOpenSettings = () => {
    // Ici on pourrait ouvrir une modal d'aide ou rediriger vers les paramètres du navigateur
    window.open('https://support.google.com/chrome/answer/142065?hl=fr', '_blank');
  };

  // Cleanup à la fermeture
  useEffect(() => {
    return () => {
      stopTracking();
    };
  }, []);

  // Protection contre la fermeture de page
  useEffect(() => {
    if (trackingActive) {
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = 'Le suivi de livraison est actif. Êtes-vous sûr de vouloir quitter?';
        return e.returnValue;
      };
      
      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    }
  }, [trackingActive]);

  return (
    <div className="p-4 border rounded-lg bg-white shadow-sm space-y-4">
      <h3 className="text-lg font-semibold mb-4">Suivi GPS Temps Réel</h3>
      
      {/* Composant de statut de géolocalisation amélioré */}
      <GeolocationStatus
        status={geoStatus}
        error={geoError}
        accuracy={accuracy}
        lastUpdate={lastUpdate}
        retryCount={retryCount}
        maxRetries={MAX_RETRY_ATTEMPTS}
        onRetry={handleRetry}
        onOpenSettings={handleOpenSettings}
      />

      {/* Informations sur la dernière position envoyée */}
      {lastSent && (
        <div className="p-3 bg-blue-50 rounded-lg">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">Dernière position envoyée</span>
          </div>
          <p className="text-sm text-blue-800 mt-1">
            {lastSent.toLocaleTimeString()}
          </p>
        </div>
      )}

      {/* Statut livraison */}
      {deliveryStatus && (
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-900">Statut de la livraison</span>
          </div>
          <p className="text-sm text-gray-700 mt-1">{deliveryStatus}</p>
        </div>
      )}

      {/* Contrôles principaux */}
      <div className="flex gap-2">
        {!trackingActive ? (
          <Button 
            onClick={startTracking} 
            className="w-full"
            disabled={deliveryStatus === 'DELIVERED' || deliveryStatus === 'CANCELLED'}
          >
            <MapPin className="mr-2 h-4 w-4" />
            Démarrer le suivi GPS
          </Button>
        ) : (
          <Button 
            onClick={stopTracking} 
            variant="outline"
            className="w-full"
          >
            Arrêter le suivi
          </Button>
        )}
      </div>

      {/* Conseils d'utilisation */}
      {!permissionRequested && (
        <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
          <h4 className="text-sm font-medium text-amber-900 mb-2">
            📱 Important pour un suivi optimal :
          </h4>
          <ul className="text-xs text-amber-800 space-y-1">
            <li>• Gardez cette page ouverte pendant toute la livraison</li>
            <li>• Autorisez l'accès à votre position lorsque demandé</li>
            <li>• Activez votre GPS pour une meilleure précision</li>
            <li>• Évitez de mettre votre téléphone en mode avion</li>
            <li>• Restez dans une zone avec une bonne couverture réseau</li>
          </ul>
        </div>
      )}

      {/* Informations techniques pour le debug (en mode développement) */}
      {process.env.NODE_ENV === 'development' && (
        <details className="text-xs text-gray-500">
          <summary className="cursor-pointer">Informations techniques</summary>
          <div className="mt-2 p-2 bg-gray-100 rounded text-xs font-mono">
            <p>Delivery ID: {deliveryId}</p>
            <p>Status: {geoStatus}</p>
            <p>Tracking Active: {trackingActive ? 'Yes' : 'No'}</p>
            <p>Watch ID: {watchId.current}</p>
            <p>Retry Count: {retryCount}</p>
            {accuracy && <p>Accuracy: {Math.round(accuracy)}m</p>}
          </div>
        </details>
      )}
    </div>
  );
}; 