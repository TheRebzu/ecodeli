"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  Truck,
  MapPin,
  Clock,
  Package,
  CheckCircle,
  AlertCircle,
  Navigation,
  Phone,
  MessageSquare,
  Eye,
  RefreshCw,
  Zap,
  Route,
} from "lucide-react";
import { cn } from "@/lib/utils/common";
import { api } from "@/trpc/react";
import { useLiveTrackingDetails } from "@/hooks/delivery/use-live-tracking";

interface DeliveryStatus {
  id: string;
  announcementTitle: string;
  delivererName: string;
  delivererPhone?: string;
  status: "ASSIGNED" | "PICKUP_PENDING" | "IN_TRANSIT" | "DELIVERED" | "DELAYED";
  currentLocation?: {
    latitude: number;
    longitude: number;
    address: string;
  };
  estimatedArrival: string;
  progress: number; // 0-100
  pickupAddress: string;
  deliveryAddress: string;
  packageDetails: {
    weight: number;
    dimensions: string;
    fragile: boolean;
  };
  timeTracking: {
    assignedAt: Date;
    pickedUpAt?: Date;
    estimatedDelivery: Date;
  };
  notifications: Array<{
    id: string;
    message: string;
    timestamp: Date;
    type: "info" | "warning" | "success";
  }>;
}

interface RealTimeDeliveriesWidgetProps {
  className?: string;
}

