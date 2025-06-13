"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { useToast } from "@/components/ui/use-toast";

export interface ContractFilters {
  search?: string;
  status?: string;
  type?: string;
  merchantId?: string;
  merchantCategory?: string;
  dateRange?: {
    from?: Date;
    to?: Date;
  };
}

export interface ContractFormData {
  merchantId: string;
  templateId?: string;
  title: string;
  content: string;
  status: string;
  type: string;
  monthlyFee?: number;
  commissionRate?: number;
  minimumVolume?: number;
  merchantCategory?: string;
  deliveryZone?: string;
  maxDeliveryRadius?: number;
  effectiveDate?: Date;
  expiresAt?: Date;
  autoRenewal?: boolean;
  renewalNotice?: number;
  insuranceRequired?: boolean;
  insuranceAmount?: number;
  securityDeposit?: number;
  notes?: string;
}

export function useAdminContracts() {
  const { toast } = useToast();
  const [filters, setFilters] = useState<ContractFilters>({});
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
  });
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<any>(null);

  // Récupérer les contrats avec pagination et filtres
  const {
    data: contractsData,
    isLoading: isLoadingContracts,
    error: contractsError,
    refetch: refetchContracts,
  } = api.adminContracts.getAll.useQuery({
    page: pagination.page,
    pageSize: pagination.pageSize,
    filters: filters,
  });

  const {
    data: stats,
    isLoading: isLoadingStats,
    refetch: refetchStats,
  } = api.adminContracts.getStats.useQuery();

  const { data: merchants, isLoading: isLoadingMerchants } =
    api.adminContracts.getMerchants.useQuery();

  // Mutations
  const createContractMutation = api.adminContracts.create.useMutation({
    onSuccess: () => {
      toast({
        title: "Succès",
        description: "Le contrat a été créé avec succès.",
      });
      refetchContracts();
      refetchStats();
      setIsCreateModalOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de la création du contrat.",
        variant: "destructive",
      });
    },
  });

  const updateContractMutation = api.adminContracts.update.useMutation({
    onSuccess: () => {
      toast({
        title: "Succès",
        description: "Le contrat a été modifié avec succès.",
      });
      refetchContracts();
      refetchStats();
      setEditingContract(null);
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description:
          error.message || "Erreur lors de la modification du contrat.",
        variant: "destructive",
      });
    },
  });

  const deleteContractMutation = api.adminContracts.delete.useMutation({
    onSuccess: () => {
      toast({
        title: "Succès",
        description: "Le contrat a été supprimé avec succès.",
      });
      refetchContracts();
      refetchStats();
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description:
          error.message || "Erreur lors de la suppression du contrat.",
        variant: "destructive",
      });
    },
  });

  const activateContractMutation = api.adminContracts.activate.useMutation({
    onSuccess: () => {
      toast({
        title: "Succès",
        description: "Le contrat a été activé avec succès.",
      });
      refetchContracts();
      refetchStats();
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de l'activation du contrat.",
        variant: "destructive",
      });
    },
  });

  const suspendContractMutation = api.adminContracts.suspend.useMutation({
    onSuccess: () => {
      toast({
        title: "Succès",
        description: "Le contrat a été suspendu avec succès.",
      });
      refetchContracts();
      refetchStats();
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description:
          error.message || "Erreur lors de la suspension du contrat.",
        variant: "destructive",
      });
    },
  });

  const generatePdfMutation = api.adminContracts.generatePdf.useMutation({
    onSuccess: (data) => {
      toast({
        title: "Succès",
        description: "Le PDF du contrat a été généré avec succès.",
      });
      // Ouvrir le PDF dans un nouvel onglet
      window.open(data.fileUrl, "_blank");
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de la génération du PDF.",
        variant: "destructive",
      });
    },
  });

  // Actions
  const handleFiltersChange = (newFilters: Partial<ContractFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
    setPagination((prev) => ({ ...prev, page: 1 })); // Reset to first page when filters change
  };

  const handleClearFilters = () => {
    setFilters({});
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setPagination((prev) => ({ ...prev, page }));
  };

  const handleCreateContract = (data: ContractFormData) => {
    createContractMutation.mutate(data);
  };

  const handleUpdateContract = (data: ContractFormData) => {
    if (!editingContract?.id) return;
    updateContractMutation.mutate({ id: editingContract.id, ...data });
  };

  const handleDeleteContract = (id: string) => {
    deleteContractMutation.mutate({ id });
  };

  const handleActivateContract = (id: string) => {
    activateContractMutation.mutate({ id });
  };

  const handleSuspendContract = (id: string, reason?: string) => {
    suspendContractMutation.mutate({ id, reason });
  };

  const handleGeneratePdf = (id: string) => {
    generatePdfMutation.mutate({ id });
  };

  const handleEditContract = (contract: any) => {
    setEditingContract(contract);
  };

  return {
    // Data
    contracts: contractsData?.contracts || [],
    totalPages: contractsData?.totalPages || 1,
    currentPage: pagination.page,
    stats,
    merchants: merchants || [],
    filters,
    editingContract,

    // Loading states
    isLoadingContracts,
    isLoadingStats,
    isLoadingMerchants,
    isCreating: createContractMutation.isPending,
    isUpdating: updateContractMutation.isPending,
    isDeleting: deleteContractMutation.isPending,
    isActivating: activateContractMutation.isPending,
    isSuspending: suspendContractMutation.isPending,
    isGeneratingPdf: generatePdfMutation.isPending,

    // Modal states
    isCreateModalOpen,
    setIsCreateModalOpen,

    // Actions
    handleFiltersChange,
    handleClearFilters,
    handlePageChange,
    handleCreateContract,
    handleUpdateContract,
    handleDeleteContract,
    handleActivateContract,
    handleSuspendContract,
    handleGeneratePdf,
    handleEditContract,
    setEditingContract,

    // Refetch functions
    refetchContracts,
    refetchStats,
  };
}
