"use client";

import { useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Package, MapPin, Clock, CreditCard, ChevronRight, Eye, User, AlertCircle } from "lucide-react";

interface AnnouncementCardProps {
  announcement: {
    id: string;
    title: string;
    description: string;
    pickupAddress: string;
    deliveryAddress: string;
    packageSize: string;
    estimatedWeight?: string;
    status: string;
    price: number;
    urgency: string;
    createdAt: Date;
    offersCount?: number;
    deadline: Date;
    views: number;
  };
  showDetailLink?: boolean;
  className?: string;
}

export function AnnouncementCard({ announcement, showDetailLink = true, className = "" }: AnnouncementCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const statusColors = {
    OPEN: "bg-green-100 text-green-800",
    ASSIGNED: "bg-blue-100 text-blue-800",
    COMPLETED: "bg-gray-100 text-gray-800",
    CANCELLED: "bg-red-100 text-red-800",
  };
  
  const statusTexts = {
    OPEN: "Ouverte",
    ASSIGNED: "Attribuée",
    COMPLETED: "Terminée",
    CANCELLED: "Annulée",
  };
  
  const urgencyColors = {
    LOW: "bg-green-100 text-green-800",
    MEDIUM: "bg-yellow-100 text-yellow-800",
    HIGH: "bg-orange-100 text-orange-800",
    URGENT: "bg-red-100 text-red-800",
  };
  
  const urgencyTexts = {
    LOW: "Basse",
    MEDIUM: "Moyenne",
    HIGH: "Élevée",
    URGENT: "Urgente",
  };
  
  const packageSizeIcons = {
    SMALL: 16,
    MEDIUM: 20,
    LARGE: 24,
    EXTRA_LARGE: 28,
  };
  
  const formattedDate = formatDistanceToNow(new Date(announcement.createdAt), {
    addSuffix: true,
    locale: fr,
  });
  
  const daysUntilDeadline = Math.ceil(
    (new Date(announcement.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );
  
  return (
    <div className={`bg-white rounded-lg shadow border border-gray-200 overflow-hidden ${className}`}>
      <div className="p-4">
        <div className="flex justify-between items-start">
          <h3 className="text-lg font-medium text-gray-900 mr-2">{announcement.title}</h3>
          <div className="flex space-x-2">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[announcement.status as keyof typeof statusColors] || "bg-gray-100 text-gray-800"}`}>
              {statusTexts[announcement.status as keyof typeof statusTexts] || announcement.status}
            </span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${urgencyColors[announcement.urgency as keyof typeof urgencyColors] || "bg-gray-100 text-gray-800"}`}>
              {urgencyTexts[announcement.urgency as keyof typeof urgencyTexts] || announcement.urgency}
            </span>
          </div>
        </div>
        
        <div className="mt-2 text-sm text-gray-600">
          {isExpanded ? announcement.description : `${announcement.description.substring(0, 100)}${announcement.description.length > 100 ? "..." : ""}`}
          {announcement.description.length > 100 && (
            <button 
              onClick={() => setIsExpanded(!isExpanded)} 
              className="ml-1 text-blue-600 hover:underline focus:outline-none"
            >
              {isExpanded ? "Voir moins" : "Voir plus"}
            </button>
          )}
        </div>
        
        <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2">
          <div className="flex items-center text-sm text-gray-500">
            <MapPin size={16} className="mr-1 text-gray-400" />
            <span className="truncate">De: {announcement.pickupAddress}</span>
          </div>
          <div className="flex items-center text-sm text-gray-500">
            <MapPin size={16} className="mr-1 text-gray-400" />
            <span className="truncate">À: {announcement.deliveryAddress}</span>
          </div>
          <div className="flex items-center text-sm text-gray-500">
            <Package size={packageSizeIcons[announcement.packageSize as keyof typeof packageSizeIcons] || 16} className="mr-1 text-gray-400" />
            <span>
              Taille: {announcement.packageSize.charAt(0) + announcement.packageSize.slice(1).toLowerCase().replace('_', ' ')}
              {announcement.estimatedWeight && ` (${announcement.estimatedWeight})`}
            </span>
          </div>
          <div className="flex items-center text-sm text-gray-500">
            <CreditCard size={16} className="mr-1 text-gray-400" />
            <span>{announcement.price.toFixed(2)} €</span>
          </div>
        </div>
        
        <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
          <div className="flex space-x-4">
            <span className="flex items-center">
              <Clock size={14} className="mr-1" />
              {formattedDate}
            </span>
            <span className="flex items-center">
              <Eye size={14} className="mr-1" />
              {announcement.views} vues
            </span>
            {announcement.offersCount !== undefined && (
              <span className="flex items-center">
                <User size={14} className="mr-1" />
                {announcement.offersCount} offres
              </span>
            )}
          </div>
          <div>
            <span className="flex items-center">
              <AlertCircle size={14} className="mr-1" />
              {daysUntilDeadline > 0
                ? `Expire dans ${daysUntilDeadline} jour${daysUntilDeadline > 1 ? "s" : ""}`
                : "Expirée"}
            </span>
          </div>
        </div>
        
        {showDetailLink && (
          <div className="mt-4">
            <Link
              href={`/client/announcements/${announcement.id}`}
              className="w-full flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Voir les détails
              <ChevronRight size={16} className="ml-1" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
} 