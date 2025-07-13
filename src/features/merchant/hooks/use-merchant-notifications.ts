import { useState, useEffect, useCallback } from "react";
import {
  MerchantNotification,
  NotificationStats,
  NotificationPreferences,
  BusinessAlert,
  NotificationCategory,
  NotificationPriority,
} from "../services/notifications.service";

interface UseNotificationsState {
  notifications: MerchantNotification[];
  isLoading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
    total: number;
  };
  filters: {
    category?: NotificationCategory;
    priority?: NotificationPriority;
    unreadOnly?: boolean;
    actionRequired?: boolean;
  };
  unreadCount: number;
}

interface UseNotificationsActions {
  loadNotifications: () => Promise<void>;
  setFilters: (filters: Partial<UseNotificationsState["filters"]>) => void;
  setPage: (page: number) => void;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: (category?: NotificationCategory) => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  refreshStats: () => Promise<void>;
}

export interface UseNotificationsReturn
  extends UseNotificationsState,
    UseNotificationsActions {}

/**
 * Hook principal pour la gestion des notifications
 */
export function useMerchantNotifications(
  merchantId: string,
): UseNotificationsReturn {
  const [state, setState] = useState<UseNotificationsState>({
    notifications: [],
    isLoading: false,
    error: null,
    pagination: {
      page: 1,
      limit: 20,
      totalPages: 0,
      total: 0,
    },
    filters: {},
    unreadCount: 0,
  });

  /**
   * Charge les notifications avec les filtres actuels
   */
  const loadNotifications = useCallback(async () => {
    if (!merchantId) return;

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch("/api/merchant/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          merchantId,
          filters: {
            ...state.filters,
            page: state.pagination.page,
            limit: state.pagination.limit,
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Erreur lors du chargement des notifications");
      }

      const data = await response.json();

      setState((prev) => ({
        ...prev,
        notifications: data.notifications,
        unreadCount: data.unread,
        pagination: {
          ...prev.pagination,
          totalPages: data.pagination.totalPages,
          total: data.total,
        },
        isLoading: false,
      }));
    } catch (error) {
      console.error("Erreur chargement notifications:", error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Erreur inconnue",
      }));
    }
  }, [
    merchantId,
    state.filters,
    state.pagination.page,
    state.pagination.limit,
  ]);

  /**
   * Met à jour les filtres
   */
  const setFilters = useCallback(
    (newFilters: Partial<UseNotificationsState["filters"]>) => {
      setState((prev) => ({
        ...prev,
        filters: { ...prev.filters, ...newFilters },
        pagination: { ...prev.pagination, page: 1 },
      }));
    },
    [],
  );

  /**
   * Change de page
   */
  const setPage = useCallback((page: number) => {
    setState((prev) => ({
      ...prev,
      pagination: { ...prev.pagination, page },
    }));
  }, []);

  /**
   * Marque une notification comme lue
   */
  const markAsRead = useCallback(
    async (notificationId: string): Promise<void> => {
      try {
        const response = await fetch(
          `/api/merchant/notifications/${notificationId}/read`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              merchantId,
            }),
          },
        );

        if (!response.ok) {
          throw new Error("Erreur lors du marquage comme lu");
        }

        // Mettre à jour localement
        setState((prev) => ({
          ...prev,
          notifications: prev.notifications.map((n) =>
            n.id === notificationId
              ? { ...n, read: true, readAt: new Date() }
              : n,
          ),
          unreadCount: Math.max(0, prev.unreadCount - 1),
        }));
      } catch (error) {
        console.error("Erreur marquage notification lue:", error);
        throw error;
      }
    },
    [merchantId],
  );

  /**
   * Marque toutes les notifications comme lues
   */
  const markAllAsRead = useCallback(
    async (category?: NotificationCategory): Promise<void> => {
      try {
        const response = await fetch(
          "/api/merchant/notifications/mark-all-read",
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              merchantId,
              category,
            }),
          },
        );

        if (!response.ok) {
          throw new Error("Erreur lors du marquage global");
        }

        // Recharger les notifications
        await loadNotifications();
      } catch (error) {
        console.error("Erreur marquage toutes notifications lues:", error);
        throw error;
      }
    },
    [merchantId, loadNotifications],
  );

  /**
   * Supprime une notification
   */
  const deleteNotification = useCallback(
    async (notificationId: string): Promise<void> => {
      try {
        const response = await fetch(
          `/api/merchant/notifications/${notificationId}`,
          {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              merchantId,
            }),
          },
        );

        if (!response.ok) {
          throw new Error("Erreur lors de la suppression");
        }

        // Retirer la notification de la liste
        setState((prev) => ({
          ...prev,
          notifications: prev.notifications.filter(
            (n) => n.id !== notificationId,
          ),
          unreadCount: prev.notifications.find(
            (n) => n.id === notificationId && !n.read,
          )
            ? prev.unreadCount - 1
            : prev.unreadCount,
        }));
      } catch (error) {
        console.error("Erreur suppression notification:", error);
        throw error;
      }
    },
    [merchantId],
  );

  /**
   * Actualise les statistiques
   */
  const refreshStats = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch(
        `/api/merchant/notifications/stats?merchantId=${merchantId}`,
      );

      if (response.ok) {
        const stats = await response.json();
        setState((prev) => ({
          ...prev,
          unreadCount: stats.unread,
        }));
      }
    } catch (error) {
      console.error("Erreur actualisation stats:", error);
    }
  }, [merchantId]);

  // Charger les notifications au montage et quand les filtres changent
  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  return {
    ...state,
    loadNotifications,
    setFilters,
    setPage,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refreshStats,
  };
}

/**
 * Hook pour les statistiques des notifications
 */
