import { useState } from 'react';
import { DocumentStatus, DocumentType, Document } from '@/types/document';
import { api } from '@/lib/api';
import { useToast } from '~/components/ui/use-toast';
import { uploadDocumentSchema, updateDocumentSchema } from '~/schemas/auth/document.schema';
import { z } from 'zod';
import type { Verification } from '@prisma/client';

type UploadDocumentInput = z.infer<typeof uploadDocumentSchema>;
type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;

type DocumentWithVerifications = Document & {
  verifications: Verification[];
};

// Mock de l'API pour les besoins de la phase de développement
const apiMock = {
  useContext: () => ({
    document: {
      getUserDocuments: {
        invalidate: () => Promise.resolve(),
      },
      getPendingDocuments: {
        invalidate: () => Promise.resolve(),
      },
    },
  }),
  document: {
    uploadDocument: {
      useMutation: ({ onSuccess }: { onSuccess?: () => void }) => ({
        mutateAsync: async () => {
          onSuccess?.();
          return { success: true };
        },
      }),
    },
    deleteDocument: {
      useMutation: ({ onSuccess }: { onSuccess?: () => void }) => ({
        mutateAsync: async () => {
          onSuccess?.();
          return { success: true };
        },
      }),
    },
    verifyDocument: {
      useMutation: ({ onSuccess }: { onSuccess?: () => void }) => ({
        mutateAsync: async () => {
          onSuccess?.();
          return { success: true };
        },
      }),
    },
    getUserDocuments: {
      useQuery: () => ({
        data: { documents: [] },
        isLoading: false,
      }),
    },
    getPendingDocuments: {
      useQuery: () => ({
        data: { documents: [] },
        isLoading: false,
        refetch: async () => ({ data: { documents: [] } }),
      }),
    },
  },
};

// Utiliser le mock à la place de l'API réelle
const api = apiMock;

