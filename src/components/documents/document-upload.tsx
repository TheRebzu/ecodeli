'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { DocumentType } from '@prisma/client';
import { useDocuments } from '@/hooks/use-documents';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Définir le schéma de validation pour le formulaire
const formSchema = z.object({
  documentType: z.string({
    required_error: 'Veuillez sélectionner un type de document',
  }),
  file: z.instanceof(File, {
    message: 'Veuillez sélectionner un fichier',
  }),
});

type FormValues = z.infer<typeof formSchema>;

interface DocumentUploadProps {
  userRole?: string;
}

export function DocumentUpload({ userRole }: DocumentUploadProps) {
  const { uploadDocument, isUploading } = useDocuments();
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  // Fonction pour gérer la soumission du formulaire
  async function onSubmit(data: FormValues) {
    setError(null);
    setIsSuccess(false);

    try {
      await uploadDocument(data.file, data.documentType as DocumentType);
      setIsSuccess(true);
      form.reset();
    } catch (err) {
      setError('Une erreur est survenue lors du téléchargement du document.');
      console.error(err);
    }
  }

  // Gérer le changement de fichier
  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      form.setValue('file', file);
    }
  }

  const getDocumentTypeOptions = () => {
    // Options de base pour tous les utilisateurs
    const baseOptions = [
      { value: DocumentType.ID_CARD, label: "Carte d'identité" },
      { value: DocumentType.OTHER, label: 'Autre document' },
    ];

    // Options spécifiques aux livreurs
    const delivererOptions = [
      { value: DocumentType.DRIVER_LICENSE, label: 'Permis de conduire' },
      { value: DocumentType.VEHICLE_REGISTRATION, label: 'Carte grise' },
      { value: DocumentType.INSURANCE, label: 'Assurance' },
    ];

    // Options spécifiques aux prestataires
    const providerOptions = [
      { value: DocumentType.PROFESSIONAL_CERTIFICATION, label: 'Certification professionnelle' },
      { value: DocumentType.CRIMINAL_RECORD, label: 'Extrait de casier judiciaire' },
    ];

    if (userRole === 'DELIVERER') {
      return [...baseOptions, ...delivererOptions];
    } else if (userRole === 'PROVIDER') {
      return [...baseOptions, ...providerOptions];
    }

    return baseOptions;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Télécharger un document</CardTitle>
        <CardDescription>
          Ajoutez les documents nécessaires pour compléter votre profil et vérifier votre identité.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {isSuccess && (
              <Alert className="bg-green-50 border-green-200">
                <AlertDescription>
                  Document téléchargé avec succès. Il sera vérifié par notre équipe.
                </AlertDescription>
              </Alert>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <FormField
              control={form.control}
              name="documentType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type de document</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isUploading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionnez un type de document" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {getDocumentTypeOptions().map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Sélectionnez le type de document que vous souhaitez télécharger.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="file"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fichier</FormLabel>
                  <FormControl>
                    <Input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleFileChange}
                      disabled={isUploading}
                    />
                  </FormControl>
                  <FormDescription>
                    Formats acceptés: PDF, JPG, JPEG, PNG. Taille maximale: 5 Mo.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={isUploading} className="w-full">
              {isUploading ? 'Téléchargement en cours...' : 'Télécharger'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
