'use client';

import { useState } from 'react';
import { api } from '@/trpc/react';
import { useToast } from '@/components/ui/use-toast';
import type { UserDocument } from '@/types/verification';

/**
 * Hook personnalisé pour gérer les fonctionnalités de vérification
 */
export function useVerification() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();

  // Mutations tRPC
  const submitVerificationMutation = api.verification.submitVerification.useMutation();
  const uploadDocumentMutation = api.verification.uploadDocument.useMutation();
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
      // Simuler un progrès d'upload pour l'UX (à remplacer par un vrai système de suivi de progression)
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
        variant: "success",
      });

      return result;
    } catch (error) {
      toast({
        title: "Erreur",
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
      // Création d'un FormData pour l'upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', userId);
      formData.append('documentType', documentType);

      // Envoi du fichier au serveur via fetch pour gérer l'upload
      const uploadResponse = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error('Échec du téléchargement');
      }

      const { documentUrl, documentId } = await uploadResponse.json();

      // Enregistrer le document dans la base de données via tRPC
      await uploadDocumentMutation.mutateAsync({
        userId,
        documentType,
        documentUrl,
        documentId,
      });

      toast({
        title: "Document téléchargé",
        variant: "success",
      });

      return { documentUrl, documentId };
    } catch (error) {
      toast({
        title: "Erreur",
        variant: "destructive",
      });
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
        variant: "success",
      });
      
      return true;
    } catch (error) {
      toast({
        title: "Erreur",
        variant: "destructive",
      });
      console.error("Erreur de suppression:", error);
      return false;
    }
  };

  return {
    isSubmitting,
    uploadProgress,
    submitVerification,
    uploadDocument,
    deleteDocument,
    getVerificationStatus,
    getDocuments,
  };
} 