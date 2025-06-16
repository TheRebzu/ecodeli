"use client";

import { useState, useEffect } from "react";
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
  CardTitle} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ButtonWithLoading } from "@/app/[locale]/(public)/loading";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage} from "@/components/ui/form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  CheckCircle2,
  AlertCircle,
  Camera,
  Upload,
  User,
  MapPin,
  Package} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { DeliveryStatus } from "@/types/delivery/delivery";

// Schéma de validation
const confirmationSchema = z.object({ confirmationCode: z
    .string()
    .min(4, { message: "Le code doit contenir au moins 4 caractères"  })
    .max(8, { message: "Le code ne doit pas dépasser 8 caractères" }),
  recipientName: z
    .string()
    .min(2, { message: "Veuillez indiquer qui a reçu le colis" }),
  confirmReceipt: z.boolean().refine((val) => val === true, {
    message: "Vous devez confirmer que le colis a été remis"}),
  safeLocation: z.boolean().optional(),
  safeLocationDetails: z.string().optional()});

// Activer le champ de détails si "lieu sûr" est coché
const confirmationSchemaWithSafeLocation = confirmationSchema.superRefine(
  (data, ctx) => {
    if (
      data.safeLocation &&
      (!data.safeLocationDetails || data.safeLocationDetails.length < 5)
    ) {
      ctx.addIssue({ code: z.ZodIssueCode.custom,
        message: "Veuillez décrire le lieu où le colis a été déposé",
        path: ["safeLocationDetails"] });
    }
  },
);

type ConfirmationFormValues = z.infer<
  typeof confirmationSchemaWithSafeLocation
>;

interface DeliveryConfirmationProps {
  deliveryId: string;
  deliveryStatus?: DeliveryStatus;
  currentLocation?: { latitude: number; longitude: number };
  onConfirmed?: () => void;
  onCancel?: () => void;
  className?: string;
}

