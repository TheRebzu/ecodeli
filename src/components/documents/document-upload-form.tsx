'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { DocumentType } from '@prisma/client';
import { api } from '@/trpc/react';
import { useToast } from '@/components/ui/use-toast';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarIcon, UploadIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import { cn } from '@/lib/utils';

// Schema for document upload validation
const documentUploadSchema = z.object({
  // Le type sera déterminé à partir des propriétés ou du contexte
  file: z
    .instanceof(File, {
      message: 'Please upload a document file',
    })
    .refine(
      file => file.size <= 5 * 1024 * 1024, // 5MB
      'File size should be less than 5MB'
    )
    .refine(
      file => ['application/pdf', 'image/jpeg', 'image/png'].includes(file.type),
      'Only PDF, JPEG and PNG files are accepted'
    ),
  expiryDate: z.date().optional(),
  description: z.string().optional(),
});

type DocumentUploadFormProps = {
  role: 'DELIVERER' | 'PROVIDER' | 'MERCHANT';
  documentType?: DocumentType; // Ajout d'une prop pour définir le type de document
  onSuccess?: () => void;
};

export default function DocumentUploadForm({
  role,
  documentType,
  onSuccess,
}: DocumentUploadFormProps) {
  const t = useTranslations('documents');
  const { toast } = useToast();
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const locale = 'fr'; // Set this based on your app's locale state

  const form = useForm<z.infer<typeof documentUploadSchema>>({
    resolver: zodResolver(documentUploadSchema),
    defaultValues: {
      description: '',
    },
  });

  const uploadDocument = api.auth.uploadDocument.useMutation({
    onSuccess: () => {
      toast({
        title: t('uploadSuccess.title'),
        description: t('uploadSuccess.description'),
        variant: 'default',
      });
      form.reset();
      setFilePreview(null);
      if (onSuccess) onSuccess();
    },
    onError: error => {
      toast({
        title: t('uploadError.title'),
        description: error.message || t('uploadError.description'),
        variant: 'destructive',
      });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    form.setValue('file', file);

    // Create a preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      // For PDFs, just show an icon or name
      setFilePreview(null);
    }
  };

  const onSubmit = async (data: z.infer<typeof documentUploadSchema>) => {
    try {
      if (!documentType) {
        toast({
          title: t('uploadError.title'),
          description: 'Document type is required',
          variant: 'destructive',
        });
        return;
      }

      // Convert file to base64 for API transmission
      const reader = new FileReader();
      reader.readAsDataURL(data.file);
      reader.onload = () => {
        const base64File = reader.result?.toString().split(',')[1];
        if (!base64File) return;

        uploadDocument.mutate({
          type: documentType, // Utiliser le type de document passé en prop
          fileData: base64File,
          fileName: data.file.name,
          mimeType: data.file.type,
          expiryDate: data.expiryDate,
          description: data.description,
        });
      };
    } catch (error) {
      console.error('Error uploading document:', error);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{t('uploadForm.title')}</CardTitle>
        <CardDescription>{t('uploadForm.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Le champ de sélection de type a été retiré */}

            <FormField
              control={form.control}
              name="file"
              render={({ field: { value, onChange, ...field } }) => (
                <FormItem>
                  <FormLabel>{t('form.file')}</FormLabel>
                  <FormControl>
                    <div className="flex flex-col items-center gap-4">
                      <Input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={handleFileChange}
                        className="cursor-pointer"
                        {...field}
                      />

                      {filePreview && (
                        <div className="w-full max-w-sm overflow-hidden rounded-lg border">
                          <img
                            src={filePreview}
                            alt="Document preview"
                            className="h-auto w-full object-cover"
                          />
                        </div>
                      )}

                      {!filePreview && value && (
                        <div className="flex items-center justify-center rounded-lg border border-dashed p-4">
                          <div className="text-center">
                            <UploadIcon className="mx-auto h-8 w-8 text-muted-foreground" />
                            <p className="mt-2 text-sm font-medium">{(value as File).name}</p>
                            <p className="text-xs text-muted-foreground">
                              {Math.round((value as File).size / 1024)} KB
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormDescription>{t('form.fileDescription')}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="expiryDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>{t('form.expiryDate')}</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={'outline'}
                          className={cn(
                            'w-full pl-3 text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          {field.value ? (
                            format(field.value, 'PPP', { locale: locale === 'fr' ? fr : enUS })
                          ) : (
                            <span>{t('form.selectDate')}</span>
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
                  <FormDescription>{t('form.expiryDateDescription')}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('form.description')}</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder={t('form.descriptionPlaceholder')} />
                  </FormControl>
                  <FormDescription>{t('form.descriptionHelp')}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={uploadDocument.isLoading}>
              {uploadDocument.isLoading ? t('form.uploading') : t('form.submit')}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
