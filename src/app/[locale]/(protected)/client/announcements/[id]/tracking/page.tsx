"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import ChatBox from "@/components/chat/ChatBox";
import { 
  ArrowLeft, 
  MapPin, 
  Clock, 
  Package,
  Phone,
  MessageCircle,
  Navigation,
  AlertCircle,
  RefreshCw,
  Wifi,
  WifiOff,
  CheckCircle2,
  Truck,
  User
} from "lucide-react";

// Import du composant de tracking robuste
const RealTimeTrackingMap = dynamic(
  () => import("@/features/tracking/components/real-time-tracking-map").then(mod => ({ default: mod.RealTimeTrackingMap })),
  {
    ssr: false,
    loading: () => (
      <div className="h-80 bg-gray-100 animate-pulse rounded-lg flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-blue-500" />
          <p className="text-gray-600">Chargement de la carte temps réel...</p>
        </div>
      </div>
    ),
  },
);

interface TrackingEvent {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: string;
  location?: {
    latitude: number;
    longitude: number;
    address: string;
  };
  status: string;
}

interface Delivery {
  id: string;
  status: string;
  trackingCode?: string;
  pickupDate: string;
  deliveryDate?: string;
  estimatedArrival?: string;
  deliverer?: {
    id: string;
    name: string;
    phone: string;
    avatar?: string;
    rating: number;
    vehicle?: string;
  };
  announcement: {
    id: string;
    title: string;
    pickupAddress: string;
    deliveryAddress: string;
    pickupCoordinates?: { lat: number; lng: number };
    deliveryCoordinates?: { lat: number; lng: number };
  };
  currentLocation?: {
    latitude: number;
    longitude: number;
    timestamp: string;
    accuracy?: number;
  };
  tracking: TrackingEvent[];
  validationCode?: string;
  progress: number;
}

// Configuration pour la mise à jour continue
const TRACKING_CONFIG = {
  intervals: {
    active: 15000,      // 15 secondes pour livraisons actives
    background: 45000,  // 45 secondes en arrière-plan
    completed: 120000,  // 2 minutes pour livraisons terminées
  },
  retries: {
    maxAttempts: 3,
    backoffMs: 2000,
  }
};

