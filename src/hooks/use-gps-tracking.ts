"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { 
  gpsTrackingService, 
  type GPSPosition, 
  type ETACalculation,
  type DeliveryRoute 
} from "@/services/gps-tracking.service";
import { useSocket } from "@/components/providers/socket-provider";

export interface UseGPSTrackingOptions {
  autoStart?: boolean;
  trackingInterval?: number;
  etaUpdateInterval?: number;
  destination?: { latitude: number; longitude: number };
  deliveryId?: string;
  onPositionUpdate?: (position: GPSPosition) => void;
  onETAUpdate?: (eta: ETACalculation) => void;
  onNearDestination?: (distance: number) => void;
}

export interface GPSTrackingState {
  isTracking: boolean;
  currentPosition: GPSPosition | null;
  positionHistory: GPSPosition[];
  currentETA: ETACalculation | null;
  isNearDestination: boolean;
  error: string | null;
  permissions: {
    granted: boolean;
    denied: boolean;
    prompt: boolean;
  };
}

export function useGPSTracking(options: UseGPSTrackingOptions = {}) {
  const {
    autoStart = false,
    trackingInterval = 5000,
    etaUpdateInterval = 10000,
    destination,
    deliveryId,
    onPositionUpdate,
    onETAUpdate,
    onNearDestination
  } = options;

  const { sendLocationUpdate, sendETAUpdate } = useSocket();
  
  const [state, setState] = useState<GPSTrackingState>({
    isTracking: false,
    currentPosition: null,
    positionHistory: [],
    currentETA: null,
    isNearDestination: false,
    error: null,
    permissions: {
      granted: false,
      denied: false,
      prompt: true
    }
  });

  const etaIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const nearDestinationNotified = useRef(false);

  // Gestionnaire de mise à jour de position
  const handlePositionUpdate = useCallback((position: GPSPosition) => {
    setState(prev => ({
      ...prev,
      currentPosition: position,
      positionHistory: gpsTrackingService.getPositionHistory(),
      error: null
    }));

    // Envoyer la position via WebSocket si un deliveryId est fourni
    if (deliveryId && sendLocationUpdate) {
      sendLocationUpdate(deliveryId, {
        latitude: position.latitude,
        longitude: position.longitude,
        accuracy: position.accuracy,
        speed: position.speed,
        heading: position.heading
      });
    }

    // Vérifier la proximité de la destination
    if (destination && !state.isNearDestination) {
      const isNear = gpsTrackingService.isNearDestination(destination, 200);
      if (isNear && !nearDestinationNotified.current) {
        setState(prev => ({ ...prev, isNearDestination: true }));
        const distance = gpsTrackingService.calculateDistance(position, destination);
        onNearDestination?.(distance);
        nearDestinationNotified.current = true;
      }
    }

    // Callback externe
    onPositionUpdate?.(position);
  }, [deliveryId, destination, state.isNearDestination, sendLocationUpdate, onPositionUpdate, onNearDestination]);

  // Gestionnaire de mise à jour ETA
  const handleETAUpdate = useCallback((eta: ETACalculation) => {
    setState(prev => ({
      ...prev,
      currentETA: eta
    }));

    // Envoyer l'ETA via WebSocket si un deliveryId est fourni
    if (deliveryId && sendETAUpdate) {
      sendETAUpdate(deliveryId, {
        estimatedMinutes: eta.estimatedMinutes,
        estimatedArrival: eta.estimatedArrival,
        confidence: eta.confidence
      });
    }

    // Callback externe
    onETAUpdate?.(eta);
  }, [deliveryId, sendETAUpdate, onETAUpdate]);

  // Démarrer le tracking
  const startTracking = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, error: null }));
      
      const success = await gpsTrackingService.startTracking(
        handlePositionUpdate,
        handleETAUpdate
      );

      if (success) {
        setState(prev => ({ 
          ...prev, 
          isTracking: true,
          permissions: { granted: true, denied: false, prompt: false }
        }));

        // Démarrer le calcul périodique de l'ETA si une destination est fournie
        if (destination && etaUpdateInterval > 0) {
          etaIntervalRef.current = setInterval(async () => {
            const eta = await gpsTrackingService.calculateETA(destination);
            if (eta) {
              handleETAUpdate(eta);
            }
          }, etaUpdateInterval);
        }

        console.log("🎯 Tracking GPS démarré avec succès");
      } else {
        setState(prev => ({ 
          ...prev, 
          error: "Impossible de démarrer le tracking GPS",
          permissions: { granted: false, denied: true, prompt: false }
        }));
      }

      return success;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
      setState(prev => ({ 
        ...prev, 
        error: errorMessage,
        permissions: { granted: false, denied: true, prompt: false }
      }));
      console.error("❌ Erreur lors du démarrage du tracking:", error);
      return false;
    }
  }, [destination, etaUpdateInterval, handlePositionUpdate, handleETAUpdate]);

  // Arrêter le tracking
  const stopTracking = useCallback(() => {
    gpsTrackingService.stopTracking();
    
    if (etaIntervalRef.current) {
      clearInterval(etaIntervalRef.current);
      etaIntervalRef.current = null;
    }

    setState(prev => ({
      ...prev,
      isTracking: false
    }));

    nearDestinationNotified.current = false;
    console.log("🛑 Tracking GPS arrêté");
  }, []);

  // Calculer l'ETA manuellement
  const calculateETA = useCallback(async (
    targetDestination?: { latitude: number; longitude: number }
  ) => {
    const dest = targetDestination || destination;
    if (!dest) {
      console.warn("Aucune destination fournie pour le calcul ETA");
      return null;
    }

    const eta = await gpsTrackingService.calculateETA(dest);
    if (eta) {
      handleETAUpdate(eta);
    }
    return eta;
  }, [destination, handleETAUpdate]);

  // Obtenir la position actuelle
  const getCurrentPosition = useCallback(async () => {
    try {
      const position = await gpsTrackingService.getCurrentPosition();
      const gpsPosition: GPSPosition = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        altitude: position.coords.altitude || undefined,
        altitudeAccuracy: position.coords.altitudeAccuracy || undefined,
        heading: position.coords.heading || undefined,
        speed: position.coords.speed || undefined,
        timestamp: position.timestamp
      };
      
      setState(prev => ({
        ...prev,
        currentPosition: gpsPosition,
        error: null,
        permissions: { granted: true, denied: false, prompt: false }
      }));

      return gpsPosition;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erreur lors de l'obtention de la position";
      setState(prev => ({ 
        ...prev, 
        error: errorMessage,
        permissions: { granted: false, denied: true, prompt: false }
      }));
      throw error;
    }
  }, []);

  // Vérifier les permissions de géolocalisation
  const checkPermissions = useCallback(async () => {
    if (!navigator.permissions || !navigator.permissions.query) {
      setState(prev => ({
        ...prev,
        permissions: { granted: false, denied: false, prompt: true }
      }));
      return;
    }

    try {
      const result = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
      
      setState(prev => ({
        ...prev,
        permissions: {
          granted: result.state === 'granted',
          denied: result.state === 'denied',
          prompt: result.state === 'prompt'
        }
      }));

      // Écouter les changements de permissions
      result.onchange = () => {
        setState(prev => ({
          ...prev,
          permissions: {
            granted: result.state === 'granted',
            denied: result.state === 'denied',
            prompt: result.state === 'prompt'
          }
        }));
      };
    } catch (error) {
      console.warn("Impossible de vérifier les permissions de géolocalisation:", error);
    }
  }, []);

  // Simuler une position (pour les tests)
  const simulatePosition = useCallback((position: { latitude: number; longitude: number }) => {
    gpsTrackingService.simulatePosition(position);
  }, []);

  // Effect pour démarrage automatique
  useEffect(() => {
    if (autoStart) {
      startTracking();
    }

    checkPermissions();

    return () => {
      if (etaIntervalRef.current) {
        clearInterval(etaIntervalRef.current);
      }
    };
  }, [autoStart, startTracking, checkPermissions]);

  // Effect pour nettoyer à la fermeture
  useEffect(() => {
    return () => {
      if (state.isTracking) {
        stopTracking();
      }
    };
  }, [state.isTracking, stopTracking]);

  return {
    // État
    ...state,
    
    // Actions
    startTracking,
    stopTracking,
    calculateETA,
    getCurrentPosition,
    checkPermissions,
    simulatePosition,
    
    // Utilitaires
    isSupported: !!navigator.geolocation,
    distanceToDestination: destination && state.currentPosition 
      ? gpsTrackingService.calculateDistance(state.currentPosition, destination)
      : null,
  };
}

