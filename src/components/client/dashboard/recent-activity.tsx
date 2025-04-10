"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CheckCircle2, Clock4, Truck, AlertTriangle, Package } from "lucide-react";

interface RecentActivityProps {
  activities?: Array<{
    id: string;
    title: string;
    status: string;
    updatedAt: string;
    deliveryPerson?: {
      user: {
        name: string;
        image: string | null;
      };
    } | null;
  }>;
  isLoading?: boolean;
  className?: string;
}

export function RecentActivity({ activities = [], isLoading = false, className }: RecentActivityProps) {
  // Statut mapping pour les badges et icônes
  const statusConfig: Record<string, { label: string; variant: string; icon: React.ReactNode }> = {
    PENDING: { 
      label: "En attente", 
      variant: "outline", 
      icon: <Clock4 className="h-4 w-4 text-gray-500" /> 
    },
    PUBLISHED: { 
      label: "Publiée", 
      variant: "outline", 
      icon: <Package className="h-4 w-4 text-blue-500" /> 
    },
    ASSIGNED: { 
      label: "Assignée", 
      variant: "default", 
      icon: <Package className="h-4 w-4 text-amber-500" /> 
    },
    IN_TRANSIT: { 
      label: "En transit", 
      variant: "default", 
      icon: <Truck className="h-4 w-4 text-blue-500" /> 
    },
    DELIVERED: { 
      label: "Livrée", 
      variant: "success", 
      icon: <CheckCircle2 className="h-4 w-4 text-green-500" /> 
    },
    COMPLETED: { 
      label: "Terminée", 
      variant: "success", 
      icon: <CheckCircle2 className="h-4 w-4 text-green-500" /> 
    },
    CANCELLED: { 
      label: "Annulée", 
      variant: "destructive", 
      icon: <AlertTriangle className="h-4 w-4 text-red-500" /> 
    },
    EXPIRED: { 
      label: "Expirée", 
      variant: "destructive", 
      icon: <AlertTriangle className="h-4 w-4 text-orange-500" /> 
    },
  };

  return (
    <div className={cn("bg-white rounded-lg shadow-sm border border-gray-200 p-6", className)}>
      <h3 className="font-medium text-lg">Activité récente</h3>
      
      <div className="mt-4 space-y-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-gray-200 animate-pulse" />
              <div className="space-y-2 flex-1">
                <div className="h-4 w-2/3 bg-gray-200 animate-pulse rounded" />
                <div className="h-3 w-1/3 bg-gray-200 animate-pulse rounded" />
              </div>
            </div>
          ))
        ) : activities.length > 0 ? (
          activities.map((activity) => (
            <div key={activity.id} className="flex items-start gap-4">
              <div className="mt-1">
                {statusConfig[activity.status]?.icon || <Package className="h-4 w-4" />}
              </div>
              
              <div className="flex-1">
                <p className="text-sm font-medium">{activity.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={statusConfig[activity.status]?.variant as any || "outline"}>
                    {statusConfig[activity.status]?.label || activity.status}
                  </Badge>
                  <p className="text-xs text-gray-500">
                    {format(new Date(activity.updatedAt), "d MMM à HH:mm", { locale: fr })}
                  </p>
                </div>
              </div>
              
              {activity.deliveryPerson && (
                <Avatar className="h-8 w-8">
                  <AvatarImage 
                    src={activity.deliveryPerson.user.image || undefined} 
                    alt={activity.deliveryPerson.user.name} 
                  />
                  <AvatarFallback>
                    {activity.deliveryPerson.user.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          ))
        ) : (
          <p className="text-sm text-gray-500 text-center py-4">
            Aucune activité récente
          </p>
        )}
      </div>
      
      {activities.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <a 
            href="/client/history" 
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Voir toute l'activité
          </a>
        </div>
      )}
    </div>
  );
} 