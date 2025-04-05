"use client";

import React, { useState } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { X, Bell, Info, AlertCircle, CheckCircle, Package, Truck, Clock, CreditCard, MessageSquare } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

const notificationVariants = cva(
  "relative w-full flex gap-3 rounded-lg p-4 text-sm border",
  {
    variants: {
      variant: {
        default: "bg-white border-gray-200",
        info: "bg-blue-50 border-blue-200",
        success: "bg-green-50 border-green-200",
        warning: "bg-amber-50 border-amber-200",
        error: "bg-red-50 border-red-200",
      },
      size: {
        default: "p-4",
        sm: "p-3 text-xs",
        lg: "p-5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface NotificationProps extends VariantProps<typeof notificationVariants> {
  id: string;
  title: string;
  message: string;
  type?: "system" | "delivery" | "payment" | "message" | "alert" | "package" | "info" | "promo";
  timestamp: Date;
  read?: boolean;
  actionLabel?: string;
  onActionClick?: () => void;
  onDismiss?: (id: string) => void;
  onMarkAsRead?: (id: string) => void;
  className?: string;
}

function getNotificationIcon(type: NotificationProps["type"] = "info") {
  const iconClasses = "h-5 w-5";
  switch (type) {
    case "delivery":
      return <Truck className={iconClasses} />;
    case "package":
      return <Package className={iconClasses} />;
    case "payment":
      return <CreditCard className={iconClasses} />;
    case "message":
      return <MessageSquare className={iconClasses} />;
    case "alert":
      return <AlertCircle className={iconClasses} />;
    case "info":
      return <Info className={iconClasses} />;
    case "system":
      return <Bell className={iconClasses} />;
    case "promo":
      return <Bell className={iconClasses} />;
    default:
      return <Info className={iconClasses} />;
  }
}

function getIconBackgroundColor(type: NotificationProps["type"] = "info") {
  switch (type) {
    case "delivery":
      return "bg-blue-100 text-blue-600";
    case "package":
      return "bg-emerald-100 text-emerald-600";
    case "payment":
      return "bg-green-100 text-green-600";
    case "message":
      return "bg-indigo-100 text-indigo-600";
    case "alert":
      return "bg-amber-100 text-amber-600";
    case "info":
      return "bg-sky-100 text-sky-600";
    case "system":
      return "bg-gray-100 text-gray-600";
    case "promo":
      return "bg-purple-100 text-purple-600";
    default:
      return "bg-gray-100 text-gray-600";
  }
}

export function Notification({
  id,
  title,
  message,
  type = "info",
  timestamp,
  read = false,
  actionLabel,
  onActionClick,
  onDismiss,
  onMarkAsRead,
  variant,
  size,
  className = "",
}: NotificationProps) {
  const [isVisible, setIsVisible] = useState(true);
  
  const handleDismiss = () => {
    setIsVisible(false);
    if (onDismiss) {
      onDismiss(id);
    }
  };
  
  const handleMarkAsRead = () => {
    if (onMarkAsRead) {
      onMarkAsRead(id);
    }
  };
  
  const formattedTime = formatDistanceToNow(timestamp, { addSuffix: true, locale: fr });
  
  if (!isVisible) {
    return null;
  }
  
  return (
    <div 
      className={notificationVariants({ variant, size, className })}
      onClick={read ? undefined : handleMarkAsRead}
    >
      <div className={`flex-shrink-0 rounded-full p-2 ${getIconBackgroundColor(type)}`}>
        {getNotificationIcon(type)}
      </div>
      
      <div className="flex-1">
        <div className="flex justify-between items-start">
          <h4 className="font-medium text-gray-900">{title}</h4>
          
          <div className="flex items-center gap-1 ml-2">
            {!read && (
              <span className="flex-shrink-0 h-2 w-2 rounded-full bg-blue-500"></span>
            )}
            <button 
              onClick={(e) => {
                e.stopPropagation();
                handleDismiss();
              }}
              className="text-gray-400 hover:text-gray-500 rounded-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        
        <p className="text-gray-600 mt-1">{message}</p>
        
        <div className="flex justify-between items-center mt-2">
          <span className="text-xs text-gray-500">{formattedTime}</span>
          
          {actionLabel && onActionClick && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onActionClick();
              }}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              {actionLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

interface NotificationListProps {
  notifications: NotificationProps[];
  onDismissAll?: () => void;
  onMarkAllAsRead?: () => void;
  emptyMessage?: string;
  className?: string;
}

export function NotificationList({
  notifications,
  onDismissAll,
  onMarkAllAsRead,
  emptyMessage = "Aucune notification",
  className = "",
}: NotificationListProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      {notifications.length > 0 ? (
        <>
          {notifications.length > 1 && (
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-500">{notifications.length} notifications</span>
              <div className="flex gap-3">
                {onMarkAllAsRead && (
                  <button 
                    onClick={onMarkAllAsRead}
                    className="text-xs text-gray-600 hover:text-gray-900"
                  >
                    Tout marquer comme lu
                  </button>
                )}
                {onDismissAll && (
                  <button
                    onClick={onDismissAll}
                    className="text-xs text-gray-600 hover:text-gray-900"
                  >
                    Tout effacer
                  </button>
                )}
              </div>
            </div>
          )}
          
          <div className="space-y-3">
            {notifications.map((notification) => (
              <Notification
                key={notification.id}
                {...notification}
              />
            ))}
          </div>
        </>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
          <p>{emptyMessage}</p>
        </div>
      )}
    </div>
  );
}

// Sample notifications for demonstration
export const sampleNotifications: NotificationProps[] = [
  {
    id: "notif-1",
    title: "Livraison en cours",
    message: "Votre colis sera livré aujourd'hui entre 14h et 16h",
    type: "delivery",
    timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
    read: false,
    actionLabel: "Voir le suivi",
  },
  {
    id: "notif-2",
    title: "Offre spéciale",
    message: "Profitez de -20% sur votre prochaine livraison avec le code ECODELI20",
    type: "promo",
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
    read: true,
    actionLabel: "Voir l'offre",
  },
  {
    id: "notif-3",
    title: "Nouveau message",
    message: "Thomas (Livreur) vous a envoyé un message concernant votre livraison",
    type: "message",
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    read: false,
    actionLabel: "Répondre",
  },
  {
    id: "notif-4",
    title: "Paiement confirmé",
    message: "Votre paiement de 49,90€ pour l'abonnement Premium a été traité avec succès",
    type: "payment",
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    read: true,
  },
  {
    id: "notif-5", 
    title: "Confirmation de réservation",
    message: "Votre créneau de service de montage a été confirmé pour le 28/10/2023 à 14h00",
    type: "info",
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    read: true,
    actionLabel: "Voir les détails",
  }
]; 