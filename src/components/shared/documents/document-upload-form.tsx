"use client";

import { useState, useRef } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Upload,
  Camera,
  FileText,
  Image as ImageIcon,
  AlertTriangle,
  CheckCircle,
  X,
  Loader2,
  Calendar,
  Info} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { cn } from "@/lib/utils/common";

// Schéma de validation pour l'upload de document
const documentUploadSchema = z.object({ file: z
    .instanceof(File)
    .refine(
      (file) => file.size <= 10 * 1024 * 1024, // 10MB max
      "Le fichier ne doit pas dépasser 10MB",
    )
    .refine(
      (file) =>
        ["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(
          file.type,
        ),
      "Seuls les formats JPG, PNG, WebP et PDF sont acceptés",
    ),
  expiryDate: z.string().optional(),
  notes: z.string().optional() });

type FormValues = z.infer<typeof documentUploadSchema>;

interface DocumentUploadFormProps {
  documentType: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    file: File;
    expiryDate?: string;
    notes?: string;
  }) => Promise<void>;
  isLoading?: boolean;
}

// Configuration des types de documents
const DOCUMENT_CONFIG: Record<
  string,
  {
    label: string;
    description: string;
    hasExpiry: boolean;
    acceptedFormats: string[];
    tips: string[];
  }
> = {
  IDENTITY: {
    label: "Pièce d'identité",
    description: "Carte d'identité nationale ou passeport en cours de validité",
    hasExpiry: true,
    acceptedFormats: ["JPG", "PNG", "WebP", "PDF"],
    tips: [
      "Document recto-verso complet",
      "Photo nette et bien éclairée",
      "Toutes les informations doivent être lisibles",
      "Document non expiré"]}, DRIVING_LICENSE: {
    label: "Permis de conduire",
    description: "Permis de conduire en cours de validité",
    hasExpiry: true,
    acceptedFormats: ["JPG", "PNG", "WebP", "PDF"],
    tips: [
      "Document recto-verso complet",
      "Vérifiez que la date d'expiration est visible",
      "Catégories de véhicules bien visibles",
      "Photo d'identité claire"]},
  INSURANCE: {
    label: "Attestation d'assurance",
    description: "Attestation d'assurance véhicule en cours de validité",
    hasExpiry: true,
    acceptedFormats: ["JPG", "PNG", "WebP", "PDF"],
    tips: [
      "Document original ou copie certifiée",
      "Vérifiez la période de validité",
      "Numéro de police visible",
      "Coordonnées de l'assureur présentes"]}, VEHICLE_REGISTRATION: {
    label: "Carte grise",
    description: "Certificat d'immatriculation du véhicule",
    hasExpiry: false,
    acceptedFormats: ["JPG", "PNG", "WebP", "PDF"],
    tips: [
      "Document recto-verso si applicable",
      "Numéro d'immatriculation visible",
      "Informations du propriétaire lisibles",
      "Caractéristiques techniques du véhicule"]}, BACKGROUND_CHECK: {
    label: "Extrait de casier judiciaire",
    description: "Bulletin n°3 du casier judiciaire (moins de 3 mois)",
    hasExpiry: true,
    acceptedFormats: ["JPG", "PNG", "WebP", "PDF"],
    tips: [
      "Document de moins de 3 mois",
      "Tampon officiel visible",
      "Informations personnelles complètes",
      "Document scanné en haute qualité"]}, MEDICAL_CERTIFICATE: {
    label: "Certificat médical",
    description: "Certificat médical d'aptitude à la conduite",
    hasExpiry: true,
    acceptedFormats: ["JPG", "PNG", "WebP", "PDF"],
    tips: [
      "Certificat de moins d'un an",
      "Signature et tampon du médecin",
      "Mention de l'aptitude à la conduite",
      "Coordonnées du praticien"]}, BANK_DETAILS: {
    label: "RIB",
    description: "Relevé d'identité bancaire",
    hasExpiry: false,
    acceptedFormats: ["JPG", "PNG", "WebP", "PDF"],
    tips: [
      "IBAN et BIC clairement visibles",
      "Nom du titulaire identique au compte",
      "Coordonnées de la banque",
      "Document récent et officiel"]}, ADDRESS_PROOF: {
    label: "Justificatif de domicile",
    description: "Facture ou document officiel de moins de 3 mois",
    hasExpiry: true,
    acceptedFormats: ["JPG", "PNG", "WebP", "PDF"],
    tips: [
      "Document de moins de 3 mois",
      "Adresse complète visible",
      "Nom et prénom du titulaire",
      "Organisme émetteur officiel"]}};

