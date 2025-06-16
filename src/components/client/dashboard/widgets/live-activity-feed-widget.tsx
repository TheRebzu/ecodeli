"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Package, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Truck, 
  RefreshCw,
  Activity,
  Calendar
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { api } from "@/trpc/react";

interface ActivityItem {
  id: string;
  type: "delivery" | "order" | "service" | "notification";
  title: string;
  description: string;
  timestamp: Date;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  icon: React.ComponentType<{ className?: string }>;
  metadata?: {
    orderId?: string;
    deliveryId?: string;
    amount?: number;
    location?: string;
  };
}

interface LiveActivityFeedWidgetProps {
  className?: string;
  maxItems?: number;
}

export function LiveActivityFeedWidget({ 
  className, 
  maxItems = 10 
}: LiveActivityFeedWidgetProps) {
  const [filter, setFilter] = useState<"all" | "delivery" | "order" | "service">("all");

  // Récupération des vraies données d'activité depuis l'API
  const { data: activities, isLoading, error, refetch } = useQuery({
    queryKey: ["client-activity-feed", filter, maxItems],
    queryFn: async () => {
      const response = await api.client.dashboard.getActivityFeed.query({
        filter: filter === "all" ? undefined : filter,
        limit: maxItems
      });
      return response;
    },
    refetchInterval: 30000, // Actualise toutes les 30 secondes
    staleTime: 15000, // Données périmées après 15s
  });

  const getStatusColor = (status: ActivityItem["status"]) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "in_progress":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "cancelled":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  const getStatusLabel = (status: ActivityItem["status"]) => {
    switch (status) {
      case "completed":
        return "Terminé";
      case "in_progress":
        return "En cours";
      case "pending":
        return "En attente";
      case "cancelled":
        return "Annulé";
      default:
        return "Inconnu";
    }
  };

  const filterOptions = [
    { value: "all", label: "Tout" },
    { value: "delivery", label: "Livraisons" },
    { value: "order", label: "Commandes" },
    { value: "service", label: "Services" },
  ];

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Activité en temps réel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 bg-slate-200 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                    <div className="h-3 bg-slate-200 rounded w-1/2"></div>
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
          <CardTitle className="text-lg font-semibold">Activité en temps réel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500 opacity-50" />
            <p className="text-sm text-red-600 mb-2">
              Erreur lors du chargement de l'activité
            </p>
            <p className="text-xs text-gray-500 mb-4">
              Impossible de récupérer les données d'activité
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

  if (!activities || activities.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Activité en temps réel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Activity className="w-12 h-12 mx-auto mb-4 text-gray-400 opacity-50" />
            <p className="text-sm text-gray-500 mb-2">
              Aucune activité récente
            </p>
            <p className="text-xs text-gray-400">
              Vos activités apparaîtront ici en temps réel
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
          <CardTitle className="text-lg font-semibold">
            Activité en temps réel
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
              variant={filter === option.value ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(option.value as any)}
              className="text-xs"
            >
              {option.label}
            </Button>
          ))}
        </div>
      </CardHeader>

      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {activities.map((activity) => {
              const IconComponent = activity.icon;
              
              return (
                <div
                  key={activity.id}
                  className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  {/* Icône */}
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      <IconComponent className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </div>

                  {/* Contenu */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">
                          {activity.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {activity.description}
                        </p>
                      </div>
                      
                      <Badge
                        className={cn("ml-2 text-xs", getStatusColor(activity.status))}
                        variant="secondary"
                      >
                        {getStatusLabel(activity.status)}
                      </Badge>
                    </div>

                    {/* Métadonnées */}
                    {activity.metadata && (
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        {activity.metadata.orderId && (
                          <span>#{activity.metadata.orderId}</span>
                        )}
                        {activity.metadata.amount && (
                          <span>{activity.metadata.amount.toFixed(2)}€</span>
                        )}
                        {activity.metadata.location && (
                          <span>{activity.metadata.location}</span>
                        )}
                      </div>
                    )}

                    {/* Timestamp */}
                    <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>
                        {formatDistanceToNow(activity.timestamp, {
                          addSuffix: true,
                          locale: fr,
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}