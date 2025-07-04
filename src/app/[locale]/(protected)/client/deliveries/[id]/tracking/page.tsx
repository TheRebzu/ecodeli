"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft,
  Package, 
  MapPin, 
  User,
  Clock,
  Phone,
  Navigation,
  Truck,
  CheckCircle,
  AlertCircle,
  MapIcon,
  RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
// Composant temporaire pour la carte de suivi
const DeliveryTrackingMap = ({ pickupCoordinates, deliveryCoordinates, currentLocation, route, status }: any) => {
  return (
    <div className="h-96 bg-gray-100 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
      <div className="text-center p-6">
        <MapIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-700 mb-2">Carte de suivi</h3>
        <p className="text-sm text-gray-500 mb-4">
          Statut: <span className="font-medium">{status}</span>
        </p>
        {currentLocation && (
          <div className="bg-white rounded-lg p-3 border">
            <p className="text-sm font-medium text-gray-700">Position actuelle:</p>
            <p className="text-xs text-gray-600">{currentLocation.address}</p>
            <p className="text-xs text-gray-500">
              Coordonnées: {currentLocation.lat.toFixed(4)}, {currentLocation.lng.toFixed(4)}
            </p>
          </div>
        )}
        {!currentLocation && (
          <p className="text-sm text-gray-500">Position en attente...</p>
        )}
      </div>
    </div>
  );
};

interface TrackingData {
  id: string;
  announcementTitle: string;
  status: string;
  delivererName: string | null;
  delivererPhone: string | null;
  delivererAvatar: string | null;
  pickupAddress: string;
  deliveryAddress: string;
  currentLocation: {
    lat: number;
    lng: number;
    address: string;
    timestamp: string;
  } | null;
  estimatedArrival: string | null;
  validationCode: string | null;
  route: Array<{
    lat: number;
    lng: number;
    timestamp: string;
    status: string;
  }>;
  updates: Array<{
    id: string;
    message: string;
    timestamp: string;
    location?: string;
    status: string;
  }>;
  pickupCoordinates: { lat: number; lng: number } | null;
  deliveryCoordinates: { lat: number; lng: number } | null;
}

export default function DeliveryTrackingPage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations("client.deliveries");
  const [tracking, setTracking] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    if (params.id) {
      fetchTrackingData();
    }
  }, [params.id]);

  // Auto-refresh toutes les 30 secondes si la livraison est en cours
  useEffect(() => {
    if (autoRefresh && tracking && ["ACCEPTED", "IN_TRANSIT"].includes(tracking.status)) {
      const interval = setInterval(fetchTrackingData, 30000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, tracking?.status]);

  const fetchTrackingData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/client/deliveries/${params.id}/tracking`);
      
      if (response.ok) {
        const data = await response.json();
        setTracking(data);
      } else {
        toast.error("Erreur lors du chargement du suivi");
        router.push(`/fr/client/deliveries/${params.id}`);
      }
    } catch (error) {
      console.error("Error fetching tracking data:", error);
      toast.error("Erreur lors du chargement du suivi");
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = (status: string) => {
    const statusConfig = {
      PENDING: { 
        color: "bg-gray-100 text-gray-800", 
        label: "En attente", 
        icon: Clock,
        description: "Votre livraison est en attente d'un livreur"
      },
      ACCEPTED: { 
        color: "bg-blue-100 text-blue-800", 
        label: "Acceptée", 
        icon: CheckCircle,
        description: "Un livreur a accepté votre livraison"
      },
      IN_TRANSIT: { 
        color: "bg-yellow-100 text-yellow-800", 
        label: "En cours", 
        icon: Truck,
        description: "Votre colis est en route vers sa destination"
      },
      DELIVERED: { 
        color: "bg-green-100 text-green-800", 
        label: "Livrée", 
        icon: CheckCircle,
        description: "Votre colis a été livré avec succès"
      }
    };
    
    return statusConfig[status as keyof typeof statusConfig] || statusConfig.PENDING;
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDateTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Chargement du suivi...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!tracking) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Suivi non disponible</h1>
          <p className="text-gray-600 mb-6">Le suivi de cette livraison n'est pas disponible.</p>
          <Link href={`/fr/client/deliveries/${params.id}`}>
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour aux détails
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const statusInfo = getStatusInfo(tracking.status);
  const StatusIcon = statusInfo.icon;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* En-tête */}
      <div className="flex items-center gap-4 mb-6">
        <Button 
          variant="outline" 
          onClick={() => router.push(`/fr/client/deliveries/${params.id}`)}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">
            Suivi en temps réel
          </h1>
          <p className="text-gray-600">
            {tracking.announcementTitle}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchTrackingData()}
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Actualiser
          </Button>
          <Badge className={`${statusInfo.color} flex items-center gap-1`}>
            <StatusIcon className="w-3 h-3" />
            {statusInfo.label}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Carte et statut principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Statut principal */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className={`p-3 rounded-full ${statusInfo.color.replace('text-', 'bg-').replace('100', '200')}`}>
                  <StatusIcon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-gray-900">{statusInfo.label}</h2>
                  <p className="text-gray-600">{statusInfo.description}</p>
                </div>
              </div>

              {tracking.estimatedArrival && tracking.status === "IN_TRANSIT" && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <span className="font-medium text-blue-900">Arrivée estimée</span>
                  </div>
                  <p className="text-blue-800 font-bold">
                    {formatDateTime(tracking.estimatedArrival)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Carte de suivi */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapIcon className="w-5 h-5" />
                Position en temps réel
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DeliveryTrackingMap
                pickupCoordinates={tracking.pickupCoordinates}
                deliveryCoordinates={tracking.deliveryCoordinates}
                currentLocation={tracking.currentLocation}
                route={tracking.route || []}
                status={tracking.status}
              />
              
              {tracking.currentLocation && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Navigation className="w-4 h-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">Position actuelle</span>
                  </div>
                  <p className="text-sm text-gray-600">{tracking.currentLocation.address}</p>
                  <p className="text-xs text-gray-500">
                    Dernière mise à jour: {formatTime(tracking.currentLocation.timestamp)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Adresses de livraison */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Trajet
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-3 h-3 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Point de collecte</p>
                  <p className="text-sm text-gray-600">{tracking.pickupAddress}</p>
                </div>
              </div>
              
              <div className="ml-1.5 border-l-2 border-gray-200 h-8"></div>
              
              <div className="flex items-start gap-3">
                <div className="w-3 h-3 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Point de livraison</p>
                  <p className="text-sm text-gray-600">{tracking.deliveryAddress}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Colonne latérale */}
        <div className="space-y-6">
          {/* Informations livreur */}
          {tracking.delivererName && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Votre livreur
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  {tracking.delivererAvatar ? (
                    <img 
                      src={tracking.delivererAvatar} 
                      alt={tracking.delivererName}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-gray-400" />
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-gray-900">{tracking.delivererName}</p>
                    <p className="text-sm text-gray-500">Livreur EcoDeli</p>
                  </div>
                </div>
                
                {tracking.delivererPhone && (
                  <Button 
                    variant="outline" 
                    className="w-full flex items-center gap-2"
                    onClick={() => window.open(`tel:${tracking.delivererPhone}`, '_self')}
                  >
                    <Phone className="w-4 h-4" />
                    Appeler
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Code de validation */}
          {tracking.status === "IN_TRANSIT" && tracking.validationCode && (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-yellow-800">
                  <AlertCircle className="w-5 h-5" />
                  Code de validation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-yellow-700 mb-3">
                  Donnez ce code au livreur pour confirmer la réception
                </p>
                <div className="bg-white border border-yellow-300 rounded-lg p-4 text-center">
                  <p className="text-2xl font-mono font-bold text-yellow-900">
                    {tracking.validationCode}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Mises à jour en temps réel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Mises à jour</span>
                <div className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                  <span className="text-xs text-gray-500">
                    {autoRefresh ? 'Temps réel' : 'Manuel'}
                  </span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {tracking.updates && tracking.updates.length > 0 ? (
                  tracking.updates.map((update) => (
                    <div key={update.id} className="flex gap-3 pb-3 border-b last:border-0">
                      <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{update.message}</p>
                        <p className="text-xs text-gray-500">
                          {formatDateTime(update.timestamp)}
                        </p>
                        {update.location && (
                          <p className="text-xs text-gray-400">{update.location}</p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-500">Aucune mise à jour disponible</p>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Actualisation automatique</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAutoRefresh(!autoRefresh)}
                    className={autoRefresh ? 'bg-green-50 border-green-200' : ''}
                  >
                    {autoRefresh ? 'Activée' : 'Désactivée'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 