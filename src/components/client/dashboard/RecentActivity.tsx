"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Truck,
  Package,
  Clock,
  Box,
  CheckCircle2,
  AlertCircle,
  Bell,
  ArrowUpRight,
  Hammer,
  ShoppingBag,
  DollarSign,
} from "lucide-react";

interface Activity {
  id: string;
  type: 'delivery' | 'package' | 'storage' | 'service' | 'payment' | 'notification';
  title: string;
  description: string;
  date: string;
  status?: 'pending' | 'completed' | 'warning' | 'info';
  url: string;
}

function getActivityIcon(type: Activity['type'], status?: Activity['status']) {
  switch (type) {
    case 'delivery':
      return <Truck className="h-5 w-5" />;
    case 'package':
      return <Package className="h-5 w-5" />;
    case 'storage':
      return <Box className="h-5 w-5" />;
    case 'service':
      return <Hammer className="h-5 w-5" />;
    case 'payment':
      return <DollarSign className="h-5 w-5" />;
    case 'notification':
      return <Bell className="h-5 w-5" />;
    default:
      return <Clock className="h-5 w-5" />;
  }
}

function getStatusIcon(status?: Activity['status']) {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case 'warning':
      return <AlertCircle className="h-4 w-4 text-amber-500" />;
    case 'pending':
      return <Clock className="h-4 w-4 text-blue-500" />;
    case 'info':
    default:
      return null;
  }
}

function getActivityColor(type: Activity['type']) {
  switch (type) {
    case 'delivery':
      return 'bg-blue-100 text-blue-700';
    case 'package':
      return 'bg-emerald-100 text-emerald-700';
    case 'storage':
      return 'bg-amber-100 text-amber-700';
    case 'service':
      return 'bg-violet-100 text-violet-700';
    case 'payment':
      return 'bg-green-100 text-green-700';
    case 'notification':
      return 'bg-gray-100 text-gray-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

// Simulated API call
const fetchRecentActivity = (): Promise<Activity[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([
        {
          id: "act-1",
          type: "delivery",
          title: "Livraison en cours",
          description: "Votre colis sera livré aujourd'hui entre 14h et 16h",
          date: "2023-10-26T14:00:00",
          status: "pending",
          url: "/client/tracking/DEL-78945",
        },
        {
          id: "act-2",
          type: "package",
          title: "Colis livré",
          description: "Votre colis #PACK-567 a été livré avec succès",
          date: "2023-10-25T09:30:00",
          status: "completed",
          url: "/client/tracking/PACK-567",
        },
        {
          id: "act-3",
          type: "storage",
          title: "Renouvellement stockage",
          description: "Votre espace de stockage sera renouvelé dans 3 jours",
          date: "2023-10-24T11:45:00",
          status: "warning",
          url: "/client/storage",
        },
        {
          id: "act-4",
          type: "service",
          title: "Service de montage",
          description: "Réservation confirmée pour le 28/10/2023",
          date: "2023-10-23T16:20:00",
          status: "info",
          url: "/client/services/SRV-4523",
        },
        {
          id: "act-5",
          type: "payment",
          title: "Paiement reçu",
          description: "Paiement de 49,90€ pour l'abonnement Premium",
          date: "2023-10-20T10:15:00",
          status: "completed",
          url: "/client/billing/INV-89012",
        },
      ]);
    }, 1000);
  });
};

export function RecentActivity({ className = "" }: { className?: string }) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadActivity = async () => {
      try {
        const data = await fetchRecentActivity();
        setActivities(data);
      } catch (error) {
        console.error("Failed to load recent activity", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadActivity();
  }, []);

  const formatDate = (dateString: string) => {
    const date = parseISO(dateString);
    return format(date, "d MMM", { locale: fr });
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      <div className="p-4 border-b border-gray-200 flex justify-between items-center">
        <h2 className="text-lg font-medium text-gray-900">Activité récente</h2>
        <Link 
          href="/client/activity" 
          className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
        >
          Voir tout
          <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>
      
      <div className="divide-y divide-gray-200">
        {isLoading ? (
          Array(3).fill(0).map((_, index) => (
            <div key={index} className="p-4 flex animate-pulse">
              <div className="rounded-full bg-gray-200 h-10 w-10 mr-3 flex-shrink-0"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/4"></div>
              </div>
            </div>
          ))
        ) : (
          activities.map((activity) => (
            <Link 
              href={activity.url}
              key={activity.id} 
              className="p-4 flex items-start hover:bg-gray-50 transition-colors"
            >
              <div className={`rounded-full p-2 mr-3 flex-shrink-0 ${getActivityColor(activity.type)}`}>
                {getActivityIcon(activity.type)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <h3 className="text-sm font-medium text-gray-900 truncate pr-2">{activity.title}</h3>
                  <div className="flex items-center gap-1">
                    {getStatusIcon(activity.status)}
                    <span className="text-xs text-gray-500">{formatDate(activity.date)}</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">{activity.description}</p>
              </div>
            </Link>
          ))
        )}
      </div>
      
      {!isLoading && activities.length === 0 && (
        <div className="p-8 text-center">
          <p className="text-gray-500 text-sm">Aucune activité récente</p>
        </div>
      )}
    </div>
  );
} 