export function RealTimeDeliveriesWidget({ className }: RealTimeDeliveriesWidgetProps) {
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<string | null>(null);

  // Récupérer les livraisons actives en temps réel
  const { 
    data: activeDeliveries, 
    isLoading,
    refetch 
  } = api.delivery.getActiveDeliveries.useQuery(undefined, {
    refetchInterval: 10000, // Actualise toutes les 10 secondes
  });

  // Hook pour le suivi en temps réel de la livraison sélectionnée
  const { 
    trackingData, 
    isLoading: isTrackingLoading 
  } = useLiveTrackingDetails(selectedDelivery || "");

  // Données simulées en attendant l'API
  const mockDeliveries: DeliveryStatus[] = [
    {
      id: "del-001",
      announcementTitle: "Livraison documents urgents",
      delivererName: "Marie Dubois",
      delivererPhone: "06 12 34 56 78",
      status: "IN_TRANSIT",
      currentLocation: {
        latitude: 48.8566,
        longitude: 2.3522,
        address: "Rue de Rivoli, Paris 1er",
      },
      estimatedArrival: "14:30",
      progress: 65,
      pickupAddress: "123 Rue de la Paix, Paris 2e",
      deliveryAddress: "456 Avenue des Champs, Paris 8e",
      packageDetails: {
        weight: 0.5,
        dimensions: "A4",
        fragile: false,
      },
      timeTracking: {
        assignedAt: new Date(Date.now() - 90 * 60 * 1000), // Il y a 90 min
        pickedUpAt: new Date(Date.now() - 45 * 60 * 1000), // Il y a 45 min
        estimatedDelivery: new Date(Date.now() + 30 * 60 * 1000), // Dans 30 min
      },
      notifications: [
        {
          id: "n1",
          message: "Colis récupéré avec succès",
          timestamp: new Date(Date.now() - 45 * 60 * 1000),
          type: "success",
        },
        {
          id: "n2", 
          message: "En route vers la destination",
          timestamp: new Date(Date.now() - 30 * 60 * 1000),
          type: "info",
        },
      ],
    },
    {
      id: "del-002",
      announcementTitle: "Livraison courses bio",
      delivererName: "Thomas Martin",
      status: "PICKUP_PENDING",
      estimatedArrival: "16:00",
      progress: 20,
      pickupAddress: "Bio Market, 89 Rue du Commerce",
      deliveryAddress: "12 Rue des Jardins, Paris 11e",
      packageDetails: {
        weight: 3.2,
        dimensions: "40x30x20cm",
        fragile: true,
      },
      timeTracking: {
        assignedAt: new Date(Date.now() - 30 * 60 * 1000),
        estimatedDelivery: new Date(Date.now() + 120 * 60 * 1000),
      },
      notifications: [
        {
          id: "n3",
          message: "Livreur en route vers le point de collecte",
          timestamp: new Date(Date.now() - 15 * 60 * 1000),
          type: "info",
        },
      ],
    },
  ];

  const deliveries = activeDeliveries || mockDeliveries;

  const getStatusColor = (status: DeliveryStatus["status"]) => {
    switch (status) {
      case "ASSIGNED":
        return "bg-blue-100 text-blue-800";
      case "PICKUP_PENDING": 
        return "bg-yellow-100 text-yellow-800";
      case "IN_TRANSIT":
        return "bg-purple-100 text-purple-800";
      case "DELIVERED":
        return "bg-green-100 text-green-800";
      case "DELAYED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: DeliveryStatus["status"]) => {
    const labels = {
      ASSIGNED: "Attribuée",
      PICKUP_PENDING: "Collecte en attente", 
      IN_TRANSIT: "En transit",
      DELIVERED: "Livrée",
      DELAYED: "Retardée",
    };
    return labels[status];
  };

  const getStatusIcon = (status: DeliveryStatus["status"]) => {
    switch (status) {
      case "ASSIGNED":
        return Clock;
      case "PICKUP_PENDING":
        return Package;
      case "IN_TRANSIT":
        return Truck;
      case "DELIVERED":
        return CheckCircle;
      case "DELAYED":
        return AlertCircle;
      default:
        return Clock;
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setTimeout(() => setRefreshing(false), 1000);
  };

  const formatTimeAgo = (date: Date) => {
    const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
    if (minutes < 1) return "À l'instant";
    if (minutes < 60) return `Il y a ${minutes}min`;
    const hours = Math.floor(minutes / 60);
    return `Il y a ${hours}h ${minutes % 60}min`;
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-slate-200 rounded w-1/2"></div>
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-20 bg-slate-200 rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-blue-600" />
            Livraisons en cours
            {deliveries.length > 0 && (
              <Badge variant="secondary">{deliveries.length}</Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
          </Button>
        </CardTitle>
      </CardHeader>

      <CardContent className="p-0">
        {deliveries.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Aucune livraison en cours</p>
            <p className="text-sm">Créez une nouvelle annonce pour commencer</p>
          </div>
        ) : (
          <ScrollArea className="max-h-96">
            <div className="p-4 space-y-4">
              {deliveries.map((delivery) => {
                const StatusIcon = getStatusIcon(delivery.status);
                
                return (
                  <div
                    key={delivery.id}
                    className={cn(
                      "border rounded-lg p-4 transition-all hover:shadow-md",
                      selectedDelivery === delivery.id && "ring-2 ring-primary"
                    )}
                  >
                    {/* En-tête */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm mb-1">
                          {delivery.announcementTitle}
                        </h4>
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(delivery.status)}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {getStatusLabel(delivery.status)}
                          </Badge>
                          {delivery.status === "IN_TRANSIT" && (
                            <Badge variant="outline" className="text-xs">
                              <Zap className="h-3 w-3 mr-1" />
                              ETA {delivery.estimatedArrival}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => 
                          setSelectedDelivery(
                            selectedDelivery === delivery.id ? null : delivery.id
                          )
                        }
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Progression */}
                    <div className="space-y-2 mb-3">
                      <div className="flex justify-between text-xs">
                        <span>Progression</span>
                        <span>{delivery.progress}%</span>
                      </div>
                      <Progress value={delivery.progress} className="h-2" />
                    </div>

                    {/* Informations du livreur */}
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium">
                            {delivery.delivererName.charAt(0)}
                          </span>
                        </div>
                        <span>{delivery.delivererName}</span>
                      </div>
                      
                      <div className="flex gap-1">
                        {delivery.delivererPhone && (
                          <Button variant="ghost" size="sm">
                            <Phone className="h-3 w-3" />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm">
                          <MessageSquare className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    {/* Détails étendus */}
                    {selectedDelivery === delivery.id && (
                      <div className="mt-4 pt-4 border-t space-y-4">
                        {/* Adresses */}
                        <div className="space-y-2">
                          <div className="flex items-start gap-2 text-xs">
                            <MapPin className="h-3 w-3 mt-0.5 text-green-600" />
                            <div>
                              <div className="font-medium">Collecte</div>
                              <div className="text-muted-foreground">
                                {delivery.pickupAddress}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-start gap-2 text-xs">
                            <MapPin className="h-3 w-3 mt-0.5 text-red-600" />
                            <div>
                              <div className="font-medium">Livraison</div>
                              <div className="text-muted-foreground">
                                {delivery.deliveryAddress}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Position actuelle */}
                        {delivery.currentLocation && (
                          <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
                            <div className="flex items-center gap-2 mb-1">
                              <Navigation className="h-3 w-3 text-blue-600" />
                              <span className="text-xs font-medium">Position actuelle</span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {delivery.currentLocation.address}
                            </div>
                          </div>
                        )}

                        {/* Notifications récentes */}
                        {delivery.notifications.length > 0 && (
                          <div className="space-y-2">
                            <div className="text-xs font-medium">Dernières mises à jour</div>
                            {delivery.notifications.slice(0, 2).map((notification) => (
                              <div key={notification.id} className="flex items-start gap-2 text-xs">
                                <div className={cn(
                                  "w-2 h-2 rounded-full mt-1",
                                  notification.type === "success" && "bg-green-500",
                                  notification.type === "info" && "bg-blue-500",
                                  notification.type === "warning" && "bg-orange-500"
                                )} />
                                <div className="flex-1">
                                  <div>{notification.message}</div>
                                  <div className="text-muted-foreground">
                                    {formatTimeAgo(notification.timestamp)}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Actions rapides */}
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="flex-1">
                            <Route className="h-3 w-3 mr-1" />
                            Voir le trajet
                          </Button>
                          <Button variant="outline" size="sm" className="flex-1">
                            <MessageSquare className="h-3 w-3 mr-1" />
                            Contacter
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}