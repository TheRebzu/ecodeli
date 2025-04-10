"use client";

import { useEffect, useState } from "react";
import { 
  Package, 
  Calendar, 
  Truck, 
  ShoppingBag, 
  TrendingUp, 
  Clock, 
  ShieldCheck, 
  Star,
  Box 
} from "lucide-react";

interface Stats {
  activeDeliveries: number;
  pendingDeliveries: number;
  completedDeliveries: number;
  activeOrders: number;
  savedFavorites: number;
  totalSaved: number;
  averageDeliveryTime: string;
  loyaltyPoints: number;
  boxesInStorage: number;
  activeSubscription: string;
  isLoading: boolean;
}

export function OverviewStats() {
  const [stats, setStats] = useState<Stats>({
    activeDeliveries: 0,
    pendingDeliveries: 0,
    completedDeliveries: 0,
    activeOrders: 0,
    savedFavorites: 0,
    totalSaved: 0,
    averageDeliveryTime: "",
    loyaltyPoints: 0,
    boxesInStorage: 0,
    activeSubscription: "",
    isLoading: true
  });

  useEffect(() => {
    // Fetch stats from your API
    const fetchStats = async () => {
      try {
        // For demo purposes, let's simulate an API call with a timeout
        // In a real implementation, you would fetch data from your API
        setTimeout(() => {
          setStats({
            activeDeliveries: 3,
            pendingDeliveries: 2,
            completedDeliveries: 42,
            activeOrders: 1,
            savedFavorites: 12,
            totalSaved: 147.50,
            averageDeliveryTime: "28 min",
            loyaltyPoints: 850,
            boxesInStorage: 2,
            activeSubscription: "PREMIUM",
            isLoading: false
          });
        }, 1000);
      } catch (error) {
        console.error("Error fetching stats:", error);
        setStats(prev => ({ ...prev, isLoading: false }));
      }
    };

    fetchStats();
  }, []);

  // Subscription plan mapping
  const subscriptionLabels = {
    FREE: "Gratuit",
    STARTER: "Débutant",
    PREMIUM: "Premium"
  };

  // Subscription colors
  const subscriptionColors = {
    FREE: "bg-gray-100 text-gray-800",
    STARTER: "bg-blue-100 text-blue-800",
    PREMIUM: "bg-purple-100 text-purple-800"
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Active Deliveries */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center">
          <div className="flex-shrink-0 p-2 bg-blue-100 rounded-md">
            <Truck className="h-6 w-6 text-blue-600" />
          </div>
          <div className="ml-3 w-full">
            <div className="flex justify-between items-baseline">
              <h3 className="text-sm font-medium text-gray-500">Livraisons en cours</h3>
              {stats.isLoading ? (
                <div className="h-6 w-8 bg-gray-200 animate-pulse rounded"></div>
              ) : (
                <p className="text-xl font-semibold text-gray-900">{stats.activeDeliveries}</p>
              )}
            </div>
            {stats.isLoading ? (
              <div className="h-4 w-20 bg-gray-200 animate-pulse rounded mt-1"></div>
            ) : (
              <p className="text-xs text-gray-500 mt-1">
                {stats.pendingDeliveries > 0 ? `+ ${stats.pendingDeliveries} en attente` : "Aucune en attente"}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Completed Deliveries */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center">
          <div className="flex-shrink-0 p-2 bg-green-100 rounded-md">
            <Package className="h-6 w-6 text-green-600" />
          </div>
          <div className="ml-3 w-full">
            <div className="flex justify-between items-baseline">
              <h3 className="text-sm font-medium text-gray-500">Livraisons complétées</h3>
              {stats.isLoading ? (
                <div className="h-6 w-10 bg-gray-200 animate-pulse rounded"></div>
              ) : (
                <p className="text-xl font-semibold text-gray-900">{stats.completedDeliveries}</p>
              )}
            </div>
            {stats.isLoading ? (
              <div className="h-4 w-20 bg-gray-200 animate-pulse rounded mt-1"></div>
            ) : (
              <p className="text-xs text-gray-500 mt-1">Depuis votre inscription</p>
            )}
          </div>
        </div>
      </div>

      {/* Active Orders */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center">
          <div className="flex-shrink-0 p-2 bg-amber-100 rounded-md">
            <ShoppingBag className="h-6 w-6 text-amber-600" />
          </div>
          <div className="ml-3 w-full">
            <div className="flex justify-between items-baseline">
              <h3 className="text-sm font-medium text-gray-500">Commandes en cours</h3>
              {stats.isLoading ? (
                <div className="h-6 w-8 bg-gray-200 animate-pulse rounded"></div>
              ) : (
                <p className="text-xl font-semibold text-gray-900">{stats.activeOrders}</p>
              )}
            </div>
            {stats.isLoading ? (
              <div className="h-4 w-20 bg-gray-200 animate-pulse rounded mt-1"></div>
            ) : (
              <p className="text-xs text-gray-500 mt-1">
                {stats.savedFavorites > 0 ? `${stats.savedFavorites} commerces favoris` : "Aucun commerce favori"}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Total Saved */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center">
          <div className="flex-shrink-0 p-2 bg-emerald-100 rounded-md">
            <TrendingUp className="h-6 w-6 text-emerald-600" />
          </div>
          <div className="ml-3 w-full">
            <div className="flex justify-between items-baseline">
              <h3 className="text-sm font-medium text-gray-500">Total économisé</h3>
              {stats.isLoading ? (
                <div className="h-6 w-16 bg-gray-200 animate-pulse rounded"></div>
              ) : (
                <p className="text-xl font-semibold text-gray-900">{stats.totalSaved.toFixed(2)} €</p>
              )}
            </div>
            {stats.isLoading ? (
              <div className="h-4 w-20 bg-gray-200 animate-pulse rounded mt-1"></div>
            ) : (
              <p className="text-xs text-gray-500 mt-1">Grâce à votre abonnement</p>
            )}
          </div>
        </div>
      </div>

      {/* Average Delivery Time */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center">
          <div className="flex-shrink-0 p-2 bg-indigo-100 rounded-md">
            <Clock className="h-6 w-6 text-indigo-600" />
          </div>
          <div className="ml-3 w-full">
            <div className="flex justify-between items-baseline">
              <h3 className="text-sm font-medium text-gray-500">Délai moyen</h3>
              {stats.isLoading ? (
                <div className="h-6 w-16 bg-gray-200 animate-pulse rounded"></div>
              ) : (
                <p className="text-xl font-semibold text-gray-900">{stats.averageDeliveryTime}</p>
              )}
            </div>
            {stats.isLoading ? (
              <div className="h-4 w-20 bg-gray-200 animate-pulse rounded mt-1"></div>
            ) : (
              <p className="text-xs text-gray-500 mt-1">Pour vos livraisons</p>
            )}
          </div>
        </div>
      </div>

      {/* Loyalty Points */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center">
          <div className="flex-shrink-0 p-2 bg-yellow-100 rounded-md">
            <Star className="h-6 w-6 text-yellow-600" />
          </div>
          <div className="ml-3 w-full">
            <div className="flex justify-between items-baseline">
              <h3 className="text-sm font-medium text-gray-500">Points de fidélité</h3>
              {stats.isLoading ? (
                <div className="h-6 w-16 bg-gray-200 animate-pulse rounded"></div>
              ) : (
                <p className="text-xl font-semibold text-gray-900">{stats.loyaltyPoints}</p>
              )}
            </div>
            {stats.isLoading ? (
              <div className="h-4 w-24 bg-gray-200 animate-pulse rounded mt-1"></div>
            ) : (
              <p className="text-xs text-gray-500 mt-1">150 points pour une remise</p>
            )}
          </div>
        </div>
      </div>

      {/* Boxes in Storage */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center">
          <div className="flex-shrink-0 p-2 bg-orange-100 rounded-md">
            <Box className="h-6 w-6 text-orange-600" />
          </div>
          <div className="ml-3 w-full">
            <div className="flex justify-between items-baseline">
              <h3 className="text-sm font-medium text-gray-500">Box en stockage</h3>
              {stats.isLoading ? (
                <div className="h-6 w-8 bg-gray-200 animate-pulse rounded"></div>
              ) : (
                <p className="text-xl font-semibold text-gray-900">{stats.boxesInStorage}</p>
              )}
            </div>
            {stats.isLoading ? (
              <div className="h-4 w-16 bg-gray-200 animate-pulse rounded mt-1"></div>
            ) : (
              <p className="text-xs text-gray-500 mt-1">Capacité totale: 5</p>
            )}
          </div>
        </div>
      </div>

      {/* Active Subscription */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center">
          <div className="flex-shrink-0 p-2 bg-purple-100 rounded-md">
            <ShieldCheck className="h-6 w-6 text-purple-600" />
          </div>
          <div className="ml-3 w-full">
            <div className="flex justify-between items-baseline">
              <h3 className="text-sm font-medium text-gray-500">Abonnement actif</h3>
              {stats.isLoading ? (
                <div className="h-6 w-16 bg-gray-200 animate-pulse rounded"></div>
              ) : (
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  subscriptionColors[stats.activeSubscription as keyof typeof subscriptionColors] || "bg-gray-100 text-gray-800"
                }`}>
                  {subscriptionLabels[stats.activeSubscription as keyof typeof subscriptionLabels] || stats.activeSubscription}
                </span>
              )}
            </div>
            {stats.isLoading ? (
              <div className="h-4 w-20 bg-gray-200 animate-pulse rounded mt-1"></div>
            ) : (
              <p className="text-xs text-gray-500 mt-1">
                {stats.activeSubscription === "FREE" ? "Mettez à niveau" : "Renouvellement: 15/06/2023"}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 