export default function DeliveryConfirmation({
  deliveryId,
  deliveryStatus,
  currentLocation,
  onConfirmed,
  onCancel,
  className = ""}: DeliveryConfirmationProps) {
  const t = useTranslations("deliveries.confirmation");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [useCurrentLocation, setUseCurrentLocation] = useState(true);

  // Vérifier si on peut confirmer la livraison
  const canConfirm = deliveryStatus === DeliveryStatus.IN_TRANSIT;

  // Initialiser le formulaire
  const form = useForm<ConfirmationFormValues>({
    resolver: zodResolver(confirmationSchemaWithSafeLocation),
    defaultValues: {
      confirmationCode: "",
      recipientName: "",
      confirmReceipt: false,
      safeLocation: false,
      safeLocationDetails: ""},
    mode: "onChange"});

  // Observer les changements sur safeLocation
  const watchSafeLocation = form.watch("safeLocation");

  // Fonction pour ajouter des photos
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newPhotos = Array.from(e.target.files);
      setPhotos((prev) => [...prev, ...newPhotos]);
    }
  };

  // Prendre une photo avec l'appareil
  const handleTakePhoto = () => {
    const fileInput = document.getElementById(
      "photo-upload",
    ) as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  };

  // Fonction pour supprimer une photo
  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  // Gérer la soumission du formulaire
  const onSubmit = async (data: ConfirmationFormValues) => {
    if (!canConfirm) {
      setError(t("cannotConfirmError"));
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Simuler un appel API pour l'exemple
      // Dans un cas réel, vous utiliseriez un hook ou un appel API
      await new Promise((resolve) => setTimeout(resolve, 1500));

      console.log("Livraison confirmée:", {
        deliveryId,
        ...data,
        photosCount: photos.length,
        location: useCurrentLocation ? currentLocation : null,
        timestamp: new Date()});

      setSuccess(true);
      if (onConfirmed) {
        onConfirmed();
      }
    } catch (err) {
      console.error("Erreur lors de la confirmation de livraison:", err);
      setError(t("errorSubmitting"));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Afficher un message de succès
  if (success) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-center text-green-600 flex items-center justify-center">
            <CheckCircle2 className="mr-2 h-6 w-6" />
            {t("successTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center">
            <div className="rounded-full bg-green-50 p-3 mb-4">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
            </div>
            <p className="text-center mb-4">{t("successMessage")}</p>
            <p className="text-sm text-muted-foreground text-center">
              {t("confirmationSent")}
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button onClick={onCancel}>{t("backToDeliveries")}</Button>
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
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t("cannotConfirmTitle")}</AlertTitle>
            <AlertDescription>{t("cannotConfirmDescription")}</AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t("errorTitle")}</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center">
                <Package className="h-5 w-5 mr-2 text-muted-foreground" />
                <h3 className="text-lg font-medium">{t("deliveryDetails")}</h3>
              </div>
              <div className="rounded-md border p-3 bg-muted/30">
                <p className="text-sm">
                  <span className="font-medium">{t("orderNumber")}: </span>#
                  {deliveryId.slice(-6)}
                </p>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <FormField
                control={form.control}
                name="confirmationCode"
                render={({ field  }) => (
                  <FormItem>
                    <FormLabel>{t("confirmationCodeLabel")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t("confirmationCodePlaceholder")}
                        {...field}
                        disabled={isSubmitting || !canConfirm}
                      />
                    </FormControl>
                    <FormDescription>
                      {t("confirmationCodeHelp")}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="recipientName"
                render={({ field  }) => (
                  <FormItem>
                    <FormLabel className="flex items-center">
                      <User className="h-4 w-4 mr-1" />
                      {t("recipientNameLabel")}
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t("recipientNamePlaceholder")}
                        {...field}
                        disabled={isSubmitting || !canConfirm}
                      />
                    </FormControl>
                    <FormDescription>{t("recipientNameHelp")}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="safeLocation"
                  render={({ field  }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isSubmitting || !canConfirm}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          <MapPin className="h-4 w-4 inline mr-1" />
                          {t("safeLocationLabel")}
                        </FormLabel>
                        <FormDescription>
                          {t("safeLocationDescription")}
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                {watchSafeLocation && (
                  <FormField
                    control={form.control}
                    name="safeLocationDetails"
                    render={({ field  }) => (
                      <FormItem>
                        <FormLabel>{t("safeLocationDetailsLabel")}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={t("safeLocationDetailsPlaceholder")}
                            {...field}
                            disabled={isSubmitting || !canConfirm}
                          />
                        </FormControl>
                        <FormDescription>
                          {t("safeLocationDetailsHelp")}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <h3 className="text-sm font-medium mb-2">
                    {t("photoEvidenceLabel")}
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={handleTakePhoto}
                      disabled={isSubmitting || !canConfirm}
                    >
                      <Camera className="mr-2 h-4 w-4" />
                      {t("takePhotoButton")}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() =>
                        document.getElementById("photo-upload")?.click()
                      }
                      disabled={isSubmitting || !canConfirm}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      {t("uploadPhotoButton")}
                    </Button>
                    <input
                      id="photo-upload"
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handlePhotoUpload}
                      disabled={isSubmitting || !canConfirm}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 text-center">
                    {t("photoHelpText")}
                  </p>
                </div>

                {photos.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {photos.map((photo, index) => (
                      <div key={index} className="relative">
                        <img
                          src={URL.createObjectURL(photo)}
                          alt={`Delivery confirmation ${index + 1}`}
                          className="w-20 h-20 object-cover rounded-md"
                        />
                        <button
                          type="button"
                          onClick={() => removePhoto(index)}
                          className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                          disabled={isSubmitting}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="use-location"
                  checked={useCurrentLocation}
                  onCheckedChange={(checked) =>
                    setUseCurrentLocation(checked as boolean)
                  }
                  disabled={isSubmitting || !canConfirm}
                />
                <label
                  htmlFor="use-location"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {t("includeLocationLabel")}
                </label>
              </div>

              <FormField
                control={form.control}
                name="confirmReceipt"
                render={({ field  }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 bg-muted/20">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isSubmitting || !canConfirm}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>{t("confirmReceiptLabel")}</FormLabel>
                      <FormDescription>
                        {t("confirmReceiptDescription")}
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </div>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
          {t("cancelButton")}
        </Button>
        <ButtonWithLoading
          onClick={form.handleSubmit(onSubmit)}
          disabled={isSubmitting || !canConfirm || !form.formState.isValid}
          loading={isSubmitting}
        >
          {t("confirmButton")}
        </ButtonWithLoading>
      </CardFooter>
    </Card>
  );
}
