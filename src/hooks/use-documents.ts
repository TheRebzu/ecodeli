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
      // Ajout d'une notification de succès pour la suppression
      toast({
        title: t('delete.success.title'),
        description: t('delete.success.description'),
        variant: 'default',
      });
    },
    onError: error => {
      console.error('Error deleting document:', error);
      toast({
        title: t('delete.error.title'),
        description: `${error.message || t('delete.error.description')}`,
        variant: 'destructive',
      });
    },
  });

  // Télécharger un document
  const uploadMutation = api.document.uploadDocument.useMutation({
    onSuccess: data => {
      refreshDocuments();

      // Ajout d'une notification de succès pour l'upload
      toast({
        title: t('upload.success.title'),
        description: t('upload.success.description'),
        variant: 'default',
      });
    },
    onError: error => {
      console.error('Error uploading document:', error);
      toast({
        title: t('upload.error.title'),
        description: `${error.message || t('upload.error.description')}`,
        variant: 'destructive',
      });
    },
  });

  // Récupérer les types de documents requis pour l'utilisateur
  const { data: requiredDocuments, isLoading: isLoadingRequired } =
    api.document.getRequiredDocumentTypes.useQuery({
      userRole: 'DELIVERER', // Spécifique aux livreurs
    });

  // Fonction pour télécharger un document avec un type spécifique
  const uploadDocument = async (file: File, type: string, notes: string = '') => {
    try {
      // Utiliser correctement la mutation pour télécharger le document
      // avec le format attendu par l'API
      await uploadMutation.mutateAsync({
        file, // Le fichier à télécharger
        type: type as DocumentType, // Le type de document correctement typé
        notes, // Champ optionnel avec les notes supplémentaires
      });

      return true;
    } catch (error) {
      console.error('Upload error details:', error);
      throw error;
    }
  };

  // Fonction pour supprimer un document
  const deleteDocument = async (documentId: string) => {
    try {
      await deleteMutation.mutateAsync({ documentId });
      return true;
    } catch (error) {
      console.error('Delete error details:', error);
      throw error;
    }
  };

  return {
    documents,
    isLoading: isLoading || uploadMutation.isLoading || deleteMutation.isLoading,
    uploadDocument,
    deleteDocument,
    refreshDocuments,
    filter,
    setFilter,
    requiredDocuments: requiredDocuments || [],
  };
}
