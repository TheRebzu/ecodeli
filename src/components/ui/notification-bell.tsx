"use client";

import { useState } from "react";
import { Bell, BellRing, Check, X, ExternalLink } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/components/layout/providers/layout-provider";

export interface Notification {
  id: string;
  type: "info" | "success" | "warning" | "error";
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
  actionLabel?: string;
}

export interface NotificationBellProps {
  notifications: Notification[];
  onNotificationClick: (notification: Notification) => void;
  onMarkAllRead: () => void;
  className?: string;
}

export function NotificationBell({
  notifications,
  onNotificationClick,
  onMarkAllRead,
  className,
}: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleNotificationClick = (notification: Notification) => {
    onNotificationClick(notification);
    if (notification.actionUrl) {
      setIsOpen(false);
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "À l'instant";
    if (minutes < 60) return `Il y a ${minutes}min`;
    if (hours < 24) return `Il y a ${hours}h`;
    if (days < 7) return `Il y a ${days}j`;
    return timestamp.toLocaleDateString("fr-FR");
  };

  const getNotificationIcon = (type: Notification["type"]) => {
    switch (type) {
      case "success":
        return "✅";
      case "warning":
        return "⚠️";
      case "error":
        return "❌";
      default:
        return "ℹ️";
    }
  };

  const getNotificationColor = (type: Notification["type"]) => {
    switch (type) {
      case "success":
        return "border-l-green-500 bg-green-50 dark:bg-green-950";
      case "warning":
        return "border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950";
      case "error":
        return "border-l-red-500 bg-red-50 dark:bg-red-950";
      default:
        return "border-l-blue-500 bg-blue-50 dark:bg-blue-950";
    }
  };

  return (
    <div className={cn("relative", className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "relative p-2 rounded-lg transition-colors",
          "hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-muted",
          unreadCount > 0 ? "text-primary" : "text-muted-foreground",
        )}
        aria-label={`${unreadCount} notifications non lues`}
      >
        {unreadCount > 0 ? (
          <BellRing className="h-5 w-5" />
        ) : (
          <Bell className="h-5 w-5" />
        )}

        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium min-w-[20px]">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-background border border-border rounded-lg shadow-lg z-50 max-h-[32rem] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-semibold text-foreground">
                Notifications
                {unreadCount > 0 && (
                  <span className="ml-2 bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs font-medium">
                    {unreadCount} nouvelles
                  </span>
                )}
              </h3>

              <div className="flex items-center space-x-2">
                {unreadCount > 0 && (
                  <button
                    onClick={() => {
                      onMarkAllRead();
                      setIsOpen(false);
                    }}
                    className="text-xs text-primary hover:text-primary/80 transition-colors flex items-center space-x-1"
                  >
                    <Check className="h-3 w-3" />
                    <span>Tout marquer comme lu</span>
                  </button>
                )}

                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-md hover:bg-muted transition-colors"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
            </div>

            {/* Notifications list */}
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium">Aucune notification</p>
                  <p className="text-sm">Vous êtes à jour !</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={cn(
                        "p-4 border-l-4 transition-colors cursor-pointer",
                        getNotificationColor(notification.type),
                        !notification.read && "bg-opacity-100",
                        notification.read && "bg-opacity-50 opacity-75",
                      )}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 text-lg">
                          {getNotificationIcon(notification.type)}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p
                                className={cn(
                                  "text-sm font-medium",
                                  !notification.read
                                    ? "text-foreground"
                                    : "text-muted-foreground",
                                )}
                              >
                                {notification.title}
                              </p>
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {notification.message}
                              </p>
                            </div>

                            {!notification.read && (
                              <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 ml-2 mt-1" />
                            )}
                          </div>

                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-muted-foreground">
                              {formatTimestamp(notification.timestamp)}
                            </span>

                            {notification.actionUrl && (
                              <Link
                                href={notification.actionUrl}
                                className="text-xs text-primary hover:text-primary/80 transition-colors flex items-center space-x-1"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <span>
                                  {notification.actionLabel || "Voir"}
                                </span>
                                <ExternalLink className="h-3 w-3" />
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="p-3 border-t border-border bg-muted/50">
                <Link
                  href="/notifications"
                  className="text-sm text-primary hover:text-primary/80 transition-colors font-medium flex items-center justify-center space-x-1"
                  onClick={() => setIsOpen(false)}
                >
                  <span>Voir toutes les notifications</span>
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Version compacte pour mobile
 */
export function MobileNotificationBell({
  notifications,
  onNotificationClick,
  className,
}: Omit<NotificationBellProps, "onMarkAllRead">) {
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <Link
      href="/notifications"
      className={cn(
        "relative inline-flex items-center space-x-3 w-full px-4 py-3 text-left",
        "hover:bg-muted transition-colors rounded-lg",
        className,
      )}
    >
      <div className="relative">
        {unreadCount > 0 ? (
          <BellRing className="h-5 w-5 text-primary" />
        ) : (
          <Bell className="h-5 w-5 text-muted-foreground" />
        )}

        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center font-medium">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </div>

      <div className="flex-1">
        <span className="font-medium text-foreground">Notifications</span>
        {unreadCount > 0 && (
          <span className="text-sm text-muted-foreground block">
            {unreadCount} nouvelle{unreadCount > 1 ? "s" : ""}
          </span>
        )}
      </div>
    </Link>
  );
}

/**
 * Hook pour utiliser les notifications depuis le contexte
 */
export function useNotificationBell() {
  const { notifications, markAsRead, markAllAsRead } = useNotifications();

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
  };

  return {
    notifications,
    unreadCount: notifications.filter((n) => !n.read).length,
    onNotificationClick: handleNotificationClick,
    onMarkAllRead: markAllAsRead,
  };
}
