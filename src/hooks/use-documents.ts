import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { api } from '@/trpc/react';
import { useToast } from '@/components/ui/use-toast';
import { DocumentType, DocumentStatus } from '@prisma/client';

export function useDocuments() {
  const [filter, setFilter] = useState<DocumentStatus | 'ALL'>('ALL');
  const t = useTranslations('documents');
  const { toast } = useToast();

  // Récupérer les documents de l'utilisateur
  const {
    data: userDocuments,
    isLoading: isLoadingUserDocs,
    refetch: refetchUserDocs,
  } = api.document.getUserDocuments.useQuery({
    status: filter !== 'ALL' ? filter : undefined,
  });

  // Supprimer un document
  const deleteDocument = api.document.deleteDocument.useMutation({
    onSuccess: () => {
      toast({
        title: t('deleteSuccess'),
        description: t('deleteSuccessDescription'),
      });
      refetchUserDocs();
    },
    onError: error => {
      toast({
        title: t('deleteError'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Télécharger un document
  const uploadDocument = api.document.uploadDocument.useMutation({
    onSuccess: () => {
      toast({
        title: t('uploadSuccess'),
        description: t('uploadSuccessDescription'),
      });
      refetchUserDocs();
    },
    onError: error => {
      toast({
        title: t('uploadError'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Récupérer les types de documents requis pour l'utilisateur
  const { data: requiredDocuments, isLoading: isLoadingRequired } =
    api.document.getRequiredDocumentTypes.useQuery();

  // Récupérer les types de documents manquants
  const getMissingDocumentTypes = (): DocumentType[] => {
    if (!requiredDocuments || !userDocuments) return [];

    const uploadedVerifiedTypes = userDocuments.filter(doc => doc.isVerified).map(doc => doc.type);

    return requiredDocuments.filter(type => !uploadedVerifiedTypes.includes(type));
  };

  return {
    userDocuments: userDocuments || [],
    isLoadingUserDocs,
    requiredDocuments: requiredDocuments || [],
    isLoadingRequired,
    missingDocuments: getMissingDocumentTypes(),
    deleteDocument: (id: string) => deleteDocument.mutateAsync(id),
    isDeleting: deleteDocument.isLoading,
    uploadDocument: (data: any) => uploadDocument.mutateAsync(data),
    isUploading: uploadDocument.isLoading,
    filter,
    setFilter,
  };
}
