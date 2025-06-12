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
import { Button } from '@/components/ui/button';
import { ButtonWithLoading } from '@/app/[locale]/(public)/loading';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertCircle, CheckCircle2, Phone, MessageSquare, Send, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils/common';

// Schéma de validation
const contactSchema = z.object({
  subject: z.string({
    required_error: 'Veuillez sélectionner un sujet',
  }),
  message: z
    .string()
    .min(5, { message: 'Le message doit contenir au moins 5 caractères' })
    .max(500, { message: 'Le message ne doit pas dépasser 500 caractères' }),
  preferredContact: z.enum(['app', 'phone', 'either'], {
    required_error: 'Veuillez sélectionner une méthode de contact préférée',
  }),
});

type ContactFormValues = z.infer<typeof contactSchema>;

interface DeliveryContactProps {
  deliveryId: string;
  delivererName?: string;
  delivererPhone?: string;
  onClose?: () => void;
  className?: string;
}

export default function DeliveryContact({
  deliveryId,
  delivererName,
  delivererPhone,
  onClose,
  className = '',
}: DeliveryContactProps) {
  const t = useTranslations('deliveries.contact');
  const [showSuccess, setShowSuccess] = useState(false);

  // État pour la gestion du contact
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fonctions pour l'envoi de message et appel
  const sendMessage = async (data: { subject: string; message: string; preferredContact: string }) => {
    setIsLoading(true);
    setError(null);
    try {
      // Simuler l'envoi du message
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('Message sent:', data);
    } catch (err) {
      setError('Erreur lors de l\'envoi du message');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const callDeliverer = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Simuler l'appel
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log('Call initiated');
    } catch (err) {
      setError('Erreur lors de l\'appel');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Initialiser le formulaire
  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      subject: '',
      message: '',
      preferredContact: 'app',
    },
  });

  // Sujets prédéfinis pour aider les utilisateurs
  const subjectOptions = [
    { value: 'update', label: t('subjects.update') },
    { value: 'address', label: t('subjects.address') },
    { value: 'delay', label: t('subjects.delay') },
    { value: 'issue', label: t('subjects.issue') },
    { value: 'other', label: t('subjects.other') },
  ];

  // Contact préféré options
  const contactOptions = [
    { value: 'app', label: t('contactMethods.app') },
    { value: 'phone', label: t('contactMethods.phone') },
    { value: 'either', label: t('contactMethods.either') },
  ];

  // Traitement du formulaire
  const onSubmit = async (data: ContactFormValues) => {
    try {
      await sendMessage({
        subject: data.subject,
        message: data.message,
        preferredContact: data.preferredContact,
      });

      setShowSuccess(true);
    } catch (error) {
      console.error("Erreur lors de l'envoi du message:", error);
    }
  };

  // Gérer l'appel téléphonique
  const handlePhoneCall = async () => {
    if (!delivererPhone) return;

    try {
      await callDeliverer();
      // Rediriger vers le téléphone
      window.location.href = `tel:${delivererPhone}`;
    } catch (error) {
      console.error("Erreur lors de l'appel:", error);
    }
  };

  // Messages prédéfinis pour accélérer la communication
  const quickMessages = [
    { id: 'eta', message: t('quickMessages.eta') },
    { id: 'doorCode', message: t('quickMessages.doorCode') },
    { id: 'parking', message: t('quickMessages.parking') },
    { id: 'wait', message: t('quickMessages.wait') },
  ];

  // Ajouter un message prédéfini
  const addQuickMessage = (message: string) => {
    const currentMessage = form.getValues('message');
    form.setValue('message', currentMessage ? `${currentMessage} ${message}` : message);
  };

  // Afficher l'écran de succès
  if (showSuccess) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-center text-green-600 flex items-center justify-center">
            <CheckCircle2 className="mr-2 h-6 w-6" />
            {t('successTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center">
          <p className="text-center mb-6">{t('successMessage')}</p>
          <div className="flex flex-col sm:flex-row gap-3">
            {delivererPhone && (
              <Button variant="outline" onClick={handlePhoneCall} className="flex items-center">
                <Phone className="mr-2 h-4 w-4" />
                {t('callDeliverer')}
              </Button>
            )}
            <Button onClick={onClose}>
              {t('backButton')}
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center">
          <MessageSquare className="mr-2 h-5 w-5" />
          {t('title')}
        </CardTitle>
        <CardDescription>
          {delivererName ? t('descriptionWithName', { name: delivererName }) : t('description')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t('errorTitle')}</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('subjectLabel')}</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isLoading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('selectSubject')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {subjectOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>{t('subjectHelp')}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div>
              <div className="mb-2">
                <FormLabel>{t('quickMessagesLabel')}</FormLabel>
              </div>
              <div className="flex flex-wrap gap-2 mb-4">
                {quickMessages.map(msg => (
                  <Button
                    key={msg.id}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addQuickMessage(msg.message)}
                    disabled={isLoading}
                  >
                    {msg.message}
                  </Button>
                ))}
              </div>
            </div>

            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('messageLabel')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('messagePlaceholder')}
                      className="min-h-[120px]"
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormDescription>{t('messageHelp')}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="preferredContact"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('preferredContactLabel')}</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isLoading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('selectPreferredContact')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {contactOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>{t('preferredContactHelp')}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>

        {delivererPhone && (
          <div className="mt-6 border-t pt-6">
            <p className="text-sm font-medium mb-3">{t('orCallDirectly')}</p>
            <Button
              variant="outline"
              onClick={handlePhoneCall}
              className="w-full flex items-center justify-center"
              disabled={isLoading}
            >
              <Phone className="mr-2 h-4 w-4" />
              {t('callDeliverer')}
            </Button>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onClose} disabled={isLoading}>
          {t('cancelButton')}
        </Button>
        <ButtonWithLoading
          onClick={form.handleSubmit(onSubmit)}
          disabled={isLoading || !form.formState.isValid}
          loading={isLoading}
        >
          <Send className="mr-2 h-4 w-4" />
          {t('sendButton')}
        </ButtonWithLoading>
      </CardFooter>
    </Card>
  );
}
