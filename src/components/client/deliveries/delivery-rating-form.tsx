"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ButtonWithLoading } from "@/app/[locale]/(public)/loading";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils/common";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
  CheckCircle2,
  AlertCircle,
  Star,
  WifiOff,
  Clock,
  ImagePlus,
  Upload,
  Trash2,
} from "lucide-react";

// Schéma de validation
const ratingSchema = z.object({
  rating: z.number().min(1, "Veuillez donner une note").max(5),
  comment: z
    .string()
    .max(500, "Le commentaire ne peut pas dépasser 500 caractères")
    .optional(),
  photoUrls: z
    .array(z.string().url())
    .max(3, "Vous ne pouvez pas télécharger plus de 3 photos")
    .optional(),
});

type RatingFormValues = z.infer<typeof ratingSchema>;

interface DeliveryRatingFormProps {
  deliveryId: string;
  delivererName?: string;
  existingRating?: {
    rating: number;
    comment?: string;
    photoUrls?: string[];
    createdAt?: Date;
  };
  onSubmit: (data: RatingFormValues) => Promise<boolean>;
  onCancel?: () => void;
  className?: string;
  deadline?: Date;
}

export default function DeliveryRatingForm({
  deliveryId,
  delivererName,
  existingRating,
  onSubmit,
  onCancel,
  className = "",
  deadline,
}: DeliveryRatingFormProps) {
  const t = useTranslations("deliveries.rating");
  const [showSuccess, setShowSuccess] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [remainingTime, setRemainingTime] = useState<string | null>(null);
  const [photos, setPhotos] = useState<string[]>(
    existingRating?.photoUrls || [],
  );
  const [isUploading, setIsUploading] = useState<boolean>(false);

  // Initialiser le formulaire avec React Hook Form
  const form = useForm<RatingFormValues>({
    resolver: zodResolver(ratingSchema),
    defaultValues: {
      rating: existingRating?.rating || 0,
      comment: existingRating?.comment || "",
      photoUrls: existingRating?.photoUrls || [],
    },
  });

  const { handleSubmit, formState, setValue, watch } = form;
  const { errors, isSubmitting } = formState;
  const currentRating = watch("rating");

  // Vérifier l'état de la connexion
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Calculer le temps restant pour évaluer
  useEffect(() => {
    if (!deadline) return;

    const calculateRemainingTime = () => {
      const now = new Date();
      const deadlineDate = new Date(deadline);

      if (now > deadlineDate) {
        setRemainingTime(null);
        return;
      }

      const diffMs = deadlineDate.getTime() - now.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const diffHours = Math.floor(
        (diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
      );

      if (diffDays > 0) {
        setRemainingTime(t("timeLeft", { days: diffDays, hours: diffHours }));
      } else {
        setRemainingTime(t("timeLeftHours", { hours: diffHours }));
      }
    };

    calculateRemainingTime();
    const interval = setInterval(calculateRemainingTime, 60000); // Mise à jour toutes les minutes

    return () => clearInterval(interval);
  }, [deadline, t]);

  // Fonction pour télécharger une photo
  const handlePhotoUpload = async (file: File) => {
    if (photos.length >= 3 || !isOnline || isSubmitting) return;

    try {
      setIsUploading(true);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "rating");

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Erreur lors du téléchargement de la photo");
      }

      const data = await response.json();
      const newPhotos = [...photos, data.url];
      setPhotos(newPhotos);
      setValue("photoUrls", newPhotos);
    } catch (error) {
      console.error("Erreur de téléchargement:", error);
    } finally {
      setIsUploading(false);
    }
  };

  // Fonction pour supprimer une photo
  const handleDeletePhoto = (index: number) => {
    const newPhotos = [...photos];
    newPhotos.splice(index, 1);
    setPhotos(newPhotos);
    setValue("photoUrls", newPhotos);
  };

  // Traiter le formulaire
  const onFormSubmit = async (data: RatingFormValues) => {
    if (!isOnline) return;

    try {
      // Assurez-vous que photoUrls est bien envoyé
      const formData = {
        ...data,
        photoUrls: photos,
      };

      const success = await onSubmit(formData);
      if (success) {
        setShowSuccess(true);
      }
    } catch (error) {
      console.error("Erreur lors de l'envoi de l'évaluation:", error);
    }
  };

  // Composant d'étoile pour la notation
  const RatingStar = ({ value }: { value: number }) => (
    <button
      type="button"
      onClick={() => setValue("rating", value)}
      className={cn(
        "focus:outline-none transition-all",
        currentRating >= value
          ? "text-yellow-500 scale-110"
          : "text-gray-300 hover:text-yellow-200",
      )}
      disabled={isSubmitting}
    >
      <Star
        className="w-8 h-8"
        fill={currentRating >= value ? "currentColor" : "none"}
      />
    </button>
  );

  // Fonction pour déclencher le téléchargement de fichier
  const triggerFileUpload = () => {
    if (photos.length >= 3) return;

    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        handlePhotoUpload(file);
      }
    };
    input.click();
  };

  // Vérifier si l'évaluation peut être soumise
  const canRate = !deadline || new Date() < new Date(deadline);

  if (showSuccess) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-center text-green-600 flex items-center justify-center">
            <CheckCircle2 className="mr-2 h-6 w-6" />
            {existingRating ? t("updateSuccessTitle") : t("successTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center mb-4">
            <div className="flex space-x-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className="h-6 w-6"
                  fill={currentRating >= star ? "rgb(234 179 8)" : "none"}
                  stroke="rgb(234 179 8)"
                />
              ))}
            </div>
          </div>
          <p className="text-center mb-4">{t("successMessage")}</p>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button onClick={onCancel}>{t("backToDetails")}</Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{existingRating ? t("editTitle") : t("title")}</CardTitle>
        <CardDescription>
          {delivererName
            ? t("descriptionWithName", { name: delivererName })
            : existingRating
              ? t("editDescription")
              : t("description")}
        </CardDescription>

        {remainingTime && (
          <div className="mt-2 flex items-center text-amber-500 text-sm">
            <Clock className="h-4 w-4 mr-1" />
            {remainingTime}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {!canRate && !existingRating && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t("cannotRateTitle")}</AlertTitle>
            <AlertDescription>{t("cannotRateDescription")}</AlertDescription>
          </Alert>
        )}

        {!isOnline && (
          <Alert>
            <WifiOff className="h-4 w-4" />
            <AlertTitle>{t("offlineTitle")}</AlertTitle>
            <AlertDescription>{t("offlineDescription")}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="rating" className="text-center block">
              {t("ratingLabel")}
            </Label>
            <div className="flex justify-center space-x-2 py-4" id="rating">
              {[1, 2, 3, 4, 5].map((star) => (
                <RatingStar key={star} value={star} />
              ))}
            </div>
            {errors.rating && (
              <p className="text-sm text-destructive text-center">
                {errors.rating.message as string}
              </p>
            )}
            <p className="text-sm text-center text-muted-foreground">
              {currentRating
                ? t("ratingDescription", { rating: currentRating })
                : t("selectRating")}
            </p>
          </div>

          <div className="space-y-2 pt-4">
            <Label htmlFor="comment">{t("commentLabel")}</Label>
            <Textarea
              id="comment"
              {...form.register("comment")}
              placeholder={t("commentPlaceholder")}
              rows={4}
              disabled={isSubmitting || !isOnline}
              className="resize-none"
            />
            {errors.comment && (
              <p className="text-sm text-destructive">
                {errors.comment.message as string}
              </p>
            )}
            <p className="text-sm text-muted-foreground">{t("commentHelp")}</p>
          </div>

          <Separator className="my-4" />

          <div className="space-y-3">
            <Label>{t("photosLabel")}</Label>

            <div className="grid grid-cols-3 gap-2">
              {photos.map((url, index) => (
                <div
                  key={index}
                  className="relative group aspect-square rounded-md overflow-hidden border"
                >
                  <img
                    src={url}
                    alt={t("photoAlt", { index: index + 1 })}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => handleDeletePhoto(index)}
                    className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
                    disabled={isSubmitting}
                  >
                    <Trash2 className="h-6 w-6 text-white" />
                  </button>
                </div>
              ))}

              {photos.length < 3 && (
                <button
                  type="button"
                  onClick={triggerFileUpload}
                  disabled={isUploading || isSubmitting || !isOnline}
                  className={cn(
                    "border-2 border-dashed rounded-md flex flex-col items-center justify-center aspect-square p-2 transition-colors",
                    "hover:border-primary/50",
                    (isUploading || isSubmitting || !isOnline) &&
                      "opacity-50 cursor-not-allowed",
                  )}
                >
                  {isUploading ? (
                    <div className="flex flex-col items-center">
                      <span className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></span>
                      <span className="text-xs mt-1">{t("uploading")}</span>
                    </div>
                  ) : (
                    <>
                      <ImagePlus className="h-6 w-6 text-muted-foreground mb-1" />
                      <span className="text-xs text-center text-muted-foreground">
                        {t("addPhoto")}
                      </span>
                    </>
                  )}
                </button>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              {t("photosHelp", { remaining: 3 - photos.length })}
            </p>
          </div>

          {existingRating?.createdAt && (
            <p className="text-xs text-muted-foreground text-center">
              {t("originalRating")}:{" "}
              {new Date(existingRating.createdAt).toLocaleDateString("fr-FR")}
            </p>
          )}
        </form>
      </CardContent>

      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
          {t("cancelButton")}
        </Button>
        <ButtonWithLoading
          onClick={handleSubmit(onFormSubmit)}
          disabled={
            (!canRate && !existingRating) ||
            currentRating === 0 ||
            isSubmitting ||
            !isOnline
          }
          loading={isSubmitting}
        >
          {existingRating ? t("updateButton") : t("submitButton")}
        </ButtonWithLoading>
      </CardFooter>
    </Card>
  );
}
