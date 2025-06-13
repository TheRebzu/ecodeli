"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { useToast } from "@/components/ui/use-toast";

export interface TemplateFormData {
  name: string;
  description?: string;
  content: string;
  version: string;
  defaultType: string;
  defaultMonthlyFee?: number;
  defaultCommissionRate?: number;
  defaultDuration?: number;
  targetMerchantCategory?: string;
  requiredDocuments?: string[];
  minimumBusinessAge?: number;
  minimumTurnover?: number;
  defaultExclusivityClause?: boolean;
  defaultInsuranceRequired?: boolean;
  defaultSecurityDeposit?: number;
  isActive: boolean;
}

export const useContractTemplates = () => {
  const { toast } = useToast();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Queries
  const {
    data: templates,
    isLoading: templatesLoading,
    refetch: refetchTemplates,
  } = api.admin.contracts.getTemplates.useQuery();

  const { data: activeTemplates, isLoading: activeTemplatesLoading } =
    api.admin.contracts.getActiveTemplates.useQuery();

  // Mutations
  const createTemplateMutation = api.admin.contracts.createTemplate.useMutation(
    {
      onSuccess: () => {
        toast({
          title: "Template créé",
          description: "Le template de contrat a été créé avec succès.",
        });
        refetchTemplates();
        setIsCreateModalOpen(false);
      },
      onError: (error) => {
        toast({
          title: "Erreur",
          description: `Erreur lors de la création : ${error.message}`,
          variant: "destructive",
        });
      },
    },
  );

  const updateTemplateMutation = api.admin.contracts.updateTemplate.useMutation(
    {
      onSuccess: () => {
        toast({
          title: "Template mis à jour",
          description: "Le template de contrat a été mis à jour avec succès.",
        });
        refetchTemplates();
      },
      onError: (error) => {
        toast({
          title: "Erreur",
          description: `Erreur lors de la mise à jour : ${error.message}`,
          variant: "destructive",
        });
      },
    },
  );

  const deleteTemplateMutation = api.admin.contracts.deleteTemplate.useMutation(
    {
      onSuccess: () => {
        toast({
          title: "Template supprimé",
          description: "Le template de contrat a été supprimé avec succès.",
        });
        refetchTemplates();
      },
      onError: (error) => {
        toast({
          title: "Erreur",
          description: `Erreur lors de la suppression : ${error.message}`,
          variant: "destructive",
        });
      },
    },
  );

  const activateTemplateMutation =
    api.admin.contracts.activateTemplate.useMutation({
      onSuccess: () => {
        toast({
          title: "Template activé",
          description: "Le template de contrat a été activé avec succès.",
        });
        refetchTemplates();
      },
      onError: (error) => {
        toast({
          title: "Erreur",
          description: `Erreur lors de l'activation : ${error.message}`,
          variant: "destructive",
        });
      },
    });

  const deactivateTemplateMutation =
    api.admin.contracts.deactivateTemplate.useMutation({
      onSuccess: () => {
        toast({
          title: "Template désactivé",
          description: "Le template de contrat a été désactivé avec succès.",
        });
        refetchTemplates();
      },
      onError: (error) => {
        toast({
          title: "Erreur",
          description: `Erreur lors de la désactivation : ${error.message}`,
          variant: "destructive",
        });
      },
    });

  // Actions
  const createTemplate = (data: TemplateFormData) => {
    createTemplateMutation.mutate(data);
  };

  const updateTemplate = (id: string, data: Partial<TemplateFormData>) => {
    updateTemplateMutation.mutate({ id, ...data });
  };

  const deleteTemplate = (id: string) => {
    deleteTemplateMutation.mutate({ id });
  };

  const activateTemplate = (id: string) => {
    activateTemplateMutation.mutate({ id });
  };

  const deactivateTemplate = (id: string) => {
    deactivateTemplateMutation.mutate({ id });
  };

  const openCreateModal = () => setIsCreateModalOpen(true);
  const closeCreateModal = () => setIsCreateModalOpen(false);

  return {
    // Data
    templates: templates || [],
    activeTemplates: activeTemplates || [],

    // UI State
    isCreateModalOpen,

    // Loading states
    isLoading: templatesLoading,
    templatesLoading,
    activeTemplatesLoading,
    isCreating: createTemplateMutation.isPending,
    isUpdating: updateTemplateMutation.isPending,
    isDeleting: deleteTemplateMutation.isPending,
    isActivating: activateTemplateMutation.isPending,
    isDeactivating: deactivateTemplateMutation.isPending,

    // Actions
    createTemplate,
    updateTemplate,
    deleteTemplate,
    activateTemplate,
    deactivateTemplate,
    openCreateModal,
    closeCreateModal,
    refetch: refetchTemplates,
  };
};
