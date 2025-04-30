'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createBookingSchema } from '@/schemas/service.schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ClockIcon, CreditCardIcon, CheckCircleIcon } from 'lucide-react';
import { formatPrice, formatDate } from '@/lib/format';
import { useServiceBooking } from '@/hooks/use-service-booking';

interface BookingFormProps {
  service: {
    id: string;
    name: string;
    price: number;
    provider: {
      id: string;
    };
  };
  selectedDate: Date | null;
  onCancel: () => void;
}

/**
 * Formulaire de réservation de service
 */
export function BookingForm({ service, selectedDate, onCancel }: BookingFormProps) {
  const t = useTranslations('services.booking');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    selectedTimeSlot,
    handleTimeSlotChange,
    availableTimeSlots,
    handleNotesChange,
    createBooking,
    notes,
  } = useServiceBooking({
    serviceId: service.id,
    providerId: service.provider.id,
  });

  // Données du formulaire
  const form = useForm({
    resolver: zodResolver(createBookingSchema),
    defaultValues: {
      serviceId: service.id,
      providerId: service.provider.id,
      date: selectedDate ? formatDate(selectedDate) : '',
      startTime: selectedTimeSlot || '',
      notes: notes,
      paymentMethod: 'card',
    },
  });

  // Soumission du formulaire
  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      await createBooking();
      // La redirection est gérée dans le hook useServiceBooking
    } catch (error) {
      console.error('Booking error:', error);
      setIsSubmitting(false);
    }
  };

  if (!selectedDate) {
    return (
      <div className="text-center py-4">
        <p className="text-red-500">{t('form.selectDateFirst')}</p>
        <Button onClick={onCancel} variant="outline" className="mt-2">
          {t('form.back')}
        </Button>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Date et heure */}
        <div className="space-y-4">
          <h3 className="font-medium">{t('form.appointment')}</h3>

          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('form.date')}</FormLabel>
                <FormControl>
                  <Input {...field} disabled value={formatDate(selectedDate)} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="startTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('form.time')}</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={value => {
                    field.onChange(value);
                    handleTimeSlotChange(value);
                  }}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t('form.selectTime')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {availableTimeSlots.map(slot => (
                      <SelectItem key={slot} value={slot}>
                        <div className="flex items-center">
                          <ClockIcon className="mr-2 h-4 w-4" />
                          <span>{slot}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Separator />

        {/* Notes spéciales */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('form.notes')}</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder={t('form.notesPlaceholder')}
                  rows={3}
                  onChange={e => {
                    field.onChange(e);
                    handleNotesChange(e.target.value);
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Separator />

        {/* Méthode de paiement */}
        <FormField
          control={form.control}
          name="paymentMethod"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>{t('form.paymentMethod')}</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="flex flex-col space-y-1"
                >
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="card" />
                    </FormControl>
                    <FormLabel className="font-normal cursor-pointer flex items-center">
                      <CreditCardIcon className="w-4 h-4 mr-2" />
                      {t('form.creditCard')}
                    </FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="appWallet" />
                    </FormControl>
                    <FormLabel className="font-normal cursor-pointer">
                      {t('form.appWallet')}
                    </FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="paypal" />
                    </FormControl>
                    <FormLabel className="font-normal cursor-pointer">PayPal</FormLabel>
                  </FormItem>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Récapitulatif */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-medium mb-2">{t('form.summary')}</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>{t('form.servicePrice')}</span>
              <span>{formatPrice(service.price)}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-medium">
              <span>{t('form.total')}</span>
              <span>{formatPrice(service.price)}</span>
            </div>
          </div>
        </div>

        {/* Conditions générales */}
        <FormField
          control={form.control}
          name="termsAccepted"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
              <FormControl>
                <div className="flex items-center h-5 mt-0.5">
                  <input
                    type="checkbox"
                    required
                    className="w-4 h-4"
                    onChange={e => field.onChange(e.target.checked)}
                  />
                </div>
              </FormControl>
              <div className="text-sm">
                {t.rich('form.termsAndConditions', {
                  link: chunks => (
                    <a href="/terms" className="text-primary hover:underline">
                      {chunks}
                    </a>
                  ),
                })}
              </div>
            </FormItem>
          )}
        />

        {/* Boutons d'action */}
        <div className="flex gap-4">
          <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
            {t('form.cancel')}
          </Button>
          <Button
            type="submit"
            className="flex-1"
            disabled={isSubmitting || !form.formState.isValid}
          >
            {isSubmitting ? (
              <span className="flex items-center">
                <span className="animate-spin mr-2">⏳</span> {t('form.processing')}
              </span>
            ) : (
              <span className="flex items-center">
                <CheckCircleIcon className="w-4 h-4 mr-2" /> {t('form.confirmBooking')}
              </span>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
