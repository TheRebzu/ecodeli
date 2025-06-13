import { useState, useCallback } from "react";
import { api } from "@/trpc/react";
import { useToast } from "@/components/ui/use-toast";
import { DocumentType } from "@prisma/client";

interface UploadOptions {
  documentType?: DocumentType;
  onSuccess?: (fileUrl: string) => void;
  onError?: (error: Error) => void;
}

/**
 * Hook personnalisé pour gérer l'upload de fichiers
 * Utilise tRPC pour préparer l'upload et l'API route pour le streaming
 */
export function useFileUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();

  const prepareUploadMutation = api.file.prepareUpload.useMutation();

  const uploadFile = useCallback(
    async (file: File, options?: UploadOptions) => {
      try {
        setIsUploading(true);
        setUploadProgress(0);

        // 1. Préparer l'upload avec tRPC
        const uploadInfo = await prepareUploadMutation.mutateAsync({
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          documentType: options?.documentType,
        });

        // 2. Créer le FormData pour l'upload
        const formData = new FormData();
        formData.append("file", file);
        formData.append("uploadId", uploadInfo.uploadId);
        formData.append("uploadToken", uploadInfo.uploadToken);
        if (options?.documentType) {
          formData.append("documentType", options.documentType);
        }

        // 3. Upload le fichier via l'API route
        const xhr = new XMLHttpRequest();

        // Gérer la progression
        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            const percentComplete = (event.loaded / event.total) * 100;
            setUploadProgress(Math.round(percentComplete));
          }
        });

        // Promesse pour gérer l'upload
        const uploadPromise = new Promise<string>((resolve, reject) => {
          xhr.onload = () => {
            if (xhr.status === 200) {
              const response = JSON.parse(xhr.responseText);
              if (response.success && response.fileUrl) {
                resolve(response.fileUrl);
              } else {
                reject(
                  new Error(response.message || "Erreur lors de l'upload"),
                );
              }
            } else {
              reject(new Error(`Erreur HTTP: ${xhr.status}`));
            }
          };

          xhr.onerror = () => {
            reject(new Error("Erreur réseau lors de l'upload"));
          };
        });

        // Lancer l'upload
        xhr.open("POST", uploadInfo.uploadUrl);
        xhr.send(formData);

        const fileUrl = await uploadPromise;

        // Succès
        toast({
          title: "Succès",
          description: "Fichier uploadé avec succès",
        });

        options?.onSuccess?.(fileUrl);
        return fileUrl;
      } catch (error) {
        console.error("Erreur lors de l'upload:", error);

        const errorMessage =
          error instanceof Error
            ? error.message
            : "Erreur lors de l'upload du fichier";

        toast({
          title: "Erreur",
          description: errorMessage,
          variant: "destructive",
        });

        options?.onError?.(error as Error);
        throw error;
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
      }
    },
    [prepareUploadMutation],
  );

  return {
    uploadFile,
    isUploading,
    uploadProgress,
  };
}

/**
 * Hook pour gérer le téléchargement de fichiers
 */
export function useFileDownload() {
  const [isDownloading, setIsDownloading] = useState(false);
  const { toast } = useToast();

  const getDownloadUrlQuery = api.file.getDownloadUrl.useQuery;

  const downloadFile = useCallback(
    async (fileUrl: string, fileName?: string, forceDownload = true) => {
      try {
        setIsDownloading(true);

        // Obtenir l'URL signée via tRPC
        const { data } = await getDownloadUrlQuery({
          fileUrl,
          forceDownload,
        });

        if (!data) {
          throw new Error("Impossible d'obtenir l'URL de téléchargement");
        }

        // Créer un lien temporaire pour télécharger
        const link = document.createElement("a");
        link.href = data.url;
        if (fileName) {
          link.download = fileName;
        }
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast({
          title: "Téléchargement démarré",
          description: "Le fichier est en cours de téléchargement",
        });
      } catch (error) {
        console.error("Erreur lors du téléchargement:", error);

        toast({
          title: "Erreur",
          description: "Impossible de télécharger le fichier",
          variant: "destructive",
        });

        throw error;
      } finally {
        setIsDownloading(false);
      }
    },
    [getDownloadUrlQuery],
  );

  return {
    downloadFile,
    isDownloading,
  };
}

/**
 * Hook pour supprimer des fichiers
 */
export function useFileDelete() {
  const { toast } = useToast();
  const deleteFileMutation = api.file.deleteFile.useMutation();

  const deleteFile = useCallback(
    async (fileUrl: string) => {
      try {
        const result = await deleteFileMutation.mutateAsync({ fileUrl });

        toast({
          title: "Succès",
          description: "Fichier supprimé avec succès",
        });

        return result;
      } catch (error) {
        console.error("Erreur lors de la suppression:", error);

        toast({
          title: "Erreur",
          description: "Impossible de supprimer le fichier",
          variant: "destructive",
        });

        throw error;
      }
    },
    [deleteFileMutation],
  );

  return {
    deleteFile,
    isDeleting: deleteFileMutation.isPending,
  };
}
