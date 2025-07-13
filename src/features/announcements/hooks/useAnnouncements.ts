"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  Announcement,
  PaginatedAnnouncementsResponse,
} from "@/features/announcements/types/announcement.types";

interface UseAnnouncementsOptions {
  filters?: Record<string, any>;
  pagination?: {
    page?: number;
    limit?: number;
  };
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  role?: "CLIENT" | "DELIVERER" | "MERCHANT" | "ADMIN";
  autoFetch?: boolean;
}

interface UseAnnouncementsReturn {
  announcements: Announcement[];
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  refresh: () => void;
  fetchMore: () => void;
  hasMore: boolean;
}

export function useAnnouncements({
  filters = {},
  pagination = { page: 1, limit: 10 },
  sortBy = "createdAt",
  sortOrder = "desc",
  role = "CLIENT",
  autoFetch = true,
}: UseAnnouncementsOptions = {}): UseAnnouncementsReturn {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paginationState, setPaginationState] = useState({
    page: pagination.page || 1,
    limit: pagination.limit || 10,
    total: 0,
    totalPages: 0,
  });

  const getApiEndpoint = useCallback(() => {
    switch (role) {
      case "CLIENT":
      case "MERCHANT":
        return `/api/${role.toLowerCase()}/announcements`;
      case "DELIVERER":
        return "/api/deliverer/opportunities";
      case "ADMIN":
        return "/api/admin/announcements";
      default:
        return "/api/shared/announcements/search";
    }
  }, [role]);

  const fetchAnnouncements = useCallback(
    async (append = false) => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          page: paginationState.page.toString(),
          limit: paginationState.limit.toString(),
          sortBy,
          sortOrder,
          ...filters,
        });

        const endpoint = getApiEndpoint();
        const response = await fetch(`${endpoint}?${params}`);
        const data: PaginatedAnnouncementsResponse = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error || "Erreur lors du chargement des annonces",
          );
        }

        if (append) {
          setAnnouncements((prev) => [...prev, ...data.data]);
        } else {
          setAnnouncements(data.data);
        }

        setPaginationState({
          page: data.pagination.page,
          limit: data.pagination.limit,
          total: data.pagination.total,
          totalPages: data.pagination.totalPages,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur inconnue");
      } finally {
        setLoading(false);
      }
    },
    [
      filters,
      paginationState.page,
      paginationState.limit,
      sortBy,
      sortOrder,
      getApiEndpoint,
    ],
  );

  const refresh = useCallback(() => {
    setPaginationState((prev) => ({ ...prev, page: 1 }));
    fetchAnnouncements(false);
  }, [fetchAnnouncements]);

  const fetchMore = useCallback(() => {
    if (paginationState.page < paginationState.totalPages) {
      setPaginationState((prev) => ({ ...prev, page: prev.page + 1 }));
      fetchAnnouncements(true);
    }
  }, [paginationState.page, paginationState.totalPages, fetchAnnouncements]);

  const hasMore = paginationState.page < paginationState.totalPages;

  useEffect(() => {
    if (autoFetch) {
      fetchAnnouncements(false);
    }
  }, [autoFetch, fetchAnnouncements]);

  // Reset page when filters change
  useEffect(() => {
    setPaginationState((prev) => ({ ...prev, page: 1 }));
  }, [filters, sortBy, sortOrder]);

  return {
    announcements,
    loading,
    error,
    pagination: paginationState,
    refresh,
    fetchMore,
    hasMore,
  };
}
