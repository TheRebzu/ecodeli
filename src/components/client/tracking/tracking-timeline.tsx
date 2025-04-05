"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Truck,
  Package,
  Home,
  User,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Store,
  ShoppingBag,
  MapPin,
  Info,
  UserCheck,
  Calendar
} from "lucide-react";

type TrackingStatus = 
  | "ORDER_PLACED"
  | "PAYMENT_CONFIRMED"
  | "PICKUP_SCHEDULED"
  | "PICKUP_IN_PROGRESS"
  | "PICKED_UP"
  | "IN_TRANSIT"
  | "IN_STORAGE"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED"
  | "FAILED_DELIVERY"
  | "RETURNED_TO_SENDER";

interface TrackingEvent {
  id: string;
  status: TrackingStatus;
  timestamp: Date;
  location?: string;
  description?: string;
  agent?: {
    name: string;
    role: string;
  };
}

interface TrackingTimelineProps {
  events: TrackingEvent[];
  currentStatus: TrackingStatus;
  isLoading?: boolean;
  className?: string;
}

export function TrackingTimeline({ 
  events, 
  currentStatus, 
  isLoading = false, 
  className = "" 
}: TrackingTimelineProps) {
  const [sortedEvents, setSortedEvents] = useState<TrackingEvent[]>([]);
  
  useEffect(() => {
    // Sort events by timestamp, most recent first
    const sorted = [...events].sort((a, b) => {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
    setSortedEvents(sorted);
  }, [events]);
  
  // Configuration for status icons and colors
  const statusConfig = {
    ORDER_PLACED: {
      icon: ShoppingBag,
      color: "text-blue-500",
      bgColor: "bg-blue-100",
      borderColor: "border-blue-200",
      title: "Commande passée"
    },
    PAYMENT_CONFIRMED: {
      icon: CheckCircle2,
      color: "text-green-500",
      bgColor: "bg-green-100",
      borderColor: "border-green-200",
      title: "Paiement confirmé"
    },
    PICKUP_SCHEDULED: {
      icon: Calendar,
      color: "text-indigo-500",
      bgColor: "bg-indigo-100",
      borderColor: "border-indigo-200",
      title: "Récupération programmée"
    },
    PICKUP_IN_PROGRESS: {
      icon: User,
      color: "text-purple-500",
      bgColor: "bg-purple-100",
      borderColor: "border-purple-200",
      title: "Récupération en cours"
    },
    PICKED_UP: {
      icon: Package,
      color: "text-amber-500",
      bgColor: "bg-amber-100",
      borderColor: "border-amber-200",
      title: "Colis récupéré"
    },
    IN_TRANSIT: {
      icon: Truck,
      color: "text-blue-500",
      bgColor: "bg-blue-100",
      borderColor: "border-blue-200",
      title: "En transit"
    },
    IN_STORAGE: {
      icon: Home,
      color: "text-amber-500",
      bgColor: "bg-amber-100",
      borderColor: "border-amber-200",
      title: "En stockage"
    },
    OUT_FOR_DELIVERY: {
      icon: Truck,
      color: "text-emerald-500",
      bgColor: "bg-emerald-100",
      borderColor: "border-emerald-200",
      title: "En cours de livraison"
    },
    DELIVERED: {
      icon: CheckCircle2,
      color: "text-green-500",
      bgColor: "bg-green-100",
      borderColor: "border-green-200",
      title: "Livré"
    },
    CANCELLED: {
      icon: AlertTriangle,
      color: "text-red-500",
      bgColor: "bg-red-100",
      borderColor: "border-red-200",
      title: "Annulé"
    },
    FAILED_DELIVERY: {
      icon: AlertTriangle,
      color: "text-orange-500",
      bgColor: "bg-orange-100",
      borderColor: "border-orange-200",
      title: "Échec de livraison"
    },
    RETURNED_TO_SENDER: {
      icon: Store,
      color: "text-gray-500",
      bgColor: "bg-gray-100",
      borderColor: "border-gray-200",
      title: "Retourné à l'expéditeur"
    }
  };
  
  if (isLoading) {
    return (
      <div className={`space-y-4 py-2 ${className}`}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex">
            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 animate-pulse"></div>
            <div className="ml-4 flex-grow">
              <div className="h-4 w-1/3 bg-gray-200 rounded animate-pulse"></div>
              <div className="mt-2 h-3 w-1/2 bg-gray-200 rounded animate-pulse"></div>
              <div className="mt-1 h-3 w-3/4 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }
  
  if (sortedEvents.length === 0) {
    return (
      <div className={`p-4 rounded-md bg-gray-50 text-gray-500 text-center ${className}`}>
        <Info className="h-5 w-5 mx-auto mb-2" />
        <p>Aucune information de suivi disponible</p>
      </div>
    );
  }
  
  return (
    <div className={`space-y-4 py-2 ${className}`}>
      {sortedEvents.map((event, index) => {
        const config = statusConfig[event.status] || statusConfig.IN_TRANSIT;
        const StatusIcon = config.icon;
        const isLast = index === sortedEvents.length - 1;
        
        return (
          <div key={event.id} className="flex">
            <div className="relative">
              <div className={`flex-shrink-0 h-10 w-10 rounded-full ${config.bgColor} flex items-center justify-center z-10 relative`}>
                <StatusIcon className={`h-5 w-5 ${config.color}`} />
              </div>
              
              {!isLast && (
                <div className={`absolute top-10 bottom-0 left-1/2 w-0.5 -ml-px ${config.borderColor} z-0`}></div>
              )}
            </div>
            
            <div className="ml-4 flex-grow">
              <div className="flex items-center">
                <h3 className="text-sm font-medium text-gray-900">{config.title}</h3>
                <span className="ml-2 text-xs text-gray-500">
                  {format(new Date(event.timestamp), "d MMM yyyy, HH:mm", { locale: fr })}
                </span>
              </div>
              
              {event.description && (
                <p className="mt-1 text-sm text-gray-600">{event.description}</p>
              )}
              
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                {event.location && (
                  <span className="inline-flex items-center text-xs text-gray-500">
                    <MapPin size={12} className="mr-1" />
                    {event.location}
                  </span>
                )}
                
                {event.agent && (
                  <span className="inline-flex items-center text-xs text-gray-500">
                    <UserCheck size={12} className="mr-1" />
                    {event.agent.name} ({event.agent.role})
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
} 