export function useNotificationStats(merchantId: string) {
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    if (!merchantId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/merchant/notifications/stats?merchantId=${merchantId}`,
      );

      if (!response.ok) {
        throw new Error("Erreur lors du chargement des statistiques");
      }

      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error("Erreur chargement stats notifications:", error);
      setError(error instanceof Error ? error.message : "Erreur inconnue");
    } finally {
      setIsLoading(false);
    }
  }, [merchantId]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    isLoading,
    error,
    refresh: fetchStats,
  };
}

/**
 * Hook pour les préférences de notification
 */
export function useNotificationPreferences(merchantId: string) {
  const [preferences, setPreferences] =
    useState<NotificationPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPreferences = useCallback(async () => {
    if (!merchantId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/merchant/notifications/preferences?merchantId=${merchantId}`,
      );

      if (!response.ok) {
        throw new Error("Erreur lors du chargement des préférences");
      }

      const data = await response.json();
      setPreferences(data);
    } catch (error) {
      console.error("Erreur chargement préférences notifications:", error);
      setError(error instanceof Error ? error.message : "Erreur inconnue");
    } finally {
      setIsLoading(false);
    }
  }, [merchantId]);

  const updatePreferences = useCallback(
    async (updates: Partial<NotificationPreferences>): Promise<void> => {
      try {
        const response = await fetch(
          "/api/merchant/notifications/preferences",
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              merchantId,
              preferences: updates,
            }),
          },
        );

        if (!response.ok) {
          throw new Error("Erreur lors de la mise à jour des préférences");
        }

        const updatedPreferences = await response.json();
        setPreferences(updatedPreferences);
      } catch (error) {
        console.error("Erreur mise à jour préférences:", error);
        throw error;
      }
    },
    [merchantId],
  );

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  return {
    preferences,
    isLoading,
    error,
    updatePreferences,
    refresh: fetchPreferences,
  };
}

/**
 * Hook pour les alertes métier
 */
export function useBusinessAlerts(merchantId: string) {
  const [alerts, setAlerts] = useState<BusinessAlert[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [filters, setFilters] = useState<{
    type?: BusinessAlert["type"];
    severity?: BusinessAlert["severity"];
    resolved?: boolean;
  }>({});

  const fetchAlerts = useCallback(async () => {
    if (!merchantId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/merchant/notifications/alerts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          merchantId,
          filters: {
            ...filters,
            page: pagination.page,
            limit: pagination.limit,
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Erreur lors du chargement des alertes");
      }

      const data = await response.json();
      setAlerts(data.alerts);
      setPagination((prev) => ({
        ...prev,
        total: data.total,
        totalPages: data.pagination.totalPages,
      }));
    } catch (error) {
      console.error("Erreur chargement alertes métier:", error);
      setError(error instanceof Error ? error.message : "Erreur inconnue");
    } finally {
      setIsLoading(false);
    }
  }, [merchantId, filters, pagination.page, pagination.limit]);

  const resolveAlert = useCallback(
    async (alertId: string): Promise<void> => {
      try {
        const response = await fetch(
          `/api/merchant/notifications/alerts/${alertId}/resolve`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              merchantId,
            }),
          },
        );

        if (!response.ok) {
          throw new Error("Erreur lors de la résolution de l'alerte");
        }

        // Mettre à jour localement
        setAlerts((prev) =>
          prev.map((alert) =>
            alert.id === alertId
              ? { ...alert, resolved: true, resolvedAt: new Date() }
              : alert,
          ),
        );
      } catch (error) {
        console.error("Erreur résolution alerte:", error);
        throw error;
      }
    },
    [merchantId],
  );

  const updateFilters = useCallback((newFilters: typeof filters) => {
    setFilters(newFilters);
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, []);

  const setPage = useCallback((page: number) => {
    setPagination((prev) => ({ ...prev, page }));
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  return {
    alerts,
    isLoading,
    error,
    pagination,
    filters,
    updateFilters,
    setPage,
    resolveAlert,
    refresh: fetchAlerts,
  };
}

/**
 * Hook pour les notifications en temps réel
 */
export function useRealTimeNotifications(merchantId: string) {
  const [lastNotification, setLastNotification] =
    useState<MerchantNotification | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!merchantId) return;

    // Simuler une connexion WebSocket ou SSE
    const interval = setInterval(async () => {
      try {
        const response = await fetch(
          `/api/merchant/notifications/latest?merchantId=${merchantId}`,
        );

        if (response.ok) {
          const data = await response.json();
          if (
            data.notification &&
            data.notification.id !== lastNotification?.id
          ) {
            setLastNotification(data.notification);
          }
        }

        setIsConnected(true);
      } catch (error) {
        setIsConnected(false);
      }
    }, 30000); // Vérifier toutes les 30 secondes

    return () => clearInterval(interval);
  }, [merchantId, lastNotification?.id]);

  return {
    lastNotification,
    isConnected,
    clearLastNotification: () => setLastNotification(null),
  };
}

/**
 * Hook pour le badge de notifications non lues
 */
export function useNotificationBadge(merchantId: string) {
  const [unreadCount, setUnreadCount] = useState(0);

  const updateUnreadCount = useCallback(async () => {
    if (!merchantId) return;

    try {
      const response = await fetch(
        `/api/merchant/notifications/unread-count?merchantId=${merchantId}`,
      );

      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.count);
      }
    } catch (error) {
      console.error("Erreur récupération compteur non lues:", error);
    }
  }, [merchantId]);

  useEffect(() => {
    updateUnreadCount();

    // Mettre à jour toutes les minutes
    const interval = setInterval(updateUnreadCount, 60000);

    return () => clearInterval(interval);
  }, [updateUnreadCount]);

  return {
    unreadCount,
    refresh: updateUnreadCount,
  };
}
