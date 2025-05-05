'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/components/ui/use-toast';
import { CalendarIcon, Upload, X, AlertTriangle, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { api } from '@/trpc/react';
import { DocumentType } from '@prisma/client';
import { useTranslations } from 'next-intl';

// Schéma de validation pour le formulaire
const documentUploadSchema = z.object({
  type: z.nativeEnum(DocumentType, {
    required_error: 'Veuillez sélectionner un type de document',
  }),
  file: z.instanceof(File, {
    message: 'Veuillez sélectionner un fichier',
  }),
  expiryDate: z.date().optional(),
});

type DocumentUploadFormValues = z.infer<typeof documentUploadSchema>;

// Mapping des types de documents pour l'affichage
const documentTypeLabels: Record<DocumentType, string> = {
  ID_CARD: "Carte d'identité",
  DRIVING_LICENSE: 'Permis de conduire',
  VEHICLE_REGISTRATION: 'Carte grise',
  INSURANCE: "Attestation d'assurance",
  QUALIFICATION_CERTIFICATE: 'Certificat de qualification',
  SELFIE: 'Photo de profil',
  OTHER: 'Autre document',
};

export function DocumentUpload() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations('Documents');

  const form = useForm<DocumentUploadFormValues>({
    resolver: zodResolver(documentUploadSchema),
    defaultValues: {
      type: undefined,
      expiryDate: undefined,
    },
  });

  const uploadDocument = api.auth.uploadDocument.useMutation({
    onSuccess: () => {
      setUploadSuccess(true);
      toast({
        title: t('upload.success.title'),
        description: t('upload.success.description'),
      });
    },
    onError: error => {
      toast({
        title: t('upload.error.title'),
        description: error.message,
        variant: 'destructive',
      });
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  const onSubmit = async (data: DocumentUploadFormValues) => {
    setIsSubmitting(true);

    // Création d'un FormData pour l'upload
    const formData = new FormData();
    formData.append('type', data.type);
    formData.append('file', data.file);
    if (data.expiryDate) {
      formData.append('expiryDate', data.expiryDate.toISOString());
    }

    try {
      // Appel API pour uploader le document
      await uploadDocument.mutateAsync({
        type: data.type,
        file: data.file,
        expiryDate: data.expiryDate,
      });

      // Reset du formulaire après succès
      form.reset();
      setPreviewUrl(null);
    } catch (error) {
      console.error('Error uploading document:', error);
    }
  };

  // Gestion de la preview du fichier
  const handleFileChange = (file: File | null) => {
    if (file) {
      // Créer un URL pour la preview du fichier
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);

      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setPreviewUrl(null);
    }
  };

  // Gestion de la suppression du fichier
  const handleClearFile = () => {
    form.setValue('file', undefined as any);
    setPreviewUrl(null);
  };

  const fileRef = form.register('file');

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{t('upload.title')}</CardTitle>
        <CardDescription>{t('upload.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        {uploadSuccess ? (
          <div className="flex flex-col items-center justify-center p-6 space-y-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
            <h3 className="text-xl font-semibold">{t('upload.success.title')}</h3>
            <p className="text-center text-muted-foreground">{t('upload.success.message')}</p>
            <div className="flex space-x-4 pt-4">
              <Button variant="outline" onClick={() => setUploadSuccess(false)}>
                {t('upload.uploadAnother')}
              </Button>
              <Button onClick={() => router.push('/deliverer')}>
                {t('upload.backToDashboard')}
              </Button>
            </div>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('upload.form.type.label')}</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={isSubmitting}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('upload.form.type.placeholder')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(documentTypeLabels).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>{t('upload.form.type.description')}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="file"
                render={({ field: { value, onChange, ...field } }) => (
                  <FormItem>
                    <FormLabel>{t('upload.form.file.label')}</FormLabel>
                    <FormControl>
                      <div className="space-y-4">
                        {!previewUrl ? (
                          <div className="flex flex-col items-center justify-center w-full min-h-[150px] border-2 border-dashed rounded-md border-muted p-4 hover:border-muted-foreground/50 cursor-pointer">
                            <Input
                              {...field}
                              type="file"
                              ref={fileRef.ref}
                              disabled={isSubmitting}
                              className="hidden"
                              accept="image/*, application/pdf"
                              onChange={e => {
                                const file = e.target.files?.[0] || null;
                                if (file) {
                                  onChange(file);
                                  handleFileChange(file);
                                }
                              }}
                              id="document-file"
                            />
                            <label
                              htmlFor="document-file"
                              className="flex flex-col items-center justify-center w-full h-full"
                            >
                              <Upload className="w-10 h-10 text-muted-foreground mb-2" />
                              <span className="text-muted-foreground font-medium">
                                {t('upload.form.file.instruction')}
                              </span>
                              <span className="text-sm text-muted-foreground mt-1">
                                {t('upload.form.file.supportedFormats')}
                              </span>
                            </label>
                          </div>
                        ) : (
                          <div className="relative">
                            <div className="border rounded-md overflow-hidden">
                              {previewUrl.endsWith('.pdf') ? (
                                <div className="flex items-center justify-center bg-secondary p-6 min-h-[150px]">
                                  <span className="font-medium">Document PDF</span>
                                </div>
                              ) : (
                                <img
                                  src={previewUrl}
                                  alt="Document preview"
                                  className="object-contain w-full max-h-[300px]"
                                />
                              )}
                            </div>
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              className="absolute top-2 right-2"
                              onClick={handleClearFile}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormDescription>{t('upload.form.file.description')}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="expiryDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>{t('upload.form.expiryDate.label')}</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                            disabled={isSubmitting}
                          >
                            {field.value ? (
                              format(field.value, 'PPP', { locale: fr })
                            ) : (
                              <span>{t('upload.form.expiryDate.placeholder')}</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={date => date < new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormDescription>{t('upload.form.expiryDate.description')}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="pt-4">
                <AlertTriangle className="h-5 w-5 text-amber-500 inline mr-2" />
                <span className="text-sm text-muted-foreground">
                  {t('upload.verification.notice')}
                </span>
              </div>

              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? t('upload.form.submitting') : t('upload.form.submit')}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="ghost" onClick={() => router.push('/deliverer')} disabled={isSubmitting}>
          {t('upload.backToDashboard')}
        </Button>
      </CardFooter>
    </Card>
  );
}
