"use client";

import React, { useState, useCallback } from "react";
import { api } from "@/trpc/react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import { useTranslations } from "next-intl";
import { 
  type ClientAnnouncement, 
  type AnnouncementFilters,
  type CreateAnnouncementData,
  type UpdateAnnouncementData 
} from "@/types/client/announcements";

interface UseClientAnnouncementsProps {
  initialFilter?: AnnouncementFilters;
}

export function useClientAnnouncements({
  initialFilter = {}
}: UseClientAnnouncementsProps = {}) {
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations("announcements");

  const [filter, setFilter] = useState<AnnouncementFilters>(initialFilter);
  const [myAnnouncements, setMyAnnouncements] = useState<ClientAnnouncement[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Récupérer mes annonces avec filtres
  const {
    data: myAnnouncementsData,
    isLoading: isLoadingMy,
    error: apiError,
    refetch: refetchMy
  } = api.clientAnnouncements.getMyAnnouncements.useQuery(filter, {
    staleTime: 30000, // 30 secondes
    refetchOnWindowFocus: false,
  });

  const isLoading = isLoadingMy;

  // Mutations
  const createAnnouncementMutation = api.clientAnnouncements.createAnnouncement.useMutation({
    onSuccess: () => {
      toast({
        title: "Succès",
        description: "Annonce créée avec succès",
      });
      refetchMy();
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
      setError(error.message);
    },
  });

  const updateAnnouncementMutation = api.clientAnnouncements.updateAnnouncement.useMutation({
    onSuccess: () => {
      toast({
        title: "Succès",
        description: "Annonce mise à jour avec succès",
      });
      refetchMy();
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
      setError(error.message);
    },
  });

  const cancelAnnouncementMutation = api.clientAnnouncements.cancelAnnouncement.useMutation({
    onSuccess: () => {
      toast({
        title: "Succès",
        description: "Annonce annulée avec succès",
      });
      refetchMy();
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
      setError(error.message);
    },
  });

  const acceptProposalMutation = api.clientAnnouncements.acceptProposal.useMutation({
    onSuccess: () => {
      toast({
        title: "Succès",
        description: "Proposition acceptée avec succès",
      });
      refetchMy();
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
      setError(error.message);
    },
  });

  // Actions avec gestion d'erreur unifiée
  const createAnnouncement = useCallback(
    async (data: CreateAnnouncementData) => {
      setError(null);
      return await createAnnouncementMutation.mutateAsync(data);
    },
    [createAnnouncementMutation],
  );

  const updateAnnouncement = useCallback(
    async (data: UpdateAnnouncementData) => {
      setError(null);
      return await updateAnnouncementMutation.mutateAsync(data);
    },
    [updateAnnouncementMutation],
  );

  const cancelAnnouncement = useCallback(
    async (announcementId: string) => {
      setError(null);
      return await cancelAnnouncementMutation.mutateAsync({ announcementId });
    },
    [cancelAnnouncementMutation],
  );

  const acceptProposal = useCallback(
    async (proposalId: string) => {
      setError(null);
      return await acceptProposalMutation.mutateAsync({ proposalId });
    },
    [acceptProposalMutation],
  );

  const updateFilter = useCallback(
    (newFilter: Partial<AnnouncementFilters>) => {
      setError(null);
      setFilter(prev => ({ ...prev, ...newFilter }));
    },
    [],
  );

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  // Navigation helpers
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

  // Gestion des erreurs centralisée
  React.useEffect(() => {
    if (apiError) {
      setError(apiError.message);
    }
  }, [apiError]);

  // Mettre à jour les annonces selon les données reçues
  React.useEffect(() => {
    if (myAnnouncementsData?.announcements) {
      setMyAnnouncements(myAnnouncementsData.announcements);
    }
  }, [myAnnouncementsData]);

  return {
    // Data
    announcements: myAnnouncements,
    total: myAnnouncementsData?.total || 0,
    hasMore: myAnnouncementsData?.hasMore || false,
    stats: myAnnouncementsData?.stats,
    filter,

    // Loading states
    isLoading,
    isCreating: createAnnouncementMutation.isPending,
    isUpdating: updateAnnouncementMutation.isPending,
    isCanceling: cancelAnnouncementMutation.isPending,
    isAcceptingProposal: acceptProposalMutation.isPending,

    // Error state
    error,

    // Actions
    createAnnouncement,
    updateAnnouncement,
    cancelAnnouncement,
    acceptProposal,
    updateFilter,
    resetError,
    refetch: refetchMy,

    // Navigation
    navigateToAnnouncement,
    navigateToEdit,
    navigateToTracking,
    navigateToPayment,
  };
}