export function useDocuments() {
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [userDocuments, setUserDocuments] = useState<Document[]>([]);
  const [pendingDocuments, setPendingDocuments] = useState<Document[]>([]);
  const { toast } = useToast();

  const utils = api.useContext();

  // Mutations
  const uploadMutation = api.document.uploadDocument.useMutation({
    onSuccess: () => {
      utils.document.getUserDocuments.invalidate();
    },
  });

  const deleteMutation = api.document.deleteDocument.useMutation({
    onSuccess: () => {
      utils.document.getUserDocuments.invalidate();
    },
  });

  const verifyMutation = api.document.verifyDocument.useMutation({
    onSuccess: () => {
      utils.document.getPendingDocuments.invalidate();
    },
  });

  // Queries
  const { data: userDocumentsData, isLoading: isLoadingUserDocs } =
    api.document.getUserDocuments.useQuery();

  const {
    data: pendingDocumentsData,
    isLoading: isLoadingPendingDocs,
    refetch: refetchPendingDocs,
  } = api.document.getPendingDocuments.useQuery();

  // Fonctions
  const uploadDocument = async (file: File, documentType: DocumentType) => {
    if (!file) return null;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', documentType);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Erreur lors du téléchargement du document');
      }

      const data = await response.json();

      // Mettre à jour la liste des documents de l'utilisateur
      await loadUserDocuments();

      return data;
    } catch (error) {
      console.error('Erreur lors du téléchargement du document:', error);
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  const deleteDocument = async (documentId: string) => {
    setIsDeleting(true);

    try {
      await deleteMutation.mutateAsync({ documentId });

      // Mettre à jour la liste des documents de l'utilisateur
      await loadUserDocuments();

      return true;
    } catch (error) {
      console.error('Erreur lors de la suppression du document:', error);
      throw error;
    } finally {
      setIsDeleting(false);
    }
  };

  const verifyDocument = async (
    documentId: string,
    status: DocumentStatus,
    rejectionReason?: string
  ) => {
    try {
      await verifyMutation.mutateAsync({
        documentId,
        status,
        rejectionReason,
      });

      return { success: true };
    } catch (error) {
      console.error('Erreur lors de la vérification du document:', error);
      return { success: false, error };
    }
  };

  // Charger les documents en attente, optionnellement filtrés par rôle
  const loadPendingDocuments = async (role?: string) => {
    setIsLoading(true);

    try {
      const documents = await refetchPendingDocs({ userRole: role });
      setPendingDocuments(documents);
      return documents;
    } catch (error) {
      console.error('Erreur lors du chargement des documents en attente:', error);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Charge les documents de l'utilisateur courant
   */
  const loadUserDocuments = async () => {
    setIsLoading(true);

    try {
      const documents = await api.document.getUserDocuments.query();
      setUserDocuments(documents);
      return documents;
    } catch (error) {
      console.error('Erreur lors du chargement des documents:', error);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Approuve un document
   */
  const approveDocument = async (documentId: string) => {
    try {
      await verifyMutation.mutateAsync({
        documentId,
        status: DocumentStatus.APPROVED,
      });
      return true;
    } catch (error) {
      console.error("Erreur lors de l'approbation du document:", error);
      throw error;
    }
  };

  /**
   * Rejette un document
   */
  const rejectDocument = async (documentId: string, reason: string) => {
    try {
      await verifyMutation.mutateAsync({
        documentId,
        status: DocumentStatus.REJECTED,
        rejectionReason: reason,
      });
      return true;
    } catch (error) {
      console.error('Erreur lors du rejet du document:', error);
      throw error;
    }
  };

  // Téléchargement d'un document
  const uploadDocumentMutation = api.document.uploadDocument.useMutation({
    onSuccess: () => {
      utils.document.getUserDocuments.invalidate();
    },
  });

  // Mise à jour d'un document
  const updateDocumentMutation = api.document.updateDocument.useMutation({
    onSuccess: () => {
      utils.document.getUserDocuments.invalidate();
    },
  });

  // Demande de vérification d'un document
  const createVerificationMutation = api.document.createVerification.useMutation({
    onSuccess: () => {
      utils.document.getUserDocuments.invalidate();
    },
  });

  // Admin: Mise à jour d'une vérification
  const updateVerificationMutation = api.document.updateVerification.useMutation({
    onSuccess: () => {
      utils.document.getPendingVerifications.invalidate();
    },
  });

  // Admin: Charger les vérifications en attente
  const pendingVerificationsQuery = api.document.getPendingVerifications.useQuery(undefined, {
    enabled: false, // Ne s'exécute que sur demande (pour les admins)
  });

  // Téléchargement d'un document
  const uploadDocument = async (data: UploadDocumentInput, file: File) => {
    setIsLoading(true);

    try {
      // 1. Préparer le fichier pour l'upload
      const formData = new FormData();
      formData.append('file', file);

      // 2. Uploader le fichier sur le serveur
      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error("Erreur lors de l'upload du fichier");
      }

      const { fileUrl } = await uploadResponse.json();

      // 3. Créer l'entrée du document dans la base de données
      await uploadDocumentMutation.mutateAsync({
        type: data.type,
        file: {
          name: file.name,
          type: file.type,
          size: file.size,
        },
        notes: data.notes,
      });

      toast({
        title: 'Document téléchargé',
        description: 'Votre document a été téléchargé avec succès.',
      });

      return true;
    } catch (error) {
      console.error('Erreur:', error);
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue lors du téléchargement du document.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Mise à jour d'un document
  const updateDocument = async (data: UpdateDocumentInput) => {
    setIsLoading(true);

    try {
      await updateDocumentMutation.mutateAsync(data);

      toast({
        title: 'Document mis à jour',
        description: 'Le document a été mis à jour avec succès.',
      });

      return true;
    } catch (error) {
      console.error('Erreur:', error);
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue lors de la mise à jour du document.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Demande de vérification d'un document
  const requestVerification = async (documentId: string, notes?: string) => {
    setIsLoading(true);

    try {
      await createVerificationMutation.mutateAsync({
        documentId,
        notes,
      });

      toast({
        title: 'Demande envoyée',
        description: 'Votre demande de vérification a été envoyée avec succès.',
      });

      return true;
    } catch (error) {
      console.error('Erreur:', error);
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue lors de la demande de vérification.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Admin: Mise à jour d'une vérification
  const updateVerification = async (
    verificationId: string,
    status: 'APPROVED' | 'REJECTED',
    notes?: string
  ) => {
    setIsLoading(true);

    try {
      await updateVerificationMutation.mutateAsync({
        verificationId,
        status,
        notes,
      });

      toast({
        title: 'Vérification mise à jour',
        description: `La vérification a été ${status === 'APPROVED' ? 'approuvée' : 'rejetée'} avec succès.`,
      });

      return true;
    } catch (error) {
      console.error('Erreur:', error);
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue lors de la mise à jour de la vérification.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Admin: Charger les vérifications en attente
  const loadPendingVerifications = async () => {
    return await pendingVerificationsQuery.refetch();
  };

  return {
    // États
    isUploading,
    isDeleting,
    isLoading,
    userDocuments,
    pendingDocuments,
    isLoadingUserDocs,
    isLoadingPendingDocs,

    // Fonctions
    uploadDocument,
    deleteDocument,
    verifyDocument,
    loadPendingDocuments,
    loadUserDocuments,
    approveDocument,
    rejectDocument,

    // Refresh
    refreshUserDocuments: () => utils.document.getUserDocuments.invalidate(),
    refreshPendingDocuments: () => utils.document.getPendingDocuments.invalidate(),

    // Admin
    loadPendingVerifications,
    updateVerification,

    // Admin: Documents en attente de vérification
    pendingVerifications: pendingVerificationsQuery.data,
  };
}
