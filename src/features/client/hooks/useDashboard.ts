"use client";

import { useState, useEffect, useCallback } from "react";
import { useApi } from "@/hooks/use-api";
import type { ClientDashboardResponse } from "../schemas/dashboard.schema";

/**
 * Hook pour gérer le dashboard client EcoDeli
 * Conforme aux exigences Mission 1 - Partie dédiée aux clients
 */
export function useClientDashboard() {
  const { data, loading, error, execute } = useApi<ClientDashboardResponse>();
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  /**
   * Charger les données du dashboard
   */
  const fetchDashboard = useCallback(async () => {
    await execute("/api/client/dashboard");
    setLastRefresh(new Date());
  }, [execute]);

  /**
   * Rafraîchir les données (force refresh)
   */
  const refreshDashboard = useCallback(async () => {
    await execute("/api/client/dashboard/refresh", {
      method: "POST",
    });
    setLastRefresh(new Date());
  }, [execute]);

  /**
   * Marquer le tutoriel comme terminé
   */
  const completeTutorial = useCallback(
    async (timeSpent: number = 0, feedback?: string) => {
      try {
        const response = await fetch("/api/client/dashboard/tutorial", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            completed: true,
            timeSpent,
            feedback,
          }),
        });

        if (!response.ok) {
          throw new Error("Erreur lors de la finalisation du tutoriel");
        }

        // Rafraîchir les données après completion
        await fetchDashboard();

        return true;
      } catch (error) {
        console.error("❌ [useDashboard] Erreur completion tutoriel:", error);
        throw error;
      }
    },
    [fetchDashboard],
  );

  /**
   * Chargement initial
   */
  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  /**
   * Auto-refresh toutes les 5 minutes pour les données temps réel
   */
  useEffect(() => {
    const interval = setInterval(
      () => {
        // Seulement refresh si pas d'erreur et que l'onglet est actif
        if (!error && !document.hidden) {
          fetchDashboard();
        }
      },
      5 * 60 * 1000,
    ); // 5 minutes

    return () => clearInterval(interval);
  }, [error, fetchDashboard]);

  // Données extraites pour faciliter l'utilisation
  const dashboard = data;
  const client = data?.client;
  const stats = data?.stats;
  const tutorial = data?.tutorial;
  const notifications = data?.notifications || [];
  const quickActions = data?.quickActions || [];
  const recentAnnouncements = data?.recentAnnouncements || [];
  const recentBookings = data?.recentBookings || [];
  const activeStorageBoxes = data?.activeStorageBoxes || [];

  // États dérivés
  const isLoading = loading;
  const hasError = !!error;
  const tutorialRequired = tutorial && !tutorial.completed;
  const tutorialBlocking = tutorial?.isBlocking;
  const profileComplete = client?.profileComplete;
  const hasActiveDeliveries = (stats?.activeDeliveries || 0) > 0;
  const hasUnreadNotifications = notifications.some((n) => !n.read);
  const subscriptionPlan = client?.subscriptionPlan || "FREE";

  // Statistiques formatées
  const formattedStats = stats
    ? {
        totalAnnouncements: stats.totalAnnouncements,
        activeDeliveries: stats.activeDeliveries,
        completedDeliveries: stats.completedDeliveries,
        totalSpent: `${stats.totalSpent.toFixed(2)}€`,
        walletBalance: `${stats.walletBalance.toFixed(2)}€`,
        averageRating: stats.averageRating?.toFixed(1) || "N/A",
        subscriptionSavings: `${stats.subscriptionSavings.toFixed(2)}€`,
        storageBoxesActive: stats.storageBoxesActive,
        bookingsThisMonth: stats.bookingsThisMonth,
      }
    : null;

  return {
    // Données principales
    dashboard,
    client,
    stats,
    formattedStats,
    tutorial,
    notifications,
    quickActions,
    recentAnnouncements,
    recentBookings,
    activeStorageBoxes,

    // États
    isLoading,
    hasError,
    error,
    lastRefresh,

    // États dérivés
    tutorialRequired,
    tutorialBlocking,
    profileComplete,
    hasActiveDeliveries,
    hasUnreadNotifications,
    subscriptionPlan,

    // Actions
    fetchDashboard,
    refreshDashboard,
    completeTutorial,
    refetch: fetchDashboard,
  };
}

/**
 * Hook simplifié pour les stats uniquement
 */
export function useClientStats() {
  const { stats, formattedStats, isLoading, error, fetchDashboard } =
    useClientDashboard();

  return {
    stats,
    formattedStats,
    isLoading,
    error,
    refresh: fetchDashboard,
  };
}

/**
 * Hook pour le statut du tutoriel
 */
export function useTutorialStatus() {
  const {
    tutorial,
    tutorialRequired,
    tutorialBlocking,
    completeTutorial,
    isLoading,
  } = useClientDashboard();

  return {
    tutorial,
    required: tutorialRequired,
    blocking: tutorialBlocking,
    currentStep: tutorial?.currentStep || 1,
    progress: tutorial?.stepsCompleted,
    complete: completeTutorial,
    isLoading,
  };
}

/**
 * Hook pour les notifications dashboard
 */
export function useDashboardNotifications() {
  const { notifications, hasUnreadNotifications, refreshDashboard } =
    useClientDashboard();

  const unreadCount = notifications.filter((n) => !n.read).length;
  const deliveryNotifications = notifications.filter(
    (n) => n.category === "delivery",
  );
  const paymentNotifications = notifications.filter(
    (n) => n.category === "payment",
  );
  const systemNotifications = notifications.filter(
    (n) => n.category === "system",
  );

  return {
    notifications,
    unreadCount,
    hasUnread: hasUnreadNotifications,
    byCategory: {
      delivery: deliveryNotifications,
      payment: paymentNotifications,
      system: systemNotifications,
    },
    refresh: refreshDashboard,
  };
}
