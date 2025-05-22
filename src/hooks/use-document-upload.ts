import { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { api } from '@/hooks/use-trpc';
import { DocumentType } from '@prisma/client';

type FileWithPreview = {
  file: File;
  preview: string;
  type: DocumentType;
  name: string;
};

/**
 * Hook pour gérer l'upload de documents
 * Permet de télécharger des documents, suivre le progrès et gérer les erreurs
 */
export function useDocumentUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const { toast } = useToast();

  // Utiliser la mutation TRPC
  const utils = api.useContext();
  const uploadDocument = api.document.uploadDocument.useMutation({
    onSuccess: () => {
      // Invalider la requête pour mettre à jour la liste des documents
      utils.document.getUserDocuments.invalidate();
    },
  });

  // Ajouter un fichier à la liste avec prévisualisation
  const addFile = (file: File, type: DocumentType) => {
    if (!file) return;

    // Vérifier le type de fichier
    const acceptedTypes = ['image/jpeg', 'image/png', 'application/pdf', 'image/heic'];
    if (!acceptedTypes.includes(file.type)) {
      toast({
        title: 'Type de fichier non pris en charge',
        description: 'Veuillez télécharger une image (JPG, PNG, HEIC) ou un PDF.',
        variant: 'destructive',
      });
      return;
    }

    // Vérifier la taille du fichier (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast({
        title: 'Fichier trop volumineux',
        description: 'La taille maximale est de 5MB.',
        variant: 'destructive',
      });
      return;
    }

    // Créer la prévisualisation
    const preview = URL.createObjectURL(file);

    setFiles(prev => [
      ...prev,
      {
        file,
        preview,
        type,
        name: file.name,
      },
    ]);
  };

  // Supprimer un fichier de la liste
  const removeFile = (index: number) => {
    setFiles(prev => {
      const newFiles = [...prev];
      URL.revokeObjectURL(newFiles[index].preview);
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  // Fonction utilitaire pour convertir un fichier en base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to convert file to base64'));
        }
      };
      reader.onerror = error => reject(error);
    });
  };

  // Télécharger un fichier via tRPC
  const uploadFile = async (
    file: File,
    type: DocumentType,
    notes: string = '',
    expiryDate?: Date
  ) => {
    setIsUploading(true);
    setProgress(0);
    setError(null);

    try {
      // Convertir le fichier en base64
      const base64File = await fileToBase64(file);

      // Progression à 50% après lecture du fichier
      setProgress(50);

      console.log('Type of file being sent:', typeof base64File);

      // Envoi via la mutation TRPC
      const result = await uploadDocument.mutateAsync({
        type,
        file: base64File, // Envoyer la chaîne base64
        notes,
        expiryDate,
      });

      setProgress(100);
      toast({
        title: 'Document téléchargé',
        description: 'Votre document a été téléchargé avec succès.',
      });

      return result;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Erreur lors de l'upload du document";
      setError(errorMessage);
      toast({
        title: 'Erreur',
        description: errorMessage,
        variant: 'destructive',
      });
      throw err;
    } finally {
      setIsUploading(false);
    }
  };

  // Télécharger tous les fichiers dans la liste
  const uploadAllFiles = async () => {
    if (files.length === 0) {
      toast({
        title: 'Aucun fichier à télécharger',
        description: 'Veuillez ajouter des fichiers à télécharger.',
        variant: 'destructive',
      });
      return [];
    }

    setIsUploading(true);
    const results = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const { file, type } = files[i];
        setProgress(Math.round((i / files.length) * 100));

        // Attendre que le fichier soit téléchargé
        const result = await uploadFile(file, type);
        results.push(result);
      }

      // Vider la liste des fichiers après téléchargement
      setFiles([]);
      setProgress(100);

      toast({
        title: 'Documents téléchargés',
        description: `${results.length} document(s) téléchargé(s) avec succès.`,
      });

      return results;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Erreur lors de l'upload des documents";
      setError(errorMessage);
      toast({
        title: 'Erreur',
        description: errorMessage,
        variant: 'destructive',
      });
      return [];
    } finally {
      setIsUploading(false);
    }
  };

  // Nettoyer les prévisualisations lors du démontage du composant
  const clearFiles = () => {
    files.forEach(file => {
      URL.revokeObjectURL(file.preview);
    });
    setFiles([]);
  };

  return {
    files,
    addFile,
    removeFile,
    uploadFile,
    uploadAllFiles,
    clearFiles,
    isUploading,
    progress,
    error,
    uploadDocument: uploadDocument.mutateAsync, // Accès direct à la mutation tRPC
  };
}
