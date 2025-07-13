import { useState, useEffect } from "react";
import {
  MerchantPaymentsService,
  type PaymentFilters,
  type PaymentStats,
} from "../services/payments.service";
import { useAuth } from "@/hooks/use-auth";

export function useMerchantPayments(filters: PaymentFilters = {}) {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      if (!user?.id) return;

      try {
        setLoading(true);
        setError(null);

        const [paymentsData, statsData] = await Promise.all([
          fetch(
            `/api/merchant/payments?${new URLSearchParams({
              page: String(filters.page || 1),
              limit: String(filters.limit || 20),
              ...(filters.status && { status: filters.status }),
              ...(filters.dateFrom && { dateFrom: filters.dateFrom }),
              ...(filters.dateTo && { dateTo: filters.dateTo }),
            })}`,
            {
              method: "GET",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
            },
          ),
          fetch("/api/merchant/payments/stats", {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
          }),
        ]);

        if (!paymentsData.ok || !statsData.ok) {
          throw new Error("Erreur lors du chargement des données");
        }

        const payments = await paymentsData.json();
        const statistics = await statsData.json();

        setData(payments);
        setStats(statistics);
      } catch (err) {
        console.error("Erreur chargement paiements:", err);
        setError(
          err instanceof Error ? err.message : "Une erreur est survenue",
        );
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [
    user?.id,
    filters.page,
    filters.limit,
    filters.status,
    filters.dateFrom,
    filters.dateTo,
  ]);

  const refreshData = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const [paymentsData, statsData] = await Promise.all([
        fetch(
          `/api/merchant/payments?${new URLSearchParams({
            page: String(filters.page || 1),
            limit: String(filters.limit || 20),
            ...(filters.status && { status: filters.status }),
            ...(filters.dateFrom && { dateFrom: filters.dateFrom }),
            ...(filters.dateTo && { dateTo: filters.dateTo }),
          })}`,
          {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
          },
        ),
        fetch("/api/merchant/payments/stats", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        }),
      ]);

      if (!paymentsData.ok || !statsData.ok) {
        throw new Error("Erreur lors du rechargement");
      }

      const payments = await paymentsData.json();
      const statistics = await statsData.json();

      setData(payments);
      setStats(statistics);
    } catch (err) {
      console.error("Erreur refresh paiements:", err);
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  const requestWithdrawal = async (
    amount: number,
    bankAccount: string,
    reference?: string,
  ) => {
    try {
      const response = await fetch("/api/merchant/payments/withdrawal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ amount, bankAccount, reference }),
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la demande de virement");
      }

      await refreshData();
      return await response.json();
    } catch (err) {
      console.error("Erreur demande virement:", err);
      throw err;
    }
  };

  return {
    data,
    stats,
    loading,
    error,
    refreshData,
    requestWithdrawal,
  };
}
