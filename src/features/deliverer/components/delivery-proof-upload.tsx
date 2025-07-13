"use client";

import { useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Camera,
  Upload,
  MapPin,
  CheckCircle,
  XCircle,
  Image as ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface DeliveryProofUploadProps {
  deliveryId: string;
  onUploadComplete: () => void;
}

export default function DeliveryProofUpload({
  deliveryId,
  onUploadComplete,
}: DeliveryProofUploadProps) {
  const t = useTranslations("deliverer.delivery");
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Vérifier le type de fichier
      if (!file.type.startsWith("image/")) {
        toast.error(t("proof.error.invalid_file_type"));
        return;
      }

      // Vérifier la taille (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error(t("proof.error.file_too_large"));
        return;
      }

      setPhotoFile(file);

      // Créer un aperçu
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadPhoto = async (): Promise<string> => {
    if (!photoFile) {
      throw new Error("No photo file");
    }

    // Simuler l'upload vers un service de stockage
    // En production, utilisez un vrai service comme Cloudinary, AWS S3, etc.
    return new Promise((resolve) => {
      setTimeout(() => {
        // Simuler une URL d'upload
        resolve(`https://example.com/uploads/${Date.now()}-${photoFile.name}`);
      }, 1000);
    });
  };

  const handleUpload = async () => {
    if (!photoFile) {
      toast.error(t("proof.error.no_photo"));
      return;
    }

    try {
      setLoading(true);

      // Upload de la photo
      const photoUrl = await uploadPhoto();

      // Envoyer les données à l'API
      const response = await fetch(
        `/api/deliverer/deliveries/${deliveryId}/proof`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            photo: photoUrl,
            notes: notes.trim() || undefined,
            gpsCoordinates: {
              latitude: 48.8566, // Coordonnées simulées
              longitude: 2.3522,
            },
          }),
        },
      );

      if (response.ok) {
        toast.success(t("proof.success.uploaded"));
        setUploaded(true);
        setShowUploadDialog(false);
        onUploadComplete();

        // Reset form
        setPhotoFile(null);
        setPhotoPreview(null);
        setNotes("");
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || t("proof.error.upload_failed"));
      }
    } catch (error) {
      console.error("Error uploading proof:", error);
      toast.error(t("proof.error.upload_failed"));
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    setNotes("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <>
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Camera className="w-5 h-5 mr-2" />
            {t("proof.title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">{t("proof.description")}</p>

          {uploaded ? (
            <div className="p-3 rounded-lg bg-green-50 border border-green-200">
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                <span className="text-green-800">
                  {t("proof.status.uploaded")}
                </span>
              </div>
            </div>
          ) : (
            <Button
              onClick={() => setShowUploadDialog(true)}
              className="w-full"
            >
              <Upload className="w-4 h-4 mr-2" />
              {t("proof.upload_button")}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Dialog d'upload */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("proof.dialog.title")}</DialogTitle>
            <DialogDescription>
              {t("proof.dialog.description")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Upload de photo */}
            <div>
              <label className="block text-sm font-medium mb-2">
                {t("proof.photo")} *
              </label>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                {photoPreview ? (
                  <div className="space-y-2">
                    <img
                      src={photoPreview}
                      alt="Aperçu"
                      className="w-full max-h-48 object-cover rounded"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setPhotoFile(null);
                        setPhotoPreview(null);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = "";
                        }
                      }}
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      {t("proof.remove_photo")}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <ImageIcon className="w-12 h-12 text-gray-400 mx-auto" />
                    <p className="text-sm text-gray-600">
                      {t("proof.drag_drop_or_click")}
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      {t("proof.select_photo")}
                    </Button>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoSelect}
                  className="hidden"
                />
              </div>

              <p className="text-xs text-gray-500 mt-2">
                {t("proof.file_requirements")}
              </p>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium mb-2">
                {t("proof.notes")} ({t("proof.optional")})
              </label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t("proof.notes_placeholder")}
                rows={3}
              />
            </div>

            {/* GPS Coordinates */}
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center text-sm text-blue-700">
                <MapPin className="w-4 h-4 mr-2" />
                {t("proof.gps_auto")}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowUploadDialog(false);
                resetForm();
              }}
            >
              {t("proof.cancel")}
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!photoFile || loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? t("proof.uploading") : t("proof.upload")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
