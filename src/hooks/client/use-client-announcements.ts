"use client";

import React, { useState, useCallback } from "react";
import { api } from "@/trpc/react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import { useTranslations } from "next-intl";
import type { AnnouncementWithDetails } from "@/types/announcements/announcement-with-details";

interface AnnouncementFilter {
  limit?: number;
  page?: number;
  status?: string[];
  search?: string;
  location?: {
    latitude: number;
    longitude: number;
    radius: number;
  };
}

interface UseClientAnnouncementsProps {
  initialFilter?: AnnouncementFilter;
}

export function useClientAnnouncements({
  initialFilter = { limit: 10, page: 1 }}: UseClientAnnouncementsProps = {}) {
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations("announcements");

  const [filter, setFilter] = useState<AnnouncementFilter>(initialFilter);
  const [myAnnouncements, setMyAnnouncements] = useState<
    AnnouncementWithDetails[]
  >([]);
  const [error, setError] = useState<string | null>(null);

  // Récupérer mes annonces
  const {
    data: myAnnouncementsData,
    isLoading: isLoadingMy,
    refetch: refetchMy} = api.client.clientAnnouncements.getMyAnnouncements.useQuery(filter);

  // Récupérer mes annonces actives
  const {
    data: activeAnnouncementsData,
    isLoading: isLoadingActive,
    refetch: refetchActive} = api.client.clientAnnouncements.getActiveAnnouncements.useQuery();

  // Récupérer l'historique
  const {
    data: historyData,
    isLoading: isLoadingHistory,
    refetch: refetchHistory} = api.client.clientAnnouncements.getAnnouncementHistory.useQuery();

  const isLoading = isLoadingMy || isLoadingActive || isLoadingHistory;

  // Mutations
  const deleteAnnouncementMutation =
    api.client.clientAnnouncements.deleteAnnouncement.useMutation({ onSuccess: () => {
        toast({
          title: t("deleteSuccess"),
          description: t("announcementDeleted") });
        refetchMy();
        refetchActive();
      },
      onError: (error) => {
        toast({ title: t("deleteError"),
          description: error.message,
          variant: "destructive" });
      }});

  // Actions
  const fetchMyAnnouncements = useCallback(
    async (page?: number) => {
      try {
        setError(null);
        const newFilter = page ? { ...filter, page } : filter;
        setFilter(newFilter);
        await refetchMy();
      } catch (error) {
        setError("Erreur lors du chargement des annonces");
      }
    },
    [filter, refetchMy],
  );

  const fetchActiveAnnouncements = useCallback(async () => {
    try {
      setError(null);
      await refetchActive();
      if (activeAnnouncementsData) {
        setMyAnnouncements(activeAnnouncementsData);
      }
    } catch (error) {
      setError("Erreur lors du chargement des annonces actives");
    }
  }, [refetchActive, activeAnnouncementsData]);

  const fetchAnnouncementHistory = useCallback(async () => {
    try {
      setError(null);
      await refetchHistory();
      if (historyData) {
        setMyAnnouncements(historyData);
      }
    } catch (error) {
      setError("Erreur lors du chargement de l'historique");
    }
  }, [refetchHistory, historyData]);

  const deleteAnnouncement = useCallback(
    async (announcementId: string) => {
      await deleteAnnouncementMutation.mutateAsync({ announcementId  });
    },
    [deleteAnnouncementMutation],
  );

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  const navigateToAnnouncement = useCallback(
    (announcementId: string) => {
      router.push(`/client/announcements/${announcementId}`);
    },
    [router],
  );

  const navigateToEdit = useCallback(
    (announcementId: string) => {
      router.push(`/client/announcements/${announcementId}/edit`);
    },
    [router],
  );

  const navigateToTracking = useCallback(
    (announcementId: string) => {
      router.push(`/client/announcements/${announcementId}/tracking`);
    },
    [router],
  );

  const navigateToPayment = useCallback(
    (announcementId: string) => {
      router.push(`/client/announcements/${announcementId}/payment`);
    },
    [router],
  );

  // Mettre à jour les annonces selon les données reçues
  React.useEffect(() => {
    if (myAnnouncementsData) {
      setMyAnnouncements(myAnnouncementsData);
    }
  }, [myAnnouncementsData]);

  return {
    // Data
    myAnnouncements,
    filter,

    // Loading states
    isLoading,
    isLoadingMy,
    isLoadingActive,
    isLoadingHistory,

    // Error state
    error,

    // Actions
    fetchMyAnnouncements,
    fetchActiveAnnouncements,
    fetchAnnouncementHistory,
    deleteAnnouncement,
    resetError,
    setFilter,

    // Navigation
    navigateToAnnouncement,
    navigateToEdit,
    navigateToTracking,
    navigateToPayment,

    // Mutations
    isDeleting: deleteAnnouncementMutation.isPending};
}
