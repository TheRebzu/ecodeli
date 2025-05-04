"use client";

import { useCallback } from 'react';
import { toast } from 'sonner';
import { api } from '@/trpc/react';
import { DocumentType, type Document } from '@prisma/client';

export function useProfileDocuments() {
  // Récupération des documents de l'utilisateur
  const {
    data: documents,
    isLoading: isLoadingDocuments,
    error: documentsError,
    refetch: refetchDocuments
  } = api.document.getMyDocuments.useQuery();
  
  // Procédure d'upload de document
  const uploadDocumentMutation = api.document.uploadDocument.useMutation({
    onSuccess: () => {
      toast.success('Document téléchargé avec succès');
      refetchDocuments();
    },
    onError: (error) => {
      toast.error(`Erreur lors du téléchargement du document: ${error.message}`);
    }
  });
  
  // Procédure de suppression de document
  const deleteDocumentMutation = api.document.deleteDocument.useMutation({
    onSuccess: () => {
      toast.success('Document supprimé avec succès');
      refetchDocuments();
    },
    onError: (error) => {
      toast.error(`Erreur lors de la suppression du document: ${error.message}`);
    }
  });
  
  /**
   * Télécharger un nouveau document
   */
  const uploadDocument = useCallback(
    (file: File, type: DocumentType, notes?: string) => {
      // Créer un objet FileList à partir du File pour correspondre à la signature de l'API
      const fileListContainer = new DataTransfer();
      fileListContainer.items.add(file);
      const fileList = fileListContainer.files;
      
      // Appeler la mutation avec les paramètres corrects
      uploadDocumentMutation.mutate({ 
        file: fileList,
        type, 
        notes 
      });
    },
    [uploadDocumentMutation]
  );
  
  /**
   * Supprimer un document
   */
  const deleteDocument = useCallback(
    (documentId: string) => {
      deleteDocumentMutation.mutate({ documentId });
    },
    [deleteDocumentMutation]
  );
  
  /**
   * Filtrer les documents par type
   */
  const getDocumentsByType = useCallback(
    (type: DocumentType) => {
      if (!documents) return [];
      return documents.filter((doc: Document) => doc.type === type);
    },
    [documents]
  );
  
  /**
   * Vérifier si l'utilisateur a un document de type spécifique
   */
  const hasDocumentOfType = useCallback(
    (type: DocumentType) => {
      if (!documents) return false;
      return documents.some((doc: Document) => doc.type === type);
    },
    [documents]
  );
  
  /**
   * Obtenir le document le plus récent d'un type spécifique
   */
  const getLatestDocumentOfType = useCallback(
    (type: DocumentType) => {
      if (!documents) return null;
      const typeDocuments = documents.filter((doc: Document) => doc.type === type);
      if (typeDocuments.length === 0) return null;
      
      return typeDocuments.reduce((latest: Document, current: Document) => {
        return new Date(latest.uploadedAt) > new Date(current.uploadedAt) ? latest : current;
      });
    },
    [documents]
  );
  
  return {
    documents,
    isLoadingDocuments,
    documentsError,
    uploadDocument,
    isUploadingDocument: uploadDocumentMutation.isPending,
    deleteDocument,
    isDeletingDocument: deleteDocumentMutation.isPending,
    getDocumentsByType,
    hasDocumentOfType,
    getLatestDocumentOfType,
    refreshDocuments: refetchDocuments
  };
} 