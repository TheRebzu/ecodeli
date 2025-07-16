import React, { useEffect, useRef, useState } from 'react';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

interface DeliveryTrackingSenderProps {
  deliveryId: string;
}

const TRACKING_INTERVAL = 15000; // 15 secondes (ajuster si besoin)

export const DeliveryTrackingSender: React.FC<DeliveryTrackingSenderProps> = ({ deliveryId }) => {
  const [trackingActive, setTrackingActive] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [lastSent, setLastSent] = useState<Date | null>(null);
  const [deliveryStatus, setDeliveryStatus] = useState<string>('');
  const [permissionRequested, setPermissionRequested] = useState(false);
  const watchId = useRef<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastPosition = useRef<GeolocationPosition | null>(null);
  const router = useRouter();
  const [showDialog, setShowDialog] = useState(false);
  const pendingNavigation = useRef<string | null>(null);

  // Récupère le statut de la livraison
  const fetchDeliveryStatus = async () => {
    try {
      const res = await fetch(`/api/deliveries/${deliveryId}`);
      if (!res.ok) return;
      const data = await res.json();
      setDeliveryStatus(data.status);
      if (["DELIVERED", "CANCELLED", "FAILED", "RETURNED"].includes(data.status)) {
        setTrackingActive(false);
      }
    } catch (e) {
      // ignore
    }
  };

  // Envoie la position à l'API
  const sendPosition = async (position: GeolocationPosition) => {
    try {
      const body = {
        status: 'IN_TRANSIT', // ou autre selon workflow
        message: 'Position en temps réel',
        location: {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
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
      } else {
        // Optionnel: gestion d'erreur
      }
    } catch (e) {
      // Optionnel: gestion d'erreur
    }
  };

  // Demande les permissions de géolocalisation
  const requestGeolocationPermission = () => {
    setPermissionRequested(true);
    setGeoError(null);
    
    // Vérifie si la géolocalisation est supportée
    if (!navigator.geolocation) {
      setGeoError('La géolocalisation n\'est pas supportée par votre navigateur.');
      return;
    }

    // Demande une position unique pour déclencher la demande de permission
    navigator.geolocation.getCurrentPosition(
      (position) => {
        // Permission accordée, on peut démarrer le tracking
        setTrackingActive(true);
        lastPosition.current = position;
        setGeoError(null);
      },
      (error) => {
        setTrackingActive(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setGeoError('Permission refusée. Veuillez autoriser l\'accès à votre position dans les paramètres de votre navigateur.');
            break;
          case error.POSITION_UNAVAILABLE:
            setGeoError('Position non disponible. Vérifiez votre connexion GPS.');
            break;
          case error.TIMEOUT:
            setGeoError('Délai d\'attente dépassé. Veuillez réessayer.');
            break;
          default:
            setGeoError('Erreur de géolocalisation: ' + error.message);
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Démarre le tracking GPS
  useEffect(() => {
    if (!trackingActive) {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Vérifie le statut de la livraison au démarrage
    fetchDeliveryStatus();

    // Watch position
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        lastPosition.current = pos;
        setGeoError(null);
      },
      (err) => {
        setGeoError(err.message);
        setTrackingActive(false);
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 10000 }
    );

    // Envoi périodique
    intervalRef.current = setInterval(() => {
      if (lastPosition.current) {
        sendPosition(lastPosition.current);
      }
      fetchDeliveryStatus();
    }, TRACKING_INTERVAL);

    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackingActive, deliveryId]);

  // Empêche la navigation tant que la livraison n'est pas terminée
  useEffect(() => {
    if (trackingActive && typeof window !== 'undefined') {
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = '';
        return '';
      };
      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    }
  }, [trackingActive]);

  // Intercepte la navigation interne Next.js
  useEffect(() => {
    if (!trackingActive) return;
    const handleRouteChange = (url: string) => {
      // Si on tente de naviguer ailleurs, afficher le dialog
      if (typeof window !== 'undefined' && window.location.pathname !== url) {
        setShowDialog(true);
        pendingNavigation.current = url;
        // Empêche la navigation
        throw 'Navigation bloquée par le tracking';
      }
    };
    // Next.js router events (App Router)
    // next/navigation n'expose pas d'event, donc on patch push/replace
    const origPush = router.push;
    const origReplace = router.replace;
    router.push = (...args: any[]) => {
      if (trackingActive) {
        setShowDialog(true);
        pendingNavigation.current = args[0];
        return;
      }
      return origPush.apply(router, args);
    };
    router.replace = (...args: any[]) => {
      if (trackingActive) {
        setShowDialog(true);
        pendingNavigation.current = args[0];
        return;
      }
      return origReplace.apply(router, args);
    };
    return () => {
      router.push = origPush;
      router.replace = origReplace;
    };
  }, [trackingActive, router]);

  const handleConfirmLeave = () => {
    setShowDialog(false);
    if (pendingNavigation.current) {
      router.push(pendingNavigation.current);
    }
  };
  const handleCancelLeave = () => {
    setShowDialog(false);
    pendingNavigation.current = null;
  };

  return (
    <div className="p-4 border rounded bg-white shadow">
      <h2 className="font-bold mb-2">Suivi temps réel de la livraison</h2>
      
      {!permissionRequested && (
        <div className="mb-4">
          <p className="text-gray-600 mb-3">
            Pour activer le suivi de votre position en temps réel, nous avons besoin de votre autorisation pour accéder à votre géolocalisation.
          </p>
          <Button onClick={requestGeolocationPermission} className="bg-blue-600 hover:bg-blue-700">
            Autoriser la géolocalisation
          </Button>
        </div>
      )}

      {geoError && (
        <div className="text-red-600 mb-2 font-semibold">
          {geoError.includes('denied') || geoError.includes('Permission') ? (
            <>
              ⚠️ La géolocalisation est désactivée ou refusée. 
              <br />
              <Button 
                onClick={requestGeolocationPermission} 
                variant="outline" 
                size="sm" 
                className="mt-2"
              >
                Réessayer
              </Button>
            </>
          ) : geoError.includes('unavailable') ? (
            <>⚠️ La position n'est pas disponible. Vérifiez votre connexion GPS ou réessayez plus tard.</>
          ) : geoError.includes('timeout') ? (
            <>⚠️ Le service de géolocalisation a expiré. Veuillez réessayer ou vérifier votre connexion.</>
          ) : (
            <>Erreur géolocalisation : {geoError}</>
          )}
        </div>
      )}
      
      {!trackingActive && !geoError && permissionRequested && (
        <div className="text-yellow-600 mb-2">
          Le tracking est arrêté (statut livraison : {deliveryStatus || 'inconnu'}).
        </div>
      )}
      
      {trackingActive && !geoError && (
        <div className="text-green-700 mb-2">
          ✅ Tracking actif. Dernière position envoyée :{' '}
          {lastSent ? lastSent.toLocaleTimeString() : 'Jamais'}
        </div>
      )}
      
      <div className="text-sm text-gray-500">
        La géolocalisation doit rester activée tant que la livraison n'est pas terminée.
      </div>
      
      {/* Dialog de blocage navigation */}
      <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Navigation bloquée</AlertDialogTitle>
            <AlertDialogDescription>
              Vous ne pouvez pas quitter la page tant que la livraison n'est pas terminée. Terminez ou annulez la livraison avant de quitter.<br/>
              Êtes-vous sûr de vouloir quitter cette page ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelLeave}>Rester sur la page</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmLeave}>Quitter quand même</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DeliveryTrackingSender; 