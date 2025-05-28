'use client';

import { useState } from 'react';
import { api } from '@/trpc/react';
import { useToast } from '@/components/ui/use-toast';
import { useFileUpload } from '@/hooks/use-file-upload';
import type { UserDocument } from '@/types/verification';
import { DocumentType } from '@prisma/client';

/**
 * Hook personnalisé pour gérer les fonctionnalités de vérification
 */
export function useVerification() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();
  const { uploadFile, isUploading, uploadProgress: fileUploadProgress } = useFileUpload();

  // Mutations tRPC
  const submitVerificationMutation = api.verification.submitVerification.useMutation();
  const deleteDocumentMutation = api.verification.deleteDocument.useMutation();

  // Queries tRPC
  const getVerificationStatus = api.verification.getVerificationStatus.useQuery;
  const getDocuments = api.verification.getDocuments.useQuery;

  /**
   * Soumet une demande de vérification avec les documents associés
   */
  const submitVerification = async (
    type: string,
    userId: string,
    documents: UserDocument[]
  ) => {
    setIsSubmitting(true);
    
    try {
      // Simuler un progrès d'upload pour l'UX
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 95) {
            clearInterval(progressInterval);
            return 95;
          }
          return prev + 5;
        });
      }, 200);

      // Envoi de la demande de vérification
      const result = await submitVerificationMutation.mutateAsync({
        type,
        userId,
        documents,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      toast({
        title: "Demande envoyée",
        // @ts-ignore
        description: "Votre demande de vérification a été envoyée avec succès",
        // @ts-ignore
        variant: "success",
      });

      return result;
    } catch (error) {
      toast({
        title: "Erreur",
        // @ts-ignore
        description: "Impossible d'envoyer votre demande de vérification",
        variant: "destructive",
      });
      console.error("Erreur de vérification:", error);
      return null;
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  };

  /**
   * Charge un document sur le serveur et retourne son URL
   */
  const uploadDocument = async (file: File, userId: string, documentType: string) => {
    try {
      // Utiliser le hook de file upload avec le type de document approprié
      const fileUrl = await uploadFile(file, {
        documentType: documentType as DocumentType,
        onSuccess: (url) => {
          console.log('Document uploadé avec succès:', url);
        },
        onError: (error) => {
          console.error('Erreur upload document:', error);
          throw error;
        }
      });

      // Retourner les informations du document
      return { 
        documentUrl: fileUrl, 
        documentId: fileUrl.split('/').pop()?.split('.')[0] || ''
      };
    } catch (error) {
      console.error("Erreur de téléchargement:", error);
      return null;
    }
  };

  /**
   * Supprime un document téléchargé
   */
  const deleteDocument = async (documentId: string) => {
    try {
      await deleteDocumentMutation.mutateAsync({ documentId });
      
      toast({
        title: "Document supprimé",
        // @ts-ignore
        description: "Le document a été supprimé avec succès",
        // @ts-ignore
        variant: "success",
      });
      
      return true;
    } catch (error) {
      toast({
        title: "Erreur",
        // @ts-ignore
        description: "Impossible de supprimer le document",
        variant: "destructive",
      });
      console.error("Erreur de suppression:", error);
      return false;
    }
  };

  return {
    isSubmitting,
    uploadProgress: isUploading ? fileUploadProgress : uploadProgress,
    submitVerification,
    uploadDocument,
    deleteDocument,
    getVerificationStatus,
    getDocuments,
  };
} 