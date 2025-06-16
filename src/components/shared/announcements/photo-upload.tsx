"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { X, Upload } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";

interface PhotoUploadProps {
  initialPhotos?: string[];
  onChange: (photos: string[]) => void;
  maxPhotos?: number;
}

export function PhotoUpload({
  initialPhotos = [],
  onChange,
  maxPhotos = 5}: PhotoUploadProps) {
  const t = useTranslations("announcements");
  const [photos, setPhotos] = useState<string[]>(initialPhotos);
  const [uploading, setUploading] = useState(false);

  // Fonction pour télécharger une image vers le serveur
  const uploadPhoto = async (file: File): Promise<string> => {
    setUploading(true);

    try {
      // Créer un FormData pour l'upload
      const formData = new FormData();
      formData.append("file", file);

      // Envoyer au point d'API d'upload
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData});

      if (!response.ok) {
        throw new Error(t("uploadError"));
      }

      const data = await response.json();
      return data.fileUrl; // URL de l'image téléchargée
    } catch (error) {
      console.error("Erreur de téléchargement:", error);
      toast.error(t("uploadError"));
      throw error;
    } finally {
      setUploading(false);
    }
  };

  // Configuration de react-dropzone
  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (photos.length + acceptedFiles.length > maxPhotos) {
        toast.error(t("maxPhotosError", { max }));
        return;
      }

      try {
        setUploading(true);

        // Télécharger chaque fichier séquentiellement
        const uploadPromises = acceptedFiles.map((file) => uploadPhoto(file));
        const uploadedUrls = await Promise.all(uploadPromises);

        // Mettre à jour l'état local et notifier le parent
        const updatedPhotos = [...photos, ...uploadedUrls];
        setPhotos(updatedPhotos);
        onChange(updatedPhotos);
      } catch (error) {
        console.error("Erreur lors du téléchargement:", error);
      } finally {
        setUploading(false);
      }
    },
    [photos, maxPhotos, onChange, t],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/webp": [".webp"]},
    maxSize: 5 * 1024 * 1024, // 5 MB
    multiple: true});

  // Supprimer une photo
  const removePhoto = (index: number) => {
    const updatedPhotos = [...photos];
    updatedPhotos.splice(index, 1);
    setPhotos(updatedPhotos);
    onChange(updatedPhotos);
  };

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
          isDragActive
            ? "border-primary bg-primary/10"
            : "border-gray-300 hover:border-primary"
        }`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center py-4">
          <Upload className="h-10 w-10 text-muted-foreground mb-2" />
          {isDragActive ? (
            <p>{t("dropFilesHere")}</p>
          ) : (
            <div className="space-y-1 text-center">
              <p className="text-sm text-muted-foreground">
                {t("dragAndDrop")}
              </p>
              <p className="text-sm text-muted-foreground">{t("or")}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploading}
              >
                {uploading ? t("uploading") : t("selectFiles")}
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                {t("maxFileSize")}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("remainingPhotos", { count: maxPhotos - photos.length })}
              </p>
            </div>
          )}
        </div>
      </div>

      {photos.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mt-4">
          {photos.map((photo, index) => (
            <Card
              key={index}
              className="relative overflow-hidden aspect-square"
            >
              <Button
                type="button"
                size="icon"
                variant="destructive"
                className="absolute top-1 right-1 h-6 w-6 z-10"
                onClick={() => removePhoto(index)}
              >
                <X className="h-3 w-3" />
              </Button>
              <div className="w-full h-full relative">
                <Image
                  src={photo}
                  alt={t("photoAlt", { number: index + 1 })}
                  fill
                  style={{ objectFit: "cover" }}
                  className="rounded-md"
                />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
