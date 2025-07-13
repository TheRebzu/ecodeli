import { useState, useEffect, useCallback } from "react";
import {
  AnalyticsDashboard,
  AnalyticsTimeRange,
  RevenueMetrics,
  CustomerMetrics,
  DeliveryMetrics,
  CartDropMetrics,
  MarketingMetrics,
  OperationalMetrics,
  CompetitiveAnalysis,
  PredictiveInsights,
} from "../services/analytics.service";

interface UseAnalyticsState {
  dashboard: AnalyticsDashboard | null;
  isLoading: boolean;
  error: string | null;
  lastRefresh: Date | null;
}

interface UseAnalyticsActions {
  refreshDashboard: () => Promise<void>;
  setTimeRange: (timeRange: AnalyticsTimeRange) => void;
  exportData: (format: "csv" | "pdf" | "excel") => Promise<void>;
  downloadReport: (type: "summary" | "detailed") => Promise<void>;
}

export interface UseAnalyticsReturn
  extends UseAnalyticsState,
    UseAnalyticsActions {
  timeRange: AnalyticsTimeRange;
  metrics: {
    revenue: RevenueMetrics | null;
    customers: CustomerMetrics | null;
    deliveries: DeliveryMetrics | null;
    cartDrop: CartDropMetrics | null;
    marketing: MarketingMetrics | null;
    operations: OperationalMetrics | null;
    competitive: CompetitiveAnalysis | null;
    insights: PredictiveInsights | null;
  };
}

/**
 * Hook principal pour les analytics merchant
 */
export function useMerchantAnalytics(merchantId: string): UseAnalyticsReturn {
  // État du dashboard
  const [state, setState] = useState<UseAnalyticsState>({
    dashboard: null,
    isLoading: false,
    error: null,
    lastRefresh: null,
  });

  // Période par défaut (30 derniers jours)
  const [timeRange, setTimeRange] = useState<AnalyticsTimeRange>(() => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    return {
      startDate,
      endDate,
      period: "day",
    };
  });

  /**
   * Récupère le dashboard analytics
   */
  const refreshDashboard = useCallback(async () => {
    if (!merchantId) return;

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch("/api/merchant/analytics/dashboard", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          merchantId,
          timeRange,
        }),
      });

      if (!response.ok) {
        throw new Error("Erreur lors du chargement des analytics");
      }

      const dashboard: AnalyticsDashboard = await response.json();

      setState((prev) => ({
        ...prev,
        dashboard,
        isLoading: false,
        lastRefresh: new Date(),
      }));
    } catch (error) {
      console.error("Erreur analytics:", error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Erreur inconnue",
      }));
    }
  }, [merchantId, timeRange]);

  /**
   * Change la période d'analyse
   */
  const handleSetTimeRange = useCallback((newTimeRange: AnalyticsTimeRange) => {
    setTimeRange(newTimeRange);
  }, []);

  /**
   * Exporte les données analytics
   */
  const exportData = useCallback(
    async (format: "csv" | "pdf" | "excel") => {
      if (!merchantId || !state.dashboard) return;

      try {
        const response = await fetch("/api/merchant/analytics/export", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            merchantId,
            timeRange,
            format,
            data: state.dashboard,
          }),
        });

        if (!response.ok) {
          throw new Error("Erreur lors de l'export");
        }

        // Télécharger le fichier
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.style.display = "none";
        a.href = url;
        a.download = `analytics-${format}-${Date.now()}.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } catch (error) {
        console.error("Erreur export:", error);
        throw error;
      }
    },
    [merchantId, timeRange, state.dashboard],
  );

  /**
   * Télécharge un rapport détaillé
   */
  const downloadReport = useCallback(
    async (type: "summary" | "detailed") => {
      if (!merchantId) return;

      try {
        const response = await fetch("/api/merchant/analytics/report", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            merchantId,
            timeRange,
            type,
          }),
        });

        if (!response.ok) {
          throw new Error("Erreur lors de la génération du rapport");
        }

        // Télécharger le PDF
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.style.display = "none";
        a.href = url;
        a.download = `rapport-${type}-${Date.now()}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } catch (error) {
        console.error("Erreur rapport:", error);
        throw error;
      }
    },
    [merchantId, timeRange],
  );

  // Charger les données au montage et quand la période change
  useEffect(() => {
    refreshDashboard();
  }, [refreshDashboard]);

  // Extraire les métriques du dashboard
  const metrics = {
    revenue: state.dashboard?.overview.revenue || null,
    customers: state.dashboard?.overview.customers || null,
    deliveries: state.dashboard?.overview.deliveries || null,
    cartDrop: state.dashboard?.overview.cartDrop || null,
    marketing: state.dashboard?.marketing || null,
    operations: state.dashboard?.operations || null,
    competitive: state.dashboard?.competitive || null,
    insights: state.dashboard?.insights || null,
  };

  return {
    ...state,
    timeRange,
    metrics,
    refreshDashboard,
    setTimeRange: handleSetTimeRange,
    exportData,
    downloadReport,
  };
}

/**
 * Hook pour les métriques de revenus uniquement
 */
