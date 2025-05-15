import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { api } from '@/trpc/react';
import { useToast } from '@/components/ui/use-toast';
import { DocumentType, DocumentStatus } from '@prisma/client';

interface UseDocumentsProps {
  userId?: string;
  status?: DocumentStatus | 'ALL';
}

export function useDocuments(userId?: string, status: DocumentStatus | 'ALL' = 'ALL') {
  const [filter, setFilter] = useState<DocumentStatus | 'ALL'>(status);
  const [documents, setDocuments] = useState<any[]>([]);
  const t = useTranslations('documents');
  const { toast } = useToast();

  // Récupérer les documents d'un utilisateur spécifique ou de l'utilisateur connecté
  const {
    data: fetchedDocuments,
    isLoading,
    refetch: refreshDocuments,
  } = api.document.getUserDocuments.useQuery({
    status: filter !== 'ALL' ? filter : undefined,
    userId: userId,
  });

  useEffect(() => {
    if (fetchedDocuments) {
      setDocuments(fetchedDocuments);
    }
  }, [fetchedDocuments]);

  // Supprimer un document
  const deleteMutation = api.document.deleteDocument.useMutation({
    onSuccess: () => {
      refreshDocuments();
    },
    onError: error => {
      console.error('Error deleting document:', error);
    },
  });

  // Télécharger un document
  const uploadMutation = api.document.uploadDocument.useMutation({
    onSuccess: () => {
      refreshDocuments();
    },
    onError: error => {
      console.error('Error uploading document:', error);
    },
  });

  // Récupérer les types de documents requis pour l'utilisateur
  const { data: requiredDocuments, isLoading: isLoadingRequired } =
    api.document.getRequiredDocumentTypes.useQuery({
      userRole: 'DELIVERER', // Spécifique aux livreurs
    });

  // Fonction pour télécharger un document avec un type spécifique
  const uploadDocument = async (file: File, type: string, notes?: string) => {
    try {
      // Convert the file to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result);
        };
        reader.onerror = () => {
          reject(new Error('Failed to read file'));
        };
      });

      reader.readAsDataURL(file);
      const base64 = await base64Promise;

      // Use the API to upload the document
      await uploadMutation.mutateAsync({
        type: type as DocumentType,
        file: base64,
        notes: notes,
      });

      return true;
    } catch (error) {
      console.error('Error in uploadDocument:', error);
      throw error;
    }
  };

  // Fonction pour supprimer un document
  const deleteDocument = async (documentId: string) => {
    try {
      await deleteMutation.mutateAsync({ documentId });
      return true;
    } catch (error) {
      throw error;
    }
  };

  return {
    documents,
    isLoading: isLoading || uploadMutation.isPending || deleteMutation.isPending,
    uploadDocument,
    deleteDocument,
    refreshDocuments,
    filter,
    setFilter,
    requiredDocuments: requiredDocuments || [],
  };
}