export default function ClientTrackingPage() {
  const params = useParams();
  const router = useRouter();
  // Temporairement désactivé pour éviter l'erreur de traduction
  // const t = useTranslations("tracking");
  
  const announcementId = params.id as string;
  
  // États de l'application
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'error'>('connecting');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isActive, setIsActive] = useState(true);

  // Refs pour la gestion des timers
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Fonction de chargement avec gestion des erreurs robuste
  const loadTrackingData = useCallback(async (isRetry = false) => {
    if (!isActive) return;

    try {
      // Annuler la requête précédente
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();
      const timeoutId = setTimeout(() => {
        abortControllerRef.current?.abort();
      }, 30000); // 30 secondes timeout

      if (!isRetry) {
        setConnectionStatus('connecting');
        setError(null);
      }

      const response = await fetch(`/api/client/announcements/${announcementId}/tracking`, {
        signal: abortControllerRef.current.signal,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Livraison non trouvée");
        }
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success && data.trackingData) {
        setDelivery(data.trackingData);
        setConnectionStatus('connected');
        setLastUpdate(new Date());
        setRetryCount(0);

        // Programmer la prochaine mise à jour selon le statut
        const interval = getUpdateInterval(data.trackingData.status);
        scheduleNextUpdate(interval);
      } else {
        throw new Error("Données de tracking invalides");
      }

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return; // Requête annulée, pas d'erreur
      }

      const errorMessage = error instanceof Error ? error.message : "Erreur de chargement";
      console.warn("Erreur chargement tracking:", errorMessage);
      
      setConnectionStatus('error');
      setError(errorMessage);

      // Retry automatique avec backoff
      if (retryCount < TRACKING_CONFIG.retries.maxAttempts) {
        const retryDelay = TRACKING_CONFIG.retries.backoffMs * Math.pow(2, retryCount);
        setRetryCount(prev => prev + 1);
        
        retryTimeoutRef.current = setTimeout(() => {
          if (isActive) {
            loadTrackingData(true);
          }
        }, retryDelay);
      }
    } finally {
      setIsLoading(false);
    }
  }, [announcementId, isActive, retryCount]);

  // Détermine l'intervalle de mise à jour selon le statut
  const getUpdateInterval = (status: string): number => {
    switch (status) {
      case 'IN_TRANSIT':
      case 'PICKED_UP':
        return TRACKING_CONFIG.intervals.active;
      case 'DELIVERED':
      case 'CANCELLED':
        return TRACKING_CONFIG.intervals.completed;
      default:
        return TRACKING_CONFIG.intervals.background;
    }
  };

  // Programme la prochaine mise à jour
  const scheduleNextUpdate = useCallback((interval: number) => {
    if (!isActive) return;

    if (intervalRef.current) {
      clearTimeout(intervalRef.current);
    }

    intervalRef.current = setTimeout(() => {
      if (isActive) {
        loadTrackingData();
      }
    }, interval);
  }, [isActive, loadTrackingData]);

  // Rafraîchissement manuel
  const handleManualRefresh = useCallback(async () => {
    setRetryCount(0);
    await loadTrackingData();
  }, [loadTrackingData]);

  // Gestion de la position mise à jour
  const handleLocationUpdate = useCallback((location: any) => {
    if (delivery) {
      setDelivery(prev => prev ? {
        ...prev,
        currentLocation: {
          latitude: location.latitude,
          longitude: location.longitude,
          timestamp: location.timestamp || new Date().toISOString(),
          accuracy: location.accuracy
        }
      } : null);
    }
  }, [delivery]);

  // Initialisation et nettoyage
  useEffect(() => {
    setIsActive(true);
    
    // Délai pour éviter les appels multiples
    const initTimeout = setTimeout(() => {
      if (isActive) {
        loadTrackingData();
      }
    }, 100);

    return () => {
      setIsActive(false);
      clearTimeout(initTimeout);
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
        intervalRef.current = null;
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, [announcementId]);

  // Gestion de la visibilité de la page
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!isActive) return;
      
      if (document.hidden) {
        // Page cachée, ralentir les mises à jour
        if (intervalRef.current) {
          clearTimeout(intervalRef.current);
          intervalRef.current = null;
        }
        scheduleNextUpdate(TRACKING_CONFIG.intervals.background);
      } else if (delivery) {
        // Page visible, reprendre le rythme normal
        if (intervalRef.current) {
          clearTimeout(intervalRef.current);
          intervalRef.current = null;
        }
        scheduleNextUpdate(getUpdateInterval(delivery.status));
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [delivery, scheduleNextUpdate, getUpdateInterval, isActive]);

  // Rendu du statut de connexion
  const renderConnectionStatus = () => {
    const statusConfig = {
      connecting: { icon: RefreshCw, color: 'text-yellow-600', text: 'Connexion...' },
      connected: { icon: Wifi, color: 'text-green-600', text: 'Temps réel actif' },
      error: { icon: WifiOff, color: 'text-red-600', text: 'Connexion interrompue' },
    };

    const { icon: Icon, color, text } = statusConfig[connectionStatus];

    return (
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${color} ${connectionStatus === 'connecting' ? 'animate-spin' : ''}`} />
          <span className={`text-sm font-medium ${color}`}>{text}</span>
        </div>
        {lastUpdate && connectionStatus === 'connected' && (
          <span className="text-xs text-gray-500">
            Mis à jour: {lastUpdate.toLocaleTimeString()}
          </span>
        )}
        {retryCount > 0 && (
          <Badge variant="outline" className="text-xs">
            Tentative {retryCount}
          </Badge>
        )}
      </div>
    );
  };

  // Rendu du statut de livraison
  const getStatusConfig = (status: string) => {
    const configs = {
      'PENDING': { color: 'bg-gray-100 text-gray-800', icon: Package, text: 'En attente' },
      'ACCEPTED': { color: 'bg-blue-100 text-blue-800', icon: CheckCircle2, text: 'Acceptée' },
      'PICKED_UP': { color: 'bg-yellow-100 text-yellow-800', icon: Package, text: 'Récupérée' },
      'IN_TRANSIT': { color: 'bg-green-100 text-green-800', icon: Truck, text: 'En cours' },
      'DELIVERED': { color: 'bg-green-100 text-green-800', icon: CheckCircle2, text: 'Livrée' },
      'CANCELLED': { color: 'bg-red-100 text-red-800', icon: AlertCircle, text: 'Annulée' },
    };

    return configs[status as keyof typeof configs] || configs['PENDING'];
  };

  // États de chargement et d'erreur
  if (isLoading && !delivery) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <RefreshCw className="h-12 w-12 animate-spin mx-auto mb-4 text-blue-500" />
            <h2 className="text-xl font-semibold mb-2">Chargement du suivi</h2>
            <p className="text-gray-600">Récupération des informations de livraison...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !delivery) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{error}</span>
              <Button variant="outline" size="sm" onClick={handleManualRefresh}>
                Réessayer
              </Button>
            </AlertDescription>
          </Alert>
          
          <div className="text-center">
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!delivery) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Aucune information de suivi disponible pour cette annonce.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  const statusConfig = getStatusConfig(delivery.status);

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="max-w-6xl mx-auto">
        {/* En-tête */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Suivi de livraison</h1>
              {delivery.trackingCode && (
                <p className="text-sm text-gray-600">Code: {delivery.trackingCode}</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Badge className={statusConfig.color}>
              <statusConfig.icon className="mr-1 h-4 w-4" />
              {statusConfig.text}
            </Badge>
            <Button variant="outline" size="sm" onClick={handleManualRefresh} disabled={isLoading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
          </div>
        </div>

        {/* Statut de connexion */}
        {renderConnectionStatus()}

        {/* Messages d'erreur */}
        {error && (
          <Alert variant="destructive" className="my-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          {/* Colonne principale - Carte et informations */}
          <div className="lg:col-span-2 space-y-6">
            {/* Carte de tracking temps réel */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Navigation className="h-5 w-5" />
                  Position en temps réel
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <RealTimeTrackingMap
                  deliveryId={delivery.id}
                  autoRefresh={true}
                  refreshInterval={getUpdateInterval(delivery.status)}
                  onLocationUpdate={handleLocationUpdate}
                />
              </CardContent>
            </Card>

            {/* Progression */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Progression de la livraison
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Avancement</span>
                    <span className="text-sm text-gray-600">{delivery.progress}%</span>
                  </div>
                  <Progress value={delivery.progress} className="w-full" />
                  
                  {delivery.estimatedArrival && (
                    <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                      <Clock className="h-4 w-4 text-blue-600" />
                      <div>
                        <span className="font-medium text-blue-900">Arrivée estimée</span>
                        <p className="text-sm text-blue-800">
                          {new Date(delivery.estimatedArrival).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Adresses */}
            <Card>
              <CardHeader>
                <CardTitle>Itinéraire</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <Package className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="font-medium">Point de récupération</p>
                      <p className="text-sm text-gray-600">{delivery.announcement.pickupAddress}</p>
                    </div>
                  </div>
                  
                  <div className="ml-4 w-0.5 h-8 bg-gray-200"></div>
                  
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      delivery.status === 'DELIVERED' ? 'bg-green-500' : 'bg-gray-300'
                    }`}>
                      <MapPin className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="font-medium">Point de livraison</p>
                      <p className="text-sm text-gray-600">{delivery.announcement.deliveryAddress}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Colonne latérale - Informations livreur et chat */}
          <div className="space-y-6">
            {/* Informations livreur */}
            {delivery.deliverer && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Votre livreur
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                        <User className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="font-medium">{delivery.deliverer.name}</p>
                        <p className="text-sm text-gray-600">{delivery.deliverer.vehicle || 'Véhicule'}</p>
                        {delivery.deliverer.rating && (
                          <div className="flex items-center gap-1">
                            <span className="text-yellow-400">★</span>
                            <span className="text-sm">{delivery.deliverer.rating}/5</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1">
                        <Phone className="w-4 h-4 mr-2" />
                        Appeler
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1">
                        <MessageCircle className="w-4 h-4 mr-2" />
                        Message
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Chat */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  Discussion
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChatBox
                  contextType="DELIVERY"
                  contextId={delivery.id}
                />
              </CardContent>
            </Card>

            {/* Historique */}
            {delivery.tracking && delivery.tracking.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Historique</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {delivery.tracking.slice().reverse().map((event, index) => (
                      <div key={event.id} className="flex items-start gap-3 p-2 bg-gray-50 rounded-lg">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{event.title}</p>
                          <p className="text-xs text-gray-600">{event.description}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(event.timestamp).toLocaleString()}
                          </p>
                          {event.location && (
                            <p className="text-xs text-gray-500">
                              📍 {event.location.address}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
