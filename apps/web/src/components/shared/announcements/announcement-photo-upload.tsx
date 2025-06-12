'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Camera, Upload, X, Image as ImageIcon, AlertTriangle, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils/common';

interface PhotoFile {
  id: string;
  file: File;
  preview: string;
  uploadProgress?: number;
  isUploading?: boolean;
  isUploaded?: boolean;
  url?: string;
}

interface AnnouncementPhotoUploadProps {
  photos: string[];
  onPhotosChange: (photos: string[]) => void;
  maxPhotos?: number;
  maxFileSize?: number; // en MB
  disabled?: boolean;
  className?: string;
}

export function AnnouncementPhotoUpload({
  photos,
  onPhotosChange,
  maxPhotos = 5,
  maxFileSize = 5,
  disabled = false,
  className,
}: AnnouncementPhotoUploadProps) {
  const [photoFiles, setPhotoFiles] = useState<PhotoFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Gérer la sélection de fichiers
  const handleFileSelect = (files: FileList | null) => {
    if (!files || disabled) return;

    const newFiles: PhotoFile[] = [];
    const currentCount = photoFiles.length;

    Array.from(files).forEach((file, index) => {
      // Vérifier le nombre max de photos
      if (currentCount + newFiles.length >= maxPhotos) {
        toast.error(`Vous ne pouvez télécharger que ${maxPhotos} photos maximum`);
        return;
      }

      // Vérifier le type de fichier
      if (!file.type.startsWith('image/')) {
        toast.error(`Le fichier "${file.name}" n'est pas une image valide`);
        return;
      }

      // Vérifier la taille du fichier
      if (file.size > maxFileSize * 1024 * 1024) {
        toast.error(`Le fichier "${file.name}" dépasse ${maxFileSize}MB`);
        return;
      }

      const id = Date.now().toString() + index;
      const preview = URL.createObjectURL(file);

      newFiles.push({
        id,
        file,
        preview,
        isUploading: false,
        isUploaded: false,
      });
    });

    if (newFiles.length > 0) {
      setPhotoFiles(prev => [...prev, ...newFiles]);
      // Simuler l'upload
      newFiles.forEach(photoFile => {
        uploadPhoto(photoFile);
      });
    }
  };

  // Simuler l'upload de photo
  const uploadPhoto = async (photoFile: PhotoFile) => {
    setPhotoFiles(prev =>
      prev.map(p => (p.id === photoFile.id ? { ...p, isUploading: true, uploadProgress: 0 } : p))
    );

    // Simulation de l'upload avec progression
    const intervals = [10, 25, 50, 75, 90, 100];
    for (const progress of intervals) {
      await new Promise(resolve => setTimeout(resolve, 200));

      setPhotoFiles(prev =>
        prev.map(p => (p.id === photoFile.id ? { ...p, uploadProgress: progress } : p))
      );
    }

    // Marquer comme uploadé
    const uploadedUrl = photoFile.preview; // En réalité, ce serait l'URL retournée par l'API
    setPhotoFiles(prev =>
      prev.map(p =>
        p.id === photoFile.id ? { ...p, isUploading: false, isUploaded: true, url: uploadedUrl } : p
      )
    );

    // Ajouter l'URL à la liste des photos
    const newPhotos = [...photos, uploadedUrl];
    onPhotosChange(newPhotos);

    toast.success('Photo téléchargée avec succès');
  };

  // Supprimer une photo
  const removePhoto = (photoId: string) => {
    const photoToRemove = photoFiles.find(p => p.id === photoId);
    if (!photoToRemove) return;

    // Nettoyer l'URL d'objet
    URL.revokeObjectURL(photoToRemove.preview);

    // Retirer de la liste des fichiers
    setPhotoFiles(prev => prev.filter(p => p.id !== photoId));

    // Retirer de la liste des URLs
    if (photoToRemove.url) {
      const newPhotos = photos.filter(url => url !== photoToRemove.url);
      onPhotosChange(newPhotos);
    }
  };

  // Gérer le drag & drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (disabled) return;

    const files = e.dataTransfer.files;
    handleFileSelect(files);
  };

  // Ouvrir le sélecteur de fichiers
  const openFileSelector = () => {
    if (disabled) return;
    fileInputRef.current?.click();
  };

  // Prendre une photo (mobile)
  const takePhoto = async () => {
    if (disabled) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });

      // Ici on pourrait ouvrir un modal avec le flux vidéo
      // Pour simplifier, on ouvre juste le sélecteur de fichier
      toast.info('Fonction caméra à implémenter. Utilisez le sélecteur de fichier.');
      openFileSelector();

      // Arrêter le stream
      stream.getTracks().forEach(track => track.stop());
    } catch (error) {
      toast.error("Impossible d'accéder à la caméra");
      openFileSelector();
    }
  };

  // Prévisualiser une photo
  const previewPhoto = (photoFile: PhotoFile) => {
    // Ici on pourrait ouvrir un modal avec l'image en grand
    window.open(photoFile.preview, '_blank');
  };

  const hasPhotos = photoFiles.length > 0;
  const canAddMore = photoFiles.length < maxPhotos;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Zone de drop */}
      {canAddMore && (
        <div
          className={cn(
            'relative border-2 border-dashed rounded-lg p-6 transition-colors',
            dragActive
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-primary/50',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <ImageIcon className="h-6 w-6 text-primary" />
            </div>

            <div>
              <h3 className="font-medium text-sm">
                Ajoutez vos photos ({photoFiles.length}/{maxPhotos})
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Glissez-déposez vos images ou cliquez pour sélectionner
              </p>
              <p className="text-xs text-muted-foreground">
                Maximum {maxFileSize}MB par image • JPG, PNG, WebP
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={openFileSelector}
                disabled={disabled}
              >
                <Upload className="h-4 w-4 mr-2" />
                Parcourir
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={takePhoto}
                disabled={disabled}
              >
                <Camera className="h-4 w-4 mr-2" />
                Appareil photo
              </Button>
            </div>
          </div>

          {/* Input file caché */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={e => handleFileSelect(e.target.files)}
            disabled={disabled}
          />
        </div>
      )}

      {/* Liste des photos */}
      {hasPhotos && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {photoFiles.map(photoFile => (
            <Card key={photoFile.id} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="relative aspect-square">
                  <img
                    src={photoFile.preview}
                    alt="Photo de l'annonce"
                    className="w-full h-full object-cover"
                  />

                  {/* Overlay de progression */}
                  {photoFile.isUploading && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="text-center text-white space-y-2">
                        <div className="text-xs">Upload...</div>
                        <Progress value={photoFile.uploadProgress || 0} className="w-16 h-1" />
                        <div className="text-xs">{photoFile.uploadProgress || 0}%</div>
                      </div>
                    </div>
                  )}

                  {/* Overlay d'actions */}
                  <div className="absolute top-2 right-2 flex gap-1">
                    {photoFile.isUploaded && (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="h-6 w-6 p-0"
                        onClick={() => previewPhoto(photoFile)}
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                    )}

                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      className="h-6 w-6 p-0"
                      onClick={() => removePhoto(photoFile.id)}
                      disabled={photoFile.isUploading}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>

                  {/* Indicateur de statut */}
                  <div className="absolute bottom-2 left-2">
                    {photoFile.isUploading && (
                      <div className="bg-blue-500 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                        Upload...
                      </div>
                    )}
                    {photoFile.isUploaded && (
                      <div className="bg-green-500 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                        <div className="w-2 h-2 bg-white rounded-full" />
                        Uploadé
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Message si limite atteinte */}
      {!canAddMore && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Vous avez atteint la limite de {maxPhotos} photos. Supprimez une photo pour en ajouter
            une nouvelle.
          </AlertDescription>
        </Alert>
      )}

      {/* Instructions */}
      {hasPhotos && (
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• Les photos aident les livreurs à identifier votre colis</p>
          <p>• Évitez les informations personnelles visibles (adresses, noms)</p>
          <p>• Prenez des photos nettes et bien éclairées</p>
        </div>
      )}
    </div>
  );
}

export default AnnouncementPhotoUpload;
