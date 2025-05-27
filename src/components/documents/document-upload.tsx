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
import { DocumentType, UserRole } from '@prisma/client';
import { useTranslations } from 'next-intl';
import { useDocuments } from '@/hooks/use-documents';

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

// Mapping des types de documents par rôle utilisateur
const documentTypesByRole: Record<string, DocumentType[]> = {
  DELIVERER: [
    DocumentType.ID_CARD,
    DocumentType.DRIVING_LICENSE,
    DocumentType.VEHICLE_REGISTRATION,
    DocumentType.INSURANCE,
    DocumentType.SELFIE,
    DocumentType.OTHER,
  ],
  MERCHANT: [
    DocumentType.ID_CARD,
    DocumentType.INSURANCE,
    DocumentType.OTHER,
  ],
  PROVIDER: [
    DocumentType.ID_CARD,
    DocumentType.QUALIFICATION_CERTIFICATE,
    DocumentType.INSURANCE,
    DocumentType.OTHER,
  ],
};

interface DocumentUploadProps {
  userRole?: string;
}

export function DocumentUpload({ userRole = 'DELIVERER' }: DocumentUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations('documents');
  const { refreshDocuments } = useDocuments();

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

    try {
      const file = data.file;
      
      // Débogage de la date d'expiration
      if (data.expiryDate) {
        console.log("Date d'expiration sélectionnée:", data.expiryDate);
      }
      
      // Vérifier la taille du fichier
      if (file.size > 10 * 1024 * 1024) { // 10 MB maximum
        toast({
          title: t('upload.error.title'),
          description: t('upload.error.fileTooLarge', { maxSize: '10MB' }),
          variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
      }
      
      // Vérifier le type de fichier
      const acceptedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
      if (!acceptedTypes.includes(file.type)) {
        toast({
          title: t('upload.error.title'),
          description: t('upload.error.invalidFileType'),
          variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
      }
      
      toast({
        title: t('upload.processing.title'),
        description: t('upload.processing.description'),
      });
      
      // Convertir le fichier en Base64
      const reader = new FileReader();
      reader.onload = async (event) => {
        if (!event.target?.result) {
          toast({
            title: t('upload.error.title'),
            description: t('upload.error.fileRead'),
            variant: 'destructive',
          });
          setIsSubmitting(false);
          return;
        }
        
        const fileData = event.target.result.toString();
        
        try {
          // Afficher un toast de chargement
          toast({
            title: t('upload.uploading.title'),
            description: t('upload.uploading.description'),
          });
          
          // Appel API pour uploader le document avec tous les champs requis
          const result = await uploadDocument.mutateAsync({
            type: data.type,
            fileData: fileData,
            fileName: file.name,
            mimeType: file.type,
            expiryDate: data.expiryDate,
            description: `Document ${documentTypeLabels[data.type]} soumis le ${new Date().toLocaleDateString()}`,
          });
          
          console.log("Document uploadé avec succès:", result);
          
          // Forcer un rafraîchissement des documents
          if (typeof refreshDocuments === 'function') {
            await refreshDocuments();
          }
          
          // Reset du formulaire après succès
          form.reset();
          setPreviewUrl(null);
          setUploadSuccess(true);
          
          // Redirection après un court délai pour laisser le temps aux données de se rafraîchir
          setTimeout(() => {
            router.refresh();
          }, 1500);
        } catch (error) {
          console.error("Erreur lors de l'upload:", error);
          
          // Afficher un message d'erreur spécifique
          const errorMessage = error instanceof Error ? error.message : t('upload.error.unknown');
          toast({
            title: t('upload.error.title'),
            description: errorMessage,
            variant: 'destructive',
          });
          
          setIsSubmitting(false);
        }
      };
      
      reader.onerror = (event) => {
        console.error("Erreur de lecture du fichier:", event);
        toast({
          title: t('upload.error.title'),
          description: t('upload.error.fileRead'),
          variant: 'destructive',
        });
        setIsSubmitting(false);
      };
      
      // Lancer la lecture du fichier en Base64
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading document:', error);
      
      // Message d'erreur générique
      toast({
        title: t('upload.error.title'),
        description: error instanceof Error ? error.message : t('upload.error.unknown'),
        variant: 'destructive',
      });
      
      setIsSubmitting(false);
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
  
  // Filtrer les types de documents disponibles en fonction du rôle
  const availableDocumentTypes = documentTypesByRole[userRole] || documentTypesByRole.DELIVERER;

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
              <Button onClick={() => router.push(`/${userRole.toLowerCase()}`)}>
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
                        {availableDocumentTypes.map((documentType) => (
                          <SelectItem key={documentType} value={documentType}>
                            {documentTypeLabels[documentType]}
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
                              <div className="flex items-center p-2 bg-muted/20">
                                <span className="text-sm font-medium truncate">
                                  {(value as File)?.name}
                                </span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="ml-auto"
                                  onClick={handleClearFile}
                                  disabled={isSubmitting}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </FormControl>
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
                <Button type="submit" disabled={isSubmitting} className="w-full">
                  {isSubmitting ? (
                    <>
                      <span className="mr-2">Téléchargement...</span>
                      <span className="animate-spin">⏳</span>
                    </>
                  ) : (
                    'Télécharger le document'
                  )}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  );
}
