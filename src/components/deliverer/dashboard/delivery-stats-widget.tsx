"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Package, 
  Truck, 
  Clock, 
  CheckCircle, 
  TrendingUp,
  MapPin
} from "lucide-react";

interface DeliveryStats {
  totalDeliveries: number;
  completedDeliveries: number;
  pendingDeliveries: number;
  averageTime: number;
  successRate: number;
  todayDeliveries: number;
}

interface DeliveryStatsWidgetProps {
  stats?: DeliveryStats;
  isLoading?: boolean;
}

const defaultStats: DeliveryStats = {
  totalDeliveries: 247,
  completedDeliveries: 235,
  pendingDeliveries: 12,
  averageTime: 18.5,
  successRate: 95.1,
  todayDeliveries: 8
};

export default function DeliveryStatsWidget({ 
  stats = defaultStats, 
  isLoading = false 
}: DeliveryStatsWidgetProps) {
  
  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-5 bg-gray-200 rounded w-32"></div>
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex justify-between">
              <div className="h-4 bg-gray-200 rounded w-20"></div>
              <div className="h-4 bg-gray-200 rounded w-12"></div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Truck className="h-5 w-5" />
          Statistiques de livraison
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">Total</span>
            </div>
            <p className="text-2xl font-bold">{stats.totalDeliveries}</p>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Terminées</span>
            </div>
            <p className="text-2xl font-bold text-green-600">{stats.completedDeliveries}</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-500" />
              <span className="text-sm">Temps moyen</span>
            </div>
            <Badge variant="outline">{stats.averageTime} min</Badge>
          </div>
          
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-500" />
              <span className="text-sm">Taux de réussite</span>
            </div>
            <Badge variant="default">{stats.successRate}%</Badge>
          </div>
          
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-red-500" />
              <span className="text-sm">En attente</span>
            </div>
            <Badge variant="secondary">{stats.pendingDeliveries}</Badge>
          </div>
        </div>

        <div className="pt-4 border-t">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Aujourd'hui</span>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-lg font-bold">{stats.todayDeliveries}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Export nommé pour les imports
export { DeliveryStatsWidget };
