"use client";

import { useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ButtonWithLoading } from "@/app/[locale]/(public)/loading";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useDeliveryConfirmation } from "@/hooks/delivery/use-delivery-confirmation";
import {
  CheckCircle2,
  AlertCircle,
  Upload,
  Camera,
  Package,
  Star,
  ThumbsUp,
  Delete,
} from "lucide-react";
import { cn } from "@/lib/utils/common";

// Schéma de validation
const confirmationSchema = z.object({
  code: z
    .string()
    .min(4, { message: "Le code doit contenir au moins 4 caractères" })
    .max(8, { message: "Le code ne doit pas dépasser 8 caractères" }),
  feedback: z
    .string()
    .max(500, { message: "Le feedback ne doit pas dépasser 500 caractères" })
    .optional(),
  acknowledgement: z.boolean().refine((val) => val === true, {
    message: "Vous devez confirmer la réception de votre commande",
  }),
  saveAsDefaultAddress: z.boolean().optional(),
});

type ConfirmationFormValues = z.infer<typeof confirmationSchema>;

interface DeliveryConfirmationFormProps {
  deliveryId: string;
  onCancel?: () => void;
  onSuccess?: () => void;
  afterConfirmation?: "rating" | "details" | "list";
  className?: string;
}

export default function DeliveryConfirmationForm({
  deliveryId,
  onCancel,
  onSuccess,
  afterConfirmation = "details",
  className = "",
}: DeliveryConfirmationFormProps) {
  const t = useTranslations("deliveries.confirmation");
  const [showSuccess, setShowSuccess] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Utiliser le hook de confirmation
  const { delivery, confirmDelivery, isConfirming, canConfirm, error } =
    useDeliveryConfirmation(deliveryId);

  // Initialiser le formulaire
  const form = useForm<ConfirmationFormValues>({
    resolver: zodResolver(confirmationSchema),
    defaultValues: {
      code: "",
      feedback: "",
      acknowledgement: false,
      saveAsDefaultAddress: false,
    },
  });

  // Traitement du formulaire
  const onSubmit = async (data: ConfirmationFormValues) => {
    if (!canConfirm) return;

    try {
      // Préparer les données du formulaire avec les photos
      const formData = new FormData();
      formData.append("code", data.code);
      if (data.feedback) formData.append("feedback", data.feedback);
      formData.append("acknowledgement", String(data.acknowledgement));
      formData.append(
        "saveAsDefaultAddress",
        String(data.saveAsDefaultAddress),
      );
      photos.forEach((photo, index) => {
        formData.append(`photo_${index}`, photo);
      });

      // Appeler le service de confirmation
      const success = await confirmDelivery({
        code: data.code,
        feedback: data.feedback,
        photos: photos,
        acknowledgement: data.acknowledgement,
        saveAsDefaultAddress: data.saveAsDefaultAddress,
      });

      if (success) {
        setShowSuccess(true);
        if (onSuccess) onSuccess();
      }
    } catch (err) {
      console.error("Erreur lors de la confirmation:", err);
    }
  };

  // Gérer les téléchargements de photos
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newPhotos = Array.from(e.target.files);
      setPhotos((prev) => [...prev, ...newPhotos].slice(0, 3)); // Limiter à 3 photos
    }
  };

  // Prendre une photo avec la caméra
  const handleTakePhoto = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Supprimer une photo
  const handleRemovePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  // Messages de succès en fonction de l'action suivante
  const getSuccessMessage = () => {
    switch (afterConfirmation) {
      case "rating":
        return t("successMessageRating");
      case "list":
        return t("successMessageList");
      default:
        return t("successMessage");
    }
  };

  // Afficher l'écran de succès
  if (showSuccess) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-center text-green-600 flex items-center justify-center">
            <CheckCircle2 className="mr-2 h-6 w-6" />
            {t("successTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center">
          <div className="rounded-full bg-green-50 p-5 mb-4">
            <Package className="h-12 w-12 text-green-500" />
          </div>
          <p className="text-center mb-4">{getSuccessMessage()}</p>

          {afterConfirmation === "rating" && (
            <div className="flex items-center justify-center space-x-1 my-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className="h-8 w-8 text-yellow-400"
                  fill="rgb(250 204 21)"
                />
              ))}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button onClick={onCancel} className="flex items-center">
            {afterConfirmation === "rating" ? (
              <>
                <ThumbsUp className="mr-2 h-4 w-4" />
                {t("leaveRating")}
              </>
            ) : afterConfirmation === "list" ? (
              <>
                <Package className="mr-2 h-4 w-4" />
                {t("viewOrders")}
              </>
            ) : (
              <>
                <Package className="mr-2 h-4 w-4" />
                {t("viewDetails")}
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        {!canConfirm && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t("cannotConfirmTitle")}</AlertTitle>
            <AlertDescription>{t("cannotConfirmDescription")}</AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t("errorTitle")}</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("codeLabel")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("codePlaceholder")}
                      {...field}
                      disabled={!canConfirm || isConfirming}
                      className="text-center text-lg font-semibold tracking-widest"
                      maxLength={8}
                    />
                  </FormControl>
                  <FormDescription>{t("codeHelp")}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <FormLabel>{t("photoEvidenceLabel")}</FormLabel>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full flex items-center"
                  onClick={handleTakePhoto}
                  disabled={!canConfirm || isConfirming || photos.length >= 3}
                >
                  <Camera className="mr-2 h-4 w-4" />
                  {t("takePhotoButton")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full flex items-center"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!canConfirm || isConfirming || photos.length >= 3}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {t("uploadPhotoButton")}
                </Button>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handlePhotoUpload}
                  disabled={!canConfirm || isConfirming || photos.length >= 3}
                />
              </div>
              <p className="text-xs text-muted-foreground text-center">
                {t("photoOptional")}
              </p>

              {photos.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {photos.map((photo, index) => (
                    <div key={index} className="relative">
                      <img
                        src={URL.createObjectURL(photo)}
                        alt={`Photo ${index + 1}`}
                        className="w-20 h-20 object-cover rounded-md"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(index)}
                        className="absolute -top-2 -right-2 rounded-full bg-destructive text-white p-1 w-6 h-6 flex items-center justify-center"
                        disabled={isConfirming}
                      >
                        <Delete className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <FormField
              control={form.control}
              name="feedback"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("feedbackLabel")}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t("feedbackPlaceholder")}
                      className="min-h-[80px]"
                      {...field}
                      disabled={!canConfirm || isConfirming}
                    />
                  </FormControl>
                  <FormDescription>{t("feedbackHelp")}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {delivery?.address && (
              <FormField
                control={form.control}
                name="saveAsDefaultAddress"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 border rounded-md p-3">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={!canConfirm || isConfirming}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-sm font-medium">
                        {t("saveAddressLabel")}
                      </FormLabel>
                      <FormDescription className="text-xs">
                        {t("saveAddressDescription")}
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="acknowledgement"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 border rounded-md p-4 bg-muted/20">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={!canConfirm || isConfirming}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="font-medium">
                      {t("acknowledgeLabel")}
                    </FormLabel>
                    <FormDescription>
                      {t("acknowledgeDescription")}
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex justify-between border-t pt-6">
        <Button variant="outline" onClick={onCancel} disabled={isConfirming}>
          {t("cancelButton")}
        </Button>
        <ButtonWithLoading
          onClick={form.handleSubmit(onSubmit)}
          disabled={!canConfirm || isConfirming}
          loading={isConfirming}
        >
          {t("confirmButton")}
        </ButtonWithLoading>
      </CardFooter>
    </Card>
  );
}
