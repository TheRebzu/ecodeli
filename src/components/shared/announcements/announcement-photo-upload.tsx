'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useTranslations } from 'next-intl';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Image from 'next/image';
import { cn } from '@/lib/utils/common';
import { useUpload } from '@/hooks/use-upload';

interface AnnouncementPhotoUploadProps {
  photos: string[];
  onPhotosChange: (photos: string[]) => void;
  maxPhotos?: number;
  disabled?: boolean;
  announcementId?: string;
}

export function AnnouncementPhotoUpload({
  photos = [],
  onPhotosChange,
  maxPhotos = 5,
  disabled = false,
  announcementId,
}: AnnouncementPhotoUploadProps) {
  const t = useTranslations('announcements');

  // Utiliser le hook d'upload tRPC
  const { isUploading, uploadMultipleFiles, errors, reset } = useUpload({
    type: 'announcement',
    maxFiles: maxPhotos,
    maxFileSize: 5, // 5MB
    onSuccess: results => {
      // Extraire les URLs des résultats et les ajouter aux photos existantes
      const newPhotoUrls = results.map(result => result.url);
      onPhotosChange([...photos, ...newPhotoUrls]);
      reset();
    },
    onError: error => {
      console.error('Erreur upload photos:', error);
    },
  });

  // Gestionnaire de drag & drop avec react-dropzone
  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (photos.length + acceptedFiles.length > maxPhotos) {
        return; // Le hook gère déjà cette validation
      }

      // Utiliser le hook pour l'upload
      await uploadMultipleFiles(acceptedFiles, announcementId);
    },
    [photos.length, maxPhotos, uploadMultipleFiles, announcementId]
  );

  // Configuration du dropzone
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': [],
      'image/png': [],
      'image/webp': [],
    },
    disabled: isUploading || disabled || photos.length >= maxPhotos,
    maxFiles: maxPhotos - photos.length,
  });

  // Fonction pour supprimer une photo
  const removePhoto = (indexToRemove: number) => {
    onPhotosChange(photos.filter((_, index) => index !== indexToRemove));
  };

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer transition-colors',
          isDragActive ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50',
          (isUploading || disabled || photos.length >= maxPhotos) && 'opacity-50 cursor-not-allowed'
        )}
      >
        <input {...getInputProps()} />
        <Upload className="h-10 w-10 text-muted-foreground mb-2" />
        <p className="text-sm text-center text-muted-foreground">
          {isUploading
            ? t('uploading')
            : photos.length >= maxPhotos
              ? t('maxPhotosReached', { count: maxPhotos })
              : isDragActive
                ? t('dropHere')
                : t('dragOrClick')}
        </p>
        <p className="text-xs text-center text-muted-foreground mt-1">
          {t('supportedFormats')} (JPG, PNG, WebP)
        </p>
        <p className="text-xs text-center text-muted-foreground">
          {t('maxFileSize')} 5MB - {t('remaining')}: {maxPhotos - photos.length}
        </p>
      </div>

      {/* Afficher les erreurs du hook */}
      {errors.length > 0 && (
        <div className="space-y-1">
          {errors.map((error, index) => (
            <p key={index} className="text-sm text-destructive">
              {error}
            </p>
          ))}
        </div>
      )}

      {photos && photos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
          {photos.map((photo, index) => (
            <Card key={index} className="relative group overflow-hidden">
              <CardContent className="p-0">
                <div className="relative aspect-square w-full">
                  {photo && (
                    <Image
                      src={photo || ''}
                      alt={t('announcementPhoto', { index: index + 1 })}
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="object-cover"
                    />
                  )}
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={e => {
                      e.stopPropagation();
                      removePhoto(index);
                    }}
                    disabled={disabled}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
