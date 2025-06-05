'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ButtonWithLoading } from '@/components/ui/button-with-loading';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle, MessageCircle, Clock } from 'lucide-react';

// Schéma de validation
const notesSchema = z.object({
  noteType: z.string({
    required_error: 'Veuillez sélectionner un type de note',
  }),
  content: z
    .string()
    .min(3, { message: 'La note doit contenir au moins 3 caractères' })
    .max(500, { message: 'La note ne doit pas dépasser 500 caractères' }),
});

type NotesFormValues = z.infer<typeof notesSchema>;

// Type de note précédente
interface PreviousNote {
  id: string;
  type: string;
  content: string;
  timestamp: Date;
}

interface DeliveryNotesProps {
  deliveryId: string;
  previousNotes?: PreviousNote[];
  onNoteAdded?: () => void;
  onCancel?: () => void;
  className?: string;
}

export default function DeliveryNotes({
  deliveryId,
  previousNotes = [],
  onNoteAdded,
  onCancel,
  className = '',
}: DeliveryNotesProps) {
  const t = useTranslations('deliveries.notes');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Initialiser le formulaire
  const form = useForm<NotesFormValues>({
    resolver: zodResolver(notesSchema),
    defaultValues: {
      noteType: 'INFO',
      content: '',
    },
  });

  // Types de notes
  const noteTypes = [
    { value: 'INFO', label: t('noteTypes.info') },
    { value: 'INSTRUCTION', label: t('noteTypes.instruction') },
    { value: 'WARNING', label: t('noteTypes.warning') },
    { value: 'CLIENT_REQUEST', label: t('noteTypes.clientRequest') },
    { value: 'MERCHANT_INFO', label: t('noteTypes.merchantInfo') },
  ];

  // Gérer la soumission du formulaire
  const onSubmit = async (data: NotesFormValues) => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Simuler un appel API pour l'exemple
      // Dans un cas réel, vous utiliseriez un hook ou un appel API
      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log('Note ajoutée:', {
        deliveryId,
        ...data,
        timestamp: new Date(),
      });

      setSuccess(true);
      form.reset(); // Réinitialiser le formulaire après soumission réussie
      if (onNoteAdded) {
        onNoteAdded();
      }
    } catch (err) {
      console.error("Erreur lors de l'ajout de la note:", err);
      setError(t('errorSubmitting'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Obtenir la couleur du badge selon le type de note
  const getNoteTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'INFO':
        return 'default';
      case 'INSTRUCTION':
        return 'outline';
      case 'WARNING':
        return 'destructive';
      case 'CLIENT_REQUEST':
        return 'secondary';
      case 'MERCHANT_INFO':
        return 'blue';
      default:
        return 'default';
    }
  };

  // Formatter la date
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  // Afficher les notes précédentes
  const renderPreviousNotes = () => {
    if (previousNotes.length === 0) {
      return <div className="text-center text-muted-foreground py-3">{t('noPreviousNotes')}</div>;
    }

    return (
      <div className="space-y-3">
        {previousNotes.map(note => (
          <div key={note.id} className="border rounded-md p-3 bg-card">
            <div className="flex justify-between items-center mb-2">
              <Badge variant={getNoteTypeBadgeVariant(note.type) as any}>
                {t(`noteTypes.${note.type.toLowerCase()}`)}
              </Badge>
              <span className="text-xs text-muted-foreground flex items-center">
                <Clock className="h-3 w-3 mr-1" />
                {formatDate(note.timestamp)}
              </span>
            </div>
            <p className="text-sm">{note.content}</p>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center">
          <MessageCircle className="mr-2 h-5 w-5" />
          {t('title')}
        </CardTitle>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t('errorTitle')}</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-4 bg-green-50">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-600">{t('successTitle')}</AlertTitle>
            <AlertDescription>{t('successMessage')}</AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="noteType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('noteTypeLabel')}</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('selectNoteType')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {noteTypes.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>{t('noteTypeDescription')}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('contentLabel')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('contentPlaceholder')}
                      className="min-h-[100px]"
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormDescription>{t('contentHelp')}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>

        {/* Notes précédentes */}
        <div className="mt-6">
          <h3 className="text-sm font-medium mb-2">{t('previousNotesTitle')}</h3>
          {renderPreviousNotes()}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
          {t('cancelButton')}
        </Button>
        <ButtonWithLoading
          onClick={form.handleSubmit(onSubmit)}
          disabled={isSubmitting || !form.formState.isValid}
          loading={isSubmitting}
        >
          {t('addNoteButton')}
        </ButtonWithLoading>
      </CardFooter>
    </Card>
  );
}
