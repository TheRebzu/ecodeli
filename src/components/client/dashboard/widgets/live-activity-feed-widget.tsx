"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Activity,
  Package,
  CreditCard,
  Star,
  MessageSquare,
  Calendar,
  Truck,
  CheckCircle,
  Bell,
  TrendingUp,
  Gift,
  Award,
  Leaf,
  RefreshCw,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils/common";
import { api } from "@/trpc/react";
import { useSocket } from "@/hooks/system/use-socket";

interface ActivityItem {
  id: string;
  type: "delivery" | "payment" | "announcement" | "service" | "achievement" | "eco_milestone" | "message" | "review";
  title: string;
  description: string;
  timestamp: Date;
  data: Record<string, any>;
  priority: "low" | "medium" | "high";
  icon: string;
  color: string;
  actionable?: boolean;
}

interface LiveActivityFeedWidgetProps {
  className?: string;
}

export function LiveActivityFeedWidget({ className }: LiveActivityFeedWidgetProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filter, setFilter] = useState<string>("all");

  // Connexion WebSocket pour les mises à jour en temps réel
  const { socket, isConnected } = useSocket();

  // Récupérer le feed d'activités
  const {
    data: activityData,
    isLoading,
    refetch,
  } = api.client.getActivityFeed.useQuery(
    { limit: 20, filter: filter === "all" ? undefined : filter },
    { refetchInterval: 30000 } // Actualise toutes les 30 secondes
  );

  // Données simulées en attendant l'API
  const mockActivities: ActivityItem[] = [
    {
      id: "act-1",
      type: "delivery",
      title: "Livraison confirmée",
      description: "Votre colis documents urgents a été livré avec succès",
      timestamp: new Date(Date.now() - 10 * 60 * 1000),
      data: { deliveryId: "del-001", rating: 5 },
      priority: "high",
      icon: "✅",
      color: "text-green-600",
      actionable: true,
    },
    {
      id: "act-2", 
      type: "eco_milestone",
      title: "Nouveau niveau atteint !",
      description: "Félicitations ! Vous êtes maintenant Eco-Citoyen",
      timestamp: new Date(Date.now() - 25 * 60 * 1000),
      data: { level: "Eco-Citoyen", points: 875 },
      priority: "high",
      icon: "🏆",
      color: "text-yellow-600",
    },
    {
      id: "act-3",
      type: "payment",
      title: "Paiement effectué",
      description: "Facture #INV-2024-0156 payée (24,50€)",
      timestamp: new Date(Date.now() - 45 * 60 * 1000),
      data: { amount: 24.50, invoiceId: "INV-2024-0156" },
      priority: "medium",
      icon: "💳",
      color: "text-blue-600",
    },
    {
      id: "act-4",
      type: "announcement",
      title: "Nouvelles propositions",
      description: "3 livreurs ont proposé leurs services pour votre annonce",
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      data: { announcementId: "ann-123", proposalCount: 3 },
      priority: "medium",
      icon: "📢",
      color: "text-purple-600",
      actionable: true,
    },
    {
      id: "act-5",
      type: "eco_milestone",
      title: "CO2 économisé",
      description: "Vous avez économisé 2,3kg de CO2 cette semaine !",
      timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
      data: { co2Saved: 2.3, period: "week" },
      priority: "low",
      icon: "🌱",
      color: "text-green-600",
    },
    {
      id: "act-6",
      type: "service",
      title: "Prestation planifiée",
      description: "Nettoyage écologique prévu demain à 14h",
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
      data: { serviceId: "srv-789", providerName: "EcoClean Pro" },
      priority: "medium",
      icon: "🧽",
      color: "text-teal-600",
      actionable: true,
    },
  ];

  const currentActivities = activityData || mockActivities;

  // Écouter les nouvelles activités via WebSocket
  useEffect(() => {
    if (socket && isConnected) {
      socket.on("new_activity", (newActivity: ActivityItem) => {
        setActivities((prev) => [newActivity, ...prev].slice(0, 20));
      });

      socket.on("activity_update", (updatedActivity: ActivityItem) => {
        setActivities((prev) =>
          prev.map((activity) =>
            activity.id === updatedActivity.id ? updatedActivity : activity
          )
        );
      });

      return () => {
        socket.off("new_activity");
        socket.off("activity_update");
      };
    }
  }, [socket, isConnected]);

  const getActivityIcon = (type: ActivityItem["type"]) => {
    switch (type) {
      case "delivery":
        return Truck;
      case "payment":
        return CreditCard;
      case "announcement":
        return Bell;
      case "service":
        return Calendar;
      case "achievement":
        return Award;
      case "eco_milestone":
        return Leaf;
      case "message":
        return MessageSquare;
      case "review":
        return Star;
      default:
        return Activity;
    }
  };

  const getPriorityColor = (priority: ActivityItem["priority"]) => {
    switch (priority) {
      case "high":
        return "border-l-red-500";
      case "medium":
        return "border-l-yellow-500";
      case "low":
        return "border-l-green-500";
      default:
        return "border-l-gray-300";
    }
  };

  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    
    if (seconds < 60) return "À l'instant";
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `Il y a ${minutes}min`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Il y a ${hours}h`;
    
    const days = Math.floor(hours / 24);
    return `Il y a ${days}j`;
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const handleActivityAction = (activity: ActivityItem) => {
    switch (activity.type) {
      case "delivery":
        // Rediriger vers la page de livraison
        window.location.href = `/client/deliveries/${activity.data.deliveryId}`;
        break;
      case "announcement":
        // Rediriger vers l'annonce
        window.location.href = `/client/announcements/${activity.data.announcementId}`;
        break;
      case "service":
        // Rediriger vers le service
        window.location.href = `/client/appointments/${activity.data.serviceId}`;
        break;
      default:
        break;
    }
  };

  const filterOptions = [
    { value: "all", label: "Tout", icon: Activity },
    { value: "delivery", label: "Livraisons", icon: Truck },
    { value: "eco_milestone", label: "Éco-Succès", icon: Leaf },
    { value: "payment", label: "Paiements", icon: CreditCard },
    { value: "service", label: "Services", icon: Calendar },
  ];

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-slate-200 rounded w-1/2"></div>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-slate-200 rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-purple-600" />
            Activité en temps réel
            {isConnected && (
              <Badge variant="secondary" className="text-xs">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-1" />
                Live
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
          </Button>
        </CardTitle>
      </CardHeader>

      <CardContent className="p-0">
        {/* Filtres */}
        <div className="p-4 border-b">
          <div className="flex gap-2 overflow-x-auto">
            {filterOptions.map((option) => {
              const Icon = option.icon;
              return (
                <Button
                  key={option.value}
                  variant={filter === option.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter(option.value)}
                  className="whitespace-nowrap"
                >
                  <Icon className="h-3 w-3 mr-1" />
                  {option.label}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Feed d'activités */}
        {currentActivities.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Aucune activité récente</p>
            <p className="text-sm">Vos futures actions apparaîtront ici</p>
          </div>
        ) : (
          <ScrollArea className="max-h-96">
            <div className="p-4 space-y-3">
              {currentActivities.map((activity) => {
                const Icon = getActivityIcon(activity.type);
                
                return (
                  <div
                    key={activity.id}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg border-l-4 bg-slate-50 dark:bg-slate-900 transition-all hover:shadow-sm",
                      getPriorityColor(activity.priority),
                      activity.actionable && "cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
                    )}
                    onClick={() => activity.actionable && handleActivityAction(activity)}
                  >
                    {/* Icône */}
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-background border flex items-center justify-center">
                        <Icon className={cn("h-4 w-4", activity.color)} />
                      </div>
                    </div>

                    {/* Contenu */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <h4 className="font-medium text-sm leading-tight">
                            {activity.title}
                          </h4>
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                            {activity.description}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs text-muted-foreground">
                            {formatTimeAgo(activity.timestamp)}
                          </span>
                          {activity.priority === "high" && (
                            <div className="w-2 h-2 bg-red-500 rounded-full" />
                          )}
                        </div>
                      </div>

                      {/* Données supplémentaires selon le type */}
                      {activity.type === "eco_milestone" && activity.data.points && (
                        <div className="mt-2">
                          <Badge variant="secondary" className="text-xs">
                            +{activity.data.points} EcoPoints
                          </Badge>
                        </div>
                      )}

                      {activity.type === "announcement" && activity.data.proposalCount && (
                        <div className="mt-2">
                          <Badge variant="outline" className="text-xs">
                            {activity.data.proposalCount} propositions
                          </Badge>
                        </div>
                      )}

                      {activity.type === "payment" && activity.data.amount && (
                        <div className="mt-2">
                          <Badge variant="secondary" className="text-xs">
                            {activity.data.amount}€
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}

        {/* Pied avec nombre d'éléments */}
        <div className="px-4 py-2 border-t bg-slate-50 dark:bg-slate-900">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{currentActivities.length} activités récentes</span>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>Mis à jour en temps réel</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}