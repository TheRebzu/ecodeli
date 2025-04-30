'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useTranslations } from 'next-intl';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface AnnouncementPhotoUploadProps {
  photos: string[];
  onPhotosChange: (photos: string[]) => void;
  maxPhotos?: number;
  disabled?: boolean;
}

export function AnnouncementPhotoUpload({
  photos = [],
  onPhotosChange,
  maxPhotos = 5,
  disabled = false,
}: AnnouncementPhotoUploadProps) {
  const t = useTranslations('announcements');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Gestionnaire de drag & drop avec react-dropzone
  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (photos.length + acceptedFiles.length > maxPhotos) {
        setUploadError(t('maxPhotosError', { count: maxPhotos }));
        return;
      }

      // Vérifier la taille des fichiers (max 5MB par fichier)
      const oversizedFiles = acceptedFiles.filter(file => file.size > 5 * 1024 * 1024);
      if (oversizedFiles.length > 0) {
        setUploadError(t('fileSizeError'));
        return;
      }

      setIsUploading(true);
      setUploadError(null);

      try {
        // Créer un tableau de promesses pour l'upload de chaque fichier
        const uploadPromises = acceptedFiles.map(async file => {
          // Créer un FormData pour l'upload
          const formData = new FormData();
          formData.append('file', file);
          formData.append('type', 'announcement');

          // Appeler l'API d'upload
          const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            throw new Error(t('uploadError'));
          }

          const data = await response.json();
          return data.url;
        });

        // Attendre que tous les uploads soient terminés
        const newPhotoUrls = await Promise.all(uploadPromises);

        // Mettre à jour l'état des photos
        onPhotosChange([...photos, ...newPhotoUrls]);
      } catch (error) {
        console.error("Erreur lors de l'upload des photos:", error);
        setUploadError(t('uploadError'));
      } finally {
        setIsUploading(false);
      }
    },
    [photos, maxPhotos, onPhotosChange, t]
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

      {uploadError && <p className="text-sm text-destructive">{uploadError}</p>}

      {photos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
          {photos.map((photo, index) => (
            <Card key={index} className="relative group overflow-hidden">
              <CardContent className="p-0">
                <div className="relative aspect-square w-full">
                  <Image
                    src={photo}
                    alt={t('announcementPhoto', { index: index + 1 })}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover"
                  />
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