export function useRevenueMetrics(
  merchantId: string,
  timeRange: AnalyticsTimeRange,
) {
  const [metrics, setMetrics] = useState<RevenueMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    if (!merchantId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/merchant/analytics/revenue", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          merchantId,
          timeRange,
        }),
      });

      if (!response.ok) {
        throw new Error("Erreur lors du chargement des métriques de revenus");
      }

      const data: RevenueMetrics = await response.json();
      setMetrics(data);
    } catch (error) {
      console.error("Erreur métriques revenus:", error);
      setError(error instanceof Error ? error.message : "Erreur inconnue");
    } finally {
      setIsLoading(false);
    }
  }, [merchantId, timeRange]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return {
    metrics,
    isLoading,
    error,
    refresh: fetchMetrics,
  };
}

/**
 * Hook pour les métriques clients uniquement
 */
export function useCustomerMetrics(
  merchantId: string,
  timeRange: AnalyticsTimeRange,
) {
  const [metrics, setMetrics] = useState<CustomerMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    if (!merchantId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/merchant/analytics/customers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          merchantId,
          timeRange,
        }),
      });

      if (!response.ok) {
        throw new Error("Erreur lors du chargement des métriques clients");
      }

      const data: CustomerMetrics = await response.json();
      setMetrics(data);
    } catch (error) {
      console.error("Erreur métriques clients:", error);
      setError(error instanceof Error ? error.message : "Erreur inconnue");
    } finally {
      setIsLoading(false);
    }
  }, [merchantId, timeRange]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return {
    metrics,
    isLoading,
    error,
    refresh: fetchMetrics,
  };
}

/**
 * Hook pour les insights prédictifs
 */
export function usePredictiveInsights(
  merchantId: string,
  timeRange: AnalyticsTimeRange,
) {
  const [insights, setInsights] = useState<PredictiveInsights | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = useCallback(async () => {
    if (!merchantId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/merchant/analytics/insights", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          merchantId,
          timeRange,
        }),
      });

      if (!response.ok) {
        throw new Error("Erreur lors du chargement des insights");
      }

      const data: PredictiveInsights = await response.json();
      setInsights(data);
    } catch (error) {
      console.error("Erreur insights prédictifs:", error);
      setError(error instanceof Error ? error.message : "Erreur inconnue");
    } finally {
      setIsLoading(false);
    }
  }, [merchantId, timeRange]);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  return {
    insights,
    isLoading,
    error,
    refresh: fetchInsights,
  };
}

/**
 * Hook pour comparer les performances entre périodes
 */
export function usePerformanceComparison(
  merchantId: string,
  currentPeriod: AnalyticsTimeRange,
  comparisonPeriod: AnalyticsTimeRange,
) {
  const [comparison, setComparison] = useState<{
    current: AnalyticsDashboard | null;
    previous: AnalyticsDashboard | null;
    changes: {
      revenue: number;
      customers: number;
      orders: number;
      avgOrderValue: number;
    } | null;
  }>({
    current: null,
    previous: null,
    changes: null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchComparison = useCallback(async () => {
    if (!merchantId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/merchant/analytics/comparison", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          merchantId,
          currentPeriod,
          comparisonPeriod,
        }),
      });

      if (!response.ok) {
        throw new Error("Erreur lors du chargement de la comparaison");
      }

      const data = await response.json();
      setComparison(data);
    } catch (error) {
      console.error("Erreur comparaison performances:", error);
      setError(error instanceof Error ? error.message : "Erreur inconnue");
    } finally {
      setIsLoading(false);
    }
  }, [merchantId, currentPeriod, comparisonPeriod]);

  useEffect(() => {
    fetchComparison();
  }, [fetchComparison]);

  return {
    comparison,
    isLoading,
    error,
    refresh: fetchComparison,
  };
}

/**
 * Hook pour les alertes et notifications business
 */
export function useBusinessAlerts(merchantId: string) {
  const [alerts, setAlerts] = useState<
    Array<{
      id: string;
      type: "warning" | "danger" | "info" | "success";
      title: string;
      message: string;
      priority: "low" | "medium" | "high";
      createdAt: Date;
      isRead: boolean;
      actionUrl?: string;
    }>
  >([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchAlerts = useCallback(async () => {
    if (!merchantId) return;

    setIsLoading(true);

    try {
      const response = await fetch(
        `/api/merchant/analytics/alerts?merchantId=${merchantId}`,
      );

      if (!response.ok) {
        throw new Error("Erreur lors du chargement des alertes");
      }

      const data = await response.json();
      setAlerts(data);
    } catch (error) {
      console.error("Erreur alertes business:", error);
    } finally {
      setIsLoading(false);
    }
  }, [merchantId]);

  const markAsRead = useCallback(async (alertId: string) => {
    try {
      await fetch(`/api/merchant/analytics/alerts/${alertId}/read`, {
        method: "PATCH",
      });

      setAlerts((prev) =>
        prev.map((alert) =>
          alert.id === alertId ? { ...alert, isRead: true } : alert,
        ),
      );
    } catch (error) {
      console.error("Erreur marquage alerte:", error);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  return {
    alerts,
    isLoading,
    refresh: fetchAlerts,
    markAsRead,
    unreadCount: alerts.filter((alert) => !alert.isRead).length,
  };
}
