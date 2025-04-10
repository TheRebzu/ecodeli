"use client";

import { useState, useEffect } from "react";

interface DashboardStats {
  activeDeliveries: number;
  totalPackages: number;
  storageBoxes: number;
  storageCapacity: number;
  subscription: {
    plan: string;
    expiresAt: string | null;
    remainingDays: number;
  } | null;
  recentActivity: Array<{
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
}

interface UseDashboardStatsResult {
  stats: DashboardStats | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useDashboardStats(): UseDashboardStatsResult {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardStats = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch("/api/client/dashboard/stats");
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch dashboard stats");
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || "Failed to fetch dashboard stats");
      }
      
      setStats(data.data);
    } catch (error) {
      console.error("Error in useDashboardStats:", error);
      setError(error instanceof Error ? error.message : "An unknown error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  return {
    stats,
    isLoading,
    error,
    refresh: fetchDashboardStats,
  };
} 