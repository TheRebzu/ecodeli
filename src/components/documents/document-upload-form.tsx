"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { api } from "@/trpc/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";

// Schéma de validation pour le formulaire de téléchargement de documents
const documentUploadSchema = z.object({
  documentType: z.enum([
    "ID_CARD",
    "DRIVER_LICENSE",
    "BUSINESS_REGISTRATION",
    "INSURANCE",
    "OTHER",
  ]),
  description: z.string().optional(),
  file: z.instanceof(FileList).refine((files) => files.length > 0, {
    message: "Veuillez sélectionner un fichier",
  }),
});

type DocumentUploadFormValues = z.infer<typeof documentUploadSchema>;

export function DocumentUploadForm() {
  const router = useRouter();
  const t = useTranslations("documents");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Mutation tRPC pour le téléchargement de documents
  const uploadDocumentMutation = api.documents.upload.useMutation({
    onSuccess: (data) => {
      setSuccess(t("upload.success"));
      setIsLoading(false);
      reset();
    },
    onError: (error) => {
      setError(error.message);
      setIsLoading(false);
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DocumentUploadFormValues>({
    resolver: zodResolver(documentUploadSchema),
    defaultValues: {
      documentType: "ID_CARD",
      description: "",
    },
  });

  const onSubmit = async (data: DocumentUploadFormValues) => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const file = data.file[0];

      // Création d'un FormData pour l'upload du fichier
      const formData = new FormData();
      formData.append("file", file);
      formData.append("documentType", data.documentType);
      if (data.description) {
        formData.append("description", data.description);
      }

      // Appel à l'API pour télécharger le document
      const response = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || t("upload.error"));
      }

      const result = await response.json();

      // Notification de succès
      setSuccess(t("upload.success"));
      reset();
    } catch (error) {
      console.error("Document upload error:", error);
      setError(error instanceof Error ? error.message : t("upload.error"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center">
          {t("upload.title")}
        </CardTitle>
        <CardDescription className="text-center">
          {t("upload.description")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert>
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="documentType">
              {t("upload.form.documentType.label")}
            </Label>
            <select
              id="documentType"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isLoading}
              {...register("documentType")}
            >
              <option value="ID_CARD">
                {t("upload.form.documentType.options.idCard")}
              </option>
              <option value="DRIVER_LICENSE">
                {t("upload.form.documentType.options.driverLicense")}
              </option>
              <option value="BUSINESS_REGISTRATION">
                {t("upload.form.documentType.options.businessRegistration")}
              </option>
              <option value="INSURANCE">
                {t("upload.form.documentType.options.insurance")}
              </option>
              <option value="OTHER">
                {t("upload.form.documentType.options.other")}
              </option>
            </select>
            {errors.documentType && (
              <p className="text-sm text-red-500">
                {errors.documentType.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">
              {t("upload.form.description.label")}
            </Label>
            <Textarea
              id="description"
              placeholder={t("upload.form.description.placeholder")}
              disabled={isLoading}
              {...register("description")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="file">{t("upload.form.file.label")}</Label>
            <Input
              id="file"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              disabled={isLoading}
              {...register("file")}
            />
            <p className="text-xs text-muted-foreground">
              {t("upload.form.file.formats")}
            </p>
            {errors.file && (
              <p className="text-sm text-red-500">{errors.file.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? t("upload.form.submitting") : t("upload.form.submit")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
