import { useState, useEffect } from "react";
import {
  MerchantAnnouncementsService,
  type MerchantAnnouncementFilters,
  type AnnouncementStats,
} from "../services/announcements.service";
import { useAuth } from "@/hooks/use-auth";

export function useMerchantAnnouncements(
  filters: MerchantAnnouncementFilters = {},
) {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [stats, setStats] = useState<AnnouncementStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      if (!user?.id) return;

      try {
        setLoading(true);
        setError(null);

        const [announcementsData, statsData] = await Promise.all([
          fetch(
            `/api/merchant/announcements?${new URLSearchParams({
              page: String(filters.page || 1),
              limit: String(filters.limit || 10),
              ...(filters.status && { status: filters.status }),
              ...(filters.type && { type: filters.type }),
              ...(filters.search && { search: filters.search }),
            })}`,
            {
              method: "GET",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
            },
          ),
          fetch("/api/merchant/announcements/stats", {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
          }),
        ]);

        if (!announcementsData.ok || !statsData.ok) {
          throw new Error("Erreur lors du chargement des données");
        }

        const announcements = await announcementsData.json();
        const statistics = await statsData.json();

        setData(announcements);
        setStats(statistics);
      } catch (err) {
        console.error("Erreur chargement annonces:", err);
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
    filters.type,
    filters.search,
  ]);

  const refreshData = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const [announcementsData, statsData] = await Promise.all([
        fetch(
          `/api/merchant/announcements?${new URLSearchParams({
            page: String(filters.page || 1),
            limit: String(filters.limit || 10),
            ...(filters.status && { status: filters.status }),
            ...(filters.type && { type: filters.type }),
            ...(filters.search && { search: filters.search }),
          })}`,
          {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
          },
        ),
        fetch("/api/merchant/announcements/stats", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        }),
      ]);

      if (!announcementsData.ok || !statsData.ok) {
        throw new Error("Erreur lors du rechargement");
      }

      const announcements = await announcementsData.json();
      const statistics = await statsData.json();

      setData(announcements);
      setStats(statistics);
    } catch (err) {
      console.error("Erreur refresh annonces:", err);
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  return {
    data,
    stats,
    loading,
    error,
    refreshData,
  };
}
