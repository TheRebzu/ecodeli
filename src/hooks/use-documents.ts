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

  // Fonction pour convertir un fichier en base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Échec de conversion du fichier en base64'));
        }
      };
      reader.onerror = error => reject(error);
    });
  };

  // Fonction pour télécharger un document avec un type spécifique
<<<<<<< HEAD
  const uploadDocument = async (file: File, type: string, notes: string = '') => {
    try {
      // Convertir le fichier en base64 avant de l'envoyer
      const base64File = await fileToBase64(file);

      console.log(
        `Envoi du fichier ${file.name} en base64, taille: ${base64File.length}, type: ${file.type}`
      );

      // Utiliser la mutation pour télécharger le document
      await uploadMutation.mutateAsync({
        file: base64File, // Envoyer la chaîne base64 au lieu de l'objet File
        type: type as DocumentType,
        notes,
=======
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
>>>>>>> 1b63c146c3df5c00cc1ce2e81d59f8f5633cf417
      });

      return true;
    } catch (error) {
<<<<<<< HEAD
      console.error('Upload error details:', error);
=======
      console.error('Error in uploadDocument:', error);
>>>>>>> 1b63c146c3df5c00cc1ce2e81d59f8f5633cf417
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
    isLoading: isLoading || uploadMutation.isPending || deleteMutation.isPending,
    uploadDocument,
    deleteDocument,
    refreshDocuments,
    filter,
    setFilter,
    requiredDocuments: requiredDocuments || [],
  };
}