export default function DocumentUploadForm({
  documentType,
  open,
  onOpenChange,
  onSubmit,
  isLoading = false}: DocumentUploadFormProps) {
  const t = useTranslations("documents.upload");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const config = DOCUMENT_CONFIG[documentType];

  const form = useForm<FormValues>({
    resolver: zodResolver(documentUploadSchema),
    defaultValues: {
      expiryDate: "",
      notes: ""}});

  // Gérer la sélection de fichier
  const handleFileSelect = (file: File) => {
    if (file) {
      form.setValue("file", file);

      // Créer une prévisualisation
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setPreview(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setPreview(null);
      }
    }
  };

  // Gérer le drag & drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // Prendre une photo (mobile)
  const takePhoto = () => {
    if (cameraInputRef.current) {
      cameraInputRef.current.click();
    }
  };

  // Soumettre le formulaire
  const handleSubmit = async (values: FormValues) => {
    try {
      // Simuler le progrès d'upload
      setUploadProgress(0);
      const interval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return prev + 10;
        });
      }, 100);

      await onSubmit({ file: values.file,
        expiryDate: values.expiryDate,
        notes: values.notes });

      clearInterval(interval);
      setUploadProgress(100);

      // Réinitialiser le formulaire
      form.reset();
      setPreview(null);
      setUploadProgress(0);

      toast.success("Document téléchargé avec succès");
    } catch (error) {
      setUploadProgress(0);
      toast.error("Erreur lors du téléchargement");
    }
  };

  const handleCancel = () => {
    form.reset();
    setPreview(null);
    setUploadProgress(0);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Télécharger - {config?.label}
          </DialogTitle>
          <DialogDescription>{config?.description}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6"
          >
            {/* Instructions */}
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <div className="font-medium">
                    Conseils pour un document de qualité :
                  </div>
                  <ul className="text-sm space-y-1">
                    {config?.tips.map((tip, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-primary">•</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </AlertDescription>
            </Alert>

            {/* Zone d'upload */}
            <div className="space-y-4">
              <Controller
                control={form.control}
                name="file"
                render={({ field  }) => (
                  <FormItem>
                    <FormLabel>Document *</FormLabel>
                    <FormControl>
                      <div className="space-y-4">
                        {/* Zone de drop */}
                        <div
                          className={cn(
                            "border-2 border-dashed rounded-lg p-6 text-center transition-colors",
                            "hover:border-primary/50 hover:bg-muted/25",
                            form.formState.errors.file && "border-destructive",
                          )}
                          onDrop={handleDrop}
                          onDragOver={handleDragOver}
                        >
                          {preview ? (
                            <div className="space-y-4">
                              <div className="relative">
                                <img
                                  src={preview}
                                  alt="Prévisualisation"
                                  className="max-h-48 mx-auto rounded border"
                                />
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="sm"
                                  className="absolute top-2 right-2"
                                  onClick={() => {
                                    setPreview(null);
                                    form.setValue("file", undefined as any);
                                  }}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {field.value?.name} (
                                {(field.value?.size / 1024 / 1024).toFixed(2)}{" "}
                                MB)
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                                <ImageIcon className="h-8 w-8 text-primary" />
                              </div>
                              <div>
                                <h3 className="font-medium">
                                  Glissez votre document ici
                                </h3>
                                <p className="text-sm text-muted-foreground mt-1">
                                  ou cliquez pour sélectionner un fichier
                                </p>
                                <p className="text-xs text-muted-foreground mt-2">
                                  Formats acceptés :{" "}
                                  {config?.acceptedFormats.join(", ")} • Max
                                  10MB
                                </p>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Boutons d'action */}
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                            className="flex-1"
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            Parcourir
                          </Button>

                          <Button
                            type="button"
                            variant="outline"
                            onClick={takePhoto}
                            className="flex-1"
                          >
                            <Camera className="h-4 w-4 mr-2" />
                            Prendre une photo
                          </Button>
                        </div>

                        {/* Inputs cachés */}
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept={config?.acceptedFormats
                            .map((f) => {
                              switch (f) {
                                case "JPG":
                                  return "image/jpeg";
                                case "PNG":
                                  return "image/png";
                                case "WebP":
                                  return "image/webp";
                                case "PDF":
                                  return "application/pdf";
                                default:
                                  return "";
                              }
                            })
                            .join(",")}
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileSelect(file);
                          }}
                        />

                        <input
                          ref={cameraInputRef}
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileSelect(file);
                          }}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Barre de progression */}
              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Téléchargement...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="h-2" />
                </div>
              )}
            </div>

            {/* Date d'expiration */}
            {config?.hasExpiry && (
              <Controller
                control={form.control}
                name="expiryDate"
                render={({ field  }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Date d'expiration
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        min={new Date().toISOString().split("T")[0]}
                      />
                    </FormControl>
                    <FormDescription>
                      Date d'expiration du document (optionnel)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Notes */}
            <Controller
              control={form.control}
              name="notes"
              render={({ field  }) => (
                <FormItem>
                  <FormLabel>Notes additionnelles</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Commentaires ou informations supplémentaires (optionnel)"
                      rows={3}
                    />
                  </FormControl>
                  <FormDescription>
                    Informations complémentaires pour faciliter la vérification
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Actions */}
            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isLoading}
                className="flex-1"
              >
                Annuler
              </Button>

              <Button
                type="submit"
                disabled={isLoading || !form.formState.isValid}
                className="flex-1"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Téléchargement...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Télécharger
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
