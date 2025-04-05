"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  Box, 
  Clock, 
  Calendar, 
  MapPin, 
  ChevronRight, 
  Thermometer, 
  Lock, 
  Package,
  ArrowRight
} from "lucide-react";
import type { StorageBox } from "@/hooks/use-storage-boxes";

interface StorageBoxCardProps {
  box: StorageBox;
  className?: string;
}

export function StorageBoxCard({ box, className = "" }: StorageBoxCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Formatting helpers
  const formatDate = (date: Date | null) => {
    if (!date) return "Indéterminée";
    return format(new Date(date), "dd MMMM yyyy", { locale: fr });
  };
  
  // Size display logic
  const sizeDisplay = {
    SMALL: "Petite (1m²)",
    MEDIUM: "Moyenne (3m²)",
    LARGE: "Grande (5m²)"
  };
  
  // Status display logic
  const statusColors = {
    AVAILABLE: "bg-green-100 text-green-800",
    IN_USE: "bg-blue-100 text-blue-800",
    RESERVED: "bg-amber-100 text-amber-800",
    MAINTENANCE: "bg-red-100 text-red-800"
  };
  
  const statusText = {
    AVAILABLE: "Disponible",
    IN_USE: "En utilisation",
    RESERVED: "Réservée",
    MAINTENANCE: "En maintenance"
  };
  
  // Time remaining calculation
  const getRemainingTime = () => {
    if (!box.endDate) return "Durée illimitée";
    
    const now = new Date();
    const end = new Date(box.endDate);
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 0) return "Expirée";
    if (diffDays === 1) return "1 jour restant";
    return `${diffDays} jours restants`;
  };
  
  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden ${className}`}>
      <div className="p-5">
        <div className="flex justify-between items-start">
          <div className="flex items-center">
            <div className={`p-2 mr-3 rounded-md ${
              box.size === "SMALL" ? "bg-blue-100" : 
              box.size === "MEDIUM" ? "bg-indigo-100" : 
              "bg-purple-100"
            }`}>
              <Box 
                size={
                  box.size === "SMALL" ? 18 : 
                  box.size === "MEDIUM" ? 22 : 
                  26
                } 
                className={`${
                  box.size === "SMALL" ? "text-blue-600" : 
                  box.size === "MEDIUM" ? "text-indigo-600" : 
                  "text-purple-600"
                }`} 
              />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">{box.name}</h3>
              <p className="text-sm text-gray-500">{sizeDisplay[box.size]}</p>
            </div>
          </div>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[box.status]}`}>
            {statusText[box.status]}
          </span>
        </div>
        
        <div className="mt-4 space-y-2">
          <div className="flex items-start">
            <MapPin size={16} className="mt-0.5 mr-2 text-gray-400 flex-shrink-0" />
            <div>
              <p className="text-sm text-gray-700 font-medium">{box.warehouseName}</p>
              <p className="text-xs text-gray-500">{box.warehouseAddress}</p>
            </div>
          </div>
          
          <div className="flex items-center">
            <Calendar size={16} className="mr-2 text-gray-400 flex-shrink-0" />
            <span className="text-sm text-gray-700">
              {formatDate(box.startDate)} {box.endDate && <ArrowRight size={12} className="inline mx-1" />} {box.endDate ? formatDate(box.endDate) : ""}
            </span>
          </div>
          
          {box.endDate && (
            <div className="flex items-center">
              <Clock size={16} className="mr-2 text-gray-400 flex-shrink-0" />
              <span className="text-sm text-gray-700">{getRemainingTime()}</span>
            </div>
          )}
        </div>
        
        {/* Features */}
        <div className="mt-4 flex flex-wrap gap-2">
          {box.isClimateControlled && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
              <Thermometer size={12} className="mr-1" />
              Climatisé
            </span>
          )}
          {box.isSecure && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700">
              <Lock size={12} className="mr-1" />
              Sécurisé
            </span>
          )}
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700">
            <Package size={12} className="mr-1" />
            {box.itemCount} objets
          </span>
        </div>
        
        {/* Contents (expandable) */}
        {box.contents && (
          <div className="mt-4">
            <div className="text-sm text-gray-700">
              <span className="font-medium">Contenu:</span>{" "}
              {isExpanded 
                ? box.contents 
                : box.contents.length > 80 
                  ? box.contents.substring(0, 80) + "..." 
                  : box.contents
              }
              {box.contents.length > 80 && (
                <button 
                  onClick={() => setIsExpanded(!isExpanded)} 
                  className="ml-1 text-blue-600 hover:underline focus:outline-none text-xs"
                >
                  {isExpanded ? "Voir moins" : "Voir plus"}
                </button>
              )}
            </div>
          </div>
        )}
        
        {/* Price and action */}
        <div className="mt-4 flex justify-between items-center">
          <div>
            <p className="text-lg font-semibold text-gray-900">{box.monthlyPrice.toFixed(2)} €<span className="text-xs text-gray-500">/mois</span></p>
            {box.lastAccessed && (
              <p className="text-xs text-gray-500">
                Dernier accès: {format(new Date(box.lastAccessed), "dd/MM/yyyy")}
              </p>
            )}
          </div>
          
          <Link
            href={`/client/storage/${box.id}`}
            className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Détails
            <ChevronRight size={16} className="ml-1" />
          </Link>
        </div>
      </div>
    </div>
  );
} 