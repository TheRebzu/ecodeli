"use client";

import Link from "next/link";
import { Truck, Package, Box, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardsProps {
  activeDeliveries: number;
  totalPackages: number;
  storageBoxes: number;
  storageCapacity: number;
  isLoading?: boolean;
  className?: string;
}

export function StatsCards({
  activeDeliveries,
  totalPackages,
  storageBoxes,
  storageCapacity,
  isLoading = false,
  className,
}: StatsCardsProps) {
  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-3 gap-6", className)}>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Livraisons en cours</p>
            {isLoading ? (
              <div className="h-8 w-16 bg-gray-200 animate-pulse rounded mt-1" />
            ) : (
              <p className="text-2xl font-bold mt-1">{activeDeliveries}</p>
            )}
          </div>
          <div className="p-2 bg-blue-100 rounded-full">
            <Truck className="h-5 w-5 text-blue-600" />
          </div>
        </div>
        <div className="mt-4">
          <Link 
            href="/client/deliveries" 
            className="text-sm text-blue-600 hover:text-blue-800 inline-flex items-center"
          >
            Voir les détails
            <ChevronRight className="h-4 w-4 ml-1" />
          </Link>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Colis récents</p>
            {isLoading ? (
              <div className="h-8 w-16 bg-gray-200 animate-pulse rounded mt-1" />
            ) : (
              <p className="text-2xl font-bold mt-1">{totalPackages}</p>
            )}
          </div>
          <div className="p-2 bg-emerald-100 rounded-full">
            <Package className="h-5 w-5 text-emerald-600" />
          </div>
        </div>
        <div className="mt-4">
          <Link 
            href="/client/packages" 
            className="text-sm text-blue-600 hover:text-blue-800 inline-flex items-center"
          >
            Voir l'historique
            <ChevronRight className="h-4 w-4 ml-1" />
          </Link>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Espace stockage</p>
            {isLoading ? (
              <div className="h-8 w-16 bg-gray-200 animate-pulse rounded mt-1" />
            ) : (
              <p className="text-2xl font-bold mt-1">{storageBoxes}/{storageCapacity}</p>
            )}
          </div>
          <div className="p-2 bg-amber-100 rounded-full">
            <Box className="h-5 w-5 text-amber-600" />
          </div>
        </div>
        <div className="mt-4">
          <Link 
            href="/client/storage" 
            className="text-sm text-blue-600 hover:text-blue-800 inline-flex items-center"
          >
            Gérer mes espaces
            <ChevronRight className="h-4 w-4 ml-1" />
          </Link>
        </div>
      </div>
    </div>
  );
} 