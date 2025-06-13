"use client";

import { useState } from "react";
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
import { Button } from "@/components/ui/button";
import { ButtonWithLoading } from "@/app/[locale]/(public)/loading";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Upload, CheckCircle2 } from "lucide-react";

// Schéma de validation
const issueReportSchema = z.object({
  issueType: z.string({
    required_error: "Veuillez sélectionner un type de problème",
  }),
  description: z
    .string()
    .min(10, { message: "La description doit contenir au moins 10 caractères" })
    .max(500, {
      message: "La description ne doit pas dépasser 500 caractères",
    }),
  needsAssistance: z.boolean().default(false),
  contactInfo: z.string().optional(),
});

type IssueReportFormValues = z.infer<typeof issueReportSchema>;

interface DeliveryIssueReportProps {
  deliveryId: string;
  onReportSubmitted?: () => void;
  onCancel?: () => void;
  className?: string;
}

export default function DeliveryIssueReport({
  deliveryId,
  onReportSubmitted,
  onCancel,
  className = "",
}: DeliveryIssueReportProps) {
  const t = useTranslations("deliveries.issueReport");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);

  // Initialiser le formulaire
  const form = useForm<IssueReportFormValues>({
    resolver: zodResolver(issueReportSchema),
    defaultValues: {
      issueType: "",
      description: "",
      needsAssistance: false,
      contactInfo: "",
    },
  });

  // Types de problèmes
  const issueTypes = [
    { value: "ADDRESS_NOT_FOUND", label: t("issueTypes.addressNotFound") },
    { value: "CLIENT_UNAVAILABLE", label: t("issueTypes.clientUnavailable") },
    { value: "PACKAGE_DAMAGED", label: t("issueTypes.packageDamaged") },
    { value: "VEHICLE_ISSUE", label: t("issueTypes.vehicleIssue") },
    { value: "TRAFFIC_DELAY", label: t("issueTypes.trafficDelay") },
    { value: "WEATHER_CONDITION", label: t("issueTypes.weatherCondition") },
    { value: "MERCHANT_DELAY", label: t("issueTypes.merchantDelay") },
    { value: "OTHER", label: t("issueTypes.other") },
  ];

  // Fonction pour ajouter des photos
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newPhotos = Array.from(e.target.files);
      setPhotos((prev) => [...prev, ...newPhotos]);
    }
  };

  // Fonction pour supprimer une photo
  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  // Gérer la soumission du formulaire
  const onSubmit = async (data: IssueReportFormValues) => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Simuler un appel API pour l'exemple
      // Dans un cas réel, vous utiliseriez un hook ou un appel API
      await new Promise((resolve) => setTimeout(resolve, 1500));

      console.log("Rapport soumis:", {
        deliveryId,
        ...data,
        photosCount: photos.length,
      });

      setSuccess(true);
      if (onReportSubmitted) {
        onReportSubmitted();
      }
    } catch (err) {
      console.error("Erreur lors de la soumission du rapport:", err);
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
          <p className="text-center mb-4">{t("successMessage")}</p>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button onClick={onCancel}>{t("backToDelivery")}</Button>
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
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t("errorTitle")}</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="issueType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("issueTypeLabel")}</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("selectIssueType")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {issueTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>{t("issueTypeDescription")}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("descriptionLabel")}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t("descriptionPlaceholder")}
                      className="min-h-[100px]"
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormDescription>{t("descriptionHelp")}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <FormLabel>{t("photosLabel")}</FormLabel>
              <div className="flex items-center justify-center w-full">
                <label
                  htmlFor="photo-upload"
                  className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-8 h-8 mb-2 text-gray-500" />
                    <p className="text-sm text-gray-500">
                      {t("dropPhotosHere")}
                    </p>
                  </div>
                  <input
                    id="photo-upload"
                    type="file"
                    className="hidden"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoUpload}
                    disabled={isSubmitting}
                  />
                </label>
              </div>
              <FormDescription>{t("photosHelp")}</FormDescription>

              {photos.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {photos.map((photo, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={URL.createObjectURL(photo)}
                        alt={`Issue photo ${index + 1}`}
                        className="w-16 h-16 object-cover rounded-md"
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

            <FormField
              control={form.control}
              name="needsAssistance"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>{t("needsAssistanceLabel")}</FormLabel>
                    <FormDescription>
                      {t("needsAssistanceDescription")}
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            {form.watch("needsAssistance") && (
              <FormField
                control={form.control}
                name="contactInfo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("contactInfoLabel")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t("contactInfoPlaceholder")}
                        {...field}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormDescription>{t("contactInfoHelp")}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
          {t("cancelButton")}
        </Button>
        <ButtonWithLoading
          onClick={form.handleSubmit(onSubmit)}
          disabled={isSubmitting}
          loading={isSubmitting}
        >
          {t("submitButton")}
        </ButtonWithLoading>
      </CardFooter>
    </Card>
  );
}
