'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { z } from 'zod';
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
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Euro, CheckCircle, Truck, Clock, Calendar, Loader2, Ban } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

// Schéma de validation pour le formulaire de proposition
const proposalFormSchema = z.object({
  proposedPrice: z.number().positive('Le prix proposé doit être supérieur à 0'),
  estimatedDeliveryTime: z.string().datetime().optional(),
  message: z
    .string()
    .min(10, "Veuillez fournir un message d'au moins 10 caractères")
    .max(500, 'Le message ne peut pas dépasser 500 caractères'),
  hasRequiredEquipment: z.boolean().default(true),
  canPickupAtScheduledTime: z.boolean().default(true),
});

type ProposalFormValues = z.infer<typeof proposalFormSchema>;

interface AnnouncementProposalProps {
  announcementId: string;
  title: string;
  description: string;
  suggestedPrice: number;
  pickupDateTime?: string | Date;
  deliveryDateTime?: string | Date;
  isNegotiable: boolean;
  specialRequirements?: string[];
  onSubmit: (data: ProposalFormValues) => Promise<void>;
  onCancel?: () => void;
  isSubmitting?: boolean;
  error?: string;
}

/**
 * Composant de formulaire pour soumettre une proposition sur une annonce (pour les livreurs)
 */
export function AnnouncementProposal({
  announcementId,
  title,
  description,
  suggestedPrice,
  pickupDateTime,
  deliveryDateTime,
  isNegotiable,
  specialRequirements = [],
  onSubmit,
  onCancel,
  isSubmitting = false,
  error,
}: AnnouncementProposalProps) {
  const t = useTranslations('announcements');
  const [showPriceWarning, setShowPriceWarning] = useState(false);

  // Initialiser le formulaire avec React Hook Form et Zod
  const form = useForm<ProposalFormValues>({
    resolver: zodResolver(proposalFormSchema),
    defaultValues: {
      proposedPrice: suggestedPrice,
      estimatedDeliveryTime: deliveryDateTime
        ? new Date(deliveryDateTime).toISOString()
        : undefined,
      message: '',
      hasRequiredEquipment: true,
      canPickupAtScheduledTime: true,
    },
  });

  // Observer les changements de prix pour afficher des avertissements
  const proposedPrice = form.watch('proposedPrice');

  // Surveiller le prix pour afficher un avertissement si trop bas
  const handlePriceChange = (value: string) => {
    const price = parseFloat(value);
    if (!isNaN(price)) {
      form.setValue('proposedPrice', price);
      setShowPriceWarning(price < suggestedPrice * 0.8);
    }
  };

  // Gérer l'envoi du formulaire
  const handleSubmit = async (values: ProposalFormValues) => {
    await onSubmit(values);
  };

  // Formater une date pour l'affichage
  const formatDateTime = (dateTime?: string | Date) => {
    if (!dateTime) return t('notSpecified');
    return format(new Date(dateTime), 'PPpp', { locale: fr });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{t('createProposal')}</CardTitle>
        <CardDescription>{t('createProposalDescription')}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Résumé de l'annonce */}
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-4">
          <h3 className="text-lg font-semibold mb-2">{title}</h3>
          <p className="text-sm text-muted-foreground mb-4">{description}</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="flex items-center">
              <Euro className="h-4 w-4 mr-2 text-muted-foreground" />
              <span className="text-muted-foreground mr-1">{t('suggestedPrice')}:</span>
              <span className="font-medium">
                {suggestedPrice.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
              </span>
              {isNegotiable && (
                <Badge variant="outline" className="ml-2">
                  {t('negotiable')}
                </Badge>
              )}
            </div>

            {pickupDateTime && (
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="text-muted-foreground mr-1">{t('pickupDateTime')}:</span>
                <span className="font-medium">{formatDateTime(pickupDateTime)}</span>
              </div>
            )}

            {deliveryDateTime && (
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="text-muted-foreground mr-1">{t('deliveryDateTime')}:</span>
                <span className="font-medium">{formatDateTime(deliveryDateTime)}</span>
              </div>
            )}
          </div>

          {specialRequirements.length > 0 && (
            <>
              <Separator className="my-3" />
              <div className="space-y-1">
                <h4 className="text-sm font-medium">{t('specialRequirements')}</h4>
                <ul className="text-xs list-disc list-inside text-muted-foreground">
                  {specialRequirements.map((req, index) => (
                    <li key={index}>{req}</li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </div>

        {/* Formulaire de proposition */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="proposedPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('proposedPrice')}</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Euro className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="number"
                        placeholder="0.00"
                        className="pl-9"
                        value={field.value}
                        onChange={e => handlePriceChange(e.target.value)}
                        step="0.5"
                        min="0"
                      />
                    </div>
                  </FormControl>
                  {showPriceWarning && (
                    <p className="text-yellow-600 text-xs flex items-center mt-1">
                      <Ban className="h-3.5 w-3.5 mr-1" />
                      {t('priceTooLow')}
                    </p>
                  )}
                  <FormDescription>
                    {isNegotiable
                      ? t('proposedPriceDescriptionNegotiable')
                      : t('proposedPriceDescription')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="estimatedDeliveryTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('estimatedDeliveryTime')}</FormLabel>
                  <FormControl>
                    <Input
                      type="datetime-local"
                      {...field}
                      value={field.value ? new Date(field.value).toISOString().slice(0, 16) : ''}
                      onChange={e => {
                        if (e.target.value) {
                          field.onChange(new Date(e.target.value).toISOString());
                        } else {
                          field.onChange(undefined);
                        }
                      }}
                    />
                  </FormControl>
                  <FormDescription>{t('estimatedDeliveryTimeDescription')}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('proposalMessage')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('proposalMessagePlaceholder')}
                      className="min-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>{t('proposalMessageDescription')}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3">
              <FormField
                control={form.control}
                name="hasRequiredEquipment"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>{t('hasRequiredEquipment')}</FormLabel>
                      <FormDescription>{t('hasRequiredEquipmentDescription')}</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="canPickupAtScheduledTime"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>{t('canPickupAtScheduledTime')}</FormLabel>
                      <FormDescription>{t('canPickupAtScheduledTimeDescription')}</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {error && (
              <div className="text-sm text-destructive flex items-center">
                <Ban className="h-4 w-4 mr-1" />
                <span>{error}</span>
              </div>
            )}
          </form>
        </Form>
      </CardContent>

      <CardFooter className="flex justify-between">
        {onCancel && (
          <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
            {t('cancel')}
          </Button>
        )}

        <Button onClick={form.handleSubmit(handleSubmit)} disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('submitting')}
            </>
          ) : (
            <>
              <Truck className="mr-2 h-4 w-4" />
              {t('submitProposal')}
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}

export default AnnouncementProposal;
