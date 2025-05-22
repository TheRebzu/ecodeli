import { useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { DocumentType } from '@prisma/client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { z } from 'zod';
import Image from 'next/image';
import { api } from '@/trpc/react';
import { uploadDocumentSchema } from '@/schemas/document.schema';
import { Calendar } from '@/components/ui/calendar';
import { FileText, Upload, X, Eye, Calendar as CalendarIcon } from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';

interface DocumentUploadFormProps {
  allowedTypes: DocumentType[];
  locale: string;
  onSuccess?: () => void;
}

type FormValues = z.infer<typeof uploadDocumentSchema>;

export function DocumentUploadForm({ allowedTypes, locale, onSuccess }: DocumentUploadFormProps) {
  const t = useTranslations();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const dateLocale = locale === 'fr' ? fr : enUS;

  const form = useForm<FormValues>({
    resolver: zodResolver(uploadDocumentSchema),
    defaultValues: {
      type: undefined,
      expiryDate: undefined,
    },
  });

  const uploadMutation = api.document.uploadDocument.useMutation({
    onSuccess: () => {
      toast.success(t('documents.upload_success'));
      form.reset();
      setPreviewUrl(null);
      setPreviewType(null);
      if (onSuccess) onSuccess();
      router.refresh();
    },
    onError: error => {
      toast.error(error.message);
    },
  });

  const onSubmit = async (data: FormValues) => {
    if (!data.file || !data.file.length) {
      toast.error(t('documents.no_file_selected'));
      return;
    }

    const file = data.file[0];

    // Create FormData
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', data.type);

    if (data.expiryDate) {
      formData.append('expiryDate', data.expiryDate.toISOString());
    }

    try {
      // First, upload the file to the server
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(t('documents.upload_error'));
      }

      const result = await response.json();

      // Then create the document record
      uploadMutation.mutate({
        type: data.type,
        fileUrl: result.fileUrl,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        expiryDate: data.expiryDate,
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error(t('documents.upload_error'));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (file) {
      // Update form value
      form.setValue('file', e.target.files as FileList, { shouldValidate: true });

      // Create preview URL
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setPreviewType(file.type);

      // Revoke previous URL to prevent memory leaks
      return () => URL.revokeObjectURL(url);
    }
  };

  const clearFile = () => {
    form.setValue('file', undefined, { shouldValidate: true });
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setPreviewType(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getDocumentTypeName = (type: DocumentType) => {
    return t(`documents.types.${type.toLowerCase()}`);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('documents.type')}</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t('documents.select_type')} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {allowedTypes.map(type => (
                    <SelectItem key={type} value={type}>
                      {getDocumentTypeName(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>{t('documents.type_description')}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="file"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('documents.file')}</FormLabel>
              <FormControl>
                <div className="space-y-2">
                  <Input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileChange}
                    className={`${previewUrl ? 'hidden' : ''}`}
                  />

                  {previewUrl && (
                    <Card className="overflow-hidden">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2 text-sm">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="truncate max-w-[200px]">
                              {form.watch('file')?.[0]?.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => setIsPreviewOpen(true)}
                              className="h-8 w-8 p-0"
                            >
                              <Eye className="h-4 w-4" />
                              <span className="sr-only">{t('documents.preview')}</span>
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={clearFile}
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            >
                              <X className="h-4 w-4" />
                              <span className="sr-only">{t('documents.remove')}</span>
                            </Button>
                          </div>
                        </div>

                        {previewType?.startsWith('image/') && (
                          <div className="relative h-[120px] rounded-md overflow-hidden border">
                            <Image src={previewUrl} alt="Preview" fill className="object-contain" />
                          </div>
                        )}

                        {previewType === 'application/pdf' && (
                          <div className="flex items-center justify-center h-[120px] bg-muted/30 rounded-md border">
                            <FileText className="h-16 w-16 text-muted-foreground" />
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {!previewUrl && (
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 flex flex-col items-center justify-center">
                      <Upload className="h-10 w-10 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground mb-1">
                        {t('documents.drag_drop')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        PDF, JPG, PNG {t('documents.max_size')}
                      </p>
                    </div>
                  )}
                </div>
              </FormControl>
              <FormDescription>{t('documents.file_description')}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="expiryDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>{t('documents.expiry_date')}</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full pl-3 text-left font-normal',
                        !field.value && 'text-muted-foreground'
                      )}
                    >
                      {field.value ? (
                        format(field.value, 'PPP', { locale: dateLocale })
                      ) : (
                        <span>{t('documents.select_expiry_date')}</span>
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
              <FormDescription>{t('documents.expiry_date_description')}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={uploadMutation.isLoading}>
          {uploadMutation.isLoading ? t('documents.uploading') : t('documents.upload')}
        </Button>
      </form>

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.watch('file')?.[0]?.name}</DialogTitle>
          </DialogHeader>

          <div className="mt-2">
            {previewType?.startsWith('image/') && previewUrl && (
              <div className="relative h-[500px] w-full">
                <Image src={previewUrl} alt="Preview" fill className="object-contain" />
              </div>
            )}

            {previewType === 'application/pdf' && previewUrl && (
              <iframe src={previewUrl} className="w-full h-[500px]" title="PDF Preview" />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Form>
  );
}
