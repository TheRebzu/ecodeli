import { api } from "@/trpc/react";
import { useToast } from "@/hooks/use-toast";
import { useMemo } from "react";

/**
 * Hook personnalisé pour la gestion des candidatures de livreurs
 * 
 * Fonctionnalités selon Mission 1 :
 * - Demande de candidature pour devenir livreur
 * - Validation des pièces justificatives
 * - Suivi du processus de recrutement
 */

interface CreateApplicationData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  vehicleType: "CAR" | "BIKE" | "SCOOTER" | "TRUCK" | "VAN";
  hasLicense: boolean;
  hasInsurance: boolean;
  availabilityHours: {
    monday: { start: string; end: string; available: boolean };
    tuesday: { start: string; end: string; available: boolean };
    wednesday: { start: string; end: string; available: boolean };
    thursday: { start: string; end: string; available: boolean };
    friday: { start: string; end: string; available: boolean };
    saturday: { start: string; end: string; available: boolean };
    sunday: { start: string; end: string; available: boolean };
  };
  experience: string;
  motivation: string;
}

interface ApplicationDocumentData {
  applicationId: string;
  documentType: "LICENSE" | "INSURANCE" | "IDENTITY" | "VEHICLE_REGISTRATION";
  fileUrl: string;
  fileName: string;
}

interface ApplicationFilters {
  page?: number;
  limit?: number;
  status?: "PENDING" | "UNDER_REVIEW" | "APPROVED" | "REJECTED";
  vehicleType?: "CAR" | "BIKE" | "SCOOTER" | "TRUCK" | "VAN";
  city?: string;
}

export function useDelivererApplications() {
  const { toast } = useToast();
  const utils = api.useUtils();

  // Queries
  const getApplicationsByStatus = (filters?: ApplicationFilters) => {
    return api.delivererApplications.getApplicationsByStatus.useQuery(filters);
  };

  const getApplicationById = (id: string) => {
    return api.delivererApplications.getApplicationById.useQuery(
      { id },
      { enabled: !!id }
    );
  };

  const getMyApplication = () => {
    return api.delivererApplications.getMyApplication.useQuery();
  };

  // Mutations
  const createApplicationMutation = api.delivererApplications.createApplication.useMutation({
    onSuccess: (data) => {
      toast({
        title: "Candidature soumise",
        description: data.message,
      });
      // Invalider les caches
      utils.delivererApplications.getMyApplication.invalidate();
    },
    onError: (error) => {
      toast({
        title: "Erreur de candidature",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const uploadDocumentMutation = api.delivererApplications.uploadDocument.useMutation({
    onSuccess: (data) => {
      toast({
        title: "Document téléchargé",
        description: data.message,
      });
      // Invalider les caches
      utils.delivererApplications.getMyApplication.invalidate();
      utils.delivererApplications.getApplicationById.invalidate();
    },
    onError: (error) => {
      toast({
        title: "Erreur de téléchargement",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateApplicationMutation = api.delivererApplications.updateApplication.useMutation({
    onSuccess: (data) => {
      toast({
        title: "Candidature mise à jour",
        description: data.message,
      });
      // Invalider les caches
      utils.delivererApplications.getMyApplication.invalidate();
      utils.delivererApplications.getApplicationById.invalidate();
    },
    onError: (error) => {
      toast({
        title: "Erreur de mise à jour",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Functions
  const createApplication = async (data: CreateApplicationData) => {
    return createApplicationMutation.mutateAsync(data);
  };

  const uploadDocument = async (data: ApplicationDocumentData) => {
    return uploadDocumentMutation.mutateAsync(data);
  };

  const updateApplication = async (id: string, data: Partial<CreateApplicationData>) => {
    return updateApplicationMutation.mutateAsync({ id, ...data });
  };

  // Computed values
  const isLoading = useMemo(() => {
    return (
      createApplicationMutation.isPending ||
      uploadDocumentMutation.isPending ||
      updateApplicationMutation.isPending
    );
  }, [
    createApplicationMutation.isPending,
    uploadDocumentMutation.isPending,
    updateApplicationMutation.isPending,
  ]);

  // Helper functions pour les statuts
  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "text-yellow-600 bg-yellow-100";
      case "UNDER_REVIEW":
        return "text-blue-600 bg-blue-100";
      case "APPROVED":
        return "text-green-600 bg-green-100";
      case "REJECTED":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "PENDING":
        return "En attente";
      case "UNDER_REVIEW":
        return "En cours d'examen";
      case "APPROVED":
        return "Approuvée";
      case "REJECTED":
        return "Rejetée";
      default:
        return status;
    }
  };

  const getRequiredDocuments = () => {
    return [
      { type: "LICENSE", label: "Permis de conduire", required: true },
      { type: "INSURANCE", label: "Assurance véhicule", required: true },
      { type: "IDENTITY", label: "Pièce d'identité", required: true },
      { type: "VEHICLE_REGISTRATION", label: "Carte grise", required: true },
    ];
  };

  return {
    // Functions
    getApplicationsByStatus,
    getApplicationById,
    getMyApplication,
    createApplication,
    uploadDocument,
    updateApplication,
    
    // States
    isLoading,
    isCreating: createApplicationMutation.isPending,
    isUploading: uploadDocumentMutation.isPending,
    isUpdating: updateApplicationMutation.isPending,
    
    // Errors
    createError: createApplicationMutation.error,
    uploadError: uploadDocumentMutation.error,
    updateError: updateApplicationMutation.error,
    
    // Success states
    createSuccess: createApplicationMutation.isSuccess,
    uploadSuccess: uploadDocumentMutation.isSuccess,
    updateSuccess: updateApplicationMutation.isSuccess,
    
    // Helper functions
    getStatusColor,
    getStatusText,
    getRequiredDocuments,
  };
} 