// Hook spécialisé pour les livreurs
export function useDelivererTracking(deliveryId: string, destination: { latitude: number; longitude: number }) {
  const [notifications, setNotifications] = useState<string[]>([]);

  const tracking = useGPSTracking({
    deliveryId,
    destination,
    autoStart: true,
    etaUpdateInterval: 15000, // Mise à jour ETA toutes les 15 secondes
    onNearDestination: (distance) => {
      setNotifications(prev => [...prev, `Vous êtes à ${Math.round(distance)}m de la destination`]);
    },
    onETAUpdate: (eta) => {
      if (eta.confidence < 50) {
        setNotifications(prev => [...prev, "ETA peu fiable - vérifiez votre connexion GPS"]);
      }
    }
  });

  const markDeliveryStatus = useCallback(async (status: string) => {
    if (tracking.currentPosition) {
      // Ici on peut envoyer le statut avec la position actuelle
      console.log("Statut de livraison mis à jour:", {
        deliveryId,
        status,
        position: tracking.currentPosition
      });
    }
  }, [deliveryId, tracking.currentPosition]);

  return {
    ...tracking,
    notifications,
    markDeliveryStatus,
    clearNotifications: () => setNotifications([])
  };
}

// Hook spécialisé pour les clients (suivi de livraison)
export function useClientDeliveryTracking(deliveryId: string) {
  const [delivererPosition, setDelivererPosition] = useState<GPSPosition | null>(null);
  const [eta, setETA] = useState<ETACalculation | null>(null);

  useEffect(() => {
    // Écouter les mises à jour de position du livreur via WebSocket
    const handleLocationUpdate = (event: CustomEvent) => {
      const data = event.detail;
      if (data.deliveryId === deliveryId) {
        setDelivererPosition(data.location);
      }
    };

    const handleETAUpdate = (event: CustomEvent) => {
      const data = event.detail;
      if (data.deliveryId === deliveryId) {
        setETA(data.eta);
      }
    };

    window.addEventListener("delivery-location", handleLocationUpdate as EventListener);
    window.addEventListener("eta-update", handleETAUpdate as EventListener);

    return () => {
      window.removeEventListener("delivery-location", handleLocationUpdate as EventListener);
      window.removeEventListener("eta-update", handleETAUpdate as EventListener);
    };
  }, [deliveryId]);

  return {
    delivererPosition,
    eta,
    isTracking: !!delivererPosition
  };
}