import { useState, useCallback } from 'react';
import { api } from '@/trpc/react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

export type UploadType = 'announcement' | 'profile' | 'service' | 'document';

interface UseUploadOptions {
  type: UploadType;
  maxFiles?: number;
  maxFileSize?: number; // en MB
  onSuccess?: (results: any[]) => void;
  onError?: (error: string) => void;
}

interface UploadState {
  isUploading: boolean;
  progress: number;
  uploadedFiles: any[];
  errors: string[];
}

export function useUpload(options: UseUploadOptions) {
  const t = useTranslations('announcements');
  
  const [state, setState] = useState<UploadState>({
    isUploading: false,
    progress: 0,
    uploadedFiles: [],
    errors: []
  });

  const uploadFileMutation = api.upload.uploadFile.useMutation({
    onSuccess: (result) => {
      setState(prev => ({
        ...prev,
        uploadedFiles: [...prev.uploadedFiles, result.data],
        progress: 100
      }));
      toast.success(t('uploadSuccess') || 'Fichier uploadé avec succès');
    },
    onError: (error) => {
      const errorMessage = error.message || t('uploadError') || 'Erreur lors de l\'upload';
      setState(prev => ({
        ...prev,
        errors: [...prev.errors, errorMessage],
        isUploading: false
      }));
      toast.error(errorMessage);
      options.onError?.(errorMessage);
    }
  });

  const uploadAnnouncementPhotosMutation = api.upload.uploadAnnouncementPhotos.useMutation({
    onSuccess: (result) => {
      setState(prev => ({
        ...prev,
        uploadedFiles: result.data.photos,
        progress: 100,
        isUploading: false
      }));
      toast.success(result.message || 'Photos uploadées avec succès');
      options.onSuccess?.(result.data.photos);
    },
    onError: (error) => {
      const errorMessage = error.message || t('uploadError') || 'Erreur lors de l\'upload';
      setState(prev => ({
        ...prev,
        errors: [...prev.errors, errorMessage],
        isUploading: false
      }));
      toast.error(errorMessage);
      options.onError?.(errorMessage);
    }
  });

  const deleteFileMutation = api.upload.deleteFile.useMutation({
    onSuccess: () => {
      toast.success('Fichier supprimé avec succès');
    },
    onError: (error) => {
      toast.error(error.message || 'Erreur lors de la suppression');
    }
  });

  // Convertir un fichier en base64
  const fileToBase64 = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  }, []);

  // Valider un fichier
  const validateFile = useCallback((file: File): string | null => {
    const maxSizeBytes = (options.maxFileSize || 5) * 1024 * 1024;
    
    if (file.size > maxSizeBytes) {
      return t('fileSizeError') || `La taille du fichier dépasse la limite autorisée (${options.maxFileSize || 5}MB max)`;
    }

    // Validation des types selon le type d'upload
    const allowedTypes = {
      announcement: ['image/jpeg', 'image/png', 'image/webp'],
      profile: ['image/jpeg', 'image/png', 'image/webp'],
      service: ['image/jpeg', 'image/png', 'image/webp'],
      document: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    };

    if (!allowedTypes[options.type].includes(file.type)) {
      return `Type de fichier non autorisé. Types acceptés: ${allowedTypes[options.type].join(', ')}`;
    }

    return null;
  }, [options.type, options.maxFileSize, t]);

  // Upload un seul fichier
  const uploadSingleFile = useCallback(async (file: File, description?: string) => {
    const validationError = validateFile(file);
    if (validationError) {
      setState(prev => ({
        ...prev,
        errors: [...prev.errors, validationError]
      }));
      toast.error(validationError);
      return;
    }

    setState(prev => ({
      ...prev,
      isUploading: true,
      progress: 0,
      errors: []
    }));

    try {
      setState(prev => ({ ...prev, progress: 50 }));
      const base64 = await fileToBase64(file);
      
      await uploadFileMutation.mutateAsync({
        file: base64,
        type: options.type,
        description
      });

    } catch (error: any) {
      console.error('Erreur upload:', error);
    }
  }, [validateFile, fileToBase64, uploadFileMutation, options.type]);

  // Upload multiple fichiers (pour les photos d'annonces)
  const uploadMultipleFiles = useCallback(async (files: File[], announcementId?: string) => {
    if (files.length > (options.maxFiles || 5)) {
      const error = t('maxPhotosError', { count: options.maxFiles || 5 }) || 
                   `Vous ne pouvez pas uploader plus de ${options.maxFiles || 5} fichiers`;
      toast.error(error);
      return;
    }

    // Valider tous les fichiers
    const validationErrors: string[] = [];
    files.forEach((file, index) => {
      const error = validateFile(file);
      if (error) {
        validationErrors.push(`Fichier ${index + 1}: ${error}`);
      }
    });

    if (validationErrors.length > 0) {
      setState(prev => ({
        ...prev,
        errors: validationErrors
      }));
      validationErrors.forEach(error => toast.error(error));
      return;
    }

    setState(prev => ({
      ...prev,
      isUploading: true,
      progress: 0,
      errors: []
    }));

    try {
      setState(prev => ({ ...prev, progress: 25 }));
      
      // Convertir tous les fichiers en base64
      const base64Promises = files.map(file => fileToBase64(file));
      const base64Files = await Promise.all(base64Promises);
      
      setState(prev => ({ ...prev, progress: 75 }));

      if (options.type === 'announcement') {
        await uploadAnnouncementPhotosMutation.mutateAsync({
          photos: base64Files,
          announcementId
        });
      } else {
        // Upload séquentiel pour les autres types
        const results: any[] = [];
        for (let i = 0; i < base64Files.length; i++) {
          const result = await uploadFileMutation.mutateAsync({
            file: base64Files[i],
            type: options.type,
            description: `Fichier ${i + 1}`
          });
          results.push(result.data);
        }
        
        setState(prev => ({
          ...prev,
          uploadedFiles: results,
          isUploading: false,
          progress: 100
        }));
        options.onSuccess?.(results);
      }

    } catch (error: any) {
      console.error('Erreur upload multiple:', error);
    }
  }, [
    options.maxFiles, 
    options.type, 
    validateFile, 
    fileToBase64, 
    uploadFileMutation, 
    uploadAnnouncementPhotosMutation,
    options.onSuccess,
    t
  ]);

  // Supprimer un fichier
  const deleteFile = useCallback(async (fileUrl: string) => {
    try {
      await deleteFileMutation.mutateAsync({ fileUrl });
      setState(prev => ({
        ...prev,
        uploadedFiles: prev.uploadedFiles.filter(file => file.url !== fileUrl)
      }));
    } catch (error: any) {
      console.error('Erreur suppression:', error);
    }
  }, [deleteFileMutation]);

  // Reset de l'état
  const reset = useCallback(() => {
    setState({
      isUploading: false,
      progress: 0,
      uploadedFiles: [],
      errors: []
    });
  }, []);

  return {
    // État
    isUploading: state.isUploading || uploadFileMutation.isPending || uploadAnnouncementPhotosMutation.isPending,
    progress: state.progress,
    uploadedFiles: state.uploadedFiles,
    errors: state.errors,
    
    // Méthodes
    uploadSingleFile,
    uploadMultipleFiles,
    deleteFile,
    reset,
    
    // Utilitaires
    validateFile,
    fileToBase64
  };
} 