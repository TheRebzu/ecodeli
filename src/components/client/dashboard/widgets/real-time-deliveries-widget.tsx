"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Truck, 
  MapPin, 
  Clock, 
  Package, 
  RefreshCw, 
  AlertCircle,
  CheckCircle,
  Navigation,
  Calendar
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { api } from "@/trpc/react";

interface DeliveryStatus {
  id: string;
  orderId: string;
  status: "pending" | "accepted" | "picked_up" | "in_transit" | "delivered" | "cancelled";
  delivererName: string;
  delivererAvatar?: string;
  pickupAddress: string;
  deliveryAddress: string;
  estimatedTime: string;
  currentLocation?: {
    lat: number;
    lng: number;
    address: string;
  };
  progress: number;
  createdAt: Date;
  updatedAt: Date;
  tracking?: {
    events: Array<{
      status: string;
      timestamp: Date;
      location?: string;
      description: string;
    }>;
  };
}

interface RealTimeDeliveriesWidgetProps {
  className?: string;
  maxItems?: number;
}

export function RealTimeDeliveriesWidget({ 
  className, 
  maxItems = 5 
}: RealTimeDeliveriesWidgetProps) {
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "completed">("active");

  // Récupération des vraies données de livraisons depuis l'API
  const { data: deliveries, isLoading, error, refetch } = useQuery({
    queryKey: ["client-real-time-deliveries", statusFilter, maxItems],
    queryFn: async () => {
      const response = await api.client.deliveries.getRealTimeStatus.query({
        status: statusFilter === "all" ? undefined : statusFilter,
        limit: maxItems
      });
      return response;
    },
    refetchInterval: 15000, // Actualise toutes les 15 secondes pour le temps réel
    staleTime: 5000, // Données périmées après 5s pour le temps réel
  });

  const getStatusColor = (status: DeliveryStatus["status"]) => {
    switch (status) {
      case "delivered":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "in_transit":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "picked_up":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300";
      case "accepted":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "pending":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
      case "cancelled":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  const getStatusLabel = (status: DeliveryStatus["status"]) => {
    switch (status) {
      case "delivered":
        return "Livré";
      case "in_transit":
        return "En cours";
      case "picked_up":
        return "Récupéré";
      case "accepted":
        return "Accepté";
      case "pending":
        return "En attente";
      case "cancelled":
        return "Annulé";
      default:
        return "Inconnu";
    }
  };

  const getStatusIcon = (status: DeliveryStatus["status"]) => {
    switch (status) {
      case "delivered":
        return CheckCircle;
      case "in_transit":
        return Truck;
      case "picked_up":
        return Package;
      case "accepted":
        return Calendar;
      case "pending":
        return Clock;
      case "cancelled":
        return AlertCircle;
      default:
        return Package;
    }
  };

  const filterOptions = [
    { value: "active", label: "En cours" },
    { value: "completed", label: "Terminées" },
    { value: "all", label: "Toutes" },
  ];

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Livraisons en temps réel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-start space-x-3">
                  <div className="w-12 h-12 bg-slate-200 rounded-lg"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                    <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                    <div className="h-2 bg-slate-200 rounded w-full"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Livraisons en temps réel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500 opacity-50" />
            <p className="text-sm text-red-600 mb-2">
              Erreur lors du chargement des livraisons
            </p>
            <p className="text-xs text-gray-500 mb-4">
              Impossible de récupérer les données en temps réel
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="text-xs"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Réessayer
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!deliveries || deliveries.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Livraisons en temps réel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Truck className="w-12 h-12 mx-auto mb-4 text-gray-400 opacity-50" />
            <p className="text-sm text-gray-500 mb-2">
              Aucune livraison {statusFilter === "active" ? "en cours" : "trouvée"}
            </p>
            <p className="text-xs text-gray-400">
              {statusFilter === "active" 
                ? "Vos futures livraisons apparaîtront ici"
                : "Aucune livraison ne correspond aux critères"}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Truck className="w-5 h-5" />
            Livraisons en temps réel
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className={cn("h-3 w-3", isLoading && "animate-spin")} />
          </Button>
        </div>

        {/* Filtres */}
        <div className="flex gap-1 mt-3">
          {filterOptions.map((option) => (
            <Button
              key={option.value}
              variant={statusFilter === option.value ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(option.value as any)}
              className="text-xs"
            >
              {option.label}
            </Button>
          ))}
        </div>
      </CardHeader>

      <CardContent>
        <ScrollArea className="h-[350px] pr-4">
          <div className="space-y-4">
            {deliveries.map((delivery) => {
              const StatusIcon = getStatusIcon(delivery.status);
              
              return (
                <div
                  key={delivery.id}
                  className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  {/* En-tête avec statut */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <StatusIcon className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">#{delivery.orderId}</span>
                    </div>
                    <Badge
                      className={cn("text-xs", getStatusColor(delivery.status))}
                      variant="secondary"
                    >
                      {getStatusLabel(delivery.status)}
                    </Badge>
                  </div>

                  {/* Informations du livreur */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-xs font-medium text-primary">
                        {delivery.delivererName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {delivery.delivererName}
                    </span>
                  </div>

                  {/* Adresses */}
                  <div className="space-y-2 mb-3">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-3 h-3 mt-0.5 text-green-600" />
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground">Récupération</p>
                        <p className="text-sm">{delivery.pickupAddress}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="w-3 h-3 mt-0.5 text-red-600" />
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground">Livraison</p>
                        <p className="text-sm">{delivery.deliveryAddress}</p>
                      </div>
                    </div>
                  </div>

                  {/* Position actuelle si en transit */}
                  {delivery.currentLocation && delivery.status === "in_transit" && (
                    <div className="flex items-start gap-2 mb-3 p-2 bg-blue-50 dark:bg-blue-950 rounded">
                      <Navigation className="w-3 h-3 mt-0.5 text-blue-600" />
                      <div className="flex-1">
                        <p className="text-xs text-blue-700 dark:text-blue-300">Position actuelle</p>
                        <p className="text-sm text-blue-800 dark:text-blue-200">
                          {delivery.currentLocation.address}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Barre de progression */}
                  <div className="space-y-2 mb-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Progression</span>
                      <span className="font-medium">{delivery.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${delivery.progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Temps estimé et dernière mise à jour */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>ETA: {delivery.estimatedTime}</span>
                    </div>
                    <span>
                      Mis à jour {formatDistanceToNow(delivery.updatedAt, {
                        addSuffix: true,
                        locale: fr,
                      })}
                    </span>
                  </div>

                  {/* Dernier événement de tracking */}
                  {delivery.tracking?.events && delivery.tracking.events.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <div className="text-xs text-muted-foreground">
                        Dernier événement:
                      </div>
                      <div className="text-sm">
                        {delivery.tracking.events[0]?.description}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {/* Footer avec indicateur temps réel */}
        <div className="mt-4 pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
          <span>{deliveries.length} livraison(s) affichée(s)</span>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span>Temps réel</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}