"use client";

import { useState, useEffect } from "react";
import { Bell, Truck, MessageCircle, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useRealTimeNotifications, useSocket } from "@/components/providers/socket-provider";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface NotificationIconProps {
  type: string;
  className?: string;
}

function NotificationIcon({ type, className }: NotificationIconProps) {
  const iconProps = { className: className || "h-4 w-4" };

  switch (type) {
    case "DELIVERY_STARTED":
    case "DELIVERY_PICKED_UP":
    case "DELIVERY_IN_TRANSIT":
    case "DELIVERY_NEARBY":
    case "DELIVERY_ARRIVED":
    case "DELIVERY_COMPLETED":
      return <Truck {...iconProps} />;
    
    case "NEW_MESSAGE":
    case "ANNOUNCEMENT_MATCH":
      return <MessageCircle {...iconProps} />;
    
    case "DELIVERY_DELAYED":
    case "DELIVERY_PROBLEM":
    case "SYSTEM_ALERT":
      return <AlertTriangle {...iconProps} />;
    
    case "DELIVERY_CONFIRMED":
    case "DOCUMENT_APPROVED":
    case "VERIFICATION_APPROVED":
    case "PAYMENT_RECEIVED":
      return <CheckCircle2 {...iconProps} />;
    
    default:
      return <Bell {...iconProps} />;
  }
}

function getNotificationColor(priority: string): string {
  switch (priority) {
    case "URGENT":
      return "bg-red-50 border-red-200 dark:bg-red-950/20";
    case "HIGH":
      return "bg-orange-50 border-orange-200 dark:bg-orange-950/20";
    case "NORMAL":
      return "bg-blue-50 border-blue-200 dark:bg-blue-950/20";
    case "LOW":
      return "bg-gray-50 border-gray-200 dark:bg-gray-950/20";
    default:
      return "bg-white border-gray-200 dark:bg-gray-950";
  }
}

function getPriorityColor(priority: string): string {
  switch (priority) {
    case "URGENT":
      return "bg-red-500";
    case "HIGH":
      return "bg-orange-500";
    case "NORMAL":
      return "bg-blue-500";
    case "LOW":
      return "bg-gray-500";
    default:
      return "bg-gray-400";
  }
}

export function RealTimeNotifications() {
  const notifications = useRealTimeNotifications();
  const { isConnected } = useSocket();
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Mettre à jour le nombre de notifications non lues
  useEffect(() => {
    const recentNotifications = notifications.filter(
      notif => new Date(notif.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000) // Dernières 24h
    );
    setUnreadCount(recentNotifications.length);
  }, [notifications]);

  // Écouter les événements de mise à jour du badge
  useEffect(() => {
    const handleBadgeUpdate = () => {
      // Recompter les notifications non lues
      const recentNotifications = notifications.filter(
        notif => new Date(notif.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000)
      );
      setUnreadCount(recentNotifications.length);
    };

    window.addEventListener("update-notification-badge", handleBadgeUpdate);
    return () => {
      window.removeEventListener("update-notification-badge", handleBadgeUpdate);
    };
  }, [notifications]);

  const handleNotificationClick = (notification: any) => {
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
    }
    setOpen(false);
  };

  const clearAllNotifications = () => {
    // Émettre un événement pour vider les notifications
    window.dispatchEvent(new CustomEvent("clear-notifications"));
    setUnreadCount(0);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
          {!isConnected && (
            <div className="absolute -bottom-1 -right-1 h-2 w-2 bg-orange-500 rounded-full" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <Card className="border-0 shadow-none">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                Notifications temps réel
                {!isConnected && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    Déconnecté
                  </Badge>
                )}
              </CardTitle>
              {notifications.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllNotifications}
                  className="text-xs"
                >
                  Tout effacer
                </Button>
              )}
            </div>
          </CardHeader>
          <Separator />
          <CardContent className="p-0">
            <ScrollArea className="h-80">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-8 text-center">
                  <Bell className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Aucune notification récente
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Les notifications apparaîtront ici en temps réel
                  </p>
                </div>
              ) : (
                <div className="space-y-1 p-2">
                  {notifications.map((notification, index) => (
                    <div
                      key={`${notification.id}-${index}`}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50 ${getNotificationColor(notification.priority)}`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          <div className="relative">
                            <NotificationIcon type={notification.type} />
                            <div 
                              className={`absolute -top-1 -right-1 h-2 w-2 rounded-full ${getPriorityColor(notification.priority)}`}
                            />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium text-foreground leading-tight">
                              {notification.title}
                            </p>
                            <time className="text-xs text-muted-foreground flex-shrink-0">
                              {formatDistanceToNow(new Date(notification.timestamp), {
                                addSuffix: true,
                                locale: fr
                              })}
                            </time>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {notification.message}
                          </p>
                          {notification.priority === "URGENT" && (
                            <Badge variant="destructive" className="mt-2 text-xs">
                              Urgent
                            </Badge>
                          )}
                          {notification.priority === "HIGH" && (
                            <Badge variant="secondary" className="mt-2 text-xs bg-orange-100 text-orange-800">
                              Important
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
}

// Indicateur de connexion WebSocket
export function WebSocketStatus() {
  const { isConnected } = useSocket();

  return (
    <div className="flex items-center gap-2">
      <div 
        className={`h-2 w-2 rounded-full ${
          isConnected ? "bg-green-500" : "bg-red-500"
        }`}
      />
      <span className="text-xs text-muted-foreground">
        {isConnected ? "En ligne" : "Déconnecté"}
      </span>
    </div>
  );
}

// Hook pour les composants qui veulent écouter des notifications spécifiques
export function useNotificationListener(
  types: string[],
  callback: (notification: any) => void
) {
  const notifications = useRealTimeNotifications();

  useEffect(() => {
    const latestNotification = notifications[0];
    if (latestNotification && types.includes(latestNotification.type)) {
      callback(latestNotification);
    }
  }, [notifications, types, callback]);
}