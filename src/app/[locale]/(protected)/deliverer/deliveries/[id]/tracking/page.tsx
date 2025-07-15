"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, MapPin, Truck, CheckCircle, Clock, RefreshCw, Navigation } from "lucide-react";
import { DeliveryTrackingMap } from "@/components/maps/delivery-tracking-map";
import ChatBox from "@/components/chat/ChatBox";
import { DeliveryTrackingSender } from '@/features/deliveries/components/DeliveryTrackingSender';

interface TrackingData {
  deliveryId: string;
  status: string;
  currentLocation?: {
    latitude: number;
    longitude: number;
    address?: string;
    timestamp?: string;
  };
  pickupLocation: {
    latitude: number;
    longitude: number;
    address: string;
  };
  deliveryLocation: {
    latitude: number;
    longitude: number;
    address: string;
  };
  deliverer?: {
    id: string;
    firstName: string;
    lastName: string;
    phone?: string;
  };
  estimatedDeliveryTime?: string;
  trackingHistory: Array<{
    id: string;
    location: {
      latitude: number;
      longitude: number;
    };
    timestamp: string;
    status: string;
  }>;
  progress: number;
  updates?: Array<{
    id: string;
    message: string;
    timestamp: string;
    location?: string;
    status: string;
  }>;
}

export default function DeliveryTrackingPage() {
  const { id } = useParams();
  const router = useRouter();
  const [tracking, setTracking] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    if (id) fetchTrackingData();
    // eslint-disable-next-line
  }, [id]);

  useEffect(() => {
    if (autoRefresh && tracking && ["ACCEPTED", "IN_TRANSIT"].includes(tracking.status)) {
      const interval = setInterval(fetchTrackingData, 30000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, tracking?.status]);

  const fetchTrackingData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/deliveries/${id}/tracking`);
      if (!response.ok) throw new Error("Erreur lors du chargement du tracking");
      const data = await response.json();
      setTracking(data);
    } catch (e) {
      setTracking(null);
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
        description: "La livraison est en attente de prise en charge",
      },
      ACCEPTED: {
        color: "bg-blue-100 text-blue-800",
        label: "Acceptée",
        icon: CheckCircle,
        description: "Vous avez accepté cette livraison",
      },
      IN_TRANSIT: {
        color: "bg-yellow-100 text-yellow-800",
        label: "En cours",
        icon: Truck,
        description: "Livraison en cours vers la destination",
      },
      DELIVERED: {
        color: "bg-green-100 text-green-800",
        label: "Livrée",
        icon: CheckCircle,
        description: "Livraison terminée avec succès",
      },
    };
    return statusConfig[status as keyof typeof statusConfig] || statusConfig.PENDING;
  };

  const formatTime = (timestamp?: string) => {
    if (!timestamp) return "-";
    return new Date(timestamp).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  };
  const formatDateTime = (timestamp?: string) => {
    if (!timestamp) return "-";
    return new Date(timestamp).toLocaleDateString("fr-FR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
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
          <Button onClick={() => router.push(`/fr/deliverer/deliveries/${id}`)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour aux détails
          </Button>
        </div>
      </div>
    );
  }

  const statusInfo = getStatusInfo(tracking.status);
  const StatusIcon = statusInfo.icon;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Tracking GPS et blocage navigation */}
      <DeliveryTrackingSender deliveryId={id as string} />
      {/* En-tête */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="outline"
          onClick={() => router.push(`/fr/deliverer/deliveries/${id}`)}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Suivi en temps réel</h1>
          <p className="text-gray-600">ID Livraison : {id}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchTrackingData}
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
                <div className={`p-3 rounded-full ${statusInfo.color.replace("text-", "bg-").replace("100", "200")}`}>
                  <StatusIcon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-gray-900">{statusInfo.label}</h2>
                  <p className="text-gray-600">{statusInfo.description}</p>
                </div>
              </div>
              {tracking.estimatedDeliveryTime && tracking.status === "IN_TRANSIT" && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <span className="font-medium text-blue-900">Arrivée estimée</span>
                  </div>
                  <p className="text-blue-800 font-bold">{formatDateTime(tracking.estimatedDeliveryTime)}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Carte de suivi */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="w-5 h-5" />
                Position en temps réel
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DeliveryTrackingMap 
                deliveryId={id as string} 
                apiEndpoint={`/api/deliveries/${id}/tracking`}
              />
              {tracking.currentLocation && tracking.currentLocation.address && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Navigation className="w-4 h-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">Position actuelle</span>
                  </div>
                  <p className="text-sm text-gray-600">{tracking.currentLocation.address}</p>
                  <p className="text-xs text-gray-500">Dernière mise à jour: {formatTime(tracking.currentLocation.timestamp)}</p>
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
              {tracking.pickupLocation && (
                <div className="flex items-start gap-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Point de collecte</p>
                    <p className="text-sm text-gray-600">{tracking.pickupLocation.address}</p>
                  </div>
                </div>
              )}
              <div className="ml-1.5 border-l-2 border-gray-200 h-8"></div>
              {tracking.deliveryLocation && (
                <div className="flex items-start gap-3">
                  <div className="w-3 h-3 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Point de livraison</p>
                    <p className="text-sm text-gray-600">{tracking.deliveryLocation.address}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Colonne latérale */}
        <div className="space-y-6">
          {/* Mises à jour en temps réel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Mises à jour</span>
                <div className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${autoRefresh ? "bg-green-500" : "bg-gray-400"}`}></div>
                  <span className="text-xs text-gray-500">{autoRefresh ? "Temps réel" : "Manuel"}</span>
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
                        <p className="text-xs text-gray-500">{formatDateTime(update.timestamp)}</p>
                        {update.location && <p className="text-xs text-gray-400">{update.location}</p>}
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
                    className={autoRefresh ? "bg-green-50 border-green-200" : ""}
                  >
                    {autoRefresh ? "Activée" : "Désactivée"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <div className="mt-6">
        <ChatBox contextType="DELIVERY" contextId={id as string} />
      </div>
    </div>
  );
} 