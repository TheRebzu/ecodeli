"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { useToast } from "@/components/ui/use-toast";
import type { UserDocument } from "@/types/users/verification";
import { useAuthStore } from "@/store/use-auth-store";

/**
 * Hook personnalisé pour gérer les fonctionnalités de vérification
 */
export function useVerification() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();
  const userRole = useAuthStore((state) => state.role);

  // Mutations tRPC
  const submitVerificationMutation =
    api.verification.submitVerification.useMutation();
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
    documents: UserDocument[],
  ) => {
    setIsSubmitting(true);

    try {
      // Progression réelle basée sur l'upload
      setUploadProgress(10);

      // Envoi de la demande de vérification
      const result = await submitVerificationMutation.mutateAsync({
        type,
        userId,
        documents,
      });

      // Progression complète après succès
      setUploadProgress(100);

      toast({ title: "Demande envoyée",
        variant: "success" });

      return result;
    } catch (error) {
      toast({ title: "Erreur",
        variant: "destructive" });
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
  // Patch: accept userRole as an argument for uploadDocument
  const uploadDocument = async (
    file: File,
    userId: string,
    documentType: string,
    userRoleArg?: string,
  ) => {
    try {
      const result = await api.document.uploadDocument.mutateAsync({ file,
        type: documentType as any, // Accept string or enum
        userId,
        userRole: userRoleArg || userRole });

      if (result) {
        toast({ title: "Document téléchargé",
          variant: "success" });

        return {
          documentUrl: result.fileUrl,
          documentId: result.id};
      }

      throw new Error("Échec du téléchargement");
    } catch (error) {
      toast({ title: "Erreur",
        variant: "destructive" });
      console.error("Erreur de téléchargement:", error);
      return null;
    }
  };

  /**
   * Supprime un document téléchargé
   */
  const deleteDocument = async (documentId: string) => {
    try {
      await deleteDocumentMutation.mutateAsync({ documentId  });

      toast({ title: "Document supprimé",
        variant: "success" });

      return true;
    } catch (error) {
      toast({ title: "Erreur",
        variant: "destructive" });
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
    getDocuments};
}
