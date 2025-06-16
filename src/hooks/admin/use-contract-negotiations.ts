"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { useToast } from "@/components/ui/use-toast";

interface NegotiationFilters {
  contractId?: string;
  merchantId?: string;
  status?: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  page: number;
  limit: number;
}

export function useContractNegotiations(
  initialFilters: Partial<NegotiationFilters> = {},
) {
  const { toast } = useToast();
  const [filters, setFilters] = useState<NegotiationFilters>({ page: 1,
    limit: 10,
    ...initialFilters });

  // Queries
  const {
    data: negotiationsData,
    isLoading: isLoadingNegotiations,
    error: negotiationsError,
    refetch: refetchNegotiations} = api.admin.contracts.getNegotiations.useQuery(filters);

  const { data: negotiationStats, isLoading: isLoadingStats } =
    api.admin.contracts.getNegotiationStats.useQuery();

  // Mutations
  const acceptProposalMutation =
    api.admin.contracts.acceptNegotiationProposal.useMutation({ onSuccess: () => {
        toast({
          title: "Proposition acceptée",
          description: "La proposition a été acceptée avec succès." });
        refetchNegotiations();
      },
      onError: (error) => {
        toast({
          title: "Erreur",
          description: `Impossible d'accepter la proposition: ${error.message}`,
          variant: "destructive"});
      }});

  const rejectProposalMutation =
    api.admin.contracts.rejectNegotiationProposal.useMutation({ onSuccess: () => {
        toast({
          title: "Proposition rejetée",
          description: "La proposition a été rejetée." });
        refetchNegotiations();
      },
      onError: (error) => {
        toast({
          title: "Erreur",
          description: `Impossible de rejeter la proposition: ${error.message}`,
          variant: "destructive"});
      }});

  const makeCounterProposalMutation =
    api.admin.contracts.makeCounterProposal.useMutation({ onSuccess: () => {
        toast({
          title: "Contre-proposition envoyée",
          description: "Votre contre-proposition a été envoyée au commerçant." });
        refetchNegotiations();
      },
      onError: (error) => {
        toast({
          title: "Erreur",
          description: `Impossible d'envoyer la contre-proposition: ${error.message}`,
          variant: "destructive"});
      }});

  const completeNegotiationMutation =
    api.admin.contracts.completeNegotiation.useMutation({ onSuccess: () => {
        toast({
          title: "Négociation finalisée",
          description: "La négociation a été finalisée avec succès." });
        refetchNegotiations();
      },
      onError: (error) => {
        toast({
          title: "Erreur",
          description: `Impossible de finaliser la négociation: ${error.message}`,
          variant: "destructive"});
      }});

  const cancelNegotiationMutation =
    api.admin.contracts.cancelNegotiation.useMutation({ onSuccess: () => {
        toast({
          title: "Négociation annulée",
          description: "La négociation a été annulée." });
        refetchNegotiations();
      },
      onError: (error) => {
        toast({
          title: "Erreur",
          description: `Impossible d'annuler la négociation: ${error.message}`,
          variant: "destructive"});
      }});

  // Actions
  const acceptProposal = async (negotiationId: string, terms: any) => {
    await acceptProposalMutation.mutateAsync({ negotiationId,
      terms });
  };

  const rejectProposal = async (negotiationId: string, reason: string) => {
    await rejectProposalMutation.mutateAsync({ negotiationId,
      reason });
  };

  const makeCounterProposal = async (negotiationId: string, proposal: any) => {
    await makeCounterProposalMutation.mutateAsync({ negotiationId,
      proposal });
  };

  const completeNegotiation = async (
    negotiationId: string,
    finalTerms: any,
  ) => {
    await completeNegotiationMutation.mutateAsync({ negotiationId,
      finalTerms });
  };

  const cancelNegotiation = async (negotiationId: string, reason: string) => {
    await cancelNegotiationMutation.mutateAsync({ negotiationId,
      reason });
  };

  // Filtres et pagination
  const updateFilters = (newFilters: Partial<NegotiationFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters  }));
  };

  const resetFilters = () => {
    setFilters({ page: 1,
      limit: 10 });
  };

  const goToPage = (page: number) => {
    setFilters((prev) => ({ ...prev, page  }));
  };

  const changePageSize = (limit: number) => {
    setFilters((prev) => ({ ...prev, limit, page: 1  }));
  };

  // Utilitaires
  const isLoading =
    isLoadingNegotiations ||
    acceptProposalMutation.isPending ||
    rejectProposalMutation.isPending ||
    makeCounterProposalMutation.isPending ||
    completeNegotiationMutation.isPending ||
    cancelNegotiationMutation.isPending;

  const negotiations = negotiationsData?.negotiations || [];
  const totalNegotiations = negotiationsData?.total || 0;
  const totalPages = Math.ceil(totalNegotiations / filters.limit);

  return {
    // Data
    negotiations,
    negotiationStats,
    totalNegotiations,
    totalPages,
    currentPage: filters.page,
    pageSize: filters.limit,
    filters,

    // Loading states
    isLoading,
    isLoadingNegotiations,
    isLoadingStats,

    // Error states
    error: negotiationsError,

    // Actions
    acceptProposal,
    rejectProposal,
    makeCounterProposal,
    completeNegotiation,
    cancelNegotiation,

    // Filters and pagination
    updateFilters,
    resetFilters,
    goToPage,
    changePageSize,
    refetch: refetchNegotiations};
}
