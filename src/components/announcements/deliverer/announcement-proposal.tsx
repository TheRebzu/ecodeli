'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { createDeliveryApplicationSchema } from '@/schemas/announcement.schema';
import { Announcement } from '@/types/announcement';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Euro, CheckCircle, TruckIcon } from 'lucide-react';

interface AnnouncementProposalProps {
  announcement: Announcement;
  onSubmit: (data: any) => void;
  isSubmitting?: boolean;
}

export function AnnouncementProposal({
  announcement,
  onSubmit,
  isSubmitting = false,
}: AnnouncementProposalProps) {
  const t = useTranslations('announcements');
  const [acceptSuggestedPrice, setAcceptSuggestedPrice] = useState(true);

  // Initialiser le formulaire avec React Hook Form
  const form = useForm({
    resolver: zodResolver(createDeliveryApplicationSchema),
    defaultValues: {
      announcementId: announcement.id,
      proposedPrice: announcement.suggestedPrice,
      message: '',
    },
  });

  // Gérer la soumission du formulaire
  const handleSubmit = (data: any) => {
    onSubmit({
      ...data,
      proposedPrice: acceptSuggestedPrice ? announcement.suggestedPrice : data.proposedPrice,
    });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{t('proposeDeliveryService')}</CardTitle>
        <CardDescription>{t('proposeDeliveryServiceDescription')}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Informations de prix */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">{t('priceInformation')}</h3>
              <Separator />

              <div className="space-y-4">
                <div className="flex items-center">
                  <Checkbox
                    id="acceptSuggestedPrice"
                    checked={acceptSuggestedPrice}
                    onCheckedChange={checked => setAcceptSuggestedPrice(checked as boolean)}
                  />
                  <label
                    htmlFor="acceptSuggestedPrice"
                    className="ml-2 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {t('acceptSuggestedPrice')} ({announcement.suggestedPrice?.toFixed(2) || '0.00'}{' '}
                    €)
                  </label>
                </div>

                {!acceptSuggestedPrice && (
                  <FormField
                    control={form.control}
                    name="proposedPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('proposedPrice')}</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            min={0}
                            step={0.5}
                            disabled={acceptSuggestedPrice}
                          />
                        </FormControl>
                        <FormDescription>{t('proposedPriceDescription')}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-md">
                  <h4 className="text-sm font-semibold text-green-800 dark:text-green-400 flex items-center mb-1">
                    <Euro className="h-4 w-4 mr-1" />
                    {t('estimatedEarnings')}
                  </h4>
                  <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                    {(form.watch('proposedPrice') || announcement.suggestedPrice || 0).toFixed(2)} €
                  </p>
                </div>
              </div>
            </div>

            {/* Message */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">{t('messageToClient')}</h3>
              <Separator />

              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea {...field} placeholder={t('messageToClientPlaceholder')} rows={3} />
                    </FormControl>
                    <FormDescription>{t('messageToClientDescription')}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end items-center gap-4">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <TruckIcon className="mr-2 h-4 w-4 animate-bounce" />
                    {t('submittingProposal')}
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    {t('submitProposal')